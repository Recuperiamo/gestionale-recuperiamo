// @ts-nocheck
"use client"
/**
 * LavagnaCanvas v2 — shell React.
 *
 * Responsibilities:
 *  1. Mount two canvas elements, instantiate CanvasEngine
 *  2. Wire store changes → engine.setData() (base redraw)
 *  3. Wire pointer events via usePointerHandlers
 *  4. Wire Ably sync via useAblySync
 *  5. Wire DB persistence via usePersistence
 *  6. Render Toolbar + off-screen cursor indicators
 */
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { CanvasEngine } from './engine/CanvasEngine'
import { useWhiteboardStore } from './store/whiteboardStore'
import { usePointerHandlers } from './hooks/usePointerHandlers'
import { useAblySync } from './sync/useAblySync'
import { usePersistence } from './sync/usePersistence'
import Toolbar from './toolbar/Toolbar'
import { useTextTool } from './hooks/useTextTool'
import { useSelectionTool } from './hooks/useSelectionTool'

interface Props {
  lavagnaId: string
  attivitaId?: string
  trattiIniziali?: any[]
  formeIniziali?: any[]
  utenteId: string | number
  clienteId?: string | number
  ruolo: string
  altezza?: number
  canStudentDraw?: boolean
}

export default function LavagnaCanvas({
  lavagnaId, attivitaId, trattiIniziali, formeIniziali,
  utenteId, ruolo, altezza = 600, canStudentDraw: canStudentDrawInitial = false,
}: Props) {
  const isAdmin = ruolo === 'admin' || ruolo === 'operatore'

  // ── Draw permissions ─────────────────────────────────────────────────────────
  // Admin can always draw; students need canStudentDraw toggle
  const [canDraw, setCanDraw] = useState(isAdmin || canStudentDrawInitial)
  const readOnly = !isAdmin && !canDraw

  // Admin: incoming draw requests from students
  const [drawRequestPending, setDrawRequestPending] = useState(false)

  // ── Canvas refs ──────────────────────────────────────────────────────────────
  const baseRef = useRef<HTMLCanvasElement>(null)
  const liveRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<CanvasEngine | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Store ────────────────────────────────────────────────────────────────────
  const store = useWhiteboardStore()

  // ── Channel name (same as v1) ────────────────────────────────────────────────
  const channelName = useMemo(() => {
    const base = attivitaId || lavagnaId   // || not ?? : empty string must fall back to lavagnaId
    return base ? `lavagna:${base}` : null
  }, [lavagnaId, attivitaId])

  // ── Init engine ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!baseRef.current || !liveRef.current) return
    const eng = new CanvasEngine(baseRef.current, liveRef.current)
    engineRef.current = eng

    // Initial size
    const container = containerRef.current
    if (container) {
      const { width, height } = container.getBoundingClientRect()
      eng.resize(width, height)
    }

    // Listen viewport changes → update zoom display
    const onViewport = () => {}
    eng.on(onViewport)

    return () => {
      eng.off(onViewport)
      eng.destroy()
      engineRef.current = null
    }
  }, [])

  // ── Load initial data ────────────────────────────────────────────────────────
  useEffect(() => {
    store.loadInitial(trattiIniziali || [], formeIniziali || [])
  }, [lavagnaId])

  // ── Keep engine data in sync with store ──────────────────────────────────────
  useEffect(() => {
    const eng = engineRef.current
    if (!eng) return
    eng.setData(store.strokes, store.shapes, store.background)
  }, [store.strokes, store.shapes, store.background])

  // ── Keep engine selection in sync ────────────────────────────────────────────
  useEffect(() => {
    engineRef.current?.setSelection(store.selectedStrokeIds, store.selectedShapeIds)
  }, [store.selectedStrokeIds, store.selectedShapeIds])

  // ── Keep engine remote cursors in sync ───────────────────────────────────────
  useEffect(() => {
    const cursors = Object.values(store.remoteCursors).map(c => ({
      userId: String(c.userId),
      role: c.role,
      x: c.x,
      y: c.y,
    }))
    engineRef.current?.setRemoteCursors(cursors)
  }, [store.remoteCursors])

  // ── Resize observer ──────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        engineRef.current?.resize(width, height)
      }
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // ── Persistence ──────────────────────────────────────────────────────────────
  const { saveStroke, deleteStroke, deleteShape, clearBoard } = usePersistence({ lavagnaId, userId: utenteId })

  // ── Undo / Redo keyboard ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        const entry = store.undo()
        if (!entry) return
        if (entry.type === 'add-stroke' && entry.stroke) {
          store.deleteStroke(entry.stroke.id)
          if (entry.stroke.dbId) deleteStroke(entry.stroke.dbId)
        }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        const entry = store.redo()
        if (!entry) return
        if (entry.type === 'add-stroke' && entry.stroke) {
          store.addStroke(entry.stroke)
          saveStroke(entry.stroke)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [store, saveStroke, deleteStroke])

  // Callbacks per useAblySync — devono stare al top-level del componente (regole hooks)
  const emitPermissionsUpdateRef = useRef<((d: { canStudentDraw: boolean }) => void) | null>(null)

  const handlePermissionsUpdate = useCallback(({ canStudentDraw }: { canStudentDraw: boolean }) => {
    setCanDraw(canStudentDraw)
  }, [])

  const handleDrawRequest = useCallback(() => {
    setDrawRequestPending(true)
  }, [])

  // ── Ably sync ────────────────────────────────────────────────────────────────
  const { emitStrokeEvent, emitForceSyncViewport, emitPermissionsUpdate, emitDrawRequest } = useAblySync({
    channelName, engineRef, userId: utenteId, role: ruolo,
    lavagnaId, attivitaId, isAdmin,
    onPermissionsUpdate: handlePermissionsUpdate,
    onDrawRequest: handleDrawRequest,
  })

  // Keep ref in sync so toggleStudentDraw can use emitPermissionsUpdate
  useEffect(() => { emitPermissionsUpdateRef.current = emitPermissionsUpdate }, [emitPermissionsUpdate])

  // ── Toggle student draw (admin action) ──────────────────────────────────────
  const toggleStudentDraw = useCallback(async (enable: boolean) => {
    try {
      await fetch('/api/lavagna-v2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(lavagnaId), canStudentDraw: enable }),
      })
    } catch (_) {}
    emitPermissionsUpdateRef.current?.({ canStudentDraw: enable })
    setDrawRequestPending(false)
  }, [lavagnaId])

  // ── Pointer handlers ─────────────────────────────────────────────────────────
  const onStrokeCommit = useCallback(async (event: any) => {
    emitStrokeEvent(event)
    if (event.type === 'commit' && event.stroke) {
      // Add authorId before saving
      const stroke = { ...event.stroke, authorId: utenteId }
      await saveStroke(stroke)
    }
    if (event.type === 'delete-stroke' && event.stroke?.dbId) {
      await deleteStroke(event.stroke.dbId)
    }
    if (event.type === 'delete-shape' && event.shape?.dbId) {
      await deleteShape(event.shape.dbId)
    }
    if (event.type === 'commit-shape' && event.shape) {
      try {
        const res = await fetch('/api/lavagna-v2/shape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...event.shape, lavagnaId }),
        })
        if (res.ok) {
          const js = await res.json()
          if (js.shape?.dbId) store.updateShape(event.shape.id, { dbId: js.shape.dbId })
        }
      } catch (_) {}
    }
  }, [emitStrokeEvent, saveStroke, deleteStroke, utenteId])

  const { onPointerDown, onPointerMove, onPointerUp, onPointerCancel,
    onWheel, onTouchStart, onTouchMove, onTouchEnd } = usePointerHandlers({
    engineRef,
    onStrokeCommit,
    readOnly,
    userId: utenteId,
    isAdmin,
  })

  // ── Selection tool ───────────────────────────────────────────────────────────
  const { onPointerDown: selDown, onPointerMove: selMove, onPointerUp: selUp } = useSelectionTool(
    engineRef,
    () => { /* future: persist moved items positions */ }
  )

  // ── Text tool ────────────────────────────────────────────────────────────────
  const { session: textSession, value: textValue, setValue: setTextValue,
    startText, commit: commitText, cancel: cancelText } = useTextTool(engineRef, async (shape) => {
    try {
      const res = await fetch('/api/lavagna/shape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...shape, lavagnaId }),
      })
      if (res.ok) {
        const js = await res.json()
        if (js.shape?.id) store.updateShape(shape.id, { dbId: js.shape.id })
      }
    } catch (_) {}
  })

  // ── Export PNG ───────────────────────────────────────────────────────────────
  const exportPNG = useCallback(() => {
    const base = baseRef.current
    if (!base) return
    const a = document.createElement('a')
    a.href = base.toDataURL('image/png')
    a.download = `lavagna-${lavagnaId}.png`
    a.click()
  }, [lavagnaId])

  // ── Export PDF (open print dialog with canvas image) ─────────────────────────
  const exportPDF = useCallback(() => {
    const base = baseRef.current
    if (!base) return
    const dataUrl = base.toDataURL('image/png')
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>Lavagna ${lavagnaId}</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#fff;}img{width:100%;height:auto;display:block;}@page{size:auto;margin:10mm;}@media print{img{max-width:100%;page-break-inside:avoid;}}</style></head><body><img src="${dataUrl}" onload="setTimeout(function(){window.print();},300)"/></body></html>`)
    win.document.close()
  }, [lavagnaId])

  // ── Background change broadcast (admin only) ─────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return
    // background is now in store; Ably broadcast would go here if needed
  }, [store.background, isAdmin])

  // ── Render ───────────────────────────────────────────────────────────────────
  const canvasStyle: React.CSSProperties = {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    touchAction: 'none',
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: altezza, overflow: 'hidden', background: '#f9fafb', borderRadius: 12 }}
    >
      {/* Base layer — committed strokes/shapes */}
      <canvas ref={baseRef} style={{ ...canvasStyle, zIndex: 1 }} />

      {/* Live layer — current stroke + cursors */}
      <canvas
        ref={liveRef}
        style={{ ...canvasStyle, zIndex: 2 }}
        onPointerDown={(e) => {
          if (store.tool === 'text') {
            e.preventDefault()
            const rect = liveRef.current?.getBoundingClientRect()
            if (rect) startText(e.clientX - rect.left, e.clientY - rect.top)
            return
          }
          if (store.tool === 'select') { selDown(e); return }
          onPointerDown(e)
        }}
        onPointerMove={(e) => {
          if (store.tool === 'select') { selMove(e); return }
          onPointerMove(e)
        }}
        onPointerUp={(e) => {
          if (store.tool === 'select') { selUp(e); return }
          onPointerUp(e)
        }}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerCancel}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onContextMenu={e => e.preventDefault()}
      />

      {/* Text input overlay */}
      {textSession && (
        <TextOverlay
          screenX={textSession.screenX}
          screenY={textSession.screenY}
          value={textValue}
          onChange={setTextValue}
          onCommit={commitText}
          onCancel={cancelText}
          color={store.color}
          fontSize={Math.max(14, store.strokeWidth * 5)}
        />
      )}

      {/* Selection action bar */}
      {store.tool === 'select' && (store.selectedStrokeIds.length > 0 || store.selectedShapeIds.length > 0) && (
        <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 30, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', border: '1px solid #e5e7eb', borderRadius: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
          <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
            {store.selectedStrokeIds.length + store.selectedShapeIds.length} selezionati
          </span>
          <div style={{ width: 1, height: 20, background: '#e5e7eb' }} />
          <label title="Colore" style={{ width: 22, height: 22, borderRadius: '50%', background: store.color, cursor: 'pointer', border: '2px solid rgba(0,0,0,0.1)', display: 'block' }}>
            <input type="color" value={store.color} onChange={e => store.setColor(e.target.value)} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
          </label>
          <button
            onClick={() => {
              store.selectedStrokeIds.forEach(id => { const s = store.strokes.find(x => x.id === id); store.deleteStroke(id); if (s) store.pushUndo({ type: 'delete-stroke', stroke: s }) })
              store.selectedShapeIds.forEach(id => { const s = store.shapes.find(x => x.id === id); store.deleteShape(id); if (s) store.pushUndo({ type: 'delete-shape', shape: s }) })
              store.clearSelection()
            }}
            style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '4px 10px', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Elimina
          </button>
          <button
            onClick={() => store.clearSelection()}
            style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}
          >×</button>
        </div>
      )}

      {/* Saving indicator */}
      {store.saving && (
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 8, padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#60a5fa', animation: 'pulse 1s infinite' }} />
          Salvataggio...
        </div>
      )}

      {/* Admin: banner richiesta disegno studente */}
      {drawRequestPending && isAdmin && (
        <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 40, background: '#fffbeb', border: '1.5px solid #fbbf24', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', whiteSpace: 'nowrap' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>Uno studente chiede il permesso di disegnare</span>
          <button
            onClick={() => toggleStudentDraw(true)}
            style={{ padding: '4px 12px', borderRadius: 8, background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}
          >Abilita</button>
          <button
            onClick={() => setDrawRequestPending(false)}
            style={{ padding: '4px 10px', borderRadius: 8, background: '#f3f4f6', color: '#6b7280', border: 'none', cursor: 'pointer', fontSize: 12 }}
          >Ignora</button>
        </div>
      )}

      {/* Toolbar */}
      <Toolbar
        engineRef={engineRef}
        isAdmin={isAdmin}
        readOnly={readOnly}
        canStudentDraw={canDraw}
        onClear={clearBoard}
        onForceSyncViewport={isAdmin ? emitForceSyncViewport : undefined}
        onExportPNG={exportPNG}
        onExportPDF={exportPDF}
        onRequestDraw={emitDrawRequest}
        onToggleStudentDraw={isAdmin ? toggleStudentDraw : undefined}
      />

      {/* Off-screen cursor indicators */}
      <OffscreenCursors engineRef={engineRef} />

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        canvas { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  )
}

// ─── Text input overlay ───────────────────────────────────────────────────────

function TextOverlay({ screenX, screenY, value, onChange, onCommit, onCancel, color, fontSize }) {
  return (
    <textarea
      autoFocus
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onCommit() }
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={e => {
        // Small delay to allow Enter key to fire first
        setTimeout(() => onCommit(), 150)
      }}
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        zIndex: 50,
        minWidth: 120,
        minHeight: 36,
        background: 'rgba(255,255,255,0.92)',
        border: `2px solid ${color}`,
        borderRadius: 6,
        padding: '4px 8px',
        fontSize,
        fontFamily: 'Inter, sans-serif',
        color,
        outline: 'none',
        resize: 'both',
        lineHeight: 1.4,
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      }}
      placeholder="Scrivi testo…"
    />
  )
}

// ─── Off-screen cursor indicators ────────────────────────────────────────────

function OffscreenCursors({ engineRef }: { engineRef: React.RefObject<CanvasEngine> }) {
  const remoteCursors = useWhiteboardStore(s => s.remoteCursors)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)

  // Initialize and update canvas size via ResizeObserver on the live canvas
  useEffect(() => {
    const eng = engineRef.current
    if (!eng) return
    const canvas = eng['liveCanvas'] as HTMLCanvasElement | null
    if (!canvas) return
    const ro = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect()
      setSize({ w: r.width, h: r.height })
    })
    ro.observe(canvas)
    const r = canvas.getBoundingClientRect()
    setSize({ w: r.width, h: r.height })
    return () => ro.disconnect()
  }, [engineRef])

  if (!size) return null
  const { w, h } = size
  const MARGIN = 14

  return (
    <>
      {Object.entries(remoteCursors).map(([uid, cur]) => {
        const eng = engineRef.current
        if (!eng) return null
        const sc = eng.worldToScreen(cur.x, cur.y)
        const inView = sc.x >= -10 && sc.x <= w + 10 && sc.y >= -10 && sc.y <= h + 10
        const isAdminCursor = cur.role === 'admin' || cur.role === 'operatore'
        const bg = isAdminCursor ? '#ef4444' : '#16a34a'
        const label = isAdminCursor ? 'Prof' : 'Stud'

        if (inView) {
          // Cursore visibile in viewport: mostra un piccolo badge sul posto
          return (
            <div key={uid} style={{
              position: 'absolute',
              left: sc.x + 8, top: sc.y - 22,
              background: bg, color: '#fff',
              borderRadius: 8, padding: '2px 6px',
              fontSize: 10, fontWeight: 700,
              pointerEvents: 'none', zIndex: 20,
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              whiteSpace: 'nowrap', opacity: 0.92,
            }}>{label}</div>
          )
        }

        // Cursore fuori viewport: freccia direzionale sul bordo
        const dx = sc.x - w / 2
        const dy = sc.y - h / 2
        const angle = Math.atan2(dy, dx)
        // Clamp onto screen edge
        const absDx = Math.abs(dx), absDy = Math.abs(dy)
        let ex, ey
        if (absDx / (w / 2) > absDy / (h / 2)) {
          ex = dx > 0 ? w - MARGIN : MARGIN
          ey = h / 2 + dy * ((w / 2 - MARGIN) / absDx)
        } else {
          ey = dy > 0 ? h - MARGIN : MARGIN
          ex = w / 2 + dx * ((h / 2 - MARGIN) / absDy)
        }
        ex = Math.max(MARGIN, Math.min(w - MARGIN, ex))
        ey = Math.max(MARGIN, Math.min(h - MARGIN, ey))

        const arrowDeg = (angle * 180) / Math.PI
        return (
          <div key={uid} style={{
            position: 'absolute',
            left: ex, top: ey,
            transform: 'translate(-50%, -50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            pointerEvents: 'none', zIndex: 20,
          }}>
            {/* Arrow */}
            <div style={{
              width: 0, height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: `10px solid ${bg}`,
              transform: `rotate(${arrowDeg + 90}deg)`,
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
            }} />
            {/* Label badge */}
            <div style={{
              background: bg, color: '#fff',
              borderRadius: 8, padding: '1px 6px',
              fontSize: 10, fontWeight: 700,
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              whiteSpace: 'nowrap',
            }}>{label}</div>
          </div>
        )
      })}
    </>
  )
}
