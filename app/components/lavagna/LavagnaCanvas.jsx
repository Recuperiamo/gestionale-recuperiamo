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
  const palette = ["#20489a", "#000000", "#ff0000", "#1cb0f6", "#22c55e", "#f59e0b", "#a855f7", "#ef4444"]; 

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

    // sfondo
    const W = ctx.canvas.width / (window.devicePixelRatio || 1);
    const H = ctx.canvas.height / (window.devicePixelRatio || 1);
    // fill base
    if (sfondo === 'nero') {
      ctx.fillStyle = '#000';
    } else {
      ctx.fillStyle = '#fff';
    }
    ctx.fillRect(0, 0, W, H);

    // pattern righe / quadretti / punti
    if (sfondo === 'righe' || sfondo === 'quadretti' || sfondo === 'punti') {
      const step = 32; // px
      ctx.strokeStyle = sfondo === 'righe' ? '#e5e7eb' : '#e2e8f0';
      ctx.fillStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      if (sfondo === 'righe' || sfondo === 'quadretti') {
        for (let y = step; y < H; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
          ctx.stroke();
        }
      }
      if (sfondo === 'quadretti') {
        for (let x = step; x < W; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, H);
          ctx.stroke();
        }
      }
      if (sfondo === 'punti') {
        for (let y = step; y < H; y += step) {
          for (let x = step; x < W; x += step) {
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // applichiamo lo zoom per lo strato di disegno
    ctx.save();
    ctx.scale(zoom, zoom);

    // Tratti persistiti
    tratti.forEach((t) => {
      if (!t.punti || t.punti.length < 2) return;
      ctx.globalCompositeOperation = t.strumento === 'gomma' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = t.strumento === 'gomma' ? '#fff' : t.colore || '#20489a';
      ctx.lineWidth = t.spessore || 3;
      ctx.beginPath();
      t.punti.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.stroke();
    });

    // Stream remoti in corso
    for (const st of remoteStreams.current.values()) {
      if (!st.punti || st.punti.length < 2) continue;
      ctx.globalCompositeOperation = st.strumento === 'gomma' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = st.strumento === 'gomma' ? '#fff' : st.colore || '#20489a';
      ctx.lineWidth = st.spessore || 3;
      ctx.beginPath();
      st.punti.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.stroke();
    }

    // Tratto locale in corso
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
  }, [tratti, strumento, gommaPuntuale, colore, spessore, sfondo, zoom]);

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
    const x = e.nativeEvent.offsetX / zoom;
    const y = e.nativeEvent.offsetY / zoom;
    return { x, y };
  }, [zoom]);

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
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            {palette.map((c) => (
              <button key={c} onClick={() => setColore(c)} type="button" title={c}
                style={{ width:22, height:22, borderRadius:6, border: c===colore? '2px solid #20489a':'1px solid #dbe6f5', background:c, cursor:'pointer' }} />
            ))}
            <input
              type="color"
              disabled={strumento === "gomma"}
              value={colore}
              onChange={(e) => setColore(e.target.value)}
              style={st.color}
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
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:12, color:'#20489a', fontWeight:600 }}>Zoom</span>
            <input type="range" min={50} max={200} value={Math.round(zoom*100)} onChange={(e)=>setZoom(Number(e.target.value)/100)} />
            <span style={st.sizeLabel}>{Math.round(zoom*100)}%</span>
          </div>
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
      <div style={st.canvasBox}>
        {toolbar}
        {/* Azioni in alto a destra per entrambi gli user */}
        <div style={st.topRightActions}>
          <button style={btn(false)} onClick={undo} disabled={!undoStack.length} type="button">Undo</button>
          <button style={btn(false)} onClick={redo} disabled={!redoStack.length} type="button">Redo</button>
          <button style={btn(false)} onClick={exportPNG} type="button">Export PNG</button>
          <button style={btn(false)} onClick={exportPDF} type="button">Export PDF</button>
        </div>
        <canvas
          ref={canvasRef}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerLeave={pointerUp}
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
    width: 40,
    height: 40,
    padding: 0,
    border: "none",
    background: "transparent",
    cursor: "pointer"
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