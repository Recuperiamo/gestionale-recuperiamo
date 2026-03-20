// @ts-nocheck
/**
 * usePointerHandlers — all pointer/touch/wheel interaction logic.
 *
 * Reads from engine refs, writes to engine imperatively.
 * Only calls store when a stroke is committed (pointerUp).
 */
import { useRef, useCallback } from 'react'
import { CanvasEngine } from '../engine/CanvasEngine'
import { simplifyPoints, generateId, hitTestStroke, hitTestShape } from '../engine/strokeUtils'
import { useWhiteboardStore } from '../store/whiteboardStore'

const SHAPE_TOOLS = new Set(['rect', 'ellipse', 'line', 'arrow', 'diamond', 'triangle', 'axis2', 'axis3'])

interface Options {
  engineRef: React.RefObject<CanvasEngine>
  onStrokeCommit?: (stroke: any) => void   // called with final stroke to save to DB + Ably
  onStrokeCancel?: (streamId: string) => void
  readOnly?: boolean
  userId?: string | number   // for eraser permission check
  isAdmin?: boolean          // admin can erase everything, student only own
}

export function usePointerHandlers({ engineRef, onStrokeCommit, onStrokeCancel, readOnly, userId, isAdmin }: Options) {
  const store = useWhiteboardStore()

  // Current drawing state — all refs, no React state
  const drawing = useRef(false)
  const isLaser = useRef(false)
  const streamId = useRef<string | null>(null)
  const allPoints = useRef([])            // all collected points (never trimmed)
  const lastSentIdx = useRef(0)           // index of last point sent via Ably (avoids duplicates)
  const activePointerId = useRef<number | null>(null)

  // Panning state
  const panning = useRef({ active: false, lastX: 0, lastY: 0 })

  // Pinch zoom state
  const touches = useRef<Map<number, { x: number; y: number }>>(new Map())

  // Cursor emit throttle
  const cursorThrottle = useRef(0)

  const isShape = useRef(false)
  const shapeStart = useRef<{ x: number; y: number } | null>(null)
  const lastShiftKey = useRef(false)

  // ── helpers ──

  const getEngine = () => engineRef.current
  const getPoint = useCallback((e: PointerEvent | React.PointerEvent) => {
    const eng = getEngine()
    if (!eng) return null
    const rect = (e.target as HTMLElement).getBoundingClientRect?.() || { left: 0, top: 0 }
    const sx = (e.clientX ?? e.nativeEvent?.clientX) - rect.left
    const sy = (e.clientY ?? e.nativeEvent?.clientY) - rect.top
    return eng.screenToWorld(sx, sy)
  }, [])

  // ── Pointer events ──────────────────────────────────────────────────────────

  const onPointerDown = useCallback((e) => {
    const eng = getEngine()
    if (!eng) return

    const native = e.nativeEvent || e
    const { tool, color, strokeWidth, opacity } = store

    // Right click / middle click → pan
    if (native.button === 2 || native.button === 1 || tool === 'hand') {
      panning.current = { active: true, lastX: native.clientX, lastY: native.clientY }
      return
    }

    if (readOnly) return
    if (tool === 'select') return

    const pt = getPoint(e)
    if (!pt) return

    try { (e.target as HTMLElement).setPointerCapture?.(native.pointerId) } catch (_) {}
    activePointerId.current = native.pointerId
    drawing.current = true

    if (SHAPE_TOOLS.has(tool)) {
      isShape.current = true
      shapeStart.current = pt
      eng.startLiveShape({ type: tool, x: pt.x, y: pt.y, x2: pt.x, y2: pt.y, color, strokeWidth })
      return
    }

    isLaser.current = tool === 'laser'
    streamId.current = `${store.tool === 'eraser' ? 'eraser' : ''}-${generateId()}`
    allPoints.current = [pt]
    lastSentIdx.current = 0

    eng.startLiveStroke({
      id: streamId.current,
      tool,
      color: tool === 'eraser' ? '#ffffff' : color,
      width: strokeWidth,
      opacity,
      points: [pt],
    })

    // Notify Ably immediately (stroke:start) — skip for laser
    if (!isLaser.current) {
      onStrokeCommit?.({ type: 'start', streamId: streamId.current, tool, color, strokeWidth, opacity, start: pt })
    }
  }, [store, readOnly, getPoint, onStrokeCommit])

  const onPointerMove = useCallback((e) => {
    const eng = getEngine()
    if (!eng) return
    const native = e.nativeEvent || e

    // Cursor sharing throttle
    const now = Date.now()
    if (now - cursorThrottle.current > 50) {
      cursorThrottle.current = now
      const pt = getPoint(e)
      if (pt) onStrokeCommit?.({ type: 'cursor', x: pt.x, y: pt.y })
    }

    // Pan
    if (panning.current.active) {
      const dx = native.clientX - panning.current.lastX
      const dy = native.clientY - panning.current.lastY
      panning.current.lastX = native.clientX
      panning.current.lastY = native.clientY
      eng.setPan(eng.pan.x - dx / eng.zoom, eng.pan.y - dy / eng.zoom)
      return
    }

    if (!drawing.current) return
    if (native.pointerId !== activePointerId.current) return

    // Stroke-erase mode: delete entire strokes AND shapes under cursor
    const { tool, eraserMode } = useWhiteboardStore.getState()
    if (tool === 'eraser' && eraserMode === 'stroke') {
      const pt = getPoint(e)
      if (pt) {
        eng.updateLiveStroke([pt]) // cursor circle only

        const canEraseItem = (authorId: any) => {
          if (isAdmin) return true
          // Studente: solo i propri (confronto come stringa per evitare type mismatch)
          return String(authorId) === String(userId)
        }

        const st = useWhiteboardStore.getState()
        for (const s of st.strokes) {
          if (canEraseItem(s.authorId) && hitTestStroke(s, pt.x, pt.y, eng.zoom)) {
            st.deleteStroke(s.id)
            st.pushUndo({ type: 'delete-stroke', stroke: s })
            onStrokeCommit?.({ type: 'delete-stroke', stroke: s })
          }
        }
        for (const sh of st.shapes) {
          if (canEraseItem(sh.authorId) && hitTestShape(sh, pt.x, pt.y, eng.zoom)) {
            st.deleteShape(sh.id)
            st.pushUndo({ type: 'delete-shape', shape: sh })
            onStrokeCommit?.({ type: 'delete-shape', shape: sh })
          }
        }
      }
      return
    }

    // Shape drawing live preview
    if (isShape.current && shapeStart.current) {
      const pt = getPoint(e)
      if (pt) {
        let ex = pt.x, ey = pt.y
        if (native.shiftKey) {
          const dx = pt.x - shapeStart.current.x
          const dy = pt.y - shapeStart.current.y
          const shapeTl = useWhiteboardStore.getState().tool
          if (shapeTl === 'line' || shapeTl === 'arrow') {
            const angle = Math.atan2(dy, dx)
            const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
            const dist = Math.hypot(dx, dy)
            ex = shapeStart.current.x + dist * Math.cos(snapped)
            ey = shapeStart.current.y + dist * Math.sin(snapped)
          } else {
            const size = Math.min(Math.abs(dx), Math.abs(dy))
            ex = shapeStart.current.x + Math.sign(dx) * size
            ey = shapeStart.current.y + Math.sign(dy) * size
          }
        }
        eng.updateLiveShape(ex, ey)
        lastShiftKey.current = native.shiftKey
      }
      return
    }

    // Track shift key for straight-line snap
    lastShiftKey.current = native.shiftKey

    // Shift+straight line live preview for ink tools
    if (native.shiftKey && (useWhiteboardStore.getState().tool === 'pen' || useWhiteboardStore.getState().tool === 'highlighter')) {
      const startPt = allPoints.current[0]
      const pt = getPoint(e)
      if (startPt && pt) eng.updateLiveStroke([startPt, pt])
      return
    }

    // Coalesced events for smoother strokes
    const evts = native.getCoalescedEvents ? native.getCoalescedEvents() : [native]
    for (const ev of evts) {
      const rect = (e.target as HTMLElement).getBoundingClientRect?.() || { left: 0, top: 0 }
      const sx = ev.clientX - rect.left
      const sy = ev.clientY - rect.top
      const pt = eng.screenToWorld(sx, sy)
      allPoints.current.push(pt)
    }

    // Update live display (unsimplified = responsive feel)
    eng.updateLiveStroke([...allPoints.current])

    // Stream only NEW points to Ably — no overlap with previous batch
    if (!isLaser.current) {
      const newPts = allPoints.current.slice(lastSentIdx.current)
      if (newPts.length > 0) {
        onStrokeCommit?.({ type: 'points', streamId: streamId.current, points: newPts })
        lastSentIdx.current = allPoints.current.length
      }
    }
  }, [getPoint, onStrokeCommit])

  const onPointerUp = useCallback((e) => {
    const eng = getEngine()
    if (!eng) return
    const native = e.nativeEvent || e

    // End pan
    if (panning.current.active) {
      panning.current.active = false
      return
    }

    if (!drawing.current) return
    drawing.current = false
    eng.endLiveStroke()

    try { (e.target as HTMLElement).releasePointerCapture?.(native.pointerId) } catch (_) {}
    activePointerId.current = null

    // Shape commit
    if (isShape.current) {
      isShape.current = false
      const start = shapeStart.current
      shapeStart.current = null
      eng.endLiveShape()
      if (!start) return
      const pt = getPoint(e)
      if (!pt || (Math.abs(pt.x - start.x) < 3 && Math.abs(pt.y - start.y) < 3)) return
      const { tool: shapeTool, color: shapeColor, strokeWidth: shapeWidth } = useWhiteboardStore.getState()
      const isLine = shapeTool === 'line' || shapeTool === 'arrow'
      const shape = {
        id: generateId(),
        type: shapeTool,
        x: isLine ? start.x : Math.min(start.x, pt.x),
        y: isLine ? start.y : Math.min(start.y, pt.y),
        x2: isLine ? pt.x : undefined,
        y2: isLine ? pt.y : undefined,
        width: isLine ? undefined : Math.abs(pt.x - start.x),
        height: isLine ? undefined : Math.abs(pt.y - start.y),
        color: shapeColor,
        strokeWidth: shapeWidth,
        fillColor: 'transparent',
        rotation: 0,
        authorId: userId,
      }
      useWhiteboardStore.getState().addShape(shape)
      useWhiteboardStore.getState().pushUndo({ type: 'add-shape', shape })
      onStrokeCommit?.({ type: 'commit-shape', shape })
      return
    }

    // Laser: visual only, do not commit to store
    if (isLaser.current) {
      isLaser.current = false
      allPoints.current = []
      streamId.current = null
      return
    }
    isLaser.current = false

    // Stroke-erase mode: strokes already deleted in onPointerMove, nothing to commit
    const { tool: currentTool, eraserMode } = useWhiteboardStore.getState()
    if (currentTool === 'eraser' && eraserMode === 'stroke') {
      allPoints.current = []
      streamId.current = null
      return
    }

    const raw = allPoints.current
    allPoints.current = []
    lastSentIdx.current = 0

    if (raw.length === 0) return

    // Simplify only at commit time
    // Shift: straight line from first to last collected point
    const isShiftUp = (e.nativeEvent || e).shiftKey || lastShiftKey.current
    let finalPts
    if (isShiftUp && (currentTool === 'pen' || currentTool === 'highlighter') && raw.length >= 2) {
      finalPts = [raw[0], raw[raw.length - 1]]
    } else {
      finalPts = simplifyPoints(raw, eng.zoom)
    }
    if (!finalPts || finalPts.length === 0) return
    if (finalPts.length === 1) finalPts = [finalPts[0], { x: finalPts[0].x + 0.1, y: finalPts[0].y + 0.1 }]

    const { tool, color, strokeWidth, opacity } = store
    const stroke = {
      id: streamId.current,
      tool,
      color: tool === 'eraser' ? '#ffffff' : color,
      width: strokeWidth,
      opacity,
      points: finalPts,
      authorId: undefined, // set by shell
    }

    // Commit to store (causes base canvas redraw)
    store.addStroke(stroke)
    store.pushUndo({ type: 'add-stroke', stroke })

    // Persist + broadcast
    onStrokeCommit?.({ type: 'commit', stroke })
    streamId.current = null
  }, [store, onStrokeCommit])

  const onPointerCancel = useCallback((e) => {
    const eng = getEngine()
    if (eng) eng.endLiveStroke()
    drawing.current = false
    isLaser.current = false
    panning.current.active = false
    if (streamId.current) {
      onStrokeCancel?.(streamId.current)
      streamId.current = null
    }
    allPoints.current = []
    activePointerId.current = null
  }, [onStrokeCancel])

  // ── Wheel zoom ──────────────────────────────────────────────────────────────

  const onWheel = useCallback((e) => {
    e.preventDefault()
    const eng = getEngine()
    if (!eng) return
    const rect = (e.target as HTMLElement).getBoundingClientRect?.() || { left: 0, top: 0 }
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top

    if (e.ctrlKey) {
      // Pinch gesture su Mac trackpad (ctrlKey=true) oppure Ctrl+scroll → zoom
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      eng.zoomAt(factor, sx, sy)
    } else {
      // Due dita swipe su Mac trackpad → pan (deltaX orizzontale, deltaY verticale)
      eng.setPan(eng.pan.x + e.deltaX / eng.zoom, eng.pan.y + e.deltaY / eng.zoom)
    }
  }, [])

  // ── Touch pinch ─────────────────────────────────────────────────────────────

  const onTouchStart = useCallback((e) => {
    e.preventDefault()
    for (const t of e.changedTouches) touches.current.set(t.identifier, { x: t.clientX, y: t.clientY })
  }, [])

  const onTouchMove = useCallback((e) => {
    e.preventDefault()
    if (e.touches.length < 2) return
    const [a, b] = Array.from(e.touches).slice(0, 2)
    const prev = [touches.current.get(a.identifier), touches.current.get(b.identifier)]
    if (!prev[0] || !prev[1]) return

    const prevDist = Math.hypot(prev[0].x - prev[1].x, prev[0].y - prev[1].y)
    const newDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    if (prevDist < 1) return

    const factor = newDist / prevDist
    const mx = (a.clientX + b.clientX) / 2
    const my = (a.clientY + b.clientY) / 2
    const rect = (e.target as HTMLElement).getBoundingClientRect?.() || { left: 0, top: 0 }
    getEngine()?.zoomAt(factor, mx - rect.left, my - rect.top)

    for (const t of e.changedTouches) touches.current.set(t.identifier, { x: t.clientX, y: t.clientY })
  }, [])

  const onTouchEnd = useCallback((e) => {
    for (const t of e.changedTouches) touches.current.delete(t.identifier)
  }, [])

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onWheel, onTouchStart, onTouchMove, onTouchEnd }
}
