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
import { generateId, prepareStroke } from './engine/strokeUtils'

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
  // Selettori granulari: il componente re-renderizza solo se cambia il valore specifico,
  // non su ogni aggiornamento dello store (es. cursor moves da altri utenti)
  const store = useWhiteboardStore()
  const strokes    = useWhiteboardStore(s => s.strokes)
  const shapes     = useWhiteboardStore(s => s.shapes)
  const background = useWhiteboardStore(s => s.background)
  const selectedStrokeIds = useWhiteboardStore(s => s.selectedStrokeIds)
  const selectedShapeIds  = useWhiteboardStore(s => s.selectedShapeIds)

  // ── Channel name — sempre basato sull'ID DB della lavagna (non attivitaId)
  // Così admin (apre via ?attivitaId) e studente (apre via ?lavagnaId) usano lo stesso canale
  const channelName = useMemo(() => {
    return lavagnaId ? `lavagna:${lavagnaId}` : null
  }, [lavagnaId])

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
    eng.setData(strokes, shapes, background)
  }, [strokes, shapes, background])

  // ── Keep engine selection in sync ────────────────────────────────────────────
  useEffect(() => {
    engineRef.current?.setSelection(selectedStrokeIds, selectedShapeIds)
  }, [selectedStrokeIds, selectedShapeIds])

  // ── Keep engine remote cursors in sync ───────────────────────────────────────
  const remoteCursorsList = useMemo(
    () => Object.values(store.remoteCursors).map(c => ({ userId: String(c.userId), role: c.role, x: c.x, y: c.y })),
    [store.remoteCursors]
  )
  useEffect(() => {
    engineRef.current?.setRemoteCursors(remoteCursorsList)
  }, [remoteCursorsList])

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
  const { saveStroke, deleteStroke, saveShape, deleteShape, clearBoard } = usePersistence({ lavagnaId, userId: utenteId })

  // ── Undo / Redo (usato sia da keyboard che dai pulsanti toolbar) ─────────────
  const handleUndo = useCallback(() => {
    const entry = store.undo()
    if (!entry) return
    if (entry.type === 'add-stroke' && entry.stroke) {
      store.deleteStroke(entry.stroke.id)
      if (entry.stroke.dbId) deleteStroke(entry.stroke.dbId)
    }
    if (entry.type === 'delete-stroke' && entry.stroke) {
      store.addStroke(entry.stroke)
      saveStroke(entry.stroke)
    }
    if (entry.type === 'add-shape' && entry.shape) {
      store.deleteShape(entry.shape.id)
      if (entry.shape.dbId) deleteShape(entry.shape.dbId)
    }
    if (entry.type === 'delete-shape' && entry.shape) {
      store.addShape(entry.shape)
      saveShape(entry.shape)
    }
  }, [store, saveStroke, deleteStroke, saveShape, deleteShape])

  const handleRedo = useCallback(() => {
    const entry = store.redo()
    if (!entry) return
    if (entry.type === 'add-stroke' && entry.stroke) {
      store.addStroke(entry.stroke)
      saveStroke(entry.stroke)
    }
    if (entry.type === 'delete-stroke' && entry.stroke) {
      store.deleteStroke(entry.stroke.id)
      if (entry.stroke.dbId) deleteStroke(entry.stroke.dbId)
    }
    if (entry.type === 'add-shape' && entry.shape) {
      store.addShape(entry.shape)
      saveShape(entry.shape)
    }
    if (entry.type === 'delete-shape' && entry.shape) {
      store.deleteShape(entry.shape.id)
      if (entry.shape.dbId) deleteShape(entry.shape.dbId)
    }
  }, [store, saveStroke, deleteStroke, saveShape, deleteShape])

  // ── Keyboard shortcuts Ctrl+Z / Ctrl+Y ──────────────────────────────────────
  // (Delete/Backspace è in un useEffect separato, dopo emitStrokeEvent, per evitare TDZ)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        handleRedo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleUndo, handleRedo])

  // Callbacks per useAblySync — devono stare al top-level del componente (regole hooks)
  const emitPermissionsUpdateRef = useRef<((d: { canStudentDraw: boolean }) => void) | null>(null)

  const handlePermissionsUpdate = useCallback(({ canStudentDraw }: { canStudentDraw: boolean }) => {
    setCanDraw(canStudentDraw)
  }, [])

  const handleDrawRequest = useCallback(() => {
    setDrawRequestPending(true)
  }, [])

  // ── Ably sync ────────────────────────────────────────────────────────────────
  const { emitStrokeEvent, emitForceSyncViewport, emitPermissionsUpdate, emitDrawRequest, emitShapeUpdate } = useAblySync({
    channelName, engineRef, userId: utenteId, role: ruolo,
    lavagnaId, attivitaId, isAdmin,
    onPermissionsUpdate: handlePermissionsUpdate,
    onDrawRequest: handleDrawRequest,
  })

  // Keep ref in sync so toggleStudentDraw can use emitPermissionsUpdate
  useEffect(() => { emitPermissionsUpdateRef.current = emitPermissionsUpdate }, [emitPermissionsUpdate])

  // ── Keyboard Delete/Backspace — elimina elementi selezionati (DB + Ably) ────────
  // Separato dal Ctrl+Z/Y per evitare TDZ: emitStrokeEvent è dichiarato sopra
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const { tool, selectedStrokeIds, selectedShapeIds, strokes, shapes } = useWhiteboardStore.getState()
      if (tool !== 'select') return
      if (!selectedStrokeIds.length && !selectedShapeIds.length) return
      e.preventDefault()
      selectedStrokeIds.forEach(id => {
        const s = strokes.find(x => x.id === id)
        if (!s) return
        store.deleteStroke(id)
        store.pushUndo({ type: 'delete-stroke', stroke: s })
        if (s.dbId) deleteStroke(s.dbId)
        emitStrokeEvent({ type: 'delete-stroke', stroke: s })
      })
      selectedShapeIds.forEach(id => {
        const s = shapes.find(x => x.id === id)
        if (!s) return
        store.deleteShape(id)
        store.pushUndo({ type: 'delete-shape', shape: s })
        if (s.dbId) deleteShape(s.dbId)
        emitStrokeEvent({ type: 'delete-shape', shape: s })
      })
      store.clearSelection()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [deleteStroke, deleteShape, emitStrokeEvent, store])

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
          if (js.shape?.dbId) {
            store.updateShape(event.shape.id, { dbId: js.shape.dbId })
            // Propaga il dbId agli studenti: senza questo il polling crea un duplicato
            emitShapeUpdate({ ...event.shape, dbId: js.shape.dbId })
          }
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

  // ── Salva posizione/dimensione/rotazione forma su DB + Ably ─────────────────
  const onSaveShape = useCallback(async (shapeId: string) => {
    const s = useWhiteboardStore.getState().shapes.find(x => x.id === shapeId)
    if (!s?.dbId) return
    fetch(`/api/lavagna-v2/shape?id=${s.dbId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x: s.x, y: s.y, x2: s.x2, y2: s.y2, w: s.width, h: s.height, rotation: s.rotation }),
    }).catch(() => {})
    emitShapeUpdate(s)
  }, [emitShapeUpdate])

  // ── Keyboard shortcut R / Shift+R → ruota immagine selezionata di ±90° ───────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'r') return
      const isMac = navigator.platform.toLowerCase().includes('mac')
      const mod = isMac ? e.metaKey : e.ctrlKey
      if (mod) return // ignora Ctrl/Cmd+R (refresh)
      const { selectedShapeIds, shapes } = store
      if (selectedShapeIds.length !== 1) return
      const img = shapes.find(s => s.id === selectedShapeIds[0] && s.type === 'image')
      if (!img) return
      e.preventDefault()
      // R = antiorario (−90°), Shift+R = orario (+90°); snap al multiplo di 90° più vicino
      const delta = e.shiftKey ? Math.PI / 2 : -Math.PI / 2
      const SNAP = Math.PI / 2
      const raw = (img.rotation ?? 0) + delta
      const snapped = Math.round(raw / SNAP) * SNAP
      store.updateShape(img.id, { rotation: snapped })
      onSaveShape(img.id)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [store, onSaveShape])

  // ── Selection tool ───────────────────────────────────────────────────────────
  const { onPointerDown: selDown, onPointerMove: selMove, onPointerUp: selUp } = useSelectionTool(
    engineRef,
    async () => {
      // Persist moved shapes to DB + Ably
      const { selectedShapeIds } = useWhiteboardStore.getState()
      for (const id of selectedShapeIds) onSaveShape(id)
    }
  )

  // ── Text tool ────────────────────────────────────────────────────────────────
  const { session: textSession, value: textValue, setValue: setTextValue,
    startText, commit: commitText, cancel: cancelText } = useTextTool(engineRef, async (shape) => {
    // Sync via Ably
    emitStrokeEvent({ type: 'commit-shape', shape })
    // Persist su lavagna-v2
    try {
      const res = await fetch('/api/lavagna-v2/shape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...shape, lavagnaId }),
      })
      if (res.ok) {
        const js = await res.json()
        if (js.shape?.dbId) store.updateShape(shape.id, { dbId: js.shape.dbId })
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

  // ── Image paste ──────────────────────────────────────────────────────────────
  // Nessun servizio esterno: l'immagine viene compressa in base64 e salvata nel DB
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (!item.type.startsWith('image/')) continue
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) continue

        // Comprimi a max 600px, JPEG 65% → base64 tipicamente 15-45KB (sotto limite Ably 64KB)
        const imageUrl = await imageFileToDataUrl(file, 600, 600, 0.65)
        if (!imageUrl) return

        const dims = await getImageDimensions(imageUrl)
        const eng = engineRef.current
        if (!eng) return
        const cssW = eng['baseCanvas'].width / eng['dpr']
        const cssH = eng['baseCanvas'].height / eng['dpr']
        // Centra nell'area visibile (sottrae ~60px per toolbar a fixed bottom)
        const center = eng.screenToWorld(cssW / 2, (cssH - 60) / 2)
        const maxW = (cssW / eng.zoom) * 0.6
        const scale = Math.min(1, maxW / (dims.w || 400))
        const w = (dims.w || 400) * scale
        const h = (dims.h || 300) * scale

        const shape = {
          id: generateId(),
          type: 'image' as const,
          x: center.x - w / 2,
          y: center.y - h / 2,
          width: w,
          height: h,
          imageUrl,
          color: 'transparent',
          strokeWidth: 0,
          fillColor: 'transparent',
          rotation: 0,
          authorId: utenteId,
        }

        store.addShape(shape)
        store.pushUndo({ type: 'add-shape', shape })
        // Sync via Ably (l'immagine è già piccola, stare dentro i 64KB Ably)
        emitStrokeEvent({ type: 'commit-shape', shape })

        // Persist to DB (src = base64 data URL)
        try {
          const res = await fetch('/api/lavagna-v2/shape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...shape, lavagnaId }),
          })
          if (res.ok) {
            const js = await res.json()
            if (js.shape?.dbId) { store.updateShape(shape.id, { dbId: js.shape.dbId }); emitShapeUpdate({ ...shape, dbId: js.shape.dbId }) }
          }
        } catch (_) {}

        break
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [engineRef, store, utenteId, lavagnaId, emitStrokeEvent])

  // ── Paste immagine via bottone toolbar (iOS: Clipboard API) ──────────────────
  // Su iOS non esiste Ctrl+V; navigator.clipboard.read() richiede gesto utente
  // (tap sul bottone) ed è supportato da iOS 15.4+
  const handlePasteFromButton = useCallback(async () => {
    try {
      if (!navigator.clipboard?.read) {
        alert('Incolla non supportato su questo browser. Aggiorna iOS alla versione 15.4 o superiore.')
        return
      }
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const imageType = item.types.find(t => t.startsWith('image/'))
        if (!imageType) continue
        const blob = await item.getType(imageType)
        const file = new File([blob], 'paste.png', { type: imageType })
        const imageUrl = await imageFileToDataUrl(file, 600, 600, 0.65)
        if (!imageUrl) return
        const dims = await getImageDimensions(imageUrl)
        const eng = engineRef.current
        if (!eng) return
        const cssW = eng['baseCanvas'].width / eng['dpr']
        const cssH = eng['baseCanvas'].height / eng['dpr']
        const center = eng.screenToWorld(cssW / 2, (cssH - 60) / 2)
        const maxW = (cssW / eng.zoom) * 0.6
        const scale = Math.min(1, maxW / (dims.w || 400))
        const w = (dims.w || 400) * scale
        const h = (dims.h || 300) * scale
        const shape = {
          id: generateId(), type: 'image' as const,
          x: center.x - w / 2, y: center.y - h / 2,
          width: w, height: h, imageUrl,
          color: 'transparent', strokeWidth: 0, fillColor: 'transparent',
          rotation: 0, authorId: utenteId,
        }
        store.addShape(shape)
        store.pushUndo({ type: 'add-shape', shape })
        emitStrokeEvent({ type: 'commit-shape', shape })
        try {
          const res = await fetch('/api/lavagna-v2/shape', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...shape, lavagnaId }),
          })
          if (res.ok) {
            const js = await res.json()
            if (js.shape?.dbId) { store.updateShape(shape.id, { dbId: js.shape.dbId }); emitShapeUpdate({ ...shape, dbId: js.shape.dbId }) }
          }
        } catch (_) {}
        break
      }
    } catch (err) {
      alert('Impossibile leggere gli appunti. Assicurati di aver copiato un\'immagine.')
    }
  }, [engineRef, store, utenteId, lavagnaId, emitStrokeEvent])

  // ── Catch-up poll: recupera tratti persi da Ably ogni 4 secondi ──────────────
  // Se Ably droppa un messaggio stroke:done, il tratto appare nel DB ma non nello store.
  // Questo poll confronta il DB (solo nuovi tratti dall'ultima sync) con lo store
  // e aggiunge quelli mancanti — senza toccare quelli già presenti.
  useEffect(() => {
    const syncedDbIds = new Set<number>()
    // Inizializza con i tratti già caricati dall'initial load (hanno dbId)
    for (const s of useWhiteboardStore.getState().strokes) {
      if (s.dbId) syncedDbIds.add(Number(s.dbId))
    }

    // Timestamp dell'ultima sync: inizia a ora - 2s per coprire possibili race conditions
    let lastSync = new Date(Date.now() - 2000)

    const poll = async () => {
      const since = lastSync.toISOString()
      lastSync = new Date() // aggiorna subito prima della fetch

      const params = attivitaId
        ? `attivitaId=${attivitaId}&since=${since}`
        : `lavagnaId=${lavagnaId}&since=${since}`

      try {
        const res = await fetch(`/api/lavagna-v2?${params}`)
        if (!res.ok) return
        const js = await res.json()
        const tratti: any[] = js.lavagna?.tratti || []
        const forme: any[] = js.lavagna?.forme || []
        if (!tratti.length && !forme.length) return

        const st = useWhiteboardStore.getState()
        const knownStreamIds = new Set(st.strokes.map(s => s.id))
        const knownShapeDbIds = new Set(st.shapes.map(s => s.dbId).filter(Boolean).map(Number))

        // Tratti mancanti
        for (const t of tratti) {
          if (syncedDbIds.has(t.id)) continue
          if (t.streamId && knownStreamIds.has(t.streamId)) { syncedDbIds.add(t.id); continue }
          const punti = Array.isArray(t.punti) ? t.punti : []
          if (punti.length === 0) continue
          const stroke = prepareStroke({
            id: t.streamId || `db-${t.id}`,
            tool: t.strumento || 'pen',
            color: t.colore || '#1a1a1a',
            width: t.spessore || 3,
            opacity: 1,
            points: punti,
          })
          if (stroke) {
            st.addStroke({ ...stroke, dbId: t.id, authorId: t.autoreUserId ?? undefined })
            syncedDbIds.add(t.id)
          }
        }

        // Forme mancanti (incluse immagini)
        for (const f of forme) {
          if (knownShapeDbIds.has(f.id)) continue
          // Difesa: shape aggiunta via Ably senza dbId, già presente con id calcolato
          if (st.shapes.some((s: any) => s.id === `shape-${f.id}`)) continue
          const shape = {
            id: `shape-${f.id}`,
            dbId: f.id,
            type: f.kind || 'rect',
            x: f.x ?? 0, y: f.y ?? 0,
            width: f.w ?? f.width ?? 0,
            height: f.h ?? f.height ?? 0,
            x2: f.x2 ?? undefined, y2: f.y2 ?? undefined,
            color: f.colore || f.color || '#1a1a1a',
            strokeWidth: f.spessore || f.strokeWidth || 2,
            fillColor: f.fillColor || 'transparent',
            text: f.titolo || undefined,
            fontSize: f.fontSize ?? undefined,
            rotation: f.rotation ?? 0,
            imageUrl: f.src || f.imageUrl || undefined,
            authorId: f.autoreUserId ?? undefined,
          }
          st.addShape(shape)
        }
      } catch (_) {}
    }

    let intervalId: ReturnType<typeof setInterval> | null = setInterval(poll, 2000)

    const onVisibility = () => {
      if (document.hidden) {
        if (intervalId) { clearInterval(intervalId); intervalId = null }
      } else {
        poll() // catch-up immediato al ritorno
        if (!intervalId) intervalId = setInterval(poll, 2000)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (intervalId) clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [lavagnaId, attivitaId])

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
        onUndo={handleUndo}
        onRedo={handleRedo}
        onPasteImage={handlePasteFromButton}
      />

      {/* Image resize/rotation overlay */}
      <ImageTransformOverlay engineRef={engineRef} onSaveShape={onSaveShape} />

      {/* Off-screen cursor indicators */}
      <OffscreenCursors engineRef={engineRef} />

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        canvas { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  )
}

// ─── Image helpers ─────────────────────────────────────────────────────────────

// Converte File immagine in base64 data URL compressa (nessun servizio esterno)
function imageFileToDataUrl(file: File, maxW: number, maxH: number, quality: number): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxW / img.width, maxH / img.height)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function getImageDimensions(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve({ w: 600, h: 400 })
    img.src = url
  })
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

// ─── Image transform overlay (resize + rotation handles) ─────────────────────

function ImageTransformOverlay({
  engineRef,
  onSaveShape,
}: {
  engineRef: React.RefObject<CanvasEngine>
  onSaveShape: (shapeId: string) => void
}) {
  const selectedShapeIds = useWhiteboardStore(s => s.selectedShapeIds)
  const shapes = useWhiteboardStore(s => s.shapes)
  const [, forceUpdate] = useState(0)
  const dragRef = useRef<{ type: string; startX: number; startY: number; origShape: any } | null>(null)

  // Re-render su pan/zoom
  useEffect(() => {
    const eng = engineRef.current
    if (!eng) return
    const listener = () => forceUpdate(n => n + 1)
    eng.on(listener)
    return () => eng.off(listener)
  }, [engineRef])

  if (selectedShapeIds.length !== 1) return null
  const shape = shapes.find(s => s.id === selectedShapeIds[0] && s.type === 'image')
  if (!shape) return null
  const eng = engineRef.current
  if (!eng) return null

  const iw = shape.width ?? 200
  const ih = shape.height ?? 150
  const tl = eng.worldToScreen(shape.x, shape.y)
  const sw = iw * eng.zoom
  const sh = ih * eng.zoom
  const rotation = shape.rotation ?? 0

  const onHDown = (e: React.PointerEvent, type: string) => {
    e.stopPropagation()
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { type, startX: e.clientX, startY: e.clientY, origShape: { ...shape, width: iw, height: ih } }
  }

  const onHMove = (e: React.PointerEvent, type: string) => {
    if (!dragRef.current || dragRef.current.type !== type) return
    e.stopPropagation()
    const orig = dragRef.current.origShape
    const dx = (e.clientX - dragRef.current.startX) / eng.zoom
    const dy = (e.clientY - dragRef.current.startY) / eng.zoom

    if (type === 'rotate') {
      const cx = tl.x + sw / 2
      const cy2 = tl.y + sh / 2
      const angle = Math.atan2(e.clientY - cy2, e.clientX - cx)
      const initAngle = Math.atan2(dragRef.current.startY - cy2, dragRef.current.startX - cx)
      useWhiteboardStore.getState().updateShape(shape.id, { rotation: (orig.rotation ?? 0) + (angle - initAngle) })
    } else {
      let { x, y, width, height } = { x: orig.x, y: orig.y, width: orig.width, height: orig.height }

      // Immagini: resize sempre proporzionale usando l'aspect ratio originale
      if (shape.type === 'image' && orig.width > 0 && orig.height > 0) {
        const ar = orig.width / orig.height
        if (type === 'tl') {
          // Usa l'asse con variazione maggiore come driver
          const newW = Math.max(30, orig.width + (Math.abs(dx) >= Math.abs(dy) ? -dx : -dy * ar))
          const newH = newW / ar
          x = orig.x + (orig.width - newW)
          y = orig.y + (orig.height - newH)
          width = newW; height = newH
        } else if (type === 'tr') {
          const newW = Math.max(30, orig.width + (Math.abs(dx) >= Math.abs(dy) ? dx : -dy * ar))
          const newH = newW / ar
          y = orig.y + (orig.height - newH)
          width = newW; height = newH
        } else if (type === 'bl') {
          const newW = Math.max(30, orig.width + (Math.abs(dx) >= Math.abs(dy) ? -dx : dy * ar))
          const newH = newW / ar
          x = orig.x + (orig.width - newW)
          width = newW; height = newH
        } else if (type === 'br') {
          const newW = Math.max(30, orig.width + (Math.abs(dx) >= Math.abs(dy) ? dx : dy * ar))
          const newH = newW / ar
          width = newW; height = newH
        }
      } else {
        // Forme non-immagine: resize libero
        if (type === 'tl') { x += dx; y += dy; width -= dx; height -= dy }
        else if (type === 'tr') { width += dx; y += dy; height -= dy }
        else if (type === 'bl') { x += dx; width -= dx; height += dy }
        else if (type === 'br') { width += dx; height += dy }
      }

      if (width > 30 && height > 20) useWhiteboardStore.getState().updateShape(shape.id, { x, y, width, height })
    }
  }

  const onHUp = (e: React.PointerEvent, type: string) => {
    if (!dragRef.current || dragRef.current.type !== type) return
    e.stopPropagation()
    dragRef.current = null
    onSaveShape(shape.id)
  }

  const corners = [
    { type: 'tl', left: '0%', top: '0%', cursor: 'nwse-resize' },
    { type: 'tr', left: '100%', top: '0%', cursor: 'nesw-resize' },
    { type: 'bl', left: '0%', top: '100%', cursor: 'nesw-resize' },
    { type: 'br', left: '100%', top: '100%', cursor: 'nwse-resize' },
  ]

  const hBase: React.CSSProperties = {
    position: 'absolute', width: 12, height: 12,
    background: '#fff', border: '2px solid #0078d4', borderRadius: 3,
    transform: 'translate(-50%, -50%)', pointerEvents: 'auto', touchAction: 'none',
  }

  return (
    <div style={{
      position: 'absolute', left: tl.x, top: tl.y, width: sw, height: sh,
      transform: rotation ? `rotate(${rotation}rad)` : undefined,
      transformOrigin: 'center center',
      border: '1.5px solid #0078d4', boxSizing: 'border-box',
      pointerEvents: 'none', zIndex: 55,
    }}>
      {/* Stalk */}
      <div style={{ position: 'absolute', left: '50%', top: -28, width: 1.5, height: 28, background: '#0078d4', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
      {/* Rotation handle */}
      <div
        style={{ ...hBase, left: '50%', top: -36, borderRadius: '50%', cursor: 'grab', width: 14, height: 14 }}
        onPointerDown={e => onHDown(e, 'rotate')}
        onPointerMove={e => onHMove(e, 'rotate')}
        onPointerUp={e => onHUp(e, 'rotate')}
      />
      {/* Corner handles */}
      {corners.map(c => (
        <div
          key={c.type}
          style={{ ...hBase, left: c.left, top: c.top, cursor: c.cursor }}
          onPointerDown={e => onHDown(e, c.type)}
          onPointerMove={e => onHMove(e, c.type)}
          onPointerUp={e => onHUp(e, c.type)}
        />
      ))}
    </div>
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
