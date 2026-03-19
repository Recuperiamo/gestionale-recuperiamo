// @ts-nocheck
/**
 * usePointerHandlers — all pointer/touch/wheel interaction logic.
 *
 * Reads from engine refs, writes to engine imperatively.
 * Only calls store when a stroke is committed (pointerUp).
 */
import { useRef, useCallback } from 'react'
import { CanvasEngine } from '../engine/CanvasEngine'
import { simplifyPoints, generateId, hitTestStroke } from '../engine/strokeUtils'
import { useWhiteboardStore } from '../store/whiteboardStore'

interface Options {
  engineRef: React.RefObject<CanvasEngine>
  onStrokeCommit?: (stroke: any) => void   // called with final stroke to save to DB + Ably
  onStrokeCancel?: (streamId: string) => void
  readOnly?: boolean
}

export function usePointerHandlers({ engineRef, onStrokeCommit, onStrokeCancel, readOnly }: Options) {
  const store = useWhiteboardStore()

  // Current drawing state — all refs, no React state
  const drawing = useRef(false)
  const isLaser = useRef(false)
  const streamId = useRef<string | null>(null)
  const allPoints = useRef([])            // all collected points (never trimmed)
  const activePointerId = useRef<number | null>(null)

  // Panning state
  const panning = useRef({ active: false, lastX: 0, lastY: 0 })

  // Pinch zoom state
  const touches = useRef<Map<number, { x: number; y: number }>>(new Map())

  // Cursor emit throttle
  const cursorThrottle = useRef(0)

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
    isLaser.current = tool === 'laser'
    streamId.current = `${store.tool === 'eraser' ? 'eraser' : ''}-${generateId()}`
    allPoints.current = [pt]

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

    // Stroke-erase mode: delete entire strokes under cursor
    const { tool, eraserMode } = useWhiteboardStore.getState()
    if (tool === 'eraser' && eraserMode === 'stroke') {
      const pt = getPoint(e)
      if (pt) {
        eng.updateLiveStroke([pt]) // cursor circle only
        const currentStrokes = useWhiteboardStore.getState().strokes
        for (const s of currentStrokes) {
          if (hitTestStroke(s, pt.x, pt.y, eng.zoom)) {
            useWhiteboardStore.getState().deleteStroke(s.id)
            useWhiteboardStore.getState().pushUndo({ type: 'delete-stroke', stroke: s })
            onStrokeCommit?.({ type: 'delete-stroke', stroke: s })
          }
        }
      }
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

    // Stream points to Ably (last batch) — skip for laser
    if (!isLaser.current) {
      const latest = allPoints.current.slice(-8)
      onStrokeCommit?.({ type: 'points', streamId: streamId.current, points: latest })
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

    if (raw.length === 0) return

    // Simplify only at commit time
    let finalPts = simplifyPoints(raw, eng.zoom)
    if (finalPts.length === 0) return
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
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    eng.zoomAt(factor, sx, sy)
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
