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

  const [strumento, setStrumento] = useState("penna");
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
  const [zoom, setZoom] = useState(1); // 1 = 100%
  const palette = ["#2563eb", "#fb7185", "#10b981", "#f59e0b", "#8b5cf6"]; 
  const colorInputRef = useRef(null);
  const [pan, setPan] = useState({ x: 0, y: 0 }); // pan in unità mondo
  const panningRef = useRef({ active: false, lastX: 0, lastY: 0 });
  const touchesRef = useRef(new Map()); // pointerId -> { x,y }
  const gestureRef = useRef({ mode: 'none', startZoom: 1, startPan: { x: 0, y: 0 }, startDist: 0, startMidWorld: { x: 0, y: 0 } });

  const isAdmin = String(ruolo || "").toLowerCase() === "admin";
  const eraseSessionRef = useRef({
    ids: new Set(),
    lastX: null,
    lastY: null
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

  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
  }, [tratti, strumento, gommaPuntuale, colore, spessore, sfondo, zoom, pan.x, pan.y]);

  // Loop di rendering per il disegno locale
  const renderLoop = useCallback(() => {
    drawAll();
    animationFrameId.current = requestAnimationFrame(renderLoop);
  }, [drawAll]);

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
    ch.subscribe('clear-lavagna', onClear);

    return () => {
      try {
        ch.unsubscribe('stroke:start', onStart);
        ch.unsubscribe('stroke:points', onPoints);
        ch.unsubscribe('stroke:done', onDone);
        ch.unsubscribe('stroke:delete', onDelete);
        ch.unsubscribe('clear-lavagna', onClear);
      } catch (_) {}
    };
  }, [channelName, drawAll]);

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
    // Zoom solo sulla lavagna: intercetta sempre la rotella sul canvas
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;
    const worldBefore = { x: pan.x + offX / zoom, y: pan.y + offY / zoom };
    const factor = e.deltaY > 0 ? 0.9 : 1.1; // out/in
    const newZoom = Math.min(2, Math.max(0.5, Math.round((zoom * factor) * 100) / 100));
    // mantieni il punto sotto il cursore fermo
    const newPan = {
      x: worldBefore.x - offX / newZoom,
      y: worldBefore.y - offY / newZoom,
    };
    setZoom(newZoom);
    setPan(newPan);
  }, [zoom, pan.x, pan.y]);

  // == CANCELLAZIONE INTERO TRATTO ==
  const eraseStrokeAt = useCallback(
    (x, y) => {
      for (let i = tratti.length - 1; i >= 0; i--) {
        const st = tratti[i];
        if (eraseSessionRef.current.ids.has(st.id)) continue;
        if (hitTestStroke(x, y, st)) {
          setTratti((prev) => prev.filter((_, idx) => idx !== i));
          eraseSessionRef.current.ids.add(st.id);
          setUndoStack((prev) => [...prev, { type: "delete", stroke: st }]);
          setRedoStack([]);
          
          // Pubblica sempre la cancellazione (usa streamId)
          emitOrPublish("stroke:delete", { attivitaId, strokeId: st.id });

          // Cancella lato server: preferisci dbId se presente, altrimenti streamId
          const delId = st.dbId ?? st.id;
          fetch(`/api/lavagna/tratto/${delId}`, { method: "DELETE" }).catch(() => {});
        }
      }
      drawAll();
    },
    [tratti, drawAll, attivitaId, emitOrPublish]
  );

  // == POINTER EVENTS ==
  function pointerDown(e) {
    // Tasto destro: pan
    if (e.nativeEvent.button === 2) {
      const canvas = canvasRef.current;
      canvas.setPointerCapture?.(e.nativeEvent.pointerId);
      panningRef.current.active = true;
      panningRef.current.lastX = e.nativeEvent.clientX;
      panningRef.current.lastY = e.nativeEvent.clientY;
      return;
    }

    // Touch multi-dita: gesti pan/zoom
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

    setDisegnando(true);
    const punto = getPoint(e);

    if (strumento === 'gomma' && !gommaPuntuale) {
      eraseStrokeAt(punto.x, punto.y);
      return;
    }

    puntiCorrentiRef.current = [punto];
    animationFrameId.current = requestAnimationFrame(renderLoop);
    
    const streamId = `${utenteId}-${Date.now()}`;
    currentStreamId.current = streamId;

    emitOrPublish('stroke:start', {
      streamId,
      strumento,
      colore,
      spessore,
      start: punto,
    });
  }

  function pointerMove(e) {
    // Panning con tasto destro
    if (panningRef.current.active) {
      const dx = e.nativeEvent.clientX - panningRef.current.lastX;
      const dy = e.nativeEvent.clientY - panningRef.current.lastY;
      panningRef.current.lastX = e.nativeEvent.clientX;
      panningRef.current.lastY = e.nativeEvent.clientY;
      setPan((p) => ({ x: p.x - dx / zoom, y: p.y - dy / zoom }));
      return;
    }

    // Pan/zoom multitouch
    if (e.nativeEvent.pointerType === 'touch' && gestureRef.current.mode === 'panzoom') {
      if (touchesRef.current.has(e.nativeEvent.pointerId)) {
        touchesRef.current.set(e.nativeEvent.pointerId, { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY });
      }
      if (touchesRef.current.size >= 2) {
        const pts = Array.from(touchesRef.current.values());
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        const dist = Math.hypot(dx, dy);
        const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        const rect = canvasRef.current.getBoundingClientRect();
        const midOff = { x: mid.x - rect.left, y: mid.y - rect.top };
        const g = gestureRef.current;
        // aggiorna zoom
        const newZoom = Math.min(2, Math.max(0.5, g.startZoom * (dist / (g.startDist || 1))));
        setZoom(newZoom);
        // mantieni il punto medio mondo ancorato allo stesso punto dello schermo
        const midWorld = g.startMidWorld;
        const newPanX = midWorld.x - midOff.x / newZoom;
        const newPanY = midWorld.y - midOff.y / newZoom;
        setPan({ x: newPanX, y: newPanY });
      }
      return;
    }

    if (!disegnando) return;
    const punto = getPoint(e);

    if (strumento === 'gomma' && !gommaPuntuale) {
      eraseStrokeAt(punto.x, punto.y);
      return;
    }
    
    puntiCorrentiRef.current.push(punto);
    outgoingBufferRef.current.push(punto);
    if (!outgoingRAFRef.current) {
      outgoingRAFRef.current = requestAnimationFrame(flushOutgoing);
    }
  }

  function pointerUp() {
    if (panningRef.current.active) {
      panningRef.current.active = false;
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
    if (!disegnando) return;
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
    if (strumento !== 'gomma' && puntiFinali.length >= 2) {
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

    emitOrPublish('stroke:done', { streamId: currentStreamId.current });
    
    puntiCorrentiRef.current = [];
    currentStreamId.current = null;
    eraseSessionRef.current.ids.clear();
    drawAll(); // Chiamata finale per pulire il tratto locale
  }

  function pointerCancel(e) {
    if (panningRef.current.active) {
      panningRef.current.active = false;
    }
    if (e?.nativeEvent?.pointerType === 'touch') {
      touchesRef.current.delete(e.nativeEvent.pointerId);
      if (touchesRef.current.size < 2 && gestureRef.current.mode === 'panzoom') {
        gestureRef.current.mode = 'none';
      }
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

  // == TOOLBAR ==
  // Toolbar in basso al centro
  const toolbar = useMemo(
    () => (
      <div style={st.bottomToolbar}>
        <div style={st.group}>
          <button
            style={btn(strumento === "penna")}
            onClick={() => setStrumento("penna")}
            type="button"
          >
            Penna
          </button>
          <button
            style={btn(strumento === "gomma")}
            onClick={() => setStrumento("gomma")}
            type="button"
          >
            Gomma
          </button>
          {strumento === "gomma" && (
            <label style={st.toggleWrap}>
              <input
                type="checkbox"
                checked={gommaPuntuale}
                onChange={(e) => setGommaPuntuale(e.target.checked)}
              />
              <span style={st.toggleLbl}>Gomma puntuale</span>
            </label>
          )}
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {palette.map((c) => (
              <button
                key={c}
                onClick={() => setColore(c)}
                type="button"
                title={c}
                style={{ width:22, height:22, borderRadius:6, border: c===colore? '2px solid #20489a':'1px solid #dbe6f5', background:c, cursor:'pointer' }}
              />
            ))}
            {/* Picker nascosto + pulsante "ruota colori" */}
            <input
              ref={colorInputRef}
              type="color"
              value={colore}
              onChange={(e) => setColore(e.target.value)}
              style={{ position:'absolute', width:1, height:1, opacity:0, pointerEvents:'none' }}
            />
            <button
              type="button"
              onClick={() => colorInputRef.current?.click()}
              title="Altro colore"
              style={st.colorWheelBtn}
            />
          </div>
          <input
            type="range"
            min={1}
            max={25}
            value={spessore}
            onChange={(e) => setSpessore(Number(e.target.value))}
          />
          <span style={st.sizeLabel}>{spessore}px</span>
          <select value={sfondo} onChange={(e)=>setSfondo(e.target.value)} style={{ padding:'6px 8px', borderRadius:8 }}>
            <option value="bianco">Bianco</option>
            <option value="nero">Nero</option>
            <option value="righe">Righe</option>
            <option value="quadretti">Quadretti</option>
            <option value="punti">Punti</option>
          </select>
          {/* Zoom slider rimosso: lo zoom si controlla con CTRL + rotella */}
        </div>
        {salvando && <span style={st.saving}>Salvataggio…</span>}
      </div>
    ),
    [
      strumento,
      colore,
      spessore,
      undoStack.length,
      redoStack.length,
      salvando,
      gommaPuntuale,
      sfondo,
      zoom
    ]
  );

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
            cursor: strumento === 'gomma'
              ? `url(${st.eraserCursor}) 4 20, auto`
              : `url(${st.penCursor}) 0 24, crosshair`
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
  color: {
    width: 22,
    height: 22,
    padding: 0,
    border: "none",
    background: "transparent",
    cursor: "pointer"
  },
  colorWheelBtn: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    border: '1px solid #dbe6f5',
    background: 'conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)',
    cursor: 'pointer'
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