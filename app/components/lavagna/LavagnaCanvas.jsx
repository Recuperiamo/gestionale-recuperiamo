"use client";
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo
} from "react";
import { getAblyChannel, whenChannelAttached } from "../../lib/realtime/ablyClient";
import { jsPDF } from "jspdf";

/**
 * LavagnaCanvas – LIVE con Socket.IO su /api/socketio
 * - Penna, gomma (puntuale/intero tratto)
 * - Undo/redo, export PNG
 * - Sincronizzazione live stroke:start/points/done/delete e clear-lavagna
 * - Emissione evento "new-lavagna" se la lavagna è nuova (isNewLavagna)
 * - Pulsante "Pulisci lavagna" solo per admin
 */

export default function LavagnaCanvas({
  lavagnaId,
  attivitaId,
  trattiIniziali,
  utenteId,
  clienteId,
  ruolo,
  altezza = 600,
  openInNewWindow = false,
  isNewLavagna = false
}) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const ablyRef = useRef({ ch: null });

  const [strumento, setStrumento] = useState("penna"); // penna|gomma|mano
  const [colore, setColore] = useState("#20489a");
  const [spessore, setSpessore] = useState(3);
  const [tratti, setTratti] = useState(() =>
    (trattiIniziali || []).map((s) =>
      prepareStroke({
        ...s,
        dbId: s.id,
        id: s.streamId || s.id,
      })
    )
  );
  const [disegnando, setDisegnando] = useState(false);
  const puntiCorrentiRef = useRef([]);
  const [salvando, setSalvando] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [gommaPuntuale, setGommaPuntuale] = useState(false);
  const [showTools, setShowTools] = useState(true);
  const [sfondo, setSfondo] = useState("bianco"); // bianco|nero|righe|quadretti|punti
  const sfondoRef = useRef(sfondo);
  const backgroundStorageKey = useMemo(() => {
    const keySource = attivitaId ?? lavagnaId;
    if (!keySource) return null;
    return `lavagna-bg:${keySource}`;
  }, [attivitaId, lavagnaId]);
  const backgroundHydratedRef = useRef(false);
  const backgroundRequestedRef = useRef(false);
  const backgroundRequestKeyRef = useRef(null);
  const [zoom, setZoom] = useState(1); // 1 = 100%
  const sfondoLabels = useMemo(() => ({
    bianco: "Bianco",
    nero: "Nero",
    righe: "Righe",
    quadretti: "Quadretti",
    punti: "Punti"
  }), []);
  const [showPenPopover, setShowPenPopover] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 }); // pan in unità mondo
  const [isPanning, setIsPanning] = useState(false);
  const [contextPanning, setContextPanning] = useState(false);
  const panningRef = useRef({ active: false, lastX: 0, lastY: 0, viaContext: false });
  const touchesRef = useRef(new Map()); // pointerId -> { x,y }
  const gestureRef = useRef({ mode: 'none', startZoom: 1, startPan: { x: 0, y: 0 }, startDist: 0, startMidWorld: { x: 0, y: 0 } });

  // Shapes and selection
  const [forme, setForme] = useState([]); // shapes: { id, kind, x,y,w,h, x2,y2, colore, spessore }
  const previewShapeRef = useRef(null);
  const drawingShapeRef = useRef(false);
  const erasingRef = useRef(false);
  const selectingRef = useRef({ active: false, start: null });
  const [selectionBox, setSelectionBox] = useState(null); // world coords {x1,y1,x2,y2}
  const [selectedItems, setSelectedItems] = useState({ tratti: [], forme: [] });
  const draggingSelectionRef = useRef({ active: false, startWorld: null, offsets: null });
  const [showShapesPopover, setShowShapesPopover] = useState(false);

  const isAdmin = String(ruolo || "").toLowerCase() === "admin";
  const eraseSessionRef = useRef({
    strokeIds: new Set(),
    shapeIds: new Set()
  });
  const animationFrameId = useRef(null);

  // Disegno completo
  const drawAll = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    // pulisci
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // applichiamo pan e zoom per TUTTO (sfondo + contenuto) così si scala coerentemente
    const dpr = window.devicePixelRatio || 1;
    const W = ctx.canvas.width / dpr;
    const H = ctx.canvas.height / dpr;
    ctx.save();
    // Trasformazione world->screen: prima trasla, poi scala
    ctx.translate(-pan.x, -pan.y);
    ctx.scale(zoom, zoom);

    // sfondo (dentro lo scale per coerenza visiva)
    if (sfondo === 'nero') {
      ctx.fillStyle = '#000';
    } else {
      ctx.fillStyle = '#fff';
    }
    // dimensioni viewport in unità mondo
    const viewW = W / zoom;
    const viewH = H / zoom;
    ctx.fillRect(pan.x, pan.y, viewW, viewH);

    if (sfondo === 'righe' || sfondo === 'quadretti' || sfondo === 'punti') {
      const step = 32; // unità canvas
      ctx.strokeStyle = sfondo === 'righe' ? '#e5e7eb' : '#e2e8f0';
      ctx.fillStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      const startY = Math.floor(pan.y / step) * step;
      const startX = Math.floor(pan.x / step) * step;
      if (sfondo === 'righe' || sfondo === 'quadretti') {
        for (let y = startY; y < pan.y + viewH; y += step) {
          ctx.beginPath();
          ctx.moveTo(pan.x, y);
          ctx.lineTo(pan.x + viewW, y);
          ctx.stroke();
        }
      }
      if (sfondo === 'quadretti') {
        for (let x = startX; x < pan.x + viewW; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, pan.y);
          ctx.lineTo(x, pan.y + viewH);
          ctx.stroke();
        }
      }
      if (sfondo === 'punti') {
        for (let y = startY; y < pan.y + viewH; y += step) {
          for (let x = startX; x < pan.x + viewW; x += step) {
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // Tratti persistiti (coordinate in unità mondo)
    // Disegno forme preesistenti (prima dei tratti)
    for (const f of forme) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = f.colore || '#20489a';
      ctx.lineWidth = f.spessore || 3;
      if (f.kind === 'rettangolo') {
        ctx.strokeRect(f.x, f.y, f.w, f.h);
      } else if (f.kind === 'cerchio' || f.kind === 'ellisse') {
        const cx = f.x + f.w / 2;
        const cy = f.y + f.h / 2;
        const rx = Math.abs(f.w) / 2;
        const ry = Math.abs(f.h) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (f.kind === 'linea') {
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        ctx.lineTo(f.x2, f.y2);
        ctx.stroke();
      }
      // Se selezionata, evidenzia
      if (selectedItems.forme.includes(f.id)) {
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.setLineDash([6,4]);
        if (f.kind === 'linea') ctx.strokeRect(Math.min(f.x,f.x2)-6, Math.min(f.y,f.y2)-6, Math.abs(f.x2-f.x)+12, Math.abs(f.y2-f.y)+12);
        else ctx.strokeRect(f.x-6, f.y-6, f.w+12, f.h+12);
        ctx.setLineDash([]);
      }
      ctx.restore();
    }
    tratti.forEach((t) => {
      if (!t.punti || t.punti.length < 2) return;
      ctx.globalCompositeOperation = t.strumento === 'gomma' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = t.strumento === 'gomma' ? '#fff' : t.colore || '#20489a';
      ctx.lineWidth = t.spessore || 3;
      ctx.beginPath();
      t.punti.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.stroke();
    });

    // Stream remoti in corso (unità mondo)
    for (const st of remoteStreams.current.values()) {
      if (!st.punti || st.punti.length < 2) continue;
      ctx.globalCompositeOperation = st.strumento === 'gomma' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = st.strumento === 'gomma' ? '#fff' : st.colore || '#20489a';
      ctx.lineWidth = st.spessore || 3;
      ctx.beginPath();
      st.punti.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.stroke();
    }

    // Tratto locale in corso (unità mondo)
    const puntiLocali = puntiCorrentiRef.current;
    if (puntiLocali.length >= 2) {
      ctx.globalCompositeOperation = (strumento === 'gomma' && gommaPuntuale) ? 'destination-out' : 'source-over';
      ctx.strokeStyle = strumento === 'gomma' ? '#fff' : colore;
      ctx.lineWidth = spessore;
      ctx.beginPath();
      puntiLocali.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.stroke();
    }

      // Preview shape
      const ps = previewShapeRef.current;
      if (ps) {
        ctx.save();
        ctx.strokeStyle = ps.colore || '#20489a';
        ctx.lineWidth = ps.spessore || 2;
        ctx.setLineDash([6,4]);
        if (ps.kind === 'rettangolo') {
          const x = Math.min(ps.x, ps.x2);
          const y = Math.min(ps.y, ps.y2);
          const w = Math.abs(ps.x2 - ps.x);
          const h = Math.abs(ps.y2 - ps.y);
          ctx.strokeRect(x, y, w, h);
        } else if (ps.kind === 'cerchio' || ps.kind === 'ellisse') {
          const x = Math.min(ps.x, ps.x2);
          const y = Math.min(ps.y, ps.y2);
          const w = Math.abs(ps.x2 - ps.x);
          const h = Math.abs(ps.y2 - ps.y);
          const cx = x + w/2; const cy = y + h/2;
          ctx.beginPath(); ctx.ellipse(cx, cy, w/2, h/2, 0, 0, Math.PI*2); ctx.stroke();
        } else if (ps.kind === 'linea') {
          ctx.beginPath(); ctx.moveTo(ps.x, ps.y); ctx.lineTo(ps.x2, ps.y2); ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Selection box overlay (world coords)
      if (selectionBox) {
        ctx.save();
        ctx.setTransform(1,0,0,1,0,0);
        // transform world->screen
        const sx = (selectionBox.x1 - pan.x) * zoom;
        const sy = (selectionBox.y1 - pan.y) * zoom;
        const sx2 = (selectionBox.x2 - pan.x) * zoom;
        const sy2 = (selectionBox.y2 - pan.y) * zoom;
        const rx = Math.min(sx, sx2); const ry = Math.min(sy, sy2);
        const rw = Math.abs(sx2 - sx); const rh = Math.abs(sy2 - sy);
        ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2; ctx.setLineDash([6,4]);
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.restore();
      }

  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
  }, [tratti, forme, selectionBox, selectedItems, strumento, gommaPuntuale, colore, spessore, sfondo, zoom, pan.x, pan.y]);

  // Loop di rendering per il disegno locale
  const renderLoop = useCallback(() => {
    drawAll();
    animationFrameId.current = requestAnimationFrame(renderLoop);
  }, [drawAll]);

  useEffect(() => {
    drawAll();
  }, [drawAll]);

  useEffect(() => {
    sfondoRef.current = sfondo;
  }, [sfondo]);

  useEffect(() => {
    if (backgroundHydratedRef.current) return;
    if (!backgroundStorageKey) return;
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(backgroundStorageKey);
      if (stored && stored !== sfondo) {
        setSfondo(stored);
      }
    } catch (_) {}
    backgroundHydratedRef.current = true;
  }, [backgroundStorageKey, sfondo]);

  useEffect(() => {
    if (!backgroundStorageKey) return;
    if (typeof window === 'undefined') return;
    if (!backgroundHydratedRef.current) return;
    try {
      window.localStorage.setItem(backgroundStorageKey, sfondo);
    } catch (_) {}
  }, [backgroundStorageKey, sfondo]);


  // Stream remoti in tempo reale (non persistiti finché non "done")
  const remoteStreams = useRef(new Map()); // streamId -> { strumento, colore, spessore, punti: [] }
  const currentStreamId = useRef(null);
  const throttler = useRef({ last: 0 });
  // buffer per pubblicare punti in batch (meno segmentazione remota)
  const outgoingBufferRef = useRef([]);
  const outgoingRAFRef = useRef(null);

  // Setup Ably helpers and subscriptions
  const channelName = useMemo(
    () => (attivitaId != null ? `lavagna:${attivitaId}` : `lavagna:${lavagnaId}`),
    [attivitaId, lavagnaId]
  );

  const emitOrPublish = useCallback(
    (name, data) => {
      const ch = ablyRef.current.ch;
      if (!ch) return;
      whenChannelAttached(channelName)
        .then(() => ch.publish(name, data))
        .catch(() => {});
    },
    [channelName]
  );

  useEffect(() => {
    const key = attivitaId ?? lavagnaId;
    if (isAdmin) {
      backgroundRequestedRef.current = false;
      backgroundRequestKeyRef.current = key;
      return;
    }
    if (!key) return;
    if (backgroundRequestKeyRef.current !== key) {
      backgroundRequestedRef.current = false;
      backgroundRequestKeyRef.current = key;
    }
    if (backgroundRequestedRef.current) return;
    backgroundRequestedRef.current = true;
    emitOrPublish('background:request', { lavagnaId, attivitaId });
  }, [isAdmin, emitOrPublish, lavagnaId, attivitaId]);

  const flushOutgoing = useCallback(() => {
    if (!currentStreamId.current) {
      outgoingRAFRef.current = null;
      outgoingBufferRef.current = [];
      return;
    }
    const batch = outgoingBufferRef.current;
    if (batch.length) {
      emitOrPublish('stroke:points', {
        streamId: currentStreamId.current,
        points: batch.slice()
      });
      outgoingBufferRef.current = [];
    }
    // Continua finché si disegna
    if (disegnando) {
      outgoingRAFRef.current = requestAnimationFrame(flushOutgoing);
    } else {
      outgoingRAFRef.current = null;
    }
  }, [emitOrPublish, disegnando]);

  useEffect(() => {
    const ch = getAblyChannel(channelName);
    ablyRef.current.ch = ch;
    whenChannelAttached(channelName).catch((err) => {
      console.warn('[LavagnaCanvas] channel attach failed', err?.message);
    });

    const onStart = (msg) => {
      const { data } = msg || {};
      const { streamId, strumento, colore, spessore, start } = data || {};
      if (!streamId || !start) return;
      remoteStreams.current.set(streamId, {
        strumento,
        colore,
        spessore,
        punti: [start]
      });
      drawAll();
    };

    const onPoints = (msg) => {
      const { data } = msg || {};
      const { streamId, points } = data || {};
      if (!streamId || !Array.isArray(points) || points.length === 0) return;
      const st = remoteStreams.current.get(streamId);
      if (!st) return;
      st.punti.push(...points);
      drawAll();
    };

    const onDone = (msg) => {
      const { data } = msg || {};
      const { streamId } = data || {};
      const st = remoteStreams.current.get(streamId);
      if (st && st.punti.length >= 2) {
        if (st.strumento !== 'magicpen') {
          const definitivo = prepareStroke({
            id: streamId,
            strumento: st.strumento,
            colore: st.colore,
            spessore: st.spessore,
            punti: st.punti,
            autoreUserId: 'remote'
          });
          setTratti((prev) => [...prev, definitivo]);
        }
      }
      remoteStreams.current.delete(streamId);
      drawAll();
    };

    const onDelete = (msg) => {
      const { data } = msg || {};
      const { strokeId } = data || {};
      if (!strokeId) return;
      setTratti((prev) => prev.filter((t) => String(t.id) !== String(strokeId)));
      drawAll();
    };

    const onClear = () => {
      setTratti([]);
      setUndoStack([]);
      setRedoStack([]);
      drawAll();
    };

    ch.subscribe('stroke:start', onStart);
    ch.subscribe('stroke:points', onPoints);
    ch.subscribe('stroke:done', onDone);
    ch.subscribe('stroke:delete', onDelete);
    // shape events
    const onShapeCreate = (msg) => {
      const { data } = msg || {};
      if (!data) return;
      setForme((prev) => {
        // avoid duplicate
        if (prev.find((f) => f.id === data.id)) return prev;
        return [...prev, data];
      });
      drawAll();
    };
    const onShapeUpdate = (msg) => {
      const { data } = msg || {};
      if (!data || !data.id) return;
      setForme((prev) => prev.map((f) => (f.id === data.id ? { ...f, ...data } : f)));
      drawAll();
    };
    const onShapeDelete = (msg) => {
      const { data } = msg || {};
      if (!data || !data.id) return;
      setForme((prev) => prev.filter((f) => f.id !== data.id));
      drawAll();
    };
    const onBackgroundChange = (msg) => {
      const { data } = msg || {};
      if (!data || !data.sfondo) return;
      let changed = false;
      setSfondo((prev) => {
        if (prev === data.sfondo) return prev;
        changed = true;
        return data.sfondo;
      });
      if (changed) {
        setTimeout(drawAll, 0);
      }
    };
    const onBackgroundRequest = () => {
      if (!isAdmin) return;
      emitOrPublish('background:change', { lavagnaId, attivitaId, sfondo: sfondoRef.current });
    };
    ch.subscribe('shape:create', onShapeCreate);
    ch.subscribe('shape:update', onShapeUpdate);
    ch.subscribe('shape:delete', onShapeDelete);
    ch.subscribe('background:change', onBackgroundChange);
    ch.subscribe('background:request', onBackgroundRequest);
    ch.subscribe('clear-lavagna', onClear);

    return () => {
      try {
        ch.unsubscribe('stroke:start', onStart);
        ch.unsubscribe('stroke:points', onPoints);
        ch.unsubscribe('stroke:done', onDone);
        ch.unsubscribe('stroke:delete', onDelete);
        ch.unsubscribe('clear-lavagna', onClear);
        ch.unsubscribe('shape:create', onShapeCreate);
        ch.unsubscribe('shape:update', onShapeUpdate);
        ch.unsubscribe('shape:delete', onShapeDelete);
        ch.unsubscribe('background:change', onBackgroundChange);
        ch.unsubscribe('background:request', onBackgroundRequest);
      } catch (_) {}
    };
  }, [channelName, drawAll, isAdmin, emitOrPublish, lavagnaId, attivitaId]);

  // Remote shapes ref (for in-flight updates)
  const remoteShapes = useRef(new Map());

  // Shape CRUD helpers (local + realtime + persist)
  const persistShape = useCallback(async (shape) => {
    try {
      const res = await fetch('/api/lavagna/shape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...shape, lavagnaId }) });
      if (!res.ok) return null;
      const js = await res.json();
      return js.shape || null;
    } catch (e) {
      return null;
    }
  }, [lavagnaId]);

  const createShapeLocal = useCallback((shape, emit = true) => {
    setForme((prev) => [...prev, shape]);
    if (emit) emitOrPublish('shape:create', { ...shape, lavagnaId });
    // try persist async (best-effort)
    persistShape(shape).then((s) => {
      if (s && s.id) {
        setForme((prev) => prev.map((f) => (f.id === shape.id ? { ...f, dbId: s.id } : f)));
      }
    });
  }, [emitOrPublish, lavagnaId, persistShape]);

  const updateShapeLocal = useCallback((shape, emit = true) => {
    setForme((prev) => prev.map((f) => (f.id === shape.id ? { ...f, ...shape } : f)));
    if (emit) emitOrPublish('shape:update', { ...shape, lavagnaId });
    fetch(`/api/lavagna/shape/${shape.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shape)
    }).catch(() => {});
  }, [emitOrPublish, lavagnaId]);

  const deleteShapeLocal = useCallback((id, emit = true) => {
    setForme((prev) => prev.filter((f) => f.id !== id));
    if (emit) emitOrPublish('shape:delete', { id, lavagnaId });
    fetch(`/api/lavagna/shape/${id}`, { method: 'DELETE' }).catch(() => {});
  }, [emitOrPublish, lavagnaId]);

  // Clipboard for cut/copy/paste
  const clipboardRef = useRef({ tratti: [], forme: [] });

  function copySelection() {
    const sel = selectedItems;
    clipboardRef.current = {
      tratti: sel.tratti.map(i => JSON.parse(JSON.stringify(tratti[i]))),
      forme: sel.forme.map(id => JSON.parse(JSON.stringify(forme.find(f=>f.id===id))))
    };
  }

  function cutSelection() {
    copySelection();
    // remove selected tratti
    setTratti(prev => prev.filter((_, idx) => !selectedItems.tratti.includes(idx)));
    // remove shapes
    setForme(prev => prev.filter(f => !selectedItems.forme.includes(f.id)));
    setSelectedItems({ tratti: [], forme: [] });
    // emit deletions
    clipboardRef.current.forme.forEach(s => emitOrPublish('shape:delete', { id: s.id, lavagnaId }));
  }

  function pasteClipboard(atPoint) {
    const cb = clipboardRef.current;
    if (!cb) return;
    const offset = atPoint || { x: pan.x + 50 / zoom, y: pan.y + 50 / zoom };
    const newShapes = (cb.forme || []).map(s => {
      const id = `shape-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
      const nx = (s.x || 0) + 20; const ny = (s.y || 0) + 20;
      const ns = { ...s, id, x: nx, y: ny };
      createShapeLocal(ns, true);
      return ns;
    });
    const newStrokes = (cb.tratti || []).map(st => {
      const id = `${utenteId}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
      const np = (st.punti || []).map(p => ({ x: p.x + 20, y: p.y + 20 }));
      const nt = { ...st, id, punti: np };
      setTratti(prev => [...prev, prepareStroke(nt)]);
      // persist
      salvaTratto(nt);
      emitOrPublish('stroke:done', { streamId: id });
      return nt;
    });
    drawAll();
  }

  // Duplicate selection in-place
  function duplicateSelection() {
    const sel = selectedItems;
    const atPoint = null;
    pasteClipboard(atPoint);
  }

  // Move selected items by dx,dy
  function moveSelectionBy(dx, dy, emit = true) {
    if (!selectedItems) return;
    // Move shapes
    setForme(prev => prev.map(f => selectedItems.forme.includes(f.id) ? ({ ...f, x: f.x + dx, y: f.y + dy }) : f));
    // Move strokes (shift points)
    setTratti(prev => prev.map((t, idx) => selectedItems.tratti.includes(idx) ? ({ ...t, punti: t.punti.map(p => ({ x: p.x + dx, y: p.y + dy })) }) : t));
    if (emit) {
      // emit shape updates
      selectedItems.forme.forEach(id => {
        const f = (forme.find(s => s.id === id) || {});
        if (f) emitOrPublish('shape:update', { ...f, x: f.x + dx, y: f.y + dy, lavagnaId });
      });
    }
    drawAll();
  }

  // Keyboard shortcuts for copy/cut/paste/delete/duplicate
  useEffect(() => {
    function onKey(e) {
      if (!selectedItems) return;
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key === 'c') { copySelection(); e.preventDefault(); }
      if (mod && e.key === 'x') { cutSelection(); e.preventDefault(); }
      if (mod && e.key === 'v') { pasteClipboard(); e.preventDefault(); }
      if (e.key === 'Delete') { // delete selection
        selectedItems.forme.forEach(id => deleteShapeLocal(id, true));
        setTratti(prev => prev.filter((_, idx) => !selectedItems.tratti.includes(idx)));
        setSelectedItems({ tratti: [], forme: [] });
        e.preventDefault();
      }
      if (mod && e.key === 'd') { duplicateSelection(); e.preventDefault(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedItems, tratti, forme, deleteShapeLocal]);

  // Simple magic-pen heuristic: try to detect line/rect/circle from stroke points
  function detectShapeFromStroke(points) {
    if (!points || points.length < 6) return null;
    // compute bounding box
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for (const p of points) { if (p.x<minX)minX=p.x; if (p.y<minY)minY=p.y; if (p.x>maxX)maxX=p.x; if (p.y>maxY)maxY=p.y; }
    const w = maxX-minX, h = maxY-minY;
    // check closed path
    const distEndStart = Math.hypot(points[0].x - points[points.length-1].x, points[0].y - points[points.length-1].y);
    const bboxArea = w*h;
    // circle/ellipse: closed and points roughly at similar radius from center
    if (distEndStart < Math.min(w,h)*0.25) {
      const cx = minX + w/2, cy = minY + h/2;
      let varR = 0, meanR = 0;
      const rs = points.map(p=>Math.hypot(p.x-cx,p.y-cy));
      meanR = rs.reduce((a,b)=>a+b,0)/rs.length;
      varR = rs.reduce((a,b)=>a+(b-meanR)*(b-meanR),0)/rs.length;
      if (Math.sqrt(varR) < Math.max(w,h)*0.15) {
        return { kind: w/h>1.2? 'ellisse' : 'cerchio', x:minX,y:minY,w,h };
      }
      // rectangle: many points near bbox edges
      let nearEdges=0;
      for (const p of points) {
        if (Math.abs(p.x-minX)<Math.max(4, w*0.08) || Math.abs(p.x-maxX)<Math.max(4, w*0.08) || Math.abs(p.y-minY)<Math.max(4, h*0.08) || Math.abs(p.y-maxY)<Math.max(4, h*0.08)) nearEdges++;
      }
      if (nearEdges / points.length > 0.6) return { kind: 'rettangolo', x:minX,y:minY,w,h };
    }
    // line: points close to best-fit line
    // fit line via endpoints
    const x1 = points[0].x, y1 = points[0].y, x2 = points[points.length-1].x, y2 = points[points.length-1].y;
    let maxDist=0, total=0;
    for (const p of points) { const d = distPointToSegment(p.x,p.y,x1,y1,x2,y2); if (d>maxDist) maxDist=d; total+=d; }
    if (maxDist < Math.max(8, Math.min(w,h)*0.12)) return { kind: 'linea', x:x1,y:y1,x2:x2,y2:y2 };
    return null;
  }

  // == UTILITIES ==
  function prepareStroke(s) {
    if (!s || !Array.isArray(s.punti)) return s;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of s.punti) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    s._bb = { minX, maxX, minY, maxY };
    return s;
  }
  function expandBB(bb, pad) {
    return {
      minX: bb.minX - pad,
      minY: bb.minY - pad,
      maxX: bb.maxX + pad,
      maxY: bb.maxY + pad
    };
  }
  function pointInBB(x, y, bb) {
    return x >= bb.minX && x <= bb.maxX && y >= bb.minY && y <= bb.maxY;
  }
  function distPointToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) {
      const ddx = px - x1;
      const ddy = py - y1;
      return Math.sqrt(ddx * ddx + ddy * ddy);
    }
    const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    const clamped = Math.max(0, Math.min(1, t));
    const cx = x1 + clamped * dx;
    const cy = y1 + clamped * dy;
    const ddx = px - cx;
    const ddy = py - cy;
    return Math.sqrt(ddx * ddx + ddy * ddy);
  }
  function hitTestStroke(x, y, stroke) {
    if (!stroke._bb) return false;
    const threshold = (stroke.spessore || 3) * 1.2 + 6;
    const bbExp = expandBB(stroke._bb, threshold);
    if (!pointInBB(x, y, bbExp)) return false;
    const pts = stroke.punti;
    for (let i = 0; i < pts.length - 1; i++) {
      if (
        distPointToSegment(
          x,
          y,
          pts[i].x,
          pts[i].y,
          pts[i + 1].x,
          pts[i + 1].y
        ) <= threshold
      )
        return true;
    }
    return false;
  }

  function getShapeBounds(shape) {
    if (!shape) return null;
    if (shape.kind === 'linea') {
      const minX = Math.min(shape.x, shape.x2);
      const maxX = Math.max(shape.x, shape.x2);
      const minY = Math.min(shape.y, shape.y2);
      const maxY = Math.max(shape.y, shape.y2);
      return { minX, minY, maxX, maxY };
    }
    const w = shape.w ?? (shape.x2 - shape.x);
    const h = shape.h ?? (shape.y2 - shape.y);
    const minX = Math.min(shape.x, shape.x + w);
    const maxX = Math.max(shape.x, shape.x + w);
    const minY = Math.min(shape.y, shape.y + h);
    const maxY = Math.max(shape.y, shape.y + h);
    return { minX, minY, maxX, maxY };
  }

  function hitTestShape(shape, x, y, tolerance = 12) {
    if (!shape) return false;
    if (shape.kind === 'linea') {
      return distPointToSegment(x, y, shape.x, shape.y, shape.x2, shape.y2) <= tolerance;
    }
    const bounds = getShapeBounds(shape);
    if (!bounds) return false;
    const { minX, maxX, minY, maxY } = bounds;
    const withinX = x >= minX - tolerance && x <= maxX + tolerance;
    const withinY = y >= minY - tolerance && y <= maxY + tolerance;
    if (!withinX || !withinY) return false;
    if (shape.kind === 'rettangolo') {
      return true;
    }
    if (shape.kind === 'cerchio' || shape.kind === 'ellisse') {
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const rx = (maxX - minX) / 2;
      const ry = (maxY - minY) / 2 || tolerance;
      if (rx <= 0 || ry <= 0) return false;
      const norm = ((x - cx) * (x - cx)) / ((rx + tolerance) * (rx + tolerance)) + ((y - cy) * (y - cy)) / ((ry + tolerance) * (ry + tolerance));
      return norm <= 1;
    }
    return false;
  }

  // Coordinate helper considerando lo zoom
  const getPoint = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.nativeEvent.clientX;
    const clientY = e.nativeEvent.clientY;
    const offX = clientX - rect.left;
    const offY = clientY - rect.top;
    const x = pan.x + offX / zoom;
    const y = pan.y + offY / zoom;
    return { x, y };
  }, [zoom, pan.x, pan.y]);

  // == RESIZE & REDRAW ==
  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = altezza;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      const ctx = canvas.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctxRef.current = ctx;
      drawAll();
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tratti, altezza]);

  // Zoom via rotella mouse
  const onWheel = useCallback((e) => {
    // Zoom solo sulla lavagna, sempre con rotella, ancorato al cursore
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;
    const worldBefore = { x: pan.x + offX / zoom, y: pan.y + offY / zoom };
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(2, Math.max(0.5, Math.round((zoom * factor) * 100) / 100));
    const newPan = {
      x: worldBefore.x - offX / newZoom,
      y: worldBefore.y - offY / newZoom,
    };
    setZoom(newZoom);
    setPan(newPan);
    // Aggiorna subito la lavagna per feedback immediato
    setTimeout(drawAll, 0);
  }, [zoom, pan.x, pan.y, drawAll]);

  // == CANCELLAZIONE INTERO TRATTO ==
  const eraseStrokeAt = useCallback(
    (x, y) => {
      let removed = false;
      for (let i = tratti.length - 1; i >= 0; i--) {
        const st = tratti[i];
        if (eraseSessionRef.current.strokeIds.has(st.id)) continue;
        if (hitTestStroke(x, y, st)) {
          removed = true;
          setTratti((prev) => prev.filter((_, idx) => idx !== i));
          eraseSessionRef.current.strokeIds.add(st.id);
          setUndoStack((prev) => [...prev, { type: "delete", stroke: st }]);
          setRedoStack([]);

          emitOrPublish("stroke:delete", { attivitaId, strokeId: st.id });

          const delId = st.dbId ?? st.id;
          fetch(`/api/lavagna/tratto/${delId}`, { method: "DELETE" }).catch(() => {});
        }
      }
      if (removed) {
        drawAll();
      }
      return removed;
    },
    [tratti, drawAll, attivitaId, emitOrPublish]
  );

  const eraseShapesAt = useCallback(
    (x, y) => {
      const tolerance = 14 / zoom;
      const toDelete = [];
      for (const shape of forme) {
        if (eraseSessionRef.current.shapeIds.has(shape.id)) continue;
        if (hitTestShape(shape, x, y, tolerance)) {
          toDelete.push(shape.id);
        }
      }
      if (!toDelete.length) return false;
      toDelete.forEach((id) => {
        eraseSessionRef.current.shapeIds.add(id);
        deleteShapeLocal(id, true);
      });
      drawAll();
      return true;
    },
    [forme, zoom, deleteShapeLocal, drawAll]
  );

  // == POINTER EVENTS ==
  function pointerDown(e) {
    const native = e?.nativeEvent;
    const btn = native?.button;
    const pointerId = native?.pointerId;
    const canvas = canvasRef.current;

    if (btn === 2) {
      e.preventDefault();
      try {
        canvas?.setPointerCapture?.(pointerId);
      } catch (_) {}
      panningRef.current.active = true;
      panningRef.current.viaContext = true;
      panningRef.current.lastX = native.clientX;
      panningRef.current.lastY = native.clientY;
      setContextPanning(true);
      setIsPanning(true);
      return;
    }

    if (native?.pointerType === 'touch') {
      touchesRef.current.set(pointerId, { x: native.clientX, y: native.clientY });
    }

    if (['rettangolo', 'cerchio', 'linea'].includes(strumento)) {
      const p = getPoint(e);
      previewShapeRef.current = { kind: strumento, x: p.x, y: p.y, x2: p.x, y2: p.y, colore, spessore };
      drawingShapeRef.current = true;
      try {
        canvas?.setPointerCapture?.(pointerId);
      } catch (_) {}
      drawAll();
      return;
    }

    if (strumento === 'gomma') {
      eraseSessionRef.current.strokeIds.clear();
      eraseSessionRef.current.shapeIds.clear();
      const p = getPoint(e);
      eraseShapesAt(p.x, p.y);
      if (!gommaPuntuale) {
        eraseStrokeAt(p.x, p.y);
        erasingRef.current = true;
        try {
          canvas?.setPointerCapture?.(pointerId);
        } catch (_) {}
        return;
      }
    }

    if (strumento === 'lazzo') {
      const p = getPoint(e);
      selectingRef.current = { active: true, start: p };
      setSelectionBox({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
      try {
        canvas?.setPointerCapture?.(pointerId);
      } catch (_) {}
      return;
    }

    if (strumento === 'mano') {
      try {
        canvas?.setPointerCapture?.(pointerId);
      } catch (_) {}
      panningRef.current.active = true;
      panningRef.current.lastX = native.clientX;
      panningRef.current.lastY = native.clientY;
      panningRef.current.viaContext = false;
      setContextPanning(false);
      setIsPanning(true);
      return;
    }

    setDisegnando(true);
    const punto = getPoint(e);
    if (strumento === 'gomma' && gommaPuntuale) {
      eraseShapesAt(punto.x, punto.y);
    }
    puntiCorrentiRef.current = [punto];
    animationFrameId.current = requestAnimationFrame(renderLoop);
    const streamId = `${utenteId}-${Date.now()}`;
    currentStreamId.current = streamId;
    const strokeColor = strumento === 'gomma' ? '#ffffff' : colore;
    try {
      canvas?.setPointerCapture?.(pointerId);
    } catch (_) {}
    emitOrPublish('stroke:start', {
      streamId,
      strumento,
      colore: strokeColor,
      spessore,
      start: punto,
    });
  }

  function pointerMove(e) {
    // If panning active (hand) update pan
    if (panningRef.current.active) {
      const dx = e.nativeEvent.clientX - panningRef.current.lastX;
      const dy = e.nativeEvent.clientY - panningRef.current.lastY;
      panningRef.current.lastX = e.nativeEvent.clientX;
      panningRef.current.lastY = e.nativeEvent.clientY;
      setPan((p) => {
        const nuovo = { x: p.x - dx / zoom, y: p.y - dy / zoom };
        setTimeout(drawAll, 0);
        return nuovo;
      });
      if (!isPanning) setIsPanning(true);
      return;
    }

    // Continuous erase while dragging in intero-tratto mode
    if (erasingRef.current) {
      const p = getPoint(e);
      eraseShapesAt(p.x, p.y);
      eraseStrokeAt(p.x, p.y);
      return;
    }

    // Multitouch pan/zoom
    if (e.nativeEvent.pointerType === 'touch') {
      touchesRef.current.set(e.nativeEvent.pointerId, { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY });
      if (touchesRef.current.size === 2) {
        const pts = Array.from(touchesRef.current.values());
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        const dist = Math.hypot(dx, dy);
        const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        const rect = canvasRef.current.getBoundingClientRect();
        const midOff = { x: mid.x - rect.left, y: mid.y - rect.top };
        const midWorld = { x: pan.x + midOff.x / zoom, y: pan.y + midOff.y / zoom };
        gestureRef.current = { mode: 'panzoom', startZoom: zoom, startPan: { ...pan }, startDist: dist, startMidWorld: midWorld };
        setDisegnando(false);
        return;
      }
    }

    // Update shape preview if drawing a shape
    if (drawingShapeRef.current && previewShapeRef.current) {
      const p = getPoint(e);
      previewShapeRef.current.x2 = p.x; previewShapeRef.current.y2 = p.y;
      drawAll();
      return;
    }

    // Update selection box if lazo active
    if (selectingRef.current.active) {
      const p = getPoint(e);
      setSelectionBox({ x1: selectingRef.current.start.x, y1: selectingRef.current.start.y, x2: p.x, y2: p.y });
      return;
    }

    // If not drawing stroke, nothing to do
    if (!disegnando) return;

    const punto = getPoint(e);
    if (strumento === 'gomma' && !gommaPuntuale) {
      eraseShapesAt(punto.x, punto.y);
      eraseStrokeAt(punto.x, punto.y);
      return;
    }

    if (strumento === 'gomma' && gommaPuntuale) {
      eraseShapesAt(punto.x, punto.y);
    }

    puntiCorrentiRef.current.push(punto);
    outgoingBufferRef.current.push(punto);
    if (!outgoingRAFRef.current) {
      outgoingRAFRef.current = requestAnimationFrame(flushOutgoing);
    }
  }

  function pointerUp(e) {
    const pointerId = e?.nativeEvent?.pointerId;
    if (panningRef.current.active) {
      try {
        canvasRef.current?.releasePointerCapture?.(pointerId);
      } catch (_) {}
      panningRef.current.active = false;
      panningRef.current.viaContext = false;
      setIsPanning(false);
      setContextPanning(false);
      return; // non proseguire con logica disegno quando si rilascia pan
    }
    // Touch end handling is in pointerCancel/pointerUp below
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (outgoingRAFRef.current) {
      cancelAnimationFrame(outgoingRAFRef.current);
      outgoingRAFRef.current = null;
    }
    // stop erasing drag
    if (erasingRef.current) {
      erasingRef.current = false;
    }

    // If currently drawing a shape, finalize it
    if (drawingShapeRef.current && previewShapeRef.current) {
      const ps = previewShapeRef.current;
      const x = Math.min(ps.x, ps.x2); const y = Math.min(ps.y, ps.y2);
      const w = Math.abs(ps.x2 - ps.x); const h = Math.abs(ps.y2 - ps.y);
      const id = `shape-${Date.now()}`;
      const kind = ps.kind === 'cerchio' && h !== w ? 'ellisse' : ps.kind;
      const shapeObj = { id, kind, x, y, w, h, x2:ps.x2, y2:ps.y2, colore: ps.colore, spessore: ps.spessore };
      createShapeLocal(shapeObj, true);
      previewShapeRef.current = null; drawingShapeRef.current = false;
      try {
        canvasRef.current?.releasePointerCapture?.(pointerId);
      } catch (_) {}
      drawAll();
      return;
    }

    // If finishing a lazo selection, compute selected items
    if (selectingRef.current.active) {
      selectingRef.current.active = false;
      const sb = selectionBox;
      if (sb) {
        const x1 = Math.min(sb.x1,sb.x2), x2 = Math.max(sb.x1,sb.x2);
        const y1 = Math.min(sb.y1,sb.y2), y2 = Math.max(sb.y1,sb.y2);
        const selTratti = tratti.map((t,i)=> (t._bb && t._bb.minX>=x1 && t._bb.maxX<=x2 && t._bb.minY>=y1 && t._bb.maxY<=y2) ? i : null).filter(i=>i!==null);
        const selForme = forme.map((f)=> (f.x>=x1 && f.x+f.w<=x2 && f.y>=y1 && f.y+f.h<=y2) ? f.id : null).filter(i=>i!==null);
        setSelectedItems({ tratti: selTratti, forme: selForme });
      }
      setSelectionBox(null);
      try {
        canvasRef.current?.releasePointerCapture?.(pointerId);
      } catch (_) {}
      return;
    }

    if (!disegnando) {
      try {
        canvasRef.current?.releasePointerCapture?.(pointerId);
      } catch (_) {}
      eraseSessionRef.current.strokeIds.clear();
      eraseSessionRef.current.shapeIds.clear();
      return;
    }
    setDisegnando(false);
    // Flush finale di eventuali punti in buffer
    if (outgoingBufferRef.current.length) {
      emitOrPublish('stroke:points', {
        streamId: currentStreamId.current,
        points: outgoingBufferRef.current,
      });
      outgoingBufferRef.current = [];
    }

    const puntiFinali = puntiCorrentiRef.current;
    if (puntiFinali.length >= 2) {
      // If magicpen active, attempt to detect shape
      if (strumento === 'magicpen') {
        const detected = detectShapeFromStroke(puntiFinali);
        if (detected) {
          const id = `shape-${Date.now()}`;
          const shapeObj = { id, ...detected, colore, spessore };
          createShapeLocal(shapeObj, true);
        } else {
          // fallback to stroke
          const nuovoTratto = prepareStroke({
            id: currentStreamId.current,
            strumento,
            colore,
            spessore,
            punti: puntiFinali,
            autoreUserId: utenteId,
          });
          setTratti(prev => [...prev, nuovoTratto]);
          setUndoStack(prev => [...prev, { type: 'add', stroke: nuovoTratto }]);
          setRedoStack([]);
          salvaTratto(nuovoTratto);
        }
      } else if (strumento === 'gomma' && gommaPuntuale) {
        const gommaStroke = prepareStroke({
          id: currentStreamId.current,
          strumento: 'gomma',
          colore: '#ffffff',
          spessore,
          punti: puntiFinali,
          autoreUserId: utenteId,
        });
        setTratti(prev => [...prev, gommaStroke]);
        setUndoStack(prev => [...prev, { type: 'add', stroke: gommaStroke }]);
        setRedoStack([]);
        salvaTratto(gommaStroke);
      } else if (strumento !== 'gomma') {
        const nuovoTratto = prepareStroke({
          id: currentStreamId.current, // Usa l'ID dello stream per coerenza
          strumento,
          colore,
          spessore,
          punti: puntiFinali,
          autoreUserId: utenteId,
        });
        setTratti(prev => [...prev, nuovoTratto]);
        setUndoStack(prev => [...prev, { type: 'add', stroke: nuovoTratto }]);
        setRedoStack([]);
        salvaTratto(nuovoTratto);
      }
    }

    emitOrPublish('stroke:done', { streamId: currentStreamId.current });

    try {
      canvasRef.current?.releasePointerCapture?.(pointerId);
    } catch (_) {}

    puntiCorrentiRef.current = [];
    currentStreamId.current = null;
    eraseSessionRef.current.strokeIds.clear();
    eraseSessionRef.current.shapeIds.clear();
    drawAll(); // Chiamata finale per pulire il tratto locale
  }

  function pointerCancel(e) {
    if (panningRef.current.active) {
      panningRef.current.active = false;
      panningRef.current.viaContext = false;
      setIsPanning(false);
      setContextPanning(false);
    }
    if (e?.nativeEvent?.pointerType === 'touch') {
      touchesRef.current.delete(e.nativeEvent.pointerId);
      if (touchesRef.current.size < 2 && gestureRef.current.mode === 'panzoom') {
        gestureRef.current.mode = 'none';
      }
    }
    erasingRef.current = false;
    eraseSessionRef.current.strokeIds.clear();
    eraseSessionRef.current.shapeIds.clear();
    // Reset drawing/preview state
    if (drawingShapeRef.current) {
      drawingShapeRef.current = false;
      previewShapeRef.current = null;
      setTimeout(drawAll, 0);
    }
    if (selectingRef.current.active) {
      selectingRef.current.active = false;
      setSelectionBox(null);
      setTimeout(drawAll, 0);
    }
  }

  // == SALVATAGGIO STROKE ==
  async function salvaTratto(t) {
    try {
      setSalvando(true);
      if (utenteId === undefined || utenteId === null) {
        console.warn("Salvataggio stroke annullato: utenteId assente.");
        return;
      }
      const res = await fetch("/api/lavagna/tratto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: t.id, // Invia l'ID univoco
          lavagnaId,
          strumento: t.strumento,
          colore: t.colore,
          spessore: t.spessore,
          punti: t.punti
        })
      });
      const js = await res.json();
      if (res.ok) {
        const definitivo = prepareStroke({
          ...js.tratto,
          dbId: js.tratto.id,
          id: t.id, // mantieni lo streamId come id locale coerente
        });
        setTratti((prev) =>
          prev.map((s) => (s.id === t.id ? definitivo : s))
        );
        setUndoStack((prev) =>
          prev.map((a) =>
            a.type === "add" && a.stroke.id === t.id
              ? { ...a, stroke: definitivo }
              : a
          )
        );
      } else {
        console.error("Errore creazione tratto API:", js.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
      drawAll();
    }
  }

  // == UNDO / REDO ==
  function undo() {
    if (!undoStack.length) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((u) => u.slice(0, -1));
    setRedoStack((r) => [last, ...r]);

    if (last.type === "add") {
      const sid = last.stroke.id; // streamId
      setTratti((prev) => prev.filter((s) => s.id !== sid));
      const delId = last.stroke.dbId ?? sid;
      if (isAdmin || last.stroke.autoreUserId === utenteId) {
        fetch(`/api/lavagna/tratto/${delId}`, { method: "DELETE" }).catch(() => {});
        emitOrPublish("stroke:delete", { attivitaId, strokeId: sid });
      }
    } else if (last.type === "delete") {
      setTratti((prev) => [...prev, last.stroke]);
    }
    drawAll();
  }

  function redo() {
    if (!redoStack.length) return;
    const action = redoStack[0];
    setRedoStack((r) => r.slice(1));
    setUndoStack((u) => [...u, action]);

    if (action.type === "add") {
      setTratti((prev) => [...prev, action.stroke]);
    } else if (action.type === "delete") {
      const sid = action.stroke.id; // streamId
      setTratti((prev) => prev.filter((s) => s.id !== sid));
      const delId = action.stroke.dbId ?? sid;
      fetch(`/api/lavagna/tratto/${delId}`, { method: "DELETE" }).catch(() => {});
      emitOrPublish("stroke:delete", { attivitaId, strokeId: sid });
    }
    drawAll();
  }

  // == EXPORT ==
  function exportPNG() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `lavagna-${lavagnaId}.png`;
    a.click();
  }

  function exportPDF() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    // Fit image preserving aspect
    const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
    const w = canvas.width * ratio;
    const h = canvas.height * ratio;
    const x = (pageW - w) / 2;
    const y = (pageH - h) / 2;
    pdf.addImage(img, 'PNG', x, y, w, h);
    pdf.save(`lavagna-${lavagnaId}.pdf`);
  }

  // == PULISCI LAVAGNA (solo admin) ==
  const handlePulisciLavagna = useCallback(() => {
    if (!isAdmin) return;
    if (!window.confirm("Sei sicuro di voler cancellare tutto ciò che è stato scritto nella lavagna? Questa operazione è irreversibile.")) return;
    
    // Notifica realtime
    if (ablyRef.current.ch) {
      emitOrPublish("clear-lavagna", { lavagnaId, attivitaId });
    }

    // Persist: soft delete tutti i tratti lato server
    fetch(`/api/lavagna/clear?lavagnaId=${lavagnaId}`, { method: 'DELETE' })
      .then(res => {
        if (res.ok) {
          // Cancella localmente solo dopo successo API
          setTratti([]);
          setUndoStack([]);
          setRedoStack([]);
        } else {
          console.error("[handleClear] Errore API nel pulire la lavagna:", res.statusText);
        }
      })
      .catch(error => {
        console.error("[handleClear] Eccezione nella chiamata API per pulire la lavagna:", error);
      });
  }, [isAdmin, lavagnaId, attivitaId, emitOrPublish]);

  const handleChangeSfondo = useCallback((next) => {
    if (!isAdmin) return;
    setSfondo(next);
    emitOrPublish('background:change', { lavagnaId, attivitaId, sfondo: next });
    requestAnimationFrame(() => drawAll());
  }, [isAdmin, lavagnaId, attivitaId, emitOrPublish, drawAll]);

  // == TOOLBAR ==
  // == LAZO: selezione, sposta, duplica ==
  // == LAZO: selezione, sposta, duplica ==


  // Toolbar in basso al centro
  const toolbar = useMemo(
    () => {
      const shapeActive = ['rettangolo','cerchio','linea','magicpen'].includes(strumento);
      const shapeButtonActive = shapeActive || showShapesPopover;
      return (
      <div style={st.bottomToolbarDock}>
        <div style={st.toolbarPill}>
          {/* Lazzo (freccia selezione) */}
          <button
            type="button"
            style={iconBtn(strumento === 'lazzo')}
            onClick={() => { setStrumento('lazzo'); setShowPenPopover(false); setShowMoreMenu(false); setShowShapesPopover(false); }}
            title="Seleziona/sposta/duplica"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 3l18 9-7 2-2 7-9-18z" fill={strumento==='lazzo'? '#fff':'#20489a'}/></svg>
          </button>
          {/* Forme / Penna magica */}
          <div style={{ position:'relative' }}>
            <button
              type="button"
              style={iconBtn(shapeButtonActive)}
              onClick={() => {
                setShowShapesPopover((v) => !v);
                setShowPenPopover(false);
                setShowMoreMenu(false);
              }}
              title="Forme e gomma magica"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="10" height="10" rx="2" stroke={shapeButtonActive? '#fff':'#20489a'} strokeWidth="1.8" fill="none" />
                <circle cx="16.5" cy="7.5" r="4" stroke={shapeButtonActive? '#fff':'#20489a'} strokeWidth="1.8" fill="none" />
                <path d="M4 4l6 6" stroke={shapeButtonActive? '#fff':'#20489a'} strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            {showShapesPopover && (
              <div style={st.popover}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0,1fr))', gap:8 }}>
                  <button
                    type="button"
                    style={iconBtn(strumento === 'rettangolo')}
                    onClick={() => { setStrumento('rettangolo'); setShowShapesPopover(false); setShowPenPopover(false); setShowMoreMenu(false); }}
                    title="Rettangolo"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="3" stroke={strumento==='rettangolo'? '#fff':'#20489a'} strokeWidth="2" fill="none"/></svg>
                  </button>
                  <button
                    type="button"
                    style={iconBtn(strumento === 'cerchio')}
                    onClick={() => { setStrumento('cerchio'); setShowShapesPopover(false); setShowPenPopover(false); setShowMoreMenu(false); }}
                    title="Cerchio / Ellisse"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke={strumento==='cerchio'? '#fff':'#20489a'} strokeWidth="2" fill="none"/></svg>
                  </button>
                  <button
                    type="button"
                    style={iconBtn(strumento === 'linea')}
                    onClick={() => { setStrumento('linea'); setShowShapesPopover(false); setShowPenPopover(false); setShowMoreMenu(false); }}
                    title="Linea"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><line x1="5" y1="19" x2="19" y2="5" stroke={strumento==='linea'? '#fff':'#20489a'} strokeWidth="2"/></svg>
                  </button>
                  <button
                    type="button"
                    style={iconBtn(strumento === 'magicpen')}
                    onClick={() => { setStrumento('magicpen'); setShowShapesPopover(false); setShowPenPopover(false); setShowMoreMenu(false); }}
                    title="Gomma magica (auto-figure)"
                  >
                    <span style={{fontSize:18}}>✨</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Mano / Pan */}
          <button
            type="button"
            style={iconBtn(strumento === 'mano')}
            onClick={() => { setStrumento('mano'); setShowPenPopover(false); setShowMoreMenu(false); setShowShapesPopover(false); }}
            title="Sposta lavagna (mano)"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M7.5 11V5.75a1.25 1.25 0 1 1 2.5 0V11m0-3.25V4.75a1.25 1.25 0 1 1 2.5 0V11m0-1.25V6.75a1.25 1.25 0 1 1 2.5 0V13m0-2.25V8.75a1.25 1.25 0 1 1 2.5 0V15.5c0 2.485-2.015 4.5-4.5 4.5s-4.5-2.015-4.5-4.5V13" stroke={strumento==='mano'? '#fff':'#20489a'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </button>
          {/* Penna con popover */}
          <div style={{ position:'relative' }}>
            <button
              type="button"
              style={iconBtn(strumento === 'penna')}
              onClick={() => { setStrumento('penna'); setShowPenPopover(v=>!v); setShowMoreMenu(false); setShowShapesPopover(false); }}
              title="Penna"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 21l3-1 11-11-2-2L4 18l-1 3z" fill={strumento==='penna'? '#fff':'#20489a'}/></svg>
            </button>
            {showPenPopover && (
              <div style={st.popover}>
                <div style={st.colorPickerBlock}>
                  <label style={st.colorLabel}>Colore</label>
                  <input
                    type="color"
                    value={colore}
                    onChange={(e)=>setColore(e.target.value)}
                    style={st.colorInput}
                  />
                </div>
                <div style={st.penOptionsRow}>
                  <span style={st.sizeLabel}>{spessore}px</span>
                  <input type="range" min={1} max={25} value={spessore} onChange={(e)=>setSpessore(Number(e.target.value))} />
                </div>
              </div>
            )}
          </div>
          {/* Gomma */}
          <button
            type="button"
            style={iconBtn(strumento === 'gomma')}
            onClick={() => { setStrumento('gomma'); setShowPenPopover(false); setShowMoreMenu(false); setShowShapesPopover(false); }}
            title="Gomma"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M16 3l5 5-9 9H7L2 12l9-9 5 0z" fill={strumento==='gomma'? '#fff':'#20489a'} /></svg>
          </button>
          {/* forme e penna magica: implementazione rimandata (segnaposto) */}
          {/* More */}
          <div style={{ position:'relative' }}>
            <button type="button" style={iconBtn(false)} onClick={()=> { setShowMoreMenu(v=>!v); setShowPenPopover(false); setShowShapesPopover(false); }} title="Altro">⋯</button>
            {showMoreMenu && (
              <div style={st.popover}>
                {isAdmin ? (
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <label style={{ fontSize:12, color:'#20489a', fontWeight:600 }}>Sfondo</label>
                    <select value={sfondo} onChange={(e)=>handleChangeSfondo(e.target.value)} style={{ padding:'6px 8px', borderRadius:8 }}>
                      <option value="bianco">Bianco</option>
                      <option value="nero">Nero</option>
                      <option value="righe">Righe</option>
                      <option value="quadretti">Quadretti</option>
                      <option value="punti">Punti</option>
                    </select>
                  </div>
                ) : (
                  <div style={st.readOnlyRow}>
                    <span style={st.toggleLbl}>Sfondo</span>
                    <span style={st.readOnlyValue}>{sfondoLabels[sfondo] || sfondo}</span>
                  </div>
                )}
                <div style={{ ...st.toggleWrap, marginBottom:8 }}>
                  <input
                    id="gomma-puntuale-toggle"
                    type="checkbox"
                    checked={gommaPuntuale}
                    onChange={(e)=>setGommaPuntuale(e.target.checked)}
                    style={{ margin:0, accentColor:'#1cb0f6', cursor:'pointer' }}
                  />
                  <label htmlFor="gomma-puntuale-toggle" style={st.toggleLbl}>Gomma puntuale</label>
                </div>
                {isAdmin && (
                  <button type="button" style={{ ...btn(false), background:'#ff6464', color:'#fff', fontWeight:700, marginTop:8 }} onClick={handlePulisciLavagna}>Pulisci lavagna</button>
                )}
              </div>
            )}
          </div>
        </div>
        {salvando && <span style={st.saving}>Salvataggio…</span>}
      </div>
    );
    },
    [
      strumento,
      colore,
      spessore,
      undoStack.length,
      redoStack.length,
      salvando,
      gommaPuntuale,
      sfondo,
      zoom,
      showPenPopover,
      showShapesPopover,
      showMoreMenu,
      isAdmin,
      handleChangeSfondo
    ]
  );

  const canvasCursor = useMemo(() => {
    if (contextPanning || (strumento === 'mano' && isPanning)) return 'grabbing';
    if (strumento === 'mano') return 'grab';
    if (strumento === 'gomma') return `url(${st.eraserCursor}) 4 20, auto`;
    return `url(${st.penCursor}) 0 24, crosshair`;
  }, [contextPanning, strumento, isPanning]);

  // == RENDER ==
  return (
    <div style={st.wrapper}>
      {/* Azioni in alto a destra all'esterno della lavagna */}
      <div style={st.topRightActionsOuter}>
        <button style={btn(false)} onClick={undo} disabled={!undoStack.length} type="button">Undo</button>
        <button style={btn(false)} onClick={redo} disabled={!redoStack.length} type="button">Redo</button>
        <button style={btn(false)} onClick={exportPNG} type="button">Export PNG</button>
        <button style={btn(false)} onClick={exportPDF} type="button">Export PDF</button>
        {openInNewWindow && attivitaId && (
          <button
            style={btn(false)}
            onClick={() => window.open(`/lavagna/full?attivitaId=${attivitaId}`, "_blank")}
            type="button"
          >
            Apri in un'altra finestra
          </button>
        )}
      </div>
      <div style={st.canvasBox}>
        {toolbar}
        <canvas
          ref={canvasRef}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerLeave={pointerUp}
          onPointerCancel={pointerCancel}
          onWheel={onWheel}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            ...st.canvas,
            cursor: canvasCursor
          }}
        />
      </div>
    </div>
  );
};

// == STYLES ==
const st = {
  wrapper: { width: "100%", userSelect: "none" },
  bottomToolbar: {
    position: "absolute",
    left: "50%",
    bottom: 18,
    transform: "translateX(-50%)",
    display: "flex",
    gap: 8,
    alignItems: "center",
    background: "rgba(248,251,255,0.95)",
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid #dbe6f5",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    zIndex: 2
  },
  bottomToolbarDock: {
    position: "absolute",
    left: "50%",
    bottom: 18,
    transform: "translateX(-50%)",
    zIndex: 2
  },
  toolbarPill: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    padding: '6px 8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
  },
  popover: {
    position: 'absolute',
    bottom: '110%',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#fff',
    border: '1px solid #e5e7eb',
    boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
    borderRadius: 12,
    padding: 12,
    minWidth: 220
  },
  toolbarToggle: {
    border: "none",
    background: "#e3eefe",
    color: "#20489a",
    borderRadius: 8,
    fontWeight: 700,
    width: 32,
    height: 32,
    cursor: "pointer"
  },
  topRightActions: {
    position: "absolute",
    right: 12,
    top: 12,
    display: "flex",
    gap: 8,
    zIndex: 2
  },
  topRightActionsOuter: {
    position: "relative",
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
    marginBottom: 8
  },
  group: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    background: "#f8fbff",
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid #dbe6f5"
  },
  colorPickerBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    alignItems: 'flex-start'
  },
  colorLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#20489a'
  },
  colorInput: {
    width: 180,
    height: 120,
    border: 'none',
    padding: 0,
    cursor: 'pointer'
  },
  penOptionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 10
  },
  sizeLabel: { fontSize: 12, fontWeight: 600, color: "#20489a" },
  saving: { fontSize: 12, fontWeight: 600, color: "#8C7800" },
  canvasBox: {
    position: "relative",
    border: "1px solid #dbe6f5",
    background: "#fff",
    borderRadius: 14,
    overflow: "hidden"
  },
  canvas: {
    // Permetti gesti (pinch-zoom, pan) controllati dal componente
    touchAction: "none",
    display: "block",
    cursor: "crosshair",
    width: "100%",
    height: "100%"
  },
  toggleWrap: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "#e3eefe",
    padding: "4px 8px",
    borderRadius: 8
  },
  readOnlyRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    background: "#f1f5ff",
    padding: "6px 10px",
    borderRadius: 8,
    marginBottom: 8
  },
  readOnlyValue: {
    fontSize: 12,
    fontWeight: 600,
    color: "#20489a"
  },
  toggleLbl: {
    fontSize: 11,
    fontWeight: 600,
    color: "#20489a",
    letterSpacing: ".3px"
  },
  // cursori SVG embedded (data URL)
  penCursor:
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path d="M3 21l3-1 11-11-2-2L4 18l-1 3z" fill="#20489a"/>
        <path d="M14 5l2 2 2-2-2-2-2 2z" fill="#1cb0f6"/>
      </svg>
    `),
  eraserCursor:
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path d="M3 16l7-7 8 8-3 3H6z" fill="#ff6464"/>
        <path d="M10 9l2-2 8 8-2 2z" fill="#ffd1d1"/>
      </svg>
    `)
};

const btn = (active) => ({
  background: active ? "#1cb0f6" : "#e3eefe",
  color: active ? "#fff" : "#20489a",
  border: "none",
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  padding: "6px 12px",
  cursor: "pointer"
});

const iconBtn = (active) => ({
  width: 32,
  height: 32,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 8,
  border: '1px solid #dbe6f5',
  background: active ? '#1cb0f6' : '#f8fbff',
  color: active ? '#fff' : '#20489a',
  cursor: 'pointer'
});

const overlayBlock = {
  position: "absolute",
  inset: 0,
  background: "rgba(255,255,255,0.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 600,
  fontSize: 14,
  color: "#20489a",
  backdropFilter: "blur(2px)"
};

// final newline to ensure parser happy
