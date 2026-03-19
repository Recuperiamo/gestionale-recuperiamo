// @ts-nocheck
"use client"
/**
 * Toolbar — Microsoft Whiteboard-inspired floating toolbar.
 *
 * Layout: centered horizontal pill at bottom of screen.
 * Groups: Inking tools | Shapes | Eraser/Select | Actions
 */
import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useWhiteboardStore, Tool, Background } from '../store/whiteboardStore'
import { CanvasEngine } from '../engine/CanvasEngine'

interface Props {
  engineRef: React.RefObject<CanvasEngine>
  isAdmin: boolean
  onClear?: () => void
  onForceSyncViewport?: () => void
  onExportPNG?: () => void
  lavagnaId?: string
  attivitaId?: string
}

// ─── Color palette (MS Whiteboard style) ─────────────────────────────────────
const COLORS = [
  '#1a1a1a', '#ffffff', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
]

const BG_OPTIONS: { value: Background; label: string }[] = [
  { value: 'white', label: 'Bianco' },
  { value: 'black', label: 'Nero' },
  { value: 'grid', label: 'Griglia' },
  { value: 'lines', label: 'Righe' },
  { value: 'dots', label: 'Puntini' },
]

const WIDTHS = [2, 4, 8, 14, 22]

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  toolbar: {
    position: 'fixed' as const,
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    background: 'rgba(255,255,255,0.97)',
    backdropFilter: 'blur(16px)',
    borderRadius: 16,
    padding: '6px 10px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.8) inset',
    border: '1px solid rgba(0,0,0,0.08)',
    zIndex: 1100,
    userSelect: 'none' as const,
    maxWidth: 'calc(100vw - 32px)',
    overflowX: 'auto' as const,
    overflowY: 'visible' as const,
  },
  divider: {
    width: 1,
    height: 28,
    background: 'rgba(0,0,0,0.10)',
    margin: '0 4px',
    flexShrink: 0,
  },
  btn: (active: boolean) => ({
    width: 40,
    height: 40,
    borderRadius: 10,
    border: 'none',
    background: active ? '#0078d4' : 'transparent',
    color: active ? '#fff' : '#374151',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background 0.12s, color 0.12s, transform 0.08s',
    outline: 'none',
    position: 'relative' as const,
  }),
  colorDot: (c: string, active: boolean) => ({
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: c,
    border: active ? '3px solid #0078d4' : (c === '#ffffff' ? '2px solid #e5e7eb' : '2px solid transparent'),
    cursor: 'pointer',
    flexShrink: 0,
    boxShadow: active ? '0 0 0 2px rgba(0,120,212,0.3)' : 'none',
    transition: 'transform 0.1s',
  }),
  popover: (rect: DOMRect, vertical = false) => ({
    position: 'fixed' as const,
    ...(vertical ? {
      top: rect.top + rect.height / 2,
      left: rect.right + 8,
      transform: 'translateY(-50%)',
    } : {
      bottom: window.innerHeight - rect.top + 8,
      left: rect.left + rect.width / 2,
      transform: 'translateX(-50%)',
    }),
    background: 'rgba(255,255,255,0.98)',
    backdropFilter: 'blur(16px)',
    borderRadius: 14,
    padding: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    border: '1px solid rgba(0,0,0,0.08)',
    zIndex: 1200,
    minWidth: 200,
  }),
  widthBtn: (active: boolean) => ({
    border: active ? '2px solid #0078d4' : '2px solid transparent',
    borderRadius: 8,
    padding: '4px 6px',
    background: active ? '#eff6ff' : 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icon = {
  Pen: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  Highlighter: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.5 2.1L21.9 8.5 10.5 19.9 4.1 13.5 15.5 2.1z"/><path d="M3 21l4.5-4.5"/>
    </svg>
  ),
  Eraser: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20H7L3 16l10-10 7 7-2.5 2.5"/><path d="M6.0 11.0l7 7"/>
    </svg>
  ),
  Hand: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8l-2-2a2 2 0 0 0-2.83 2.83l4 4A6 6 0 0 0 8 20h8a6 6 0 0 0 6-6v-3a2 2 0 0 0-4 0v1"/>
    </svg>
  ),
  Select: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3l14 9-7 1-4 7z"/>
    </svg>
  ),
  Text: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M12 7v12M9 19h6"/>
    </svg>
  ),
  Laser: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="14" r="2.5" fill="currentColor" opacity="0.85"/>
      <circle cx="8" cy="14" r="4.5" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.4"/>
      <line x1="10" y1="12" x2="20" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  Undo: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
    </svg>
  ),
  Redo: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
    </svg>
  ),
  ZoomIn: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  ),
  ZoomOut: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  ),
  FitView: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
    </svg>
  ),
  Sync: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/>
    </svg>
  ),
  Shapes: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="1"/><circle cx="17" cy="7" r="4"/><polygon points="3,21 9,13 15,21"/>
    </svg>
  ),
  More: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
    </svg>
  ),
  Export: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Toolbar({ engineRef, isAdmin, onClear, onForceSyncViewport, onExportPNG }: Props) {
  const { tool, color, strokeWidth, opacity, background, undoStack, redoStack,
    setTool, setColor, setStrokeWidth, setBackground, setEraserMode } = useWhiteboardStore()

  const [openPopover, setOpenPopover] = useState<string | null>(null)
  const [popoverRect, setPopoverRect] = useState<DOMRect | null>(null)
  const [zoomPct, setZoomPct] = useState(100)
  const [toolbarVertical, setToolbarVertical] = useState(false)

  const penBtnRef = useRef<HTMLButtonElement>(null)
  const hlBtnRef = useRef<HTMLButtonElement>(null)
  const eraserBtnRef = useRef<HTMLButtonElement>(null)
  const shapesBtnRef = useRef<HTMLButtonElement>(null)
  const colorBtnRef = useRef<HTMLButtonElement>(null)
  const moreBtnRef = useRef<HTMLButtonElement>(null)

  const togglePop = (name: string, btnRef: React.RefObject<HTMLButtonElement>) => {
    if (openPopover === name) {
      setOpenPopover(null)
      setPopoverRect(null)
    } else {
      const rect = btnRef.current?.getBoundingClientRect() ?? null
      setOpenPopover(name)
      setPopoverRect(rect)
    }
  }
  const closePop = () => { setOpenPopover(null); setPopoverRect(null) }

  // Sync zoom display from engine
  const syncZoom = useCallback(() => {
    const eng = engineRef.current
    if (eng) setZoomPct(Math.round(eng.zoom * 100))
  }, [engineRef])

  // Zoom actions
  const zoomIn = () => { engineRef.current?.zoomAt(1.25, (engineRef.current['baseCanvas']?.width / engineRef.current['dpr'] || 400) / 2, (engineRef.current['baseCanvas']?.height / engineRef.current['dpr'] || 300) / 2); syncZoom() }
  const zoomOut = () => { engineRef.current?.zoomAt(0.8, (engineRef.current['baseCanvas']?.width / engineRef.current['dpr'] || 400) / 2, (engineRef.current['baseCanvas']?.height / engineRef.current['dpr'] || 300) / 2); syncZoom() }
  const fitView = () => { engineRef.current?.fitToContent(); syncZoom() }
  const resetZoom = () => { engineRef.current?.resetView(); syncZoom() }

  const handleUndo = () => {
    const store = useWhiteboardStore.getState()
    const entry = store.undo()
    if (!entry) return
    if (entry.type === 'add-stroke' && entry.stroke) store.deleteStroke(entry.stroke.id)
    if (entry.type === 'delete-stroke' && entry.stroke) store.addStroke(entry.stroke)
  }
  const handleRedo = () => {
    const store = useWhiteboardStore.getState()
    const entry = store.redo()
    if (!entry) return
    if (entry.type === 'add-stroke' && entry.stroke) store.addStroke(entry.stroke)
    if (entry.type === 'delete-stroke' && entry.stroke) store.deleteStroke(entry.stroke.id)
  }

  const isInkTool = tool === 'pen' || tool === 'highlighter'
  const isDrawTool = isInkTool || tool === 'eraser'

  return (
    <>
      {/* Click outside to close popovers */}
      {openPopover && <div style={{ position: 'fixed', inset: 0, zIndex: 1099 }} onClick={closePop} />}

      {/* ── Popovers — OUTSIDE the transform container so position:fixed works relative to viewport ── */}
      {openPopover === 'pen' && popoverRect && <InkPopover type="pen" rect={popoverRect} vertical={toolbarVertical} onClose={closePop} />}
      {openPopover === 'hl' && popoverRect && <InkPopover type="highlighter" rect={popoverRect} vertical={toolbarVertical} onClose={closePop} />}
      {openPopover === 'eraser' && popoverRect && <EraserPopover rect={popoverRect} vertical={toolbarVertical} onClose={closePop} />}
      {openPopover === 'shapes' && popoverRect && <ShapesPopover rect={popoverRect} vertical={toolbarVertical} onClose={closePop} />}
      {openPopover === 'color' && popoverRect && <ColorPopover rect={popoverRect} vertical={toolbarVertical} onClose={closePop} />}
      {openPopover === 'more' && popoverRect && (
        <MorePopover
          rect={popoverRect}
          vertical={toolbarVertical}
          isAdmin={isAdmin}
          onClear={onClear}
          onForceSyncViewport={onForceSyncViewport}
          onExportPNG={onExportPNG}
          onClose={closePop}
          toolbarVertical={toolbarVertical}
          onToggleVertical={() => setToolbarVertical(v => !v)}
        />
      )}

      <div style={{
        ...S.toolbar,
        ...(toolbarVertical ? {
          flexDirection: 'column' as const,
          bottom: '50%',
          transform: 'translateY(50%)',
          left: 20,
          maxWidth: 56,
          maxHeight: 'calc(100vh - 100px)',
          overflowX: 'visible' as const,
          overflowY: 'auto' as const,
        } : {})
      }} onPointerDown={e => e.stopPropagation()}>

        {/* ── Undo / Redo ── */}
        <button style={S.btn(false)} onClick={handleUndo} disabled={!undoStack.length} title="Annulla (Ctrl+Z)">
          <Icon.Undo />
        </button>
        <button style={S.btn(false)} onClick={handleRedo} disabled={!redoStack.length} title="Ripeti (Ctrl+Y)">
          <Icon.Redo />
        </button>

        <div style={{ ...S.divider, ...(toolbarVertical ? { width: 28, height: 1, margin: '4px 0' } : {}) }} />

        {/* ── Pen ── */}
        <button
          ref={penBtnRef}
          style={{ ...S.btn(tool === 'pen'), ...(tool === 'pen' ? { background: color, color: '#fff' } : {}) }}
          onClick={() => setTool('pen')}
          onDoubleClick={() => togglePop('pen', penBtnRef)}
          title="Penna (P)"
        >
          <Icon.Pen />
        </button>

        {/* ── Highlighter ── */}
        <button
          ref={hlBtnRef}
          style={{ ...S.btn(tool === 'highlighter'), ...(tool === 'highlighter' ? { background: color + '99', color: '#1a1a1a' } : {}) }}
          onClick={() => setTool('highlighter')}
          onDoubleClick={() => togglePop('hl', hlBtnRef)}
          title="Evidenziatore (H)"
        >
          <Icon.Highlighter />
        </button>

        {/* ── Eraser ── */}
        <button ref={eraserBtnRef} style={S.btn(tool === 'eraser')} onClick={() => setTool('eraser')} onDoubleClick={() => togglePop('eraser', eraserBtnRef)} title="Gomma (E)">
          <Icon.Eraser />
        </button>

        <div style={{ ...S.divider, ...(toolbarVertical ? { width: 28, height: 1, margin: '4px 0' } : {}) }} />

        {/* ── Shapes ── */}
        <button ref={shapesBtnRef} style={S.btn(['rect','ellipse','line','arrow','diamond','triangle'].includes(tool))} onClick={() => togglePop('shapes', shapesBtnRef)} title="Forme">
          <Icon.Shapes />
        </button>

        <div style={{ ...S.divider, ...(toolbarVertical ? { width: 28, height: 1, margin: '4px 0' } : {}) }} />

        {/* ── Hand / Select / Text ── */}
        <button style={S.btn(tool === 'hand')} onClick={() => { setTool('hand'); closePop() }} title="Sposta (Spazio)">
          <Icon.Hand />
        </button>
        <button style={S.btn(tool === 'select')} onClick={() => { setTool('select'); closePop() }} title="Selezione (S)">
          <Icon.Select />
        </button>
        <button style={S.btn(tool === 'text')} onClick={() => { setTool('text'); closePop() }} title="Testo (T)">
          <Icon.Text />
        </button>
        <button style={S.btn(tool === 'laser')} onClick={() => { setTool('laser'); closePop() }} title="Laser">
          <Icon.Laser />
        </button>

        <div style={{ ...S.divider, ...(toolbarVertical ? { width: 28, height: 1, margin: '4px 0' } : {}) }} />

        {/* ── Color swatch (quick picker) ── */}
        {isInkTool && (
          <button ref={colorBtnRef} style={{ ...S.btn(false), gap: 0 }} onClick={() => togglePop('color', colorBtnRef)} title="Colore">
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: color, border: color === '#ffffff' ? '1.5px solid #e5e7eb' : 'none', display: 'block' }} />
          </button>
        )}

        <div style={{ ...S.divider, ...(toolbarVertical ? { width: 28, height: 1, margin: '4px 0' } : {}) }} />

        {/* ── Zoom ── */}
        <button style={S.btn(false)} onClick={zoomOut} title="Zoom -"><Icon.ZoomOut /></button>
        <button style={{ ...S.btn(false), width: 48, fontSize: 11, fontWeight: 600, color: '#374151' }} onClick={resetZoom} title="Reset zoom">
          {zoomPct}%
        </button>
        <button style={S.btn(false)} onClick={zoomIn} title="Zoom +"><Icon.ZoomIn /></button>
        <button style={S.btn(false)} onClick={fitView} title="Adatta contenuto"><Icon.FitView /></button>

        <div style={{ ...S.divider, ...(toolbarVertical ? { width: 28, height: 1, margin: '4px 0' } : {}) }} />

        {/* ── More menu ── */}
        <button ref={moreBtnRef} style={S.btn(openPopover === 'more')} onClick={() => togglePop('more', moreBtnRef)} title="Altro">
          <Icon.More />
        </button>

      </div>
    </>
  )
}

// ─── Sub-popovers ─────────────────────────────────────────────────────────────

function InkPopover({ type, rect, vertical, onClose }) {
  const { color, setColor, strokeWidth, setStrokeWidth } = useWhiteboardStore()
  return (
    <div style={S.popover(rect, vertical)}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
        {type === 'pen' ? 'PENNA' : 'EVIDENZIATORE'}
      </div>
      {/* Colors */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {COLORS.map(c => (
          <button key={c} style={S.colorDot(c, c === color)} onClick={() => setColor(c)}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          />
        ))}
        {/* Custom color */}
        <label title="Colore personalizzato" style={{ width: 22, height: 22, borderRadius: '50%', background: 'conic-gradient(red,yellow,green,cyan,blue,magenta,red)', cursor: 'pointer', display: 'block', border: '2px solid rgba(0,0,0,0.1)' }}>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
        </label>
      </div>
      {/* Widths */}
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>SPESSORE</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {WIDTHS.map(w => (
          <button key={w} style={S.widthBtn(w === strokeWidth)} onClick={() => setStrokeWidth(w)}>
            <div style={{ width: 28, height: w > 10 ? w : w, maxHeight: 22, borderRadius: 4, background: color, minHeight: 2 }} />
          </button>
        ))}
      </div>
    </div>
  )
}

function EraserPopover({ rect, vertical, onClose }) {
  const { strokeWidth, setStrokeWidth, eraserMode, setEraserMode } = useWhiteboardStore()
  const ERASER_SIZES = [4, 8, 16, 32]
  const modeBtn = (label: string, value: 'stroke' | 'point') => ({
    padding: '5px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
    fontWeight: eraserMode === value ? 600 : 400,
    border: eraserMode === value ? '1.5px solid #0078d4' : '1.5px solid #e5e7eb',
    background: eraserMode === value ? '#eff6ff' : '#f9fafb',
    color: eraserMode === value ? '#0078d4' : '#374151',
  })
  return (
    <div style={S.popover(rect, vertical)}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>MODALITÀ</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button style={modeBtn('Cancella tratto', 'stroke')} onClick={() => setEraserMode('stroke')}>Cancella tratto</button>
        <button style={modeBtn('Puntuale', 'point')} onClick={() => setEraserMode('point')}>Puntuale</button>
      </div>
      {eraserMode === 'point' && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>DIMENSIONE</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {ERASER_SIZES.map(w => (
              <button key={w} style={S.widthBtn(w === strokeWidth)} onClick={() => setStrokeWidth(w)}>
                <div style={{ width: w > 24 ? 24 : w, height: w > 24 ? 24 : w, borderRadius: '50%', background: '#d1d5db', border: '1.5px solid #9ca3af' }} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ColorPopover({ rect, vertical, onClose }) {
  const { color, setColor } = useWhiteboardStore()
  return (
    <div style={S.popover(rect, vertical)}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {COLORS.map(c => (
          <button key={c} style={S.colorDot(c, c === color)} onClick={() => { setColor(c); onClose() }} />
        ))}
        <label title="Personalizza" style={{ width: 22, height: 22, borderRadius: '50%', background: 'conic-gradient(red,yellow,green,cyan,blue,magenta,red)', cursor: 'pointer', border: '2px solid rgba(0,0,0,0.1)', display: 'block' }}>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
        </label>
      </div>
    </div>
  )
}

function ShapesPopover({ rect, vertical, onClose }) {
  const { tool, setTool } = useWhiteboardStore()

  const shapes = [
    { id: 'rect', label: 'Rettangolo', icon: <rect x="3" y="5" width="18" height="14" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/> },
    { id: 'ellipse', label: 'Ellisse', icon: <ellipse cx="12" cy="12" rx="9" ry="7" stroke="currentColor" strokeWidth="2" fill="none"/> },
    { id: 'line', label: 'Linea', icon: <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/> },
    { id: 'arrow', label: 'Freccia', icon: <><line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><polyline points="12,4 20,4 20,12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></> },
    { id: 'diamond', label: 'Rombo', icon: <polygon points="12,3 21,12 12,21 3,12" stroke="currentColor" strokeWidth="2" fill="none"/> },
    { id: 'triangle', label: 'Triangolo', icon: <polygon points="12,4 22,20 2,20" stroke="currentColor" strokeWidth="2" fill="none"/> },
  ]

  return (
    <div style={{ ...S.popover(rect, vertical), display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, minWidth: 160 }}>
      {shapes.map(s => (
        <button
          key={s.id}
          title={s.label}
          style={{ ...S.btn(tool === s.id), flexDirection: 'column', gap: 2, height: 48, fontSize: 9, fontWeight: 600 }}
          onClick={() => { setTool(s.id as Tool); onClose() }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">{s.icon}</svg>
          <span>{s.label}</span>
        </button>
      ))}
    </div>
  )
}

function MorePopover({ rect, vertical, isAdmin, onClear, onForceSyncViewport, onExportPNG, onClose, toolbarVertical, onToggleVertical }) {
  const { background, setBackground } = useWhiteboardStore()

  return (
    <div style={{ ...S.popover(rect, vertical), minWidth: 220 }}>
      {/* Background */}
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>SFONDO</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
        {BG_OPTIONS.map(bg => (
          <button
            key={bg.value}
            style={{ padding: '4px 8px', borderRadius: 8, fontSize: 12, fontWeight: bg.value === background ? 600 : 400, border: bg.value === background ? '1.5px solid #0078d4' : '1.5px solid #e5e7eb', background: bg.value === background ? '#eff6ff' : '#f9fafb', cursor: 'pointer', color: bg.value === background ? '#0078d4' : '#374151' }}
            onClick={() => { setBackground(bg.value); onClose() }}
          >
            {bg.label}
          </button>
        ))}
      </div>

      {/* Toggle vertical toolbar */}
      <button
        style={{ width: '100%', padding: '8px 12px', borderRadius: 10, background: toolbarVertical ? '#eff6ff' : '#f3f4f6', border: toolbarVertical ? '1px solid #bfdbfe' : 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: toolbarVertical ? 600 : 500, marginBottom: 6, display: 'flex', gap: 8, alignItems: 'center', color: toolbarVertical ? '#1d4ed8' : '#374151' }}
        onClick={() => { onToggleVertical(); onClose() }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="4" height="18" rx="1"/><line x1="10" y1="7" x2="21" y2="7"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="17" x2="21" y2="17"/></svg>
        {toolbarVertical ? 'Barra orizzontale' : 'Barra verticale'}
      </button>

      {/* Export */}
      <button
        style={{ width: '100%', padding: '8px 12px', borderRadius: 10, background: '#f3f4f6', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'flex', gap: 8, alignItems: 'center', color: '#374151' }}
        onClick={() => { onExportPNG?.(); onClose() }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Esporta PNG
      </button>

      {isAdmin && (
        <>
          <button
            style={{ width: '100%', padding: '8px 12px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'flex', gap: 8, alignItems: 'center', color: '#1d4ed8' }}
            onClick={() => { onForceSyncViewport?.(); onClose() }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
            Sincronizza View
          </button>
          <button
            style={{ width: '100%', padding: '8px 12px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center', color: '#dc2626' }}
            onClick={() => { if (confirm('Pulire tutta la lavagna?')) { onClear?.(); onClose() } }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Pulisci lavagna
          </button>
        </>
      )}
    </div>
  )
}
