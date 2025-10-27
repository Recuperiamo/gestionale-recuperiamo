"use client";
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo
} from "react";
import { getAblyChannel, getAblyChannelAsync, whenChannelAttachedAsync } from "../../lib/realtime/ablyClient";

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
  isNewLavagna = false,
  topRightPlacement = "in-canvas",
  onActionsChange
}) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const overlayRef = useRef(null);
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
  // Use a ref for background save activity to avoid re-renders that can cause UI lag
  const salvandoRef = useRef(false);
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
  const penPalette = useMemo(() => [
    "#111827",
    "#2563eb",
    "#ef4444",
    "#16a34a",
    "#f97316",
    "#facc15",
    "#a855f7"
  ], []);
  const colorInputRef = useRef(null);
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
  const [showExportMenu, setShowExportMenu] = useState(false);
  // undoMode removed: we show separate Undo / Redo buttons
  const panningRef = useRef({ active: false, lastX: 0, lastY: 0, viaContext: false });
  const touchesRef = useRef(new Map()); // pointerId -> { x,y }
  const gestureRef = useRef({ mode: 'none', startZoom: 1, startPan: { x: 0, y: 0 }, startDist: 0, startMidWorld: { x: 0, y: 0 } });
  const [spectatorMode, setSpectatorMode] = useState(false);
  const spectatorModeRef = useRef(false);
  const latestAdminViewportRef = useRef(null);
  const viewportBroadcastRef = useRef({ rafId: null, payload: null });
  const spectatorStorageKey = useMemo(() => {
    const keySource = attivitaId ?? lavagnaId;
    if (!keySource || !utenteId) return null;
    return `lavagna:spectator:${keySource}:${utenteId}`;
  }, [attivitaId, lavagnaId, utenteId]);
  const spectatorToggleId = useMemo(() => {
    const base = String(attivitaId ?? lavagnaId ?? 'lavagna');
    return `spectator-toggle-${base.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  }, [attivitaId, lavagnaId]);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const spectatorRosterRef = useRef(new Set());
  const [spectatorCount, setSpectatorCount] = useState(0);
  const exportMenuRef = useRef(null);

  const penCursor = useMemo(() => {
    if (strumento !== "penna") return null;
    // Scale cursor to reflect visible stroke size under current zoom
    const effectiveSize = spessore * 4 * (zoom || 1);
    const diameter = Math.max(12, Math.min(effectiveSize, 48));
    const size = Math.round(diameter);
    const radius = size / 2;
    const strokeWidth = Math.max(2, Math.round(size * 0.18));
    const innerRadius = Math.max(radius - strokeWidth / 2, 1);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${radius}" cy="${radius}" r="${radius}" fill="${colore}" />
        <circle cx="${radius}" cy="${radius}" r="${innerRadius}" fill="${colore}" stroke="white" stroke-width="${strokeWidth}" opacity="0.85" />
      </svg>
    `;
    return {
      url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
      hotspot: radius
    };
  }, [strumento, colore, spessore, zoom]);

  // Overlay cursor size in CSS pixels (used when we render our own cursor overlay)
  const overlaySize = useMemo(() => {
    // desired visual diameter in CSS pixels (match stroke thickness visually)
    const desired = Math.max(12, Math.min(spessore * 4 * zoom, 96));
    // clamp to a reasonable max so overlay doesn't become huge
    return Math.round(desired);
  }, [spessore, zoom]);

  const channelName = useMemo(
    () => (attivitaId != null ? `lavagna:${attivitaId}` : `lavagna:${lavagnaId}`),
    [attivitaId, lavagnaId]
  );

  const emitOrPublish = useCallback(
    (name, data) => {
      whenChannelAttachedAsync(channelName)
        .then(() => {
          const ch = ablyRef.current.ch;
          if (ch) {
            try {
              ch.publish(name, data);
            } catch (e) {
              // Ignore realtime publish failures
            }
          }
        })
        .catch(() => {});
    },
    [channelName]
  );

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
    // Clear device pixels, then work in CSS-pixel coordinate space (scale by devicePixelRatio)
    const canvas = ctx.canvas;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;

    // Reset to identity and clear the entire backing buffer (device pixels)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Now scale so 1 unit = 1 CSS pixel (we operate in CSS pixels thereafter)
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = sfondo === 'nero' ? '#000' : '#fff';
    ctx.fillRect(0, 0, cssW, cssH);

    // Trasformazione world->screen in CSS pixels: prima trasla, poi scala
    const W = cssW;
    const H = cssH;
    ctx.translate(-pan.x, -pan.y);
    ctx.scale(zoom, zoom);

    const viewW = W / zoom;
    const viewH = H / zoom;
    // sfondo pattern (dentro lo scale per coerenza visiva)
    if (sfondo === 'righe' || sfondo === 'quadretti' || sfondo === 'punti') {
      const step = 32; // unità canvas
      const margin = step * 6;
      ctx.strokeStyle = sfondo === 'righe' ? '#e5e7eb' : '#e2e8f0';
      ctx.fillStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      const startY = Math.floor((pan.y - margin) / step) * step;
      const startX = Math.floor((pan.x - margin) / step) * step;
      const endY = pan.y + viewH + margin;
      const endX = pan.x + viewW + margin;
      if (sfondo === 'righe' || sfondo === 'quadretti') {
        for (let y = startY; y < endY; y += step) {
          ctx.beginPath();
          ctx.moveTo(pan.x - margin, y);
          ctx.lineTo(pan.x + viewW + margin, y);
          ctx.stroke();
        }
      }
      if (sfondo === 'quadretti') {
        for (let x = startX; x < endX; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, pan.y - margin);
          ctx.lineTo(x, pan.y + viewH + margin);
          ctx.stroke();
        }
      }
      if (sfondo === 'punti') {
        for (let y = startY; y < endY; y += step) {
          for (let x = startX; x < endX; x += step) {
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
      switch (f.kind) {
        case 'rettangolo':
        case 'quadrato':
          ctx.strokeRect(f.x, f.y, f.w, f.h);
          break;
        case 'cerchio':
        case 'ellisse': {
          const cx = f.x + (f.w || 0) / 2;
          const cy = f.y + (f.h || 0) / 2;
          const rx = Math.abs(f.w || 0) / 2;
          const ry = Math.abs(f.h || 0) / 2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'linea':
        case 'segmento':
        case 'freccia': {
          const x1 = f.x1 ?? f.x ?? 0;
          const y1 = f.y1 ?? f.y ?? 0;
          const x2 = f.x2 ?? x1;
          const y2 = f.y2 ?? y1;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          if (f.kind === 'freccia') {
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const headLength = Math.max(10, (f.spessore || 3) * 3.2);
            const headWidth = headLength * 0.8;
            ctx.beginPath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(
              x2 - headLength * Math.cos(angle) + headWidth * Math.sin(angle),
              y2 - headLength * Math.sin(angle) - headWidth * Math.cos(angle)
            );
            ctx.lineTo(
              x2 - headLength * Math.cos(angle) - headWidth * Math.sin(angle),
              y2 - headLength * Math.sin(angle) + headWidth * Math.cos(angle)
            );
            ctx.closePath();
            ctx.fillStyle = f.colore || '#20489a';
            ctx.fill();
          }
          break;
        }
        case 'triangolo': {
          const x = f.x;
          const y = f.y;
          const w = f.w;
          const h = f.h;
          ctx.beginPath();
          ctx.moveTo(x + w / 2, y);
          ctx.lineTo(x, y + h);
          ctx.lineTo(x + w, y + h);
          ctx.closePath();
          ctx.stroke();
          break;
        }
        case 'rombo': {
          const x = f.x;
          const y = f.y;
          const w = f.w;
          const h = f.h;
          const cx = x + w / 2;
          const cy = y + h / 2;
          ctx.beginPath();
          ctx.moveTo(cx, y);
          ctx.lineTo(x + w, cy);
          ctx.lineTo(cx, y + h);
          ctx.lineTo(x, cy);
          ctx.closePath();
          ctx.stroke();
          break;
        }
        default:
          break;
      }
      // Se selezionata, evidenzia
      if (selectedItems.forme.includes(f.id)) {
        const bounds = f._bb ?? getShapeBounds(f);
        if (bounds) {
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 2;
          ctx.setLineDash([6,4]);
          const width = bounds.maxX - bounds.minX;
          const height = bounds.maxY - bounds.minY;
          ctx.strokeRect(bounds.minX - 6, bounds.minY - 6, width + 12, height + 12);
          ctx.setLineDash([]);
        }
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
        const startX = ps.xStart ?? ps.x;
        const startY = ps.yStart ?? ps.y;
        const endX = ps.x2;
        const endY = ps.y2;
        const minX = Math.min(startX, endX);
        const minY = Math.min(startY, endY);
        const w = Math.abs(endX - startX);
        const h = Math.abs(endY - startY);
        switch (ps.kind) {
          case 'rettangolo':
          case 'quadrato':
            ctx.strokeRect(minX, minY, w, h);
            break;
          case 'cerchio':
          case 'ellisse': {
            const cx = minX + w / 2;
            const cy = minY + h / 2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.stroke();
            break;
          }
          case 'linea':
          case 'freccia': {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            if (ps.kind === 'freccia') {
              const angle = Math.atan2(endY - startY, endX - startX);
              const headLength = Math.max(10, (ps.spessore || 2) * 3);
              const headWidth = headLength * 0.8;
              ctx.setLineDash([]);
              ctx.beginPath();
              ctx.moveTo(endX, endY);
              ctx.lineTo(
                endX - headLength * Math.cos(angle) + headWidth * Math.sin(angle),
                endY - headLength * Math.sin(angle) - headWidth * Math.cos(angle)
              );
              ctx.lineTo(
                endX - headLength * Math.cos(angle) - headWidth * Math.sin(angle),
                endY - headLength * Math.sin(angle) + headWidth * Math.cos(angle)
              );
              ctx.closePath();
              ctx.stroke();
              ctx.setLineDash([6,4]);
            }
            break;
          }
          case 'triangolo': {
            ctx.beginPath();
            ctx.moveTo(minX + w / 2, minY);
            ctx.lineTo(minX, minY + h);
            ctx.lineTo(minX + w, minY + h);
            ctx.closePath();
            ctx.stroke();
            break;
          }
          case 'rombo': {
            const cx = minX + w / 2;
            const cy = minY + h / 2;
            ctx.beginPath();
            ctx.moveTo(cx, minY);
            ctx.lineTo(minX + w, cy);
            ctx.lineTo(cx, minY + h);
            ctx.lineTo(minX, cy);
            ctx.closePath();
            ctx.stroke();
            break;
          }
          default:
            break;
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
    spectatorModeRef.current = spectatorMode;
  }, [spectatorMode]);

  // removed undoMode toggling effect

  useEffect(() => {
    if (!showExportMenu) return;
    function handleClickOutside(e) {
      if (!exportMenuRef.current) return;
      if (!exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showExportMenu]);

  useEffect(() => {
    if (!showTools) {
      setShowPenPopover(false);
      setShowMoreMenu(false);
      setShowShapesPopover(false);
      setShowExportMenu(false);
    }
  }, [showTools]);

  useEffect(() => {
    if (topRightPlacement !== "in-canvas") {
      setShowExportMenu(false);
    }
  }, [topRightPlacement]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

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

  useEffect(() => {
    if (!spectatorStorageKey) return;
    if (typeof window === 'undefined') return;
    if (isAdmin) return;
    try {
      const stored = window.localStorage.getItem(spectatorStorageKey);
      if (stored === '1') {
        setSpectatorMode(true);
      }
    } catch (_) {}
  }, [spectatorStorageKey, isAdmin]);

  useEffect(() => {
    if (!spectatorStorageKey) return;
    if (typeof window === 'undefined') return;
    try {
      if (spectatorMode) {
        window.localStorage.setItem(spectatorStorageKey, '1');
      } else {
        window.localStorage.removeItem(spectatorStorageKey);
      }
    } catch (_) {}
  }, [spectatorMode, spectatorStorageKey]);

  useEffect(() => {
    if (!isAdmin) return;
    if (!spectatorMode) return;
    setSpectatorMode(false);
  }, [isAdmin, spectatorMode]);

  useEffect(() => {
    if (!spectatorMode || isAdmin) return;
    if (strumento === 'mano') {
      setStrumento('penna');
    }
  }, [spectatorMode, isAdmin, strumento]);

  useEffect(() => {
    if (!utenteId) return;
    emitOrPublish('spectator:toggle', {
      lavagnaId,
      attivitaId,
      userId: utenteId,
      ruolo,
      active: spectatorMode,
      ts: Date.now()
    });
  }, [spectatorMode, emitOrPublish, lavagnaId, attivitaId, utenteId, ruolo]);

  useEffect(() => () => {
    if (!utenteId) return;
    if (!spectatorModeRef.current) return;
    emitOrPublish('spectator:toggle', {
      lavagnaId,
      attivitaId,
      userId: utenteId,
      ruolo,
      active: false,
      ts: Date.now()
    });
  }, [emitOrPublish, lavagnaId, attivitaId, utenteId, ruolo]);


  // Stream remoti in tempo reale (non persistiti finché non "done")
  const remoteStreams = useRef(new Map()); // streamId -> { strumento, colore, spessore, punti: [] }
  const currentStreamId = useRef(null);
  const throttler = useRef({ last: 0 });
  // buffer per pubblicare punti in batch (meno segmentazione remota)
  const outgoingBufferRef = useRef([]);
  const outgoingRAFRef = useRef(null);

  // Setup Ably helpers and subscriptions
  const applyViewport = useCallback((view) => {
    if (!view) return;
    const { pan: remotePan, zoom: remoteZoom } = view;
    if (remotePan && typeof remotePan.x === 'number' && typeof remotePan.y === 'number') {
      setPan((prev) => {
        if (prev.x === remotePan.x && prev.y === remotePan.y) return prev;
        return { x: remotePan.x, y: remotePan.y };
      });
    }
    if (typeof remoteZoom === 'number' && !Number.isNaN(remoteZoom)) {
      setZoom((prev) => (prev === remoteZoom ? prev : remoteZoom));
    }
  }, [setPan, setZoom]);

  useEffect(() => {
    if (!spectatorMode || isAdmin) return;
    const latest = latestAdminViewportRef.current;
    if (latest) {
      applyViewport(latest);
    } else {
      emitOrPublish('viewport:request', { lavagnaId, attivitaId, requesterId: utenteId });
    }
  }, [spectatorMode, isAdmin, applyViewport, emitOrPublish, lavagnaId, attivitaId, utenteId]);

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

  useEffect(() => {
    if (!isAdmin) return;
    if (!utenteId) return;
    emitOrPublish('spectator:request', { lavagnaId, attivitaId, requesterId: utenteId, ts: Date.now() });
  }, [isAdmin, emitOrPublish, lavagnaId, attivitaId, utenteId]);

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
    if (!isAdmin) return;
    viewportBroadcastRef.current.payload = {
      lavagnaId,
      attivitaId,
      senderId: utenteId,
      pan: { x: pan.x, y: pan.y },
      zoom,
      ts: Date.now()
    };
    if (!viewportBroadcastRef.current.rafId) {
      viewportBroadcastRef.current.rafId = requestAnimationFrame(() => {
        const pending = viewportBroadcastRef.current.payload;
        viewportBroadcastRef.current.rafId = null;
        if (pending) {
          emitOrPublish('viewport:update', pending);
        }
      });
    }
  }, [pan, zoom, isAdmin, emitOrPublish, lavagnaId, attivitaId, utenteId]);

  useEffect(() => () => {
    if (viewportBroadcastRef.current.rafId) {
      cancelAnimationFrame(viewportBroadcastRef.current.rafId);
      viewportBroadcastRef.current.rafId = null;
    }
  }, []);

  useEffect(() => {
    let cleanup = () => {};
    (async () => {
      try {
        const ch = await getAblyChannelAsync(channelName);
        ablyRef.current.ch = ch;
        if (!ch) {
          console.warn('[LavagnaCanvas] nessun canale realtime disponibile; la lavagna funzionerà solo localmente');
          return;
        }
        whenChannelAttachedAsync(channelName).catch((err) => {
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
        ch.subscribe('clear-lavagna', onClear);

        // other subscriptions (shapes, background, viewport, spectator) – keep original names
        const onShapeCreate = (msg) => {
          const { data } = msg || {};
          if (!data) return;
          const normalized = normalizeShape(data);
          if (!normalized) return;
          setForme((prev) => {
            if (prev.find((f) => f.id === normalized.id)) return prev;
            return [...prev, normalized];
          });
          drawAll();
        };
        const onShapeUpdate = (msg) => {
          const { data } = msg || {};
          if (!data || !data.id) return;
          const normalized = normalizeShape(data);
          if (!normalized) return;
          setForme((prev) => prev.map((f) => (f.id === data.id ? { ...f, ...normalized } : f)));
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
        const onViewportUpdate = (msg) => {
          const { data } = msg || {};
          if (!data) return;
          if (data.senderId && data.senderId === utenteId) return;
          const remotePan = data.pan;
          const remoteZoom = data.zoom;
          if (!remotePan && typeof remoteZoom !== 'number') return;
          const snapshot = {
            pan: (remotePan && typeof remotePan.x === 'number' && typeof remotePan.y === 'number')
              ? { x: remotePan.x, y: remotePan.y }
              : (latestAdminViewportRef.current?.pan ?? panRef.current),
            zoom: (typeof remoteZoom === 'number' && !Number.isNaN(remoteZoom))
              ? remoteZoom
              : (latestAdminViewportRef.current?.zoom ?? zoomRef.current),
            ts: data.ts || Date.now()
          };
          latestAdminViewportRef.current = snapshot;
          if (!isAdmin && spectatorModeRef.current) {
            applyViewport(snapshot);
          }
        };
        const onViewportRequest = () => {
          if (!isAdmin) return;
          emitOrPublish('viewport:update', {
            lavagnaId,
            attivitaId,
            senderId: utenteId,
            pan: { x: panRef.current.x, y: panRef.current.y },
            zoom: zoomRef.current,
            ts: Date.now()
          });
        };
        const onSpectatorToggle = (msg) => {
          const { data } = msg || {};
          const { userId, active } = data || {};
          if (!userId) return;
          const roster = spectatorRosterRef.current;
          if (active) {
            roster.add(userId);
          } else {
            roster.delete(userId);
          }
          setSpectatorCount(roster.size);
        };
        const onSpectatorRequest = () => {
          if (isAdmin) return;
          if (!spectatorModeRef.current) return;
          emitOrPublish('spectator:toggle', {
            lavagnaId,
            attivitaId,
            userId: utenteId,
            ruolo,
            active: true,
            ts: Date.now()
          });
        };

        ch.subscribe('shape:create', onShapeCreate);
        ch.subscribe('shape:update', onShapeUpdate);
        ch.subscribe('shape:delete', onShapeDelete);
        ch.subscribe('background:change', onBackgroundChange);
        ch.subscribe('background:request', onBackgroundRequest);
        ch.subscribe('viewport:update', onViewportUpdate);
        ch.subscribe('viewport:request', onViewportRequest);
        ch.subscribe('spectator:toggle', onSpectatorToggle);
        ch.subscribe('spectator:request', onSpectatorRequest);

        cleanup = () => {
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
            ch.unsubscribe('viewport:update', onViewportUpdate);
            ch.unsubscribe('viewport:request', onViewportRequest);
            ch.unsubscribe('spectator:toggle', onSpectatorToggle);
            ch.unsubscribe('spectator:request', onSpectatorRequest);
          } catch (_) {}
        };
      } catch (e) {
        // If something went wrong loading ably, we simply won't attach realtime handlers.
        ablyRef.current.ch = null;
      }
    })();

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

    return () => { try { cleanup(); } catch (_) {} };
  }, [channelName, drawAll, isAdmin, emitOrPublish, lavagnaId, attivitaId, applyViewport, utenteId, ruolo]);

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
    const normalized = normalizeShape(shape);
    if (!normalized) return;
    setForme((prev) => [...prev, normalized]);
    if (emit) emitOrPublish('shape:create', { ...normalized, lavagnaId });
    // try persist async (best-effort)
    persistShape(normalized).then((s) => {
      if (s && s.id) {
        setForme((prev) => prev.map((f) => (f.id === normalized.id ? { ...f, dbId: s.id } : f)));
      }
    });
  }, [emitOrPublish, lavagnaId, persistShape]);

  const updateShapeLocal = useCallback((shape, emit = true) => {
    const normalized = normalizeShape(shape);
    if (!normalized) return;
    setForme((prev) => prev.map((f) => (f.id === normalized.id ? { ...f, ...normalized } : f)));
    if (emit) emitOrPublish('shape:update', { ...normalized, lavagnaId });
    fetch(`/api/lavagna/shape/${shape.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized)
    }).catch(() => {});
  }, [emitOrPublish, lavagnaId]);

  const deleteShapeLocal = useCallback((id, emit = true, force = false) => {
    let removedShape = null;
    setForme((prev) => {
      const target = prev.find((f) => f.id === id);
      if (!target) return prev;
      if (!force && !isAdmin && target.autoreUserId && target.autoreUserId !== utenteId) {
        return prev;
      }
      removedShape = target;
      return prev.filter((f) => f.id !== id);
    });
    if (!removedShape) return;
    if (emit) emitOrPublish('shape:delete', { id, lavagnaId });
    fetch(`/api/lavagna/shape/${id}`, { method: 'DELETE' }).catch(() => {});
  }, [emitOrPublish, lavagnaId, isAdmin, utenteId]);

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
    const newShapes = (cb.forme || []).map((shape) => {
      const base = {
        ...shape,
        id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        autoreUserId: utenteId
      };
      const normalized = normalizeShape(base);
      const translated = translateShape(normalized, 20, 20);
      createShapeLocal(translated, true);
      return translated;
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
    const updatedShapes = [];
    setForme(prev => prev.map(f => {
      if (!selectedItems.forme.includes(f.id)) return f;
      const moved = translateShape(f, dx, dy);
      updatedShapes.push(moved);
      return moved;
    }));
    // Move strokes (shift points)
    setTratti(prev => prev.map((t, idx) => selectedItems.tratti.includes(idx) ? ({ ...t, punti: t.punti.map(p => ({ x: p.x + dx, y: p.y + dy })) }) : t));
    if (emit) {
      updatedShapes.forEach((shape) => {
        emitOrPublish('shape:update', { ...shape, lavagnaId });
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
    const closed = distEndStart < Math.max(12, Math.min(w, h) * 0.35);
    if (closed) {
      const cx = minX + w/2, cy = minY + h/2;
      const rs = points.map(p=>Math.hypot(p.x-cx,p.y-cy));
      const meanR = rs.reduce((a,b)=>a+b,0)/rs.length;
      const varR = rs.reduce((a,b)=>a+(b-meanR)*(b-meanR),0)/rs.length;
      if (Math.sqrt(varR) < Math.max(w,h)*0.15) {
        return { kind: w/h>1.2? 'ellisse' : 'cerchio', x:minX,y:minY,w,h };
      }
      const tolerance = Math.max(6, Math.min(w, h) * 0.12);
      let simplified = simplifyStroke(points, tolerance);
      if (simplified.length > 2) {
        const first = simplified[0];
        const last = simplified[simplified.length - 1];
        if (Math.hypot(first.x - last.x, first.y - last.y) < tolerance) {
          simplified = simplified.slice(0, -1);
        }
      }
      if (simplified.length === 3) {
        return { kind: 'triangolo', x: minX, y: minY, w, h };
      }
      if (simplified.length === 4) {
        const angles = [];
        for (let i = 0; i < simplified.length; i++) {
          const prev = simplified[(i - 1 + simplified.length) % simplified.length];
          const curr = simplified[i];
          const next = simplified[(i + 1) % simplified.length];
          const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
          const v2 = { x: next.x - curr.x, y: next.y - curr.y };
          const len1 = Math.hypot(v1.x, v1.y);
          const len2 = Math.hypot(v2.x, v2.y);
          if (len1 === 0 || len2 === 0) continue;
          const cos = (v1.x * v2.x + v1.y * v2.y) / (len1 * len2);
          angles.push(Math.acos(Math.max(-1, Math.min(1, cos))));
        }
        const rightAngles = angles.filter((a) => Math.abs(a - Math.PI / 2) < 0.45).length;
        if (rightAngles >= 3) {
          return { kind: 'rettangolo', x: minX, y: minY, w, h };
        }
        if (angles.length === 4) {
          return { kind: 'rombo', x: minX, y: minY, w, h };
        }
      }
      // fallback: many points near edges
      let nearEdges=0;
      for (const p of points) {
        if (Math.abs(p.x-minX)<Math.max(4, w*0.08) || Math.abs(p.x-maxX)<Math.max(4, w*0.08) || Math.abs(p.y-minY)<Math.max(4, h*0.08) || Math.abs(p.y-maxY)<Math.max(4, h*0.08)) nearEdges++;
      }
      if (nearEdges / points.length > 0.5) return { kind: 'rettangolo', x:minX,y:minY,w,h };
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

  function simplifyStroke(points, tolerance = 4) {
    if (!points || points.length < 3) return points ? points.slice() : [];
    const sqTolerance = tolerance * tolerance;

    function perpendicularDistanceSq(p, a, b) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (dx === 0 && dy === 0) {
        const ddx = p.x - a.x;
        const ddy = p.y - a.y;
        return ddx * ddx + ddy * ddy;
      }
      const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
      const clamped = Math.max(0, Math.min(1, t));
      const cx = a.x + clamped * dx;
      const cy = a.y + clamped * dy;
      const ddx = p.x - cx;
      const ddy = p.y - cy;
      return ddx * ddx + ddy * ddy;
    }

    function rdp(points, first, last, sqTol, out) {
      let maxSqDist = sqTol;
      let index = -1;
      for (let i = first + 1; i < last; i++) {
        const sqDist = perpendicularDistanceSq(points[i], points[first], points[last]);
        if (sqDist > maxSqDist) {
          index = i;
          maxSqDist = sqDist;
        }
      }
      if (index !== -1) {
        if (index - first > 1) rdp(points, first, index, sqTol, out);
        out.push(points[index]);
        if (last - index > 1) rdp(points, index, last, sqTol, out);
      }
    }

    const simplified = [points[0]];
    rdp(points, 0, points.length - 1, sqTolerance, simplified);
    simplified.push(points[points.length - 1]);
    return simplified;
  }

  function getShapeBounds(shape) {
    if (!shape) return null;
    const kind = shape.kind;
    if (kind === 'linea' || kind === 'freccia' || kind === 'segmento') {
      const x1 = Number(shape.x1 ?? shape.x ?? 0);
      const y1 = Number(shape.y1 ?? shape.y ?? 0);
      const x2 = Number(shape.x2 ?? shape.x1 ?? x1);
      const y2 = Number(shape.y2 ?? shape.y1 ?? y1);
      return {
        minX: Math.min(x1, x2),
        maxX: Math.max(x1, x2),
        minY: Math.min(y1, y2),
        maxY: Math.max(y1, y2)
      };
    }
    const baseX = Number(shape.x ?? 0);
    const baseY = Number(shape.y ?? 0);
    const width = Number(shape.w ?? (shape.x2 != null ? shape.x2 - baseX : 0));
    const height = Number(shape.h ?? (shape.y2 != null ? shape.y2 - baseY : 0));
    const minX = Math.min(baseX, baseX + width);
    const maxX = Math.max(baseX, baseX + width);
    const minY = Math.min(baseY, baseY + height);
    const maxY = Math.max(baseY, baseY + height);
    return { minX, minY, maxX, maxY };
  }

  function hitTestShape(shape, x, y, tolerance = 12) {
    if (!shape) return false;
    const kind = shape.kind;
    if (kind === 'linea' || kind === 'freccia' || kind === 'segmento') {
      const x1 = shape.x1 ?? shape.x ?? 0;
      const y1 = shape.y1 ?? shape.y ?? 0;
      const x2 = shape.x2 ?? shape.x1 ?? x1;
      const y2 = shape.y2 ?? shape.y1 ?? y1;
      if (distPointToSegment(x, y, x1, y1, x2, y2) <= tolerance) return true;
      if (kind === 'freccia') {
        // Arrow head triangle hit test
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLength = Math.max(12, tolerance * 1.2);
        const headWidth = headLength * 0.8;
        const hx = x2;
        const hy = y2;
        const left = {
          x: hx - headLength * Math.cos(angle) + headWidth * Math.sin(angle),
          y: hy - headLength * Math.sin(angle) - headWidth * Math.cos(angle)
        };
        const right = {
          x: hx - headLength * Math.cos(angle) - headWidth * Math.sin(angle),
          y: hy - headLength * Math.sin(angle) + headWidth * Math.cos(angle)
        };
        if (pointInTriangle({ x, y }, { x: hx, y: hy }, left, right)) return true;
      }
      return false;
    }
    const bounds = getShapeBounds(shape);
    if (!bounds) return false;
    const { minX, maxX, minY, maxY } = bounds;
    const withinX = x >= minX - tolerance && x <= maxX + tolerance;
    const withinY = y >= minY - tolerance && y <= maxY + tolerance;
    if (!withinX || !withinY) return false;
    if (kind === 'rettangolo' || kind === 'quadrato') {
      return true;
    }
    if (kind === 'cerchio' || kind === 'ellisse') {
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const rx = (maxX - minX) / 2;
      const ry = (maxY - minY) / 2 || tolerance;
      if (rx <= 0 || ry <= 0) return false;
      const norm = ((x - cx) * (x - cx)) / ((rx + tolerance) * (rx + tolerance)) + ((y - cy) * (y - cy)) / ((ry + tolerance) * (ry + tolerance));
      return norm <= 1;
    }
    if (kind === 'triangolo') {
      const top = { x: (minX + maxX) / 2, y: minY };
      const left = { x: minX, y: maxY };
      const right = { x: maxX, y: maxY };
      if (pointInTriangle({ x, y }, top, left, right)) return true;
      // allow tolerance by expanding bounding triangle slightly
      return pointInTriangle({ x, y },
        { x: top.x, y: top.y - tolerance },
        { x: left.x - tolerance, y: left.y + tolerance },
        { x: right.x + tolerance, y: right.y + tolerance });
    }
    if (kind === 'rombo') {
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const top = { x: cx, y: minY };
      const bottom = { x: cx, y: maxY };
      const left = { x: minX, y: cy };
      const right = { x: maxX, y: cy };
      return (
        pointInTriangle({ x, y }, top, left, right) ||
        pointInTriangle({ x, y }, bottom, left, right)
      );
    }
    return false;
  }

  function pointInTriangle(p, a, b, c) {
    const area = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
    if (area === 0) return false;
    const s = ((a.y - c.y) * (p.x - c.x) + (c.x - a.x) * (p.y - c.y)) / area;
    const t = ((c.y - b.y) * (p.x - c.x) + (b.x - c.x) * (p.y - c.y)) / area;
    const u = 1 - s - t;
    return s >= 0 && t >= 0 && u >= 0;
  }

  function normalizeShape(rawShape) {
    if (!rawShape) return null;
    const shape = { ...rawShape };
    const kind = shape.kind;
    if (kind === 'linea' || kind === 'freccia' || kind === 'segmento') {
      const startX = Number(shape.x1 ?? shape.x ?? shape.startX ?? 0);
      const startY = Number(shape.y1 ?? shape.y ?? shape.startY ?? 0);
      const endX = Number(shape.x2 ?? shape.endX ?? startX);
      const endY = Number(shape.y2 ?? shape.endY ?? startY);
      shape.x1 = startX;
      shape.y1 = startY;
      shape.x2 = endX;
      shape.y2 = endY;
      delete shape.x;
      delete shape.y;
      delete shape.w;
      delete shape.h;
    } else {
      const startX = Number(shape.x ?? shape.x1 ?? shape.startX ?? 0);
      const startY = Number(shape.y ?? shape.y1 ?? shape.startY ?? 0);
      let width = Number(shape.w ?? (shape.x2 != null ? shape.x2 - startX : 0));
      let height = Number(shape.h ?? (shape.y2 != null ? shape.y2 - startY : 0));
      let x = startX;
      let y = startY;
      if (width < 0) {
        x = startX + width;
        width = Math.abs(width);
      }
      if (height < 0) {
        y = startY + height;
        height = Math.abs(height);
      }
      shape.x = x;
      shape.y = y;
      shape.w = width;
      shape.h = height;
    }
    shape._bb = getShapeBounds(shape);
    return shape;
  }

  function translateShape(shape, dx, dy) {
    if (!shape) return shape;
    const next = { ...shape };
    if (typeof next.x === 'number') next.x += dx;
    if (typeof next.y === 'number') next.y += dy;
    if (typeof next.x1 === 'number') next.x1 += dx;
    if (typeof next.y1 === 'number') next.y1 += dy;
    if (typeof next.x2 === 'number') next.x2 += dx;
    if (typeof next.y2 === 'number') next.y2 += dy;
    if (next._bb) {
      next._bb = {
        minX: next._bb.minX + dx,
        maxX: next._bb.maxX + dx,
        minY: next._bb.minY + dy,
        maxY: next._bb.maxY + dy
      };
    } else {
      next._bb = getShapeBounds(next);
    }
    return next;
  }

  function shapeFromPreview(ps) {
    if (!ps) return null;
    const id = `shape-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const startX = ps.xStart ?? ps.x ?? 0;
    const startY = ps.yStart ?? ps.y ?? 0;
    const endX = ps.x2 ?? startX;
    const endY = ps.y2 ?? startY;
    const base = {
      id,
      kind: ps.kind,
      colore: ps.colore,
      spessore: ps.spessore,
      autoreUserId: ps.autoreUserId ?? utenteId
    };
    if (ps.kind === 'linea' || ps.kind === 'freccia') {
      return normalizeShape({ ...base, x1: startX, y1: startY, x2: endX, y2: endY });
    }
    if (ps.kind === 'triangolo' || ps.kind === 'rombo' || ps.kind === 'rettangolo' || ps.kind === 'cerchio' || ps.kind === 'ellisse') {
      const kind = ps.kind === 'cerchio' && Math.abs(endX - startX) !== Math.abs(endY - startY)
        ? 'ellisse'
        : ps.kind;
      const x = Math.min(startX, endX);
      const y = Math.min(startY, endY);
      const w = Math.max(1, Math.abs(endX - startX));
      const h = Math.max(1, Math.abs(endY - startY));
      return normalizeShape({ ...base, kind, x, y, w, h });
    }
    return normalizeShape({ ...base, x: Math.min(startX, endX), y: Math.min(startY, endY), w: Math.abs(endX - startX), h: Math.abs(endY - startY) });
  }

  // Coordinate helper considerando lo zoom
  const getPoint = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // support both synthetic/native events: prefer nativeEvent when present
    const clientX = (e && e.nativeEvent && typeof e.nativeEvent.clientX === 'number') ? e.nativeEvent.clientX : (e.clientX ?? 0);
    const clientY = (e && e.nativeEvent && typeof e.nativeEvent.clientY === 'number') ? e.nativeEvent.clientY : (e.clientY ?? 0);
    const offX = clientX - rect.left;
    const offY = clientY - rect.top;
    const x = pan.x + offX / zoom;
    const y = pan.y + offY / zoom;
    return { x, y };
  }, [zoom, pan.x, pan.y]);

  // Helper: given a world point, compute expected client (viewport) coords
  const screenFromWorld = useCallback((point) => {
    try {
      const canvas = canvasRef.current;
      if (!canvas || !point) return null;
      const rect = canvas.getBoundingClientRect();
      // world->screen in CSS pixels: (point - pan) * zoom
      const sx = (point.x - pan.x) * zoom + rect.left;
      const sy = (point.y - pan.y) * zoom + rect.top;
      return { clientX: sx, clientY: sy, rect };
    } catch (err) {
      return null;
    }
  }, [pan.x, pan.y, zoom]);

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
  const handleWheel = useCallback((event) => {
    if (spectatorModeRef.current && !isAdmin) {
      event.preventDefault();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const offX = event.clientX - rect.left;
    const offY = event.clientY - rect.top;
    const worldBefore = { x: pan.x + offX / zoom, y: pan.y + offY / zoom };
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(2, Math.max(0.5, Math.round((zoom * factor) * 100) / 100));
    const newPan = {
      x: worldBefore.x - offX / newZoom,
      y: worldBefore.y - offY / newZoom,
    };
    setZoom(newZoom);
    setPan(newPan);
    zoomRef.current = newZoom;
    panRef.current = newPan;
    setTimeout(drawAll, 0);
  }, [isAdmin, pan.x, pan.y, zoom, drawAll]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  const applyZoomAt = useCallback((factor, pivot) => {
    if (spectatorModeRef.current && !isAdmin) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const offX = pivot?.x ?? rect.width / 2;
    const offY = pivot?.y ?? rect.height / 2;
    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;
    const worldBefore = {
      x: currentPan.x + offX / currentZoom,
      y: currentPan.y + offY / currentZoom
    };
    const candidate = Math.round((currentZoom * factor) * 100) / 100;
    const newZoom = Math.min(2, Math.max(0.5, candidate));
    if (Math.abs(newZoom - currentZoom) < 0.001) return;
    const newPan = {
      x: worldBefore.x - offX / newZoom,
      y: worldBefore.y - offY / newZoom
    };
    zoomRef.current = newZoom;
    panRef.current = newPan;
    setZoom(newZoom);
    setPan(newPan);
    setTimeout(drawAll, 0);
  }, [drawAll, isAdmin]);

  const handleZoomIn = useCallback(() => applyZoomAt(1.1), [applyZoomAt]);
  const handleZoomOut = useCallback(() => applyZoomAt(0.9), [applyZoomAt]);

  const handleResetZoom = useCallback(() => {
    if (spectatorModeRef.current && !isAdmin) return;
    const nextPan = { x: 0, y: 0 };
    panRef.current = nextPan;
    zoomRef.current = 1;
    setPan(nextPan);
    setZoom(1);
    setTimeout(drawAll, 0);
  }, [drawAll, isAdmin]);

  // == CANCELLAZIONE INTERO TRATTO ==
  const eraseStrokeAt = useCallback(
    (x, y) => {
      let removed = false;
      for (let i = tratti.length - 1; i >= 0; i--) {
        const st = tratti[i];
        if (eraseSessionRef.current.strokeIds.has(st.id)) continue;
        if (!isAdmin && st.autoreUserId && st.autoreUserId !== utenteId) continue;
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
    [tratti, drawAll, attivitaId, emitOrPublish, isAdmin, utenteId]
  );

  const eraseShapesAt = useCallback(
    (x, y) => {
      const tolerance = 14 / zoom;
      const toDelete = [];
      for (const shape of forme) {
        if (eraseSessionRef.current.shapeIds.has(shape.id)) continue;
        if (hitTestShape(shape, x, y, tolerance)) {
          if (isAdmin || !shape.autoreUserId || shape.autoreUserId === utenteId) {
            toDelete.push(shape.id);
          }
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
    [forme, zoom, deleteShapeLocal, drawAll, isAdmin, utenteId]
  );

  // == POINTER EVENTS ==
  function pointerDown(e) {
    const native = e?.nativeEvent;
    const btn = native?.button;
    const pointerId = native?.pointerId;
    const canvas = canvasRef.current;
    const spectatorLocked = spectatorModeRef.current && !isAdmin;

    if (btn === 2) {
      e.preventDefault();
      if (spectatorLocked) {
        return;
      }
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

    if (['rettangolo', 'cerchio', 'linea', 'triangolo', 'freccia', 'rombo'].includes(strumento)) {
      const p = getPoint(e);
      previewShapeRef.current = {
        kind: strumento,
        x: p.x,
        y: p.y,
        xStart: p.x,
        yStart: p.y,
        x2: p.x,
        y2: p.y,
        colore,
        spessore,
        autoreUserId: utenteId
      };
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
      if (spectatorLocked) {
        return;
      }
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
    // ensure overlay visible and positioned on pointer down
    try {
      const ov = overlayRef.current;
      const canvas = canvasRef.current;
      if (ov && canvas && strumento === 'penna') {
        const clientX = e.nativeEvent.clientX;
        const clientY = e.nativeEvent.clientY;
        ov.style.display = 'block';
        ov.style.left = `${clientX}px`;
        ov.style.top = `${clientY}px`;
        ov.style.width = `${overlaySize}px`;
        ov.style.height = `${overlaySize}px`;
        ov.style.borderRadius = '50%';
        ov.style.background = colore;
        ov.style.opacity = '0.95';
        ov.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.6) inset';
        ov.style.transform = 'translate(-50%, -50%)';
      }
    } catch (_) {}

    // Diagnostic: ensure computed world->screen mapping matches pointer client coords
    try {
      const lastPoint = punto;
      const expected = screenFromWorld(lastPoint);
      if (expected) {
        const dx = Math.abs(expected.clientX - (e.nativeEvent.clientX));
        const dy = Math.abs(expected.clientY - (e.nativeEvent.clientY));
        const dist = Math.hypot(dx, dy);
        if (dist > 8) {
          // If mismatch present, log for debugging (user can paste log)
          console.warn('[lavagna][diag] pointerDown mismatch px=', Math.round(dist), { clientX: e.nativeEvent.clientX, clientY: e.nativeEvent.clientY, expected, pan: { ...pan }, zoom });
        }
      }
    } catch (_) {}
  }

  function pointerMove(e) {
    const spectatorLocked = spectatorModeRef.current && !isAdmin;
    // If panning active (hand) update pan
    if (panningRef.current.active) {
      if (spectatorLocked) {
        panningRef.current.active = false;
        setIsPanning(false);
        setContextPanning(false);
        return;
      }
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
      if (spectatorLocked) {
        return;
      }
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
    // update overlay cursor position even when not drawing
    try {
      const ov = overlayRef.current;
      if (ov && strumento === 'penna') {
        const clientX = e.nativeEvent.clientX;
        const clientY = e.nativeEvent.clientY;
        ov.style.display = 'block';
        ov.style.left = `${clientX}px`;
        ov.style.top = `${clientY}px`;
        ov.style.width = `${overlaySize}px`;
        ov.style.height = `${overlaySize}px`;
        ov.style.borderRadius = '50%';
        ov.style.background = colore;
        ov.style.opacity = '0.95';
        ov.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.6) inset';
        ov.style.transform = 'translate(-50%, -50%)';
      }
    } catch (_) {}

    // Occasional diagnostic: compare expected screen position for the last point
    try {
      if (disegnando && puntiCorrentiRef.current && puntiCorrentiRef.current.length) {
        const last = puntiCorrentiRef.current[puntiCorrentiRef.current.length - 1];
        const expected = screenFromWorld(last);
        if (expected) {
          const dx = Math.abs(expected.clientX - (e.nativeEvent.clientX));
          const dy = Math.abs(expected.clientY - (e.nativeEvent.clientY));
          const dist = Math.hypot(dx, dy);
          if (dist > 8) {
            console.warn('[lavagna][diag] pointerMove mismatch px=', Math.round(dist), { clientX: e.nativeEvent.clientX, clientY: e.nativeEvent.clientY, expected, pan: { ...pan }, zoom });
          }
        }
      }
    } catch (_) {}

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
      const shapeObj = shapeFromPreview(ps);
      if (shapeObj) {
        createShapeLocal(shapeObj, true);
      }
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
        const selForme = forme.map((f)=> {
          const bounds = f._bb ?? getShapeBounds(f);
          if (!bounds) return null;
          if (bounds.minX >= x1 && bounds.maxX <= x2 && bounds.minY >= y1 && bounds.maxY <= y2) return f.id;
          return null;
        }).filter(i=>i!==null);
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
      // hide overlay when pointer released (if not pen tool keep it hidden)
      try {
        const ov = overlayRef.current;
        if (ov) {
            // keep overlay visible only while pen tool active and pointer is present
            ov.style.display = strumento === 'penna' ? 'block' : 'none';
        }
      } catch (_) {}
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
          const shapeObj = {
            id,
            ...detected,
            colore,
            spessore,
            autoreUserId: utenteId
          };
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
    // hide overlay on cancel
    try { const ov = overlayRef.current; if (ov) ov.style.display = 'none'; } catch(_) {}
  }

  // == SALVATAGGIO STROKE ==
  async function salvaTratto(t) {
    try {
      // mark saving without triggering re-render
      salvandoRef.current = true;
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
      salvandoRef.current = false;
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
  const esportaPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `lavagna-${lavagnaId}.png`;
    link.click();
  }, [lavagnaId]);

  const esportaPDF = useCallback(async () => {
    const { jsPDF } = await import("jspdf");
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      0,
      0,
      canvas.width,
      canvas.height
    );
    pdf.save(`lavagna-${lavagnaId || attivitaId}.pdf`);
  }, [lavagnaId, attivitaId]);

  // == CLEAR ==
  const pulisciLavagna = useCallback(() => {
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
  const toolbar = useMemo(() => {
    if (!showTools) return null;
    if (!isAdmin && spectatorMode) return null;
    const shapeActive = ['rettangolo','cerchio','linea','triangolo','rombo','freccia','magicpen'].includes(strumento);
    const shapeButtonActive = shapeActive || showShapesPopover;
    const undoDisabled = !undoStack.length;
    const redoAvailable = redoStack.length > 0;

    return (
      <div style={st.bottomToolbarDock}>
        <div style={st.commandBar}>
          <button
            type="button"
            style={undoButtonStyle(undoDisabled, 'undo')}
            onClick={() => { if (!undoDisabled) undo(); }}
            disabled={undoDisabled}
            title={'Annulla'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M7.5 8.5l-4 4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 12.5h6.5c3.59 0 6.5 2.91 6.5 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span style={st.undoLabel}>Undo</span>
          </button>

          {redoAvailable && (
            <button
              type="button"
              style={undoButtonStyle(false, 'redo')}
              onClick={() => { redo(); }}
              title={'Ripristina'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M16.5 8.5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 12.5H10.5C6.91 12.5 4 9.59 4 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <span style={st.undoLabel}>Redo</span>
            </button>
          )}

          <span style={st.commandDivider} aria-hidden />

          <div style={st.toolGroup}>
            <button
              type="button"
              style={iconBtn(strumento === 'lazzo')}
              onClick={() => {
                setStrumento('lazzo');
                setShowPenPopover(false);
                setShowMoreMenu(false);
                setShowShapesPopover(false);
                setShowExportMenu(false);
              }}
              title="Seleziona"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M7.2 10.2c0-3.1 2.8-5.7 6.2-5.7 3.4 0 6.1 2.1 6.1 5 0 3-2.7 5.1-5.6 5.1-2.8 0-4.4 1.5-4.4 3.5 0 1.2.9 2.3 2.2 2.3"
                  stroke={strumento==='lazzo' ? '#fff':'#20489a'}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="6.4"
                  cy="10"
                  r="1.2"
                  stroke={strumento==='lazzo' ? '#fff':'#20489a'}
                  strokeWidth="1.4"
                  fill="none"
                />
              </svg>
            </button>
            <button
              type="button"
              style={iconBtn(strumento === 'mano')}
              onClick={() => {
                setStrumento('mano');
                setShowPenPopover(false);
                setShowMoreMenu(false);
                setShowShapesPopover(false);
                setShowExportMenu(false);
              }}
              title="Sposta"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M7.5 11V5.75a1.25 1.25 0 1 1 2.5 0V11m0-3.25V4.75a1.25 1.25 0 1 1 2.5 0V11m0-1.25V6.75a1.25 1.25 0 1 1 2.5 0V13m0-2.25V8.75a1.25 1.25 0 1 1 2.5 0V15.5c0 2.485-2.015 4.5-4.5 4.5s-4.5-2.015-4.5-4.5V13" stroke={strumento==='mano'? '#fff':'#20489a'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </button>
            <div style={{ position:'relative' }}>
              <button
                type="button"
                style={iconBtn(strumento === 'penna' || showPenPopover)}
                onClick={() => {
                  setStrumento('penna');
                  setShowPenPopover((v) => !v);
                  setShowShapesPopover(false);
                  setShowMoreMenu(false);
                  setShowExportMenu(false);
                }}
                title="Penna"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M4 20l3.2-.8 10-10-2.4-2.4-10 10L4 20z" fill={strumento==='penna'||showPenPopover? '#fff':'#20489a'} />
                  <path d="M14 4.2l2.6-2.6 3.4 3.4-2.6 2.6" stroke={strumento==='penna'||showPenPopover? '#fff':'#20489a'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </button>
              {showPenPopover && (
                <div style={st.popover}>
                  <div style={st.penColorsRow}>
                    {penPalette.map((c) => {
                      const isSelected = c === colore;
                      return (
                        <button
                          key={c}
                          onClick={() => setColore(c)}
                          title={c}
                          style={{
                            ...st.penColorButton,
                            border: isSelected ? '2px solid #20489a' : '1.5px solid #dbe6f5',
                            boxShadow: isSelected ? '0 0 0 2px #fff, 0 0 0 4px #20489a' : '0 1px 2px rgba(32,72,154,0.25)',
                            background: c
                          }}
                        />
                      );
                    })}
                    <input
                      ref={colorInputRef}
                      type="color"
                      value={colore}
                      onChange={(e)=>setColore(e.target.value)}
                      style={{ position:'absolute', width:1, height:1, opacity:0 }}
                    />
                    <button
                      type="button"
                      onClick={()=>colorInputRef.current?.click()}
                      title="Altro"
                      style={st.colorWheelBtn}
                    >
                      🎨
                    </button>
                  </div>
                  <div style={st.penOptionsRow}>
                    <span style={st.sizeLabel}>{spessore}px</span>
                    <input type="range" min={1} max={25} value={spessore} onChange={(e)=>setSpessore(Number(e.target.value))} />
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              style={iconBtn(strumento === 'gomma')}
              onClick={() => {
                setStrumento('gomma');
                setShowPenPopover(false);
                setShowMoreMenu(false);
                setShowShapesPopover(false);
                setShowExportMenu(false);
              }}
              title="Gomma"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M15.5 4l5 5-8.5 8.5H7L2 12l8.5-8.5 5.5.5z" fill={strumento==='gomma'? '#fff':'#20489a'} />
              </svg>
            </button>
            <div style={{ position:'relative' }}>
              <button
                type="button"
                style={iconBtn(shapeButtonActive)}
                onClick={() => {
                  setShowShapesPopover((v) => !v);
                  setShowPenPopover(false);
                  setShowMoreMenu(false);
                  setShowExportMenu(false);
                }}
                title="Forme"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="10" height="10" rx="2" stroke={shapeButtonActive? '#fff':'#20489a'} strokeWidth="1.8" fill="none" />
                  <circle cx="16.5" cy="7.5" r="4" stroke={shapeButtonActive? '#fff':'#20489a'} strokeWidth="1.8" fill="none" />
                  <path d="M4 4l6 6" stroke={shapeButtonActive? '#fff':'#20489a'} strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
              {showShapesPopover && (
                <div style={st.popover}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:8 }}>
                    <button type="button" style={iconBtn(strumento === 'rettangolo')} onClick={() => { setStrumento('rettangolo'); setShowShapesPopover(false); setShowExportMenu(false); }} title="Rettangolo">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="3" stroke={strumento==='rettangolo'? '#fff':'#20489a'} strokeWidth="2" fill="none"/></svg>
                    </button>
                    <button type="button" style={iconBtn(strumento === 'cerchio')} onClick={() => { setStrumento('cerchio'); setShowShapesPopover(false); setShowExportMenu(false); }} title="Cerchio / Ellisse">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke={strumento==='cerchio'? '#fff':'#20489a'} strokeWidth="2" fill="none"/></svg>
                    </button>
                    <button type="button" style={iconBtn(strumento === 'linea')} onClick={() => { setStrumento('linea'); setShowShapesPopover(false); setShowExportMenu(false); }} title="Linea">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><line x1="5" y1="19" x2="19" y2="5" stroke={strumento==='linea'? '#fff':'#20489a'} strokeWidth="2"/></svg>
                    </button>
                    <button type="button" style={iconBtn(strumento === 'triangolo')} onClick={() => { setStrumento('triangolo'); setShowShapesPopover(false); setShowExportMenu(false); }} title="Triangolo">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5l8 14H4L12 5z" stroke={strumento==='triangolo'? '#fff':'#20489a'} strokeWidth="2" fill="none"/></svg>
                    </button>
                    <button type="button" style={iconBtn(strumento === 'rombo')} onClick={() => { setStrumento('rombo'); setShowShapesPopover(false); setShowExportMenu(false); }} title="Rombo">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 9-7 9-7-9 7-9z" stroke={strumento==='rombo'? '#fff':'#20489a'} strokeWidth="2" fill="none"/></svg>
                    </button>
                    <button type="button" style={iconBtn(strumento === 'freccia')} onClick={() => { setStrumento('freccia'); setShowShapesPopover(false); setShowExportMenu(false); }} title="Freccia">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h10" stroke={strumento==='freccia'? '#fff':'#20489a'} strokeWidth="2" strokeLinecap="round"/><path d="M13 7l6 5-6 5" stroke={strumento==='freccia'? '#fff':'#20489a'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button type="button" style={iconBtn(strumento === 'magicpen')} onClick={() => { setStrumento('magicpen'); setShowShapesPopover(false); setShowExportMenu(false); }} title="Magic pen">
                      <span style={{fontSize:18}}>✨</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div style={{ position:'relative' }}>
              <button
                type="button"
                style={iconBtn(showMoreMenu)}
                onClick={()=> {
                  setShowMoreMenu(v=>!v);
                  setShowPenPopover(false);
                  setShowShapesPopover(false);
                  setShowExportMenu(false);
                }}
                title="Altro"
              >
                ...
              </button>
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
                  {!isAdmin && (
                    <div style={{ ...st.toggleWrap, marginBottom:8 }}>
                      <input
                        id={spectatorToggleId}
                        type="checkbox"
                        checked={spectatorMode}
                        onChange={(e)=>setSpectatorMode(e.target.checked)}
                        style={{ margin:0, accentColor:'#1cb0f6', cursor:'pointer' }}
                      />
                      <label htmlFor={spectatorToggleId} style={st.toggleLbl}>Modalità spettatore</label>
                    </div>
                  )}
                  {isAdmin && (
                    <button type="button" style={{ ...btn(false), background:'#ff6464', color:'#fff', fontWeight:700, marginTop:8 }} onClick={pulisciLavagna}>Pulisci lavagna</button>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }, [
    showTools,
    isAdmin,
    spectatorMode,
    strumento,
    showShapesPopover,
    showPenPopover,
    showMoreMenu,
    penPalette,
    colore,
    spessore,
    gommaPuntuale,
    sfondo,
  sfondoLabels,
    handleChangeSfondo,
    spectatorToggleId,
    pulisciLavagna,
    undoStack,
    redoStack,
    undo,
    redo
  ]);

  const canvasCursor = useMemo(() => {
    if (contextPanning || (strumento === 'mano' && isPanning)) return 'grabbing';
    if (strumento === 'mano') return 'grab';
    if (strumento === 'gomma') return `url(${st.eraserCursor}) 14 20, auto`;
    if (['lazzo','rettangolo','cerchio','linea','triangolo','rombo','freccia','magicpen'].includes(strumento)) {
      return 'crosshair';
    }
    if (!penCursor) return 'crosshair';
    const hotspot = Math.round(penCursor.hotspot);
    return `url(${penCursor.url}) ${hotspot} ${hotspot}, auto`;
  }, [contextPanning, strumento, isPanning, penCursor]);

  const spectatorIndicatorVisible = (!isAdmin && spectatorMode) || (isAdmin && spectatorCount > 0);
  const spectatorIndicatorTitle = isAdmin
    ? (spectatorCount > 0 ? `Modalità spettatore attiva (${spectatorCount})` : '')
    : 'Modalità spettatore attiva';
  const showInCanvasActions = topRightPlacement === 'in-canvas' && (!spectatorMode || isAdmin);
  const showTopRightBar = showInCanvasActions || spectatorIndicatorVisible;
  const zoomDisabled = spectatorMode && !isAdmin;
  const canZoomOut = zoom > 0.51;
  const canZoomIn = zoom < 1.99;
  const canResetView = zoom < 0.99 || zoom > 1.01 || Math.abs(pan.x) > 0.5 || Math.abs(pan.y) > 0.5;
  const zoomLabel = `${Math.round(zoom * 100)}%`;

  useEffect(() => {
    if (topRightPlacement !== "external" || !onActionsChange) return;
    const openNewWindowHandler = openInNewWindow && attivitaId
      ? () => window.open(`/lavagna/full?attivitaId=${attivitaId}`, "_blank")
      : null;
    onActionsChange({
      esportaPNG,
      esportaPDF,
      openNewWindow: openNewWindowHandler
    });
    return () => {
      onActionsChange?.(null);
    };
  }, [
    topRightPlacement,
    onActionsChange,
    esportaPNG,
    esportaPDF,
    openInNewWindow,
    attivitaId
  ]);

  // == RENDER ==
  return (
    <div style={st.wrapper}>
      {/* Azioni in alto a destra all'esterno della lavagna */}
      {showTopRightBar && (
        <div style={st.topRightActionsOuter}>
          {showInCanvasActions && (
            <div style={st.topRightActions}>
              <div ref={exportMenuRef} style={st.exportWrapper}>
                <button
                  type="button"
                  style={st.exportButton}
                  onClick={() => {
                    setShowPenPopover(false);
                    setShowMoreMenu(false);
                    setShowShapesPopover(false);
                    setShowExportMenu((v) => !v);
                  }}
                  aria-expanded={showExportMenu}
                  aria-haspopup="menu"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M5 5h14M5 12h14M5 19h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Esporta</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {showExportMenu && (
                  <div style={st.exportMenu} role="menu">
                    <button
                      type="button"
                      style={st.exportMenuItem}
                      role="menuitem"
                      onClick={() => {
                        setShowExportMenu(false);
                        esportaPNG();
                      }}
                    >
                      Scarica PNG
                    </button>
                    <button
                      type="button"
                      style={st.exportMenuItem}
                      role="menuitem"
                      onClick={() => {
                        setShowExportMenu(false);
                        esportaPDF();
                      }}
                    >
                      Scarica PDF
                    </button>
                  </div>
                )}
              </div>
              {openInNewWindow && attivitaId && (
                <button
                  type="button"
                  style={st.secondaryButton}
                  onClick={() => {
                    setShowExportMenu(false);
                    window.open(`/lavagna/full?attivitaId=${attivitaId}`, "_blank");
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M14 3h7v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 14l11-11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M21 13v5a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Nuova finestra</span>
                </button>
              )}
            </div>
          )}
          {spectatorIndicatorVisible && (
            <div
              style={{
                ...st.eyeBadge,
                cursor: (!isAdmin && spectatorMode) ? 'pointer' : 'default'
              }}
              onClick={() => { if (!isAdmin && spectatorMode) setSpectatorMode(false); }}
              title={spectatorIndicatorTitle}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 5c-5 0-9 4.5-9 7s4 7 9 7 9-4.5 9-7-4-7-9-7zm0 12c-2.757 0-5-2.016-5-4.5S9.243 8 12 8s5 2.016 5 4.5S14.757 17 12 17zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" fill="#20489a"/>
              </svg>
              {isAdmin && spectatorCount > 0 && <span style={st.eyeCount}>{spectatorCount}</span>}
            </div>
          )}
        </div>
      )}
      <div style={st.canvasBox}>
        {toolbar}
        <div style={st.zoomControls}>
          <button
            type="button"
            style={zoomButtonStyle(zoomDisabled || !canZoomOut)}
            onClick={handleZoomOut}
            disabled={zoomDisabled || !canZoomOut}
            title="Riduci zoom"
          >
            -
          </button>
          <span style={st.zoomValue}>{zoomLabel}</span>
          <button
            type="button"
            style={zoomButtonStyle(zoomDisabled || !canZoomIn)}
            onClick={handleZoomIn}
            disabled={zoomDisabled || !canZoomIn}
            title="Aumenta zoom"
          >
            +
          </button>
          <button
            type="button"
            style={zoomResetStyle(zoomDisabled || !canResetView)}
            onClick={handleResetZoom}
            disabled={zoomDisabled || !canResetView}
            title="Reimposta vista"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 5V3l-4 4 4 4V9c2.76 0 5 2.24 5 5a5 5 0 0 1-2.53 4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 19v2l4-4-4-4v2a5 5 0 0 0-5 5 5 5 0 0 0 2.37 4.23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div
          ref={overlayRef}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            pointerEvents: 'none',
            zIndex: 9999,
            display: 'none',
            transform: 'translate(-50%, -50%)'
          }}
        />

        <canvas
          ref={canvasRef}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerLeave={pointerUp}
          onPointerCancel={pointerCancel}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            ...st.canvas,
            cursor: strumento === 'penna' ? 'none' : canvasCursor
          }}
        />
      </div>
    </div>
  );
};

// == STYLES ==
const st = {
  wrapper: { width: "100%", userSelect: "none" },
  bottomToolbarDock: {
    position: "absolute",
    left: "50%",
    bottom: 18,
    transform: "translateX(-50%)",
    zIndex: 3
  },
  commandBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 16,
    background: 'rgba(255,255,255,0.92)',
    border: '1px solid #d4dff6',
    boxShadow: '0 14px 28px rgba(20,53,120,0.16)',
    backdropFilter: 'blur(8px)',
    userSelect: 'none'
  },
  toolGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 4px'
  },
  commandDivider: {
    width: 1,
    alignSelf: 'stretch',
    background: 'rgba(212,223,246,0.9)',
    margin: '0 12px'
  },
  popover: {
    position: 'absolute',
    bottom: '110%',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#fff',
    border: '1px solid #dbe6f5',
    boxShadow: '0 18px 34px rgba(15,36,92,0.18)',
    borderRadius: 14,
    padding: 14,
    minWidth: 220,
    zIndex: 5
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
    gap: 12,
    zIndex: 3
  },
  topRightActionsOuter: {
    position: "relative",
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 8
  },
  exportWrapper: {
    position: 'relative'
  },
  exportButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 14px',
    borderRadius: 12,
    border: '1px solid #d4dff6',
    background: 'rgba(255,255,255,0.92)',
    color: '#1a3d8f',
    fontWeight: 600,
    fontSize: 13,
    boxShadow: '0 10px 24px rgba(16,42,105,0.12)',
    cursor: 'pointer',
    transition: 'box-shadow .2s ease, transform .15s ease'
  },
  exportMenu: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    minWidth: 160,
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #dbe6f5',
    boxShadow: '0 18px 34px rgba(15,36,92,0.18)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 10,
    padding: 4,
    gap: 4
  },
  exportMenuItem: {
    padding: '10px 14px',
    background: 'rgba(248,251,255,0.95)',
    border: 'none',
    textAlign: 'left',
    fontSize: 13,
    fontWeight: 600,
    color: '#1a3d8f',
    cursor: 'pointer',
    borderRadius: 10,
    width: '100%'
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    border: '1px solid rgba(28,176,246,0.35)',
    background: 'rgba(28,176,246,0.12)',
    color: '#0f609b',
    fontWeight: 600,
    fontSize: 13,
    padding: '9px 14px',
    cursor: 'pointer',
    boxShadow: '0 10px 20px rgba(15,97,175,0.15)',
    transition: 'box-shadow .2s ease, transform .15s ease'
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
  penColorsRow: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap'
  },
  penColorButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: '1.5px solid #dbe6f5',
    cursor: 'pointer',
    outline: 'none',
    transition: 'box-shadow .15s'
  },
  colorWheelBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: '1.5px solid #dbe6f5',
    background: '#fff',
    backgroundImage: 'conic-gradient(red, orange, yellow, green, blue, violet, red)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    cursor: 'pointer',
    margin: 2
  },
  penOptionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 10
  },
  sizeLabel: { fontSize: 12, fontWeight: 600, color: "#20489a" },
  saving: {
    fontSize: 12,
    fontWeight: 700,
    color: "#15357a",
    marginLeft: 12,
    padding: '4px 10px',
    background: 'rgba(255,255,255,0.65)',
    borderRadius: 999
  },
  eyeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(32,72,154,0.12)',
    border: '1px solid rgba(32,72,154,0.2)',
    color: '#20489a',
    fontSize: 12,
    fontWeight: 600
  },
  eyeCount: {
    fontSize: 12,
    fontWeight: 600
  },
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
  zoomControls: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 8px 8px 10px',
    borderRadius: 14,
    background: 'rgba(14, 44, 115, 0.82)',
    backdropFilter: 'blur(6px)',
    boxShadow: '0 14px 32px rgba(10,26,70,0.35)',
    color: '#fff',
    zIndex: 3,
    transition: 'box-shadow .2s ease'
  },
  zoomValue: {
    minWidth: 52,
    textAlign: 'center',
    fontWeight: 700,
    fontSize: 13
  },
  undoLabel: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.4px',
    textTransform: 'uppercase'
  },
  // cursori SVG embedded (data URL)
  eraserCursor:
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
        <path fill="#f87171" d="M11 27l13-13 6 6-13 13h-6z"/>
        <path fill="#fee2e2" d="M17 11l5-5 10 10-5 5z"/>
      </svg>
    `)
};

const undoButtonStyle = (disabled, mode) => ({
  width: 44,
  height: 44,
  borderRadius: 14,
  border: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  gap: 2,
  background: disabled
    ? 'rgba(212,223,246,0.6)'
    : mode === 'undo'
      ? 'linear-gradient(135deg, #edf2ff 0%, #dbe5ff 100%)'
      : 'linear-gradient(135deg, #dff6ff 0%, #bce8ff 100%)',
  color: disabled ? '#9ca9c5' : mode === 'undo' ? '#15357a' : '#0c5a8a',
  boxShadow: disabled ? 'none' : '0 12px 26px rgba(20,53,120,0.18)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'transform .15s ease, box-shadow .2s ease'
});

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
  width: 36,
  height: 36,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 12,
  border: active ? '1px solid rgba(27,102,220,0.2)' : '1px solid rgba(212,223,246,0.9)',
  background: active ? 'linear-gradient(135deg, #1c7df7 0%, #5bb5ff 100%)' : 'rgba(248,251,255,0.96)',
  color: active ? '#fff' : '#20489a',
  boxShadow: active ? '0 14px 26px rgba(28,125,247,0.28)' : '0 8px 20px rgba(15,42,105,0.15)',
  cursor: 'pointer',
  transition: 'transform .15s ease, box-shadow .2s ease',
  fontWeight: 700,
  fontSize: 18
});

const zoomButtonStyle = (disabled) => ({
  width: 34,
  height: 34,
  margin: 0,
  borderRadius: 10,
  border: 'none',
  background: disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.95)',
  color: disabled ? 'rgba(255,255,255,0.5)' : '#163d8c',
  fontWeight: 700,
  fontSize: 18,
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: disabled ? 'not-allowed' : 'pointer',
  boxShadow: disabled ? 'none' : '0 8px 20px rgba(12,28,72,0.28)',
  transition: 'transform .15s ease, box-shadow .2s ease'
});

const zoomResetStyle = (disabled) => ({
  ...zoomButtonStyle(disabled),
  width: 38,
  background: disabled ? 'rgba(255,255,255,0.2)' : 'linear-gradient(135deg,#1cb0f6 0%,#36d4ff 100%)',
  color: disabled ? 'rgba(255,255,255,0.55)' : '#fff',
  boxShadow: disabled ? 'none' : '0 12px 30px rgba(19,160,240,0.35)'
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
