"use client";
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo
} from "react";
import { getAblyChannel, whenChannelAttached } from "../../lib/realtime/ablyClient";

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
    (trattiIniziali || []).map(prepareStroke)
  );
  const [disegnando, setDisegnando] = useState(false);
  const puntiCorrentiRef = useRef([]);
  const [salvando, setSalvando] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [gommaPuntuale, setGommaPuntuale] = useState(false);

  const isAdmin = String(ruolo || "").toLowerCase() === "admin";
  const eraseSessionRef = useRef({
    ids: new Set(),
    lastX: null,
    lastY: null
  });
  const animationFrameId = useRef(null);

  // Loop di rendering per il disegno locale
  const renderLoop = useCallback(() => {
    drawAll();
    animationFrameId.current = requestAnimationFrame(renderLoop);
  }, [drawAll]);

  // Stream remoti in tempo reale (non persistiti finché non "done")
  const remoteStreams = useRef(new Map()); // streamId -> { strumento, colore, spessore, punti: [] }
  const currentStreamId = useRef(null);
  const throttler = useRef({ last: 0 });

  // Disegno completo astratto (spostato prima dell'useEffect realtime per evitare TDZ minificata)
  const drawAll = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

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

    ctx.globalCompositeOperation = 'source-over';
  }, [tratti, strumento, gommaPuntuale, colore, spessore]);

  // === SOCKET.IO SETUP ===
  // Replace with Ably-first setup, fallback to Socket.IO
  useEffect(() => {
    if (!attivitaId) return;

    const channelName = `lavagna:${attivitaId}`;
    const ablyCh = getAblyChannel(channelName);
    ablyRef.current.ch = ablyCh;
    
    whenChannelAttached(channelName).catch(err => {
      console.warn('[LavagnaCanvas] channel attach failed', err?.message);
    });

    const onStart = (msg) => {
      const { data } = msg;
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
      const { data } = msg;
      const { streamId, points } = data || {};
      if (!streamId || !Array.isArray(points) || points.length === 0) return;
      const st = remoteStreams.current.get(streamId);
      if (!st) return;
      st.punti.push(...points);
      drawAll();
    };

    const onDone = (msg) => {
      const { data } = msg;
      const { streamId } = data || {};
      const st = remoteStreams.current.get(streamId);
      if (st && st.punti.length >= 2) {
        const definitivo = prepareStroke({
          id: `remote-${Date.now()}`,
          strumento: st.strumento,
          colore: st.colore,
          spessore: st.spessore,
          punti: st.punti,
          autoreUserId: "remote"
        });
        setTratti((prev) => [...prev, definitivo]);
      }
      remoteStreams.current.delete(streamId);
      drawAll();
    };

    const onDelete = (msg) => {
      const { data } = msg;
      const { strokeId } = data || {};
      if (!strokeId) return;
      setTratti((prev) => prev.filter((t) => String(t.id) !== String(strokeId)));
      drawAll();
    };

    const onClear = () => {
      setTratti([]);
      setUndoStack([]);
      setRedoStack([]);
      remoteStreams.current.clear();
      drawAll();
    };

    ablyCh.subscribe("stroke:start", onStart);
    ablyCh.subscribe("stroke:points", onPoints);
    ablyCh.subscribe("stroke:done", onDone);
    ablyCh.subscribe("stroke:delete", onDelete);
    ablyCh.subscribe("clear-lavagna", onClear);

    return () => {
      try {
        ablyCh.unsubscribe();
        ablyCh.detach?.();
      } catch {}
    };
  }, [attivitaId, drawAll]);

  // Helper per inviare eventi realtime (semplice: aspetta attach e invia)
  const emitOrPublish = useCallback((eventName, payload) => {
    const ch = ablyRef.current.ch;
    if (!ch) return;

    const doPublish = () => {
      ch.publish(eventName, payload);
    };

    if (ch.state !== 'attached') {
      whenChannelAttached(ch.name)
        .then(doPublish)
        .catch(err => {
          console.error(`[publish drop ${eventName}] attach failed:`, err);
        });
    } else {
      doPublish();
    }
  }, [lavagnaId]);

  // == UTILITIES ==
  function prepareStroke(s) {
    if (!s || !Array.isArray(s.punti)) return s;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
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

  // drawAll spostata sopra

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
          
          // Pubblica sempre la cancellazione
          emitOrPublish("stroke:delete", { attivitaId, strokeId: st.id });

          // Se l'ID è numerico, è un tratto salvato, quindi chiamiamo anche l'API
          if (typeof st.id === "number") {
            fetch(`/api/lavagna/tratto/${st.id}`, { method: "DELETE" }).catch(() => {});
          }
        }
      }
      drawAll();
    },
    [tratti, drawAll, attivitaId, emitOrPublish]
  );

  // == POINTER EVENTS ==
  function pointerDown(e) {
    setDisegnando(true);
    const punto = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };

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
    
    const punto = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };

    if (strumento === 'gomma' && !gommaPuntuale) {
      eraseStrokeAt(punto.x, punto.y);
      return;
    }
    
    puntiCorrentiRef.current.push(punto);

    const now = Date.now();
    if (now - throttler.current.last < 30) return; // Limita a ~30fps
    throttler.current.last = now;

    emitOrPublish('stroke:points', {
      streamId: currentStreamId.current,
      points: [punto],
    });
  }

  function pointerUp() {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (!disegnando) return;
    setDisegnando(false);
    
    const puntiFinali = puntiCorrentiRef.current;
    if (strumento !== 'gomma' && puntiFinali.length >= 2) {
      const nuovoTratto = prepareStroke({
        id: `local-${Date.now()}`,
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
          lavagnaId,
          strumento: t.strumento,
          colore: t.colore,
          spessore: t.spessore,
          punti: t.punti
        })
      });
      const js = await res.json();
      if (res.ok) {
        const definitivo = prepareStroke(js.tratto);
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
      const sid = last.stroke.id;
      setTratti((prev) => prev.filter((s) => s.id !== sid));
      if (
        typeof sid === "number" &&
        (isAdmin || last.stroke.autoreUserId === utenteId)
      ) {
        fetch(`/api/lavagna/tratto/${sid}`, { method: "DELETE" }).catch(() => {});
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
      const sid = action.stroke.id;
      setTratti((prev) => prev.filter((s) => s.id !== sid));
      if (typeof sid === "number") {
        fetch(`/api/lavagna/tratto/${sid}`, { method: "DELETE" }).catch(() => {});
        emitOrPublish("stroke:delete", { attivitaId, strokeId: sid });
      }
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
  const toolbar = useMemo(
    () => (
      <div style={st.toolbar}>
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
          <input
            type="color"
            disabled={strumento === "gomma"}
            value={colore}
            onChange={(e) => setColore(e.target.value)}
            style={st.color}
          />
          <input
            type="range"
            min={1}
            max={25}
            value={spessore}
            onChange={(e) => setSpessore(Number(e.target.value))}
          />
          <span style={st.sizeLabel}>{spessore}px</span>
        </div>
        <div style={st.group}>
          <button
            style={btn(false)}
            onClick={undo}
            disabled={!undoStack.length}
            type="button"
          >
            Undo
          </button>
          <button
            style={btn(false)}
            onClick={redo}
            disabled={!redoStack.length}
            type="button"
          >
            Redo
          </button>
          <button style={btn(false)} onClick={exportPNG} type="button">
            Export PNG
          </button>
          {openInNewWindow && attivitaId && (
            <button
              style={btn(false)}
              onClick={() =>
                window.open(`/lavagna/full?attivitaId=${attivitaId}`, "_blank")
              }
              type="button"
            >
              Apri in un'altra finestra
            </button>
          )}
        </div>
        {isAdmin && (
          <div style={st.group}>
            <button
              style={{
                ...btn(false),
                background: "#ff6464",
                color: "#fff",
                fontWeight: 700
              }}
              onClick={handlePulisciLavagna}
              type="button"
            >
              🧹 Pulisci lavagna
            </button>
          </div>
        )}
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
      openInNewWindow,
      attivitaId,
      isAdmin,
      handlePulisciLavagna
    ]
  );

  // == RENDER ==
  return (
    <div style={st.wrapper}>
      {toolbar}
      <div style={st.canvasBox}>
        <canvas
          ref={canvasRef}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerLeave={pointerUp}
          style={{...st.canvas, cursor: strumento === 'gomma' && !gommaPuntuale ? 'not-allowed' : 'crosshair'}}
        />
      </div>
    </div>
  );
};

// == STYLES ==
const st = {
  wrapper: { width: "100%", userSelect: "none" },
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
    marginBottom: 12
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
  }
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