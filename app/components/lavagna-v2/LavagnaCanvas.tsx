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
}

export default function LavagnaCanvas({
  lavagnaId, attivitaId, trattiIniziali, formeIniziali,
  utenteId, ruolo, altezza = 600,
}: Props) {
  const isAdmin = ruolo === 'admin' || ruolo === 'operatore'

  // ── Canvas refs ──────────────────────────────────────────────────────────────
  const baseRef = useRef<HTMLCanvasElement>(null)
  const liveRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<CanvasEngine | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Store ────────────────────────────────────────────────────────────────────
  const store = useWhiteboardStore()

  // ── Channel name (same as v1) ────────────────────────────────────────────────
  const channelName = useMemo(() => {
    const base = attivitaId ?? lavagnaId
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
  const { saveStroke, deleteStroke, clearBoard } = usePersistence({ lavagnaId, userId: utenteId })

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

  // ── Ably sync ────────────────────────────────────────────────────────────────
  const { emitStrokeEvent, emitForceSyncViewport } = useAblySync({
    channelName, engineRef, userId: utenteId, role: ruolo,
    lavagnaId, attivitaId, isAdmin,
  })

  // ── Pointer handlers ─────────────────────────────────────────────────────────
  const onStrokeCommit = useCallback(async (event: any) => {
    emitStrokeEvent(event)
    if (event.type === 'commit' && event.stroke) {
      // Add authorId before saving
      const stroke = { ...event.stroke, authorId: utenteId }
      await saveStroke(stroke)
    }
  }, [emitStrokeEvent, saveStroke, utenteId])

  const { onPointerDown, onPointerMove, onPointerUp, onPointerCancel,
    onWheel, onTouchStart, onTouchMove, onTouchEnd } = usePointerHandlers({
    engineRef,
    onStrokeCommit,
    readOnly: false,
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

      {/* Toolbar */}
      <Toolbar
        engineRef={engineRef}
        isAdmin={isAdmin}
        onClear={clearBoard}
        onForceSyncViewport={isAdmin ? emitForceSyncViewport : undefined}
        onExportPNG={exportPNG}
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
  const [bounds, setBounds] = useState<DOMRect | null>(null)

  useEffect(() => {
    const eng = engineRef.current
    if (!eng) return
    const fn = () => setBounds(eng['liveCanvas']?.getBoundingClientRect?.() ?? null)
    eng.on(fn)
    return () => eng.off(fn)
  }, [engineRef])

  if (!bounds) return null

  return (
    <>
      {Object.entries(remoteCursors).map(([uid, cur]) => {
        const eng = engineRef.current
        if (!eng) return null
        const screen = eng.worldToScreen(cur.x, cur.y)
        const inView = screen.x >= 0 && screen.x <= bounds.width && screen.y >= 0 && screen.y <= bounds.height
        if (inView) return null
        const cx = Math.max(20, Math.min(bounds.width - 20, screen.x))
        const cy = Math.max(20, Math.min(bounds.height - 20, screen.y))
        const isAdminCursor = cur.role === 'admin' || cur.role === 'operatore'
        const bg = isAdminCursor ? '#ef4444' : '#16a34a'
        return (
          <div key={uid} style={{
            position: 'absolute',
            left: cx, top: cy,
            transform: 'translate(-50%, -50%)',
            background: bg,
            color: '#fff',
            borderRadius: 20,
            padding: '2px 8px',
            fontSize: 10,
            fontWeight: 700,
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            zIndex: 20,
            whiteSpace: 'nowrap',
          }}>
            {isAdminCursor ? '👩‍🏫 Prof' : '📍 Stud'}
          </div>
        )
      })}
    </>
  )
}
