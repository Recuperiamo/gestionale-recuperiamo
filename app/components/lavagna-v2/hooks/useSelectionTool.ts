// @ts-nocheck
/**
 * useSelectionTool — rubber-band select, move, delete selected items.
 *
 * Works imperatively on the engine (draws selection rect on live canvas)
 * and updates the Zustand store for selection state.
 */
import { useRef, useCallback, useEffect } from 'react'
import { CanvasEngine } from '../engine/CanvasEngine'
import { useWhiteboardStore } from '../store/whiteboardStore'
import { hitTestStroke, shapeBBox, bboxIntersects, pointInBBox } from '../engine/strokeUtils'

type SelectState = 'idle' | 'drawing-rect' | 'moving'

interface DragStart { worldX: number; worldY: number; screenX: number; screenY: number }
interface SelectRect { x1: number; y1: number; x2: number; y2: number }

export function useSelectionTool(engineRef: React.RefObject<CanvasEngine>, onMoveCommit?: () => void) {
  const store = useWhiteboardStore()

  const state = useRef<SelectState>('idle')
  const dragStart = useRef<DragStart | null>(null)
  const selectRect = useRef<SelectRect | null>(null)

  // Move state
  const moveStart = useRef<{ worldX: number; worldY: number } | null>(null)

  // Pan state (tasto destro / centrale)
  const panning = useRef({ active: false, lastX: 0, lastY: 0 })

  // ── Draw selection rectangle on live canvas ──────────────────────────────────
  const drawSelectionRect = useCallback(() => {
    const eng = engineRef.current
    if (!eng || !selectRect.current) return
    const ctx = eng['liveCtx']
    if (!ctx) return
    const { x1, y1, x2, y2 } = selectRect.current
    const dpr = eng['dpr']
    const cssW = eng['liveCanvas'].width / dpr
    const cssH = eng['liveCanvas'].height / dpr

    ctx.setTransform(eng.zoom * dpr, 0, 0, eng.zoom * dpr, -eng.pan.x * eng.zoom * dpr, -eng.pan.y * eng.zoom * dpr)
    ctx.save()
    ctx.strokeStyle = '#0078d4'
    ctx.fillStyle = 'rgba(0,120,212,0.06)'
    ctx.lineWidth = 1.5 / eng.zoom
    ctx.setLineDash([4 / eng.zoom, 3 / eng.zoom])
    const rx = Math.min(x1, x2), ry = Math.min(y1, y2)
    const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1)
    ctx.beginPath()
    ctx.rect(rx, ry, rw, rh)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }, [engineRef])

  // ── Hit test — find what's under a world point ───────────────────────────────
  const hitTest = useCallback((wx: number, wy: number) => {
    const eng = engineRef.current
    if (!eng) return { strokeIds: [], shapeIds: [] }
    const { strokes, shapes } = store

    const hitStrokes = strokes
      .filter(s => hitTestStroke(s, wx, wy, eng.zoom))
      .map(s => s.id)

    const hitShapes = shapes
      .filter(s => {
        const bb = shapeBBox(s)
        return pointInBBox({ x: wx, y: wy }, bb)
      })
      .map(s => s.id)

    return { strokeIds: hitStrokes, shapeIds: hitShapes }
  }, [engineRef, store])

  // ── Rect select — find everything inside selection rect ───────────────────────
  const rectSelect = useCallback(() => {
    const eng = engineRef.current
    if (!eng || !selectRect.current) return
    const { x1, y1, x2, y2 } = selectRect.current
    const selBB = { minX: Math.min(x1, x2), minY: Math.min(y1, y2), maxX: Math.max(x1, x2), maxY: Math.max(y1, y2) }
    const { strokes, shapes } = store

    const strokeIds = strokes
      .filter(s => s.bbox && bboxIntersects(s.bbox, selBB))
      .map(s => s.id)

    const shapeIds = shapes
      .filter(s => { const bb = shapeBBox(s); return bboxIntersects(bb, selBB) })
      .map(s => s.id)

    store.setSelection(strokeIds, shapeIds)
  }, [engineRef, store])

  // ── Pointer events ────────────────────────────────────────────────────────────

  const onPointerDown = useCallback((e) => {
    const eng = engineRef.current
    if (!eng) return
    const native = e.nativeEvent || e

    // Tasto destro o centrale → pan (come negli altri strumenti)
    if (native.button === 2 || native.button === 1) {
      panning.current = { active: true, lastX: native.clientX, lastY: native.clientY }
      return
    }

    const rect = (e.target as HTMLElement).getBoundingClientRect?.() || { left: 0, top: 0 }
    const sx = (e.clientX ?? e.nativeEvent?.clientX) - rect.left
    const sy = (e.clientY ?? e.nativeEvent?.clientY) - rect.top
    const world = eng.screenToWorld(sx, sy)

    // Check if clicking on existing selection → start move
    const { selectedStrokeIds, selectedShapeIds } = store
    if (selectedStrokeIds.length || selectedShapeIds.length) {
      const hit = hitTest(world.x, world.y)
      const hitSelected = hit.strokeIds.some(id => selectedStrokeIds.includes(id)) ||
        hit.shapeIds.some(id => selectedShapeIds.includes(id))
      if (hitSelected) {
        state.current = 'moving'
        moveStart.current = { worldX: world.x, worldY: world.y }
        return
      }
    }

    // Check if clicking on any element → single select + start move
    const hit = hitTest(world.x, world.y)
    if (hit.strokeIds.length || hit.shapeIds.length) {
      store.setSelection(hit.strokeIds, hit.shapeIds)
      state.current = 'moving'
      moveStart.current = { worldX: world.x, worldY: world.y }
      return
    }

    // Empty area → start rubber-band
    store.clearSelection()
    state.current = 'drawing-rect'
    dragStart.current = { worldX: world.x, worldY: world.y, screenX: sx, screenY: sy }
    selectRect.current = { x1: world.x, y1: world.y, x2: world.x, y2: world.y }
    try { (e.target as HTMLElement).setPointerCapture?.(e.nativeEvent?.pointerId ?? e.pointerId) } catch (_) {}
  }, [engineRef, store, hitTest])

  const onPointerMove = useCallback((e) => {
    const eng = engineRef.current
    if (!eng) return
    const native = e.nativeEvent || e

    if (panning.current.active) {
      const dx = native.clientX - panning.current.lastX
      const dy = native.clientY - panning.current.lastY
      panning.current.lastX = native.clientX
      panning.current.lastY = native.clientY
      eng.setPan(eng.pan.x - dx / eng.zoom, eng.pan.y - dy / eng.zoom)
      return
    }

    const rect = (e.target as HTMLElement).getBoundingClientRect?.() || { left: 0, top: 0 }
    const sx = (e.clientX ?? e.nativeEvent?.clientX) - rect.left
    const sy = (e.clientY ?? e.nativeEvent?.clientY) - rect.top
    const world = eng.screenToWorld(sx, sy)

    if (state.current === 'drawing-rect' && dragStart.current) {
      selectRect.current = { x1: dragStart.current.worldX, y1: dragStart.current.worldY, x2: world.x, y2: world.y }
      drawSelectionRect()
    }

    if (state.current === 'moving' && moveStart.current) {
      const dx = world.x - moveStart.current.worldX
      const dy = world.y - moveStart.current.worldY
      moveStart.current = { worldX: world.x, worldY: world.y }

      const { selectedStrokeIds, selectedShapeIds, strokes, shapes } = store

      // Move strokes
      if (selectedStrokeIds.length) {
        selectedStrokeIds.forEach(id => {
          const s = strokes.find(x => x.id === id)
          if (!s) return
          store.updateStroke(id, { points: s.points.map(p => ({ ...p, x: p.x + dx, y: p.y + dy })) })
        })
      }

      // Move shapes
      if (selectedShapeIds.length) {
        selectedShapeIds.forEach(id => {
          const s = shapes.find(x => x.id === id)
          if (!s) return
          const patch: any = { x: s.x + dx, y: s.y + dy }
          if (s.x2 !== undefined) patch.x2 = s.x2 + dx
          if (s.y2 !== undefined) patch.y2 = s.y2 + dy
          store.updateShape(id, patch)
        })
      }
    }
  }, [engineRef, store, drawSelectionRect])

  const onPointerUp = useCallback((e) => {
    if (panning.current.active) {
      panning.current.active = false
      return
    }
    if (state.current === 'drawing-rect') {
      rectSelect()
      selectRect.current = null
      // Clear selection rect from live canvas (engine will redraw)
      engineRef.current?.markBaseDirty()
    }
    if (state.current === 'moving') {
      onMoveCommit?.()
    }
    state.current = 'idle'
    dragStart.current = null
    moveStart.current = null
    try { (e.target as HTMLElement).releasePointerCapture?.(e.nativeEvent?.pointerId ?? e.pointerId) } catch (_) {}
  }, [rectSelect, engineRef, onMoveCommit])

  // NOTE: keyboard delete (Delete/Backspace) è gestito in LavagnaCanvas
  // dove si ha accesso a emitStrokeEvent e deleteShape/deleteStroke per persistenza e sync Ably.

  return { onPointerDown, onPointerMove, onPointerUp }
}
