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
 * LavagnaCanvas - LIVE con Socket.IO su /api/socketio
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

  const [strumento, setStrumento] = useState("penna"); // penna|gomma|mano|selezione|shape-tools
  // Default color: if this is a new lavagna, start with Grafite (#111827),
  // otherwise keep the historical default (Blu) until the user changes it.
  const [colore, setColore] = useState(() => (isNewLavagna ? '#111827' : '#20489a'));
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
  const penPalette = useMemo(
    () => [
      { value: "#111827", label: "Grafite", preview: "#111827" },
      { value: "#2563eb", label: "Blu", preview: "#2563eb" },
      { value: "#0ea5e9", label: "Ciano", preview: "#0ea5e9" },
      { value: "#ef4444", label: "Rosso", preview: "#ef4444" },
      { value: "#16a34a", label: "Verde", preview: "#16a34a" },
      { value: "#f59e0b", label: "Ambra", preview: "#f59e0b" },
      { value: "#f43f5e", label: "Corallo", preview: "#f43f5e" },
      { value: "#a855f7", label: "Viola", preview: "#a855f7" },
      { value: "#14b8a6", label: "Acqua", preview: "#14b8a6" },
      {
        value: "#ff6ec7",
        label: "Arcobaleno",
        preview: "linear-gradient(135deg,#f97316 0%,#f43f5e 35%,#8b5cf6 70%,#0ea5e9 100%)"
      }
    ],
    []
  );
  const isCustomPenColor = useMemo(
    () => penPalette.every((entry) => entry.value !== colore),
    [penPalette, colore]
  );
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
  const [inToolbar, setInToolbar] = useState(false);
  const toolbarRef = useRef(null);
  const [pan, setPan] = useState({ x: 0, y: 0 }); // pan in unità mondo
  const [isPanning, setIsPanning] = useState(false);
  const [contextPanning, setContextPanning] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const panningRef = useRef({ active: false, lastX: 0, lastY: 0, viaContext: false });
  const contextTempToolRef = useRef(null); // when right-click temporarily switches tool to 'mano'
  const touchesRef = useRef(new Map()); // pointerId -> { x,y }
  const gestureRef = useRef({ mode: 'none', startZoom: 1, startPan: { x: 0, y: 0 }, startDist: 0, startMidWorld: { x: 0, y: 0 } });
  const imageCacheRef = useRef(new Map()); // src -> HTMLImageElement
  const [spectatorMode, setSpectatorMode] = useState(false);
  const spectatorModeRef = useRef(false);
  const latestAdminViewportRef = useRef(null);
  const viewportBroadcastRef = useRef({ rafId: null, payload: null });
  const pointerWorldRef = useRef(null);
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

  const eraserCursor = useMemo(() => {
    if (strumento !== 'gomma') return null;
    const effectiveSize = spessore * 4 * (zoom || 1);
    const diameter = Math.max(16, Math.min(effectiveSize, 72));
    const size = Math.round(diameter);
    const radius = size / 2;
    const strokeWidth = Math.max(2, Math.round(size * 0.18));
    const dash = Math.max(4, Math.round(size * 0.45));
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${radius}" cy="${radius}" r="${radius - strokeWidth / 2}" fill="rgba(28,125,247,0.1)" stroke="#0f1f53" stroke-width="${strokeWidth}" stroke-dasharray="${dash} ${dash}" stroke-linecap="round" />
      </svg>
    `;
    return {
      url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
      hotspot: radius
    };
  }, [strumento, spessore, zoom]);

  // Overlay cursor size in CSS pixels (used when we render our own cursor overlay)
  const overlaySize = useMemo(() => {
    // desired visual diameter in CSS pixels (match stroke thickness visually)
    const desired = Math.max(12, Math.min(spessore * 4 * zoom, 96));
    // For the eraser we want it slightly larger (≈1cm on typical displays)
    const oneCmPx = 38; // approx 1cm in CSS pixels at ~96dpi
    const final = (strumento === 'gomma') ? Math.max(desired, oneCmPx) : desired;
    // clamp to a reasonable max so overlay doesn't become huge
    return Math.round(final);
  }, [spessore, zoom, strumento]);

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
  const draggingSelectionRef = useRef({
    active: false,
    lastWorld: null,
    moved: false,
    pointerTool: null,
    pointerId: null,
    primaryShapeId: null,
    primaryStrokeIndex: null,
    selectionSnapshot: null
  });
  const selectionClickRef = useRef(null);
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
    const canvas = ctx.canvas;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Base fill in screen space
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = sfondo === 'nero' ? '#000' : '#fff';
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.restore();

    // World transform (pan/zoom + DPR in a single matrix)
  const safeZoom = Math.max(zoom, 0.0001);
  const worldScale = safeZoom * dpr;
  ctx.save();
  ctx.setTransform(worldScale, 0, 0, worldScale, (-pan.x) * worldScale, (-pan.y) * worldScale);
  const viewW = cssW / safeZoom;
  const viewH = cssH / safeZoom;
    // sfondo pattern (disegniamo un pattern ripetuto di grandi dimensioni
    // così da avere uno sfondo "infinito" che continua quando si pan/zoom)
    if (sfondo === 'righe' || sfondo === 'quadretti' || sfondo === 'punti') {
      try {
        // cache a small tile per tipo per evitare ricreazioni ogni frame
        if (!drawAll._patternCache) drawAll._patternCache = {};
        const key = sfondo;
        let pattern = drawAll._patternCache[key];
        const step = 32;
        if (!pattern) {
          const tile = document.createElement('canvas');
          tile.width = step;
          tile.height = step;
          const tctx = tile.getContext('2d');
          tctx.clearRect(0,0,step,step);
          if (sfondo === 'righe') {
            tctx.strokeStyle = '#e5e7eb';
            tctx.lineWidth = 1;
            tctx.beginPath();
            tctx.moveTo(0, 0.5);
            tctx.lineTo(step, 0.5);
            tctx.stroke();
          } else if (sfondo === 'quadretti') {
            tctx.strokeStyle = '#e2e8f0';
            tctx.lineWidth = 1;
            tctx.beginPath();
            tctx.moveTo(0, 0.5);
            tctx.lineTo(step, 0.5);
            tctx.moveTo(0.5, 0);
            tctx.lineTo(0.5, step);
            tctx.stroke();
          } else if (sfondo === 'punti') {
            tctx.fillStyle = '#e5e7eb';
            tctx.beginPath();
            tctx.arc(step/2, step/2, 1, 0, Math.PI*2);
            tctx.fill();
          }
          pattern = ctx.createPattern(tile, 'repeat');
          drawAll._patternCache[key] = pattern;
        }
        ctx.save();
        ctx.fillStyle = pattern;
        // estendi molto oltre la vista corrente per dare effetto di sfondo infinito
        const big = Math.max(viewW, viewH) * 4 + 2000;
        const rx = pan.x - big;
        const ry = pan.y - big;
        const rw = viewW + big * 2;
        const rh = viewH + big * 2;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.restore();
      } catch (err) {
        // fallback: niente sfondo pattern se il canvas non supporta createPattern
      }
    }

    // Tratti persistiti (coordinate in unità mondo)
    // Disegno forme preesistenti (prima dei tratti)
    for (const f of forme) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = f.colore || '#20489a';
      ctx.lineWidth = f.spessore || 3;
        if (f.kind === 'link') {
          // draw a small pill with the link text
          try {
            const txt = (f.titolo || f.url || '').slice(0, 60);
            const padding = 8;
            const fontSize = 14;
            ctx.font = `${fontSize}px sans-serif`;
            const measure = ctx.measureText(txt || 'link');
            const bw = Math.max(80, (measure.width || 80) + padding * 2);
            const bh = fontSize + padding;
            const rx = f.x;
            const ry = f.y;
            // background
            ctx.fillStyle = 'rgba(255,250,235,0.95)';
            roundRect(ctx, rx, ry, bw, bh, 8, true, true);
            // text
            ctx.fillStyle = '#0f4aa3';
            ctx.textBaseline = 'middle';
            ctx.fillText(txt || f.url || 'link', rx + padding, ry + bh / 2);
          } catch (_) {}
          ctx.restore();
          continue;
        }
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
        case 'assi2': {
          // 2-axis Cartesian: horizontal and vertical axes centered on bbox,
          // with arrowheads only on the top (vertical) and right (horizontal) ends.
          const x = f.x;
          const y = f.y;
          const w = f.w || 0;
          const h = f.h || 0;
          const cx = x + w / 2;
          const cy = y + h / 2;
          const hw = Math.max(20, w / 2 || 40);
          const hh = Math.max(20, h / 2 || 40);
          const headLength = Math.max(8, (f.spessore || 3) * 3);
          const headWidth = headLength * 0.8;
          // horizontal axis (left -> right). Arrow only at right end.
          const hx1 = cx - hw;
          const hy1 = cy;
          const hx2 = cx + hw;
          const hy2 = cy;
          const angleH = Math.atan2(hy2 - hy1, hx2 - hx1);
          const uxH = Math.cos(angleH);
          const uyH = Math.sin(angleH);
          const shaftHx1 = hx1; // keep left end plain
          const shaftHx2 = hx2 - headLength * uxH; // shorten before head
          ctx.beginPath();
          ctx.moveTo(shaftHx1, hy1);
          ctx.lineTo(shaftHx2, hy2);
          ctx.stroke();
          // right arrowhead only
          ctx.beginPath();
          ctx.moveTo(hx2, hy2);
          ctx.lineTo(hx2 - headLength * uxH + headWidth * uyH, hy2 - headLength * uyH - headWidth * uxH);
          ctx.lineTo(hx2 - headLength * uxH - headWidth * uyH, hy2 - headLength * uyH + headWidth * uxH);
          ctx.closePath();
          ctx.fillStyle = f.colore || '#20489a';
          ctx.fill();

          // vertical axis (top -> bottom). Arrow only at top end.
          const vx1 = cx;
          const vy1 = cy - hh;
          const vx2 = cx;
          const vy2 = cy + hh;
          const angleV = Math.atan2(vy2 - vy1, vx2 - vx1);
          const uxV = Math.cos(angleV);
          const uyV = Math.sin(angleV);
          // shorten the start (top) so head sits cleanly, leave bottom plain
          const shaftVx1 = vx1 + headLength * uxV;
          const shaftVy1 = vy1 + headLength * uyV;
          const shaftVx2 = vx2;
          const shaftVy2 = vy2;
          ctx.beginPath();
          ctx.moveTo(shaftVx1, shaftVy1);
          ctx.lineTo(shaftVx2, shaftVy2);
          ctx.stroke();
          // top arrowhead only (at vx1, vy1)
          ctx.beginPath();
          // angle for the triangular head pointing upward (from base toward top)
          const angleVT = Math.atan2(vy1 - vy2, vx1 - vx2);
          const uxT = Math.cos(angleVT);
          const uyT = Math.sin(angleVT);
          ctx.moveTo(vx1, vy1);
          ctx.lineTo(vx1 - headLength * uxT + headWidth * uyT, vy1 - headLength * uyT - headWidth * uxT);
          ctx.lineTo(vx1 - headLength * uxT - headWidth * uyT, vy1 - headLength * uyT + headWidth * uxT);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'assi3': {
          // 3-axis Cartesian: same styling as assi2 (arrow only top and right)
          // plus one extra axis (diagonal down-right) with an outward arrow.
          const x = f.x;
          const y = f.y;
          const w = f.w || 0;
          const h = f.h || 0;
          const cx = x + w / 2;
          const cy = y + h / 2;
          const hw = Math.max(28, w / 2 || 56);
          const hh = Math.max(28, h / 2 || 56);
          const headLength = Math.max(8, (f.spessore || 3) * 3);
          const headWidth = headLength * 0.8;

          // horizontal axis (left -> right) with arrow at right only
          const hx1 = cx - hw;
          const hy1 = cy;
          const hx2 = cx + hw;
          const hy2 = cy;
          const angleH = Math.atan2(hy2 - hy1, hx2 - hx1);
          const uxH = Math.cos(angleH);
          const uyH = Math.sin(angleH);
          ctx.beginPath();
          ctx.moveTo(hx1, hy1);
          ctx.lineTo(hx2 - headLength * uxH, hy2 - headLength * uyH);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(hx2, hy2);
          ctx.lineTo(hx2 - headLength * uxH + headWidth * uyH, hy2 - headLength * uyH - headWidth * uxH);
          ctx.lineTo(hx2 - headLength * uxH - headWidth * uyH, hy2 - headLength * uyH + headWidth * uxH);
          ctx.closePath();
          ctx.fillStyle = f.colore || '#20489a';
          ctx.fill();

          // vertical axis (top -> bottom) with arrow at top only
          const vx1 = cx;
          const vy1 = cy - hh;
          const vx2 = cx;
          const vy2 = cy + hh;
          const angleV = Math.atan2(vy2 - vy1, vx2 - vx1);
          const uxV = Math.cos(angleV);
          const uyV = Math.sin(angleV);
          ctx.beginPath();
          ctx.moveTo(vx1 + headLength * uxV, vy1 + headLength * uyV);
          ctx.lineTo(vx2, vy2);
          ctx.stroke();
          // top arrowhead
          ctx.beginPath();
          const angleVT = Math.atan2(vy1 - vy2, vx1 - vx2);
          const uxT = Math.cos(angleVT);
          const uyT = Math.sin(angleVT);
          ctx.moveTo(vx1, vy1);
          ctx.lineTo(vx1 - headLength * uxT + headWidth * uyT, vy1 - headLength * uyT - headWidth * uxT);
          ctx.lineTo(vx1 - headLength * uxT - headWidth * uyT, vy1 - headLength * uyT + headWidth * uxT);
          ctx.closePath();
          ctx.fill();

          // diagonal extra axis (down-right) with arrow at outer end
          const dx1 = cx;
          const dy1 = cy;
          const dx2 = cx + hw;
          const dy2 = cy + hh;
          const angleDR = Math.atan2(dy2 - dy1, dx2 - dx1);
          const uxDR = Math.cos(angleDR);
          const uyDR = Math.sin(angleDR);
          ctx.beginPath();
          ctx.moveTo(dx1 + headLength * uxDR, dy1 + headLength * uyDR);
          ctx.lineTo(dx2 - headLength * uxDR, dy2 - headLength * uyDR);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(dx2, dy2);
          ctx.lineTo(dx2 - headLength * uxDR + headWidth * uyDR, dy2 - headLength * uyDR - headWidth * uxDR);
          ctx.lineTo(dx2 - headLength * uxDR - headWidth * uyDR, dy2 - headLength * uyDR + headWidth * uxDR);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'immagine': {
          // disegna immagini incollate o aggiunte come forme
          try {
            const imgSrc = f.src;
            if (imgSrc) {
              let imgEl = imageCacheRef.current.get(imgSrc);
              if (!imgEl) {
                imgEl = new Image();
                imgEl.onload = () => { imageCacheRef.current.set(imgSrc, imgEl); drawAll(); };
                imgEl.src = imgSrc;
                imageCacheRef.current.set(imgSrc, imgEl);
              }
              if (imgEl && imgEl.complete) {
                const w = f.w || imgEl.naturalWidth / (window.devicePixelRatio || 1);
                const h = f.h || imgEl.naturalHeight / (window.devicePixelRatio || 1);
                ctx.drawImage(imgEl, f.x, f.y, w, h);
              }
            }
          } catch (_) {}
          break;
        }
        default:
          break;
      }
      // Se selezionata, evidenzia
      if (selectedItems.forme.includes(f.id)) {
        const bounds = f._bb ?? getShapeBounds(f);
        if (bounds) {
          const padding = 6 / safeZoom;
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 2 / safeZoom;
          ctx.setLineDash([6 / safeZoom, 4 / safeZoom]);
          const width = bounds.maxX - bounds.minX;
          const height = bounds.maxY - bounds.minY;
          ctx.strokeRect(bounds.minX - padding, bounds.minY - padding, width + padding * 2, height + padding * 2);
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
  ctx.lineWidth = (ps.spessore || 2) / safeZoom;
  ctx.setLineDash([6 / safeZoom, 4 / safeZoom]);
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
          case 'segmento':
          case 'freccia': {
            if (ps.kind === 'freccia') {
              const angle = Math.atan2(endY - startY, endX - startX);
              const headLength = Math.max(10, (ps.spessore || 2) * 3);
              const bx = endX - headLength * Math.cos(angle);
              const by = endY - headLength * Math.sin(angle);
              ctx.beginPath();
              ctx.moveTo(startX, startY);
              ctx.lineTo(bx, by);
              ctx.stroke();
              ctx.setLineDash([]);
              const headWidth = headLength * 0.8;
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
              ctx.setLineDash([6 / safeZoom, 4 / safeZoom]);
            } else {
              ctx.beginPath();
              ctx.moveTo(startX, startY);
              ctx.lineTo(endX, endY);
              ctx.stroke();
            }
            break;
          }
          case 'assi2': {
            // preview for 2-axis: draw dashed axes centered on bounding box
            const cx = minX + w / 2;
            const cy = minY + h / 2;
            const hw = Math.max(20, w / 2 || 40);
            const hh = Math.max(20, h / 2 || 40);
            // horizontal
            ctx.beginPath(); ctx.moveTo(cx - hw, cy); ctx.lineTo(cx + hw, cy); ctx.stroke();
            // vertical
            ctx.beginPath(); ctx.moveTo(cx, cy - hh); ctx.lineTo(cx, cy + hh); ctx.stroke();
            break;
          }
          case 'assi3': {
            const cx = minX + w / 2;
            const cy = minY + h / 2;
            const hw = Math.max(28, w / 2 || 56);
            const hh = Math.max(28, h / 2 || 56);
            // vertical up
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - hh); ctx.stroke();
            // diagonal down-right
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + hw, cy + hh); ctx.stroke();
            // diagonal down-left
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - hw, cy + hh); ctx.stroke();
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
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2 / safeZoom;
        ctx.setLineDash([6 / safeZoom, 4 / safeZoom]);
        const x1 = Math.min(selectionBox.x1, selectionBox.x2);
        const y1 = Math.min(selectionBox.y1, selectionBox.y2);
        const w = Math.abs(selectionBox.x2 - selectionBox.x1);
        const h = Math.abs(selectionBox.y2 - selectionBox.y1);
        ctx.strokeRect(x1, y1, w, h);
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

  // Hide custom overlay when pointer is over the toolbar area
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    function onEnter() {
      setInToolbar(true);
      try { const ov = overlayRef.current; if (ov) ov.style.display = 'none'; } catch(_) {}
    }
    function onLeave() {
      setInToolbar(false);
      try {
        const ov = overlayRef.current;
        if (!ov) return;
        // restore overlay only if appropriate (pen/eraser active and not panning)
        if ((strumento === 'penna' || strumento === 'gomma') && !panningRef.current.active) {
          ov.style.display = 'block';
        }
      } catch(_) {}
    }
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [toolbarRef, strumento]);

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

  const clearLavagnaState = useCallback(() => {
    try {
      if (animationFrameId.current != null) {
        cancelAnimationFrame(animationFrameId.current);
      }
    } catch (_) {}
    animationFrameId.current = null;
    try {
      if (outgoingRAFRef.current != null) {
        cancelAnimationFrame(outgoingRAFRef.current);
      }
    } catch (_) {}
    outgoingRAFRef.current = null;
    outgoingBufferRef.current = [];
    remoteStreams.current.clear();
    puntiCorrentiRef.current = [];
    currentStreamId.current = null;
    eraseSessionRef.current.strokeIds.clear();
    eraseSessionRef.current.shapeIds.clear();
    selectingRef.current = { active: false, start: null };
    previewShapeRef.current = null;
    drawingShapeRef.current = false;
    erasingRef.current = false;
    imageCacheRef.current?.clear?.();
    setSelectedItems({ tratti: [], forme: [] });
    setSelectionBox(null);
    setTratti([]);
    setForme([]);
    setUndoStack([]);
    setRedoStack([]);
    try {
      const ov = overlayRef.current;
      if (ov) {
        ov.style.display = 'none';
      }
    } catch (_) {}
    drawAll();
  }, [drawAll]);

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
  }, [spectatorMode, isAdmin, applyViewport, emitOrPublish, lavagnaId, attivitaId]);

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
          clearLavagnaState();
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

    return () => { try { cleanup(); } catch (_) {} };
  }, [channelName, drawAll, isAdmin, emitOrPublish, lavagnaId, attivitaId, applyViewport, utenteId, ruolo, clearLavagnaState]);

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
    try { console.log('[LAVAGNA-DBG-SHAPE] created', JSON.stringify(normalized)); } catch(_){}
    // register undo entry for local user-created shapes
    try {
      if (normalized.autoreUserId && normalized.autoreUserId === utenteId) {
        setUndoStack((prev) => [...prev, { type: 'add-shape', shape: normalized }]);
        setRedoStack([]);
      }
    } catch (_) {}
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
    // register undo entry for deletions performed by this user
    try {
      if (!removedShape.autoreUserId || removedShape.autoreUserId === utenteId || isAdmin) {
        setUndoStack((prev) => [...prev, { type: 'delete-shape', shape: removedShape }]);
        setRedoStack([]);
      }
    } catch (_) {}
    if (emit) emitOrPublish('shape:delete', { id, lavagnaId });
    // revoke any temporary object URL used by this shape
    try {
      if (removedShape.src && typeof removedShape.src === 'string' && removedShape.src.startsWith('blob:')) {
        try { URL.revokeObjectURL(removedShape.src); } catch(_) {}
      }
    } catch (_) {}
    fetch(`/api/lavagna/shape/${id}`, { method: 'DELETE' }).catch(() => {});
  }, [emitOrPublish, lavagnaId, isAdmin, utenteId]);

  // Clipboard for cut/copy/paste
  const clipboardRef = useRef({ tratti: [], forme: [] });

  const computeClipboardBounds = useCallback((cb) => {
    if (!cb) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const includeBounds = (bb) => {
      if (!bb) return;
      minX = Math.min(minX, bb.minX);
      minY = Math.min(minY, bb.minY);
      maxX = Math.max(maxX, bb.maxX);
      maxY = Math.max(maxY, bb.maxY);
    };
    (cb.forme || []).forEach((shape) => {
      if (!shape) return;
      const normalized = normalizeShape({ ...shape });
      includeBounds(normalized?._bb || getShapeBounds(normalized));
    });
    (cb.tratti || []).forEach((stroke) => {
      if (!stroke) return;
      const prepared = prepareStroke({ ...stroke });
      includeBounds(prepared._bb);
    });
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
      return null;
    }
    return {
      minX,
      minY,
      maxX,
      maxY,
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2
    };
  }, []);

  function getWorldCenter() {
    const canvas = canvasRef.current;
    const currentPan = panRef.current || { x: 0, y: 0 };
    const currentZoom = zoomRef.current || 1;
    if (!canvas) {
      return { x: currentPan.x, y: currentPan.y };
    }
    const rect = canvas.getBoundingClientRect();
    return {
      x: currentPan.x + (rect.width / 2) / currentZoom,
      y: currentPan.y + (rect.height / 2) / currentZoom
    };
  }

  function copySelection() {
    const sel = selectedItems;
    const selectedShapes = sel.forme
      .map((id) => forme.find((f) => f.id === id))
      .filter(Boolean)
      .map((shape) => JSON.parse(JSON.stringify(shape)));
    const selectedStrokes = sel.tratti
      .map((idx) => tratti[idx])
      .filter(Boolean)
      .map((stroke) => JSON.parse(JSON.stringify(stroke)));
    clipboardRef.current = {
      forme: selectedShapes,
      tratti: selectedStrokes
    };
  }

  function cutSelection() {
    copySelection();
    setTratti((prev) => prev.filter((_, idx) => !selectedItems.tratti.includes(idx)));
    setForme((prev) => prev.filter((f) => !selectedItems.forme.includes(f.id)));
    setSelectedItems({ tratti: [], forme: [] });
    clipboardRef.current.forme.forEach((shape) => {
      if (!shape?.id) return;
      emitOrPublish('shape:delete', { id: shape.id, lavagnaId });
    });
  }

  function pasteClipboard(targetPoint) {
    const cb = clipboardRef.current;
    if (!cb) return;
    const hasContent = (cb.forme && cb.forme.length) || (cb.tratti && cb.tratti.length);
    if (!hasContent) return;
    const bounds = computeClipboardBounds(cb);
    const fallback = pointerWorldRef.current || getWorldCenter();
    const anchor = targetPoint || fallback;
    const sourceCx = bounds ? bounds.cx : fallback.x;
    const sourceCy = bounds ? bounds.cy : fallback.y;
    const dx = anchor.x - sourceCx;
    const dy = anchor.y - sourceCy;

    const newShapeIds = [];
    (cb.forme || []).forEach((rawShape) => {
      if (!rawShape) return;
      const sanitized = { ...rawShape };
      delete sanitized.dbId;
      const id = `shape-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const normalized = normalizeShape({ ...sanitized, id, autoreUserId: utenteId });
      const translated = translateShape(normalized, dx, dy);
      translated.autoreUserId = utenteId;
      delete translated.dbId;
      newShapeIds.push(translated.id);
      createShapeLocal(translated, true);
    });

    const strokeTemplates = (cb.tratti || [])
      .filter(Boolean)
      .map((stroke) => {
        const id = `${utenteId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const punti = (stroke.punti || []).map((p) => ({ x: p.x + dx, y: p.y + dy }));
        return {
          ...stroke,
          id,
          dbId: undefined,
          autoreUserId: utenteId,
          punti
        };
      });

    const newStrokeIndexes = [];
    const preparedStrokes = [];
    if (strokeTemplates.length) {
      setTratti((prev) => {
        const startIndex = prev.length;
        const prepared = strokeTemplates.map((st, idx) => {
          const preparedStroke = prepareStroke({ ...st });
          preparedStrokes.push(preparedStroke);
          newStrokeIndexes.push(startIndex + idx);
          return preparedStroke;
        });
        return [...prev, ...prepared];
      });
      setUndoStack((prev) => [...prev, ...preparedStrokes.map((st) => ({ type: 'add', stroke: st }))]);
      setRedoStack([]);
      preparedStrokes.forEach((st) => {
        salvaTratto(st);
        emitOrPublish('stroke:done', { streamId: st.id });
      });
    }

    if (newShapeIds.length || newStrokeIndexes.length) {
      setSelectedItems({ forme: newShapeIds, tratti: newStrokeIndexes });
    }
    drawAll();
  }

  function duplicateSelection() {
    pasteClipboard(pointerWorldRef.current || getWorldCenter());
  }

  // Move selected items by dx,dy
  function moveSelectionBy(dx, dy, emit = true, selectionOverride = null) {
    const selection = selectionOverride || selectedItems;
    if (!selection) return;
    const updatedShapes = [];
    setForme(prev => prev.map(f => {
      if (!selection.forme.includes(f.id)) return f;
      const moved = translateShape(f, dx, dy);
      updatedShapes.push(moved);
      return moved;
    }));
    // Move strokes (shift points)
    setTratti(prev => prev.map((t, idx) => selection.tratti.includes(idx) ? ({ ...t, punti: t.punti.map(p => ({ x: p.x + dx, y: p.y + dy })) }) : t));
    if (emit) {
      updatedShapes.forEach((shape) => {
        emitOrPublish('shape:update', { ...shape, lavagnaId });
      });
    }
    drawAll();
  }

  const openLinkShape = useCallback((shape) => {
    if (!shape || shape.kind !== 'link' || !shape.url) return;
    try {
      window.open(shape.url, '_blank', 'noopener');
    } catch (_) {}
  }, []);

  // Keyboard shortcuts for copy/cut/paste/delete/duplicate
  useEffect(() => {
    function onKey(e) {
      if (!selectedItems) return;
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key === 'c') { copySelection(); e.preventDefault(); }
      if (mod && e.key === 'x') { cutSelection(); e.preventDefault(); }
      if (mod && e.key === 'v') {
        const cb = clipboardRef.current;
        if (cb && ((cb.forme && cb.forme.length) || (cb.tratti && cb.tratti.length))) {
          pasteClipboard(pointerWorldRef.current);
        }
        // do not prevent default so images/links from system clipboard still arrive in onPaste
      }
      if (e.key === 'Delete') { // delete selection
        selectedItems.forme.forEach(id => deleteShapeLocal(id, true));
        setTratti(prev => prev.filter((_, idx) => !selectedItems.tratti.includes(idx)));
        setSelectedItems({ tratti: [], forme: [] });
        e.preventDefault();
      }
      if (mod && e.key === 'd') { duplicateSelection(); e.preventDefault(); }
    }
    window.addEventListener('keydown', onKey);
    // Paste from system clipboard (images)
    function onPaste(e) {
      try {
        const anchor = pointerWorldRef.current || getWorldCenter();
        const items = e.clipboardData && e.clipboardData.items ? Array.from(e.clipboardData.items) : [];
        // try to detect text URL if no image items
        for (const it of items) {
          if (!it) continue;
          if (it.type && it.type.indexOf('image') === 0) {
            const file = it.getAsFile();
            if (file) {
              // Insert an immediate temporary preview using an object URL so user sees feedback
              const tempSrc = URL.createObjectURL(file);
              const tempId = insertLocalPastedImage(tempSrc);

              // Upload in background; when done, replace temp shape with persisted one
              (async () => {
                try {
                  const fd = new FormData();
                  const titolo = `incollato_${new Date().toISOString().slice(0,19).replace(/[-:T]/g,'_')}`;
                  fd.append('file', file);
                  fd.append('titolo', titolo);
                  if (clienteId) fd.append('clienteId', clienteId);
                  const res = await fetch('/api/materiale', { method: 'POST', body: fd });
                  const js = await res.json().catch(()=>null);
                  if (!res.ok || !js || !js.materiale) {
                    // leave temp preview and notify console
                    console.warn('[lavagna] upload pasted image failed, kept local preview');
                    return;
                  }
                  const mat = js.materiale;
                  const serverSrc = `/api/materiale?fileId=${mat.id}`;
                  const baseWidth = 400 / (zoom || 1);
                  const baseHeight = 300 / (zoom || 1);
                  const baseX = anchor.x - baseWidth / 2;
                  const baseY = anchor.y - baseHeight / 2;

                  const id = `img-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
                  const shape = {
                    id,
                    kind: 'immagine',
                    src: serverSrc,
                    materialeId: mat.id,
                    nomeOriginale: mat.nomeOriginale,
                    x: baseX,
                    y: baseY,
                    w: baseWidth,
                    h: baseHeight,
                    autoreUserId: utenteId
                  };

                  // preload to adjust size then create persisted shape and remove temp
                  const img = new Image();
                  img.onload = () => {
                    const aspect = img.naturalWidth / img.naturalHeight || 1;
                    const desiredW = Math.min(800, img.naturalWidth) / (zoom || 1);
                    const desiredH = desiredW / aspect;
                    shape.w = desiredW;
                    shape.h = desiredH;
                    shape.x = anchor.x - desiredW / 2;
                    shape.y = anchor.y - desiredH / 2;
                    // update temp preview in-place to point to server URL
                    setForme(prev => prev.map(f => f.id === tempId ? { ...f, src: serverSrc, materialeId: mat.id, nomeOriginale: mat.nomeOriginale, w: shape.w, h: shape.h, x: shape.x, y: shape.y } : f));
                    // emit creation for realtime consumers and persist shape on server
                    try {
                      const normalized = normalizeShape({ ...shape, id: tempId });
                      emitOrPublish('shape:create', { ...normalized, lavagnaId });
                      persistShape(normalized).then((s) => {
                        if (s && s.id) {
                          setForme(prev => prev.map(f => f.id === tempId ? { ...f, dbId: s.id } : f));
                        }
                      }).catch(()=>{});
                    } catch (_) {}
                    // revoke temp URL
                    try { URL.revokeObjectURL(tempSrc); } catch(_) {}
                    drawAll();
                  };
                  img.onerror = () => {
                    setForme(prev => prev.map(f => f.id === tempId ? { ...f, src: serverSrc, materialeId: mat.id, nomeOriginale: mat.nomeOriginale } : f));
                    try {
                      const normalized = normalizeShape({ ...shape, id: tempId });
                      emitOrPublish('shape:create', { ...normalized, lavagnaId });
                      persistShape(normalized).then((s) => {
                        if (s && s.id) {
                          setForme(prev => prev.map(f => f.id === tempId ? { ...f, dbId: s.id } : f));
                        }
                      }).catch(()=>{});
                    } catch (_) {}
                    try { URL.revokeObjectURL(tempSrc); } catch(_) {}
                    drawAll();
                  };
                  img.src = serverSrc;
                } catch (err) {
                  console.warn('[lavagna] error uploading pasted image', err);
                }
              })();
              e.preventDefault();
              return;
            }
          }
        }
        // if no image processed, check for text URL
        try {
          const text = (e.clipboardData && e.clipboardData.getData) ? e.clipboardData.getData('text/plain') : '';
          if (text && typeof text === 'string') {
            const t = text.trim();
            const urlRe = /^https?:\/\//i;
            if (urlRe.test(t)) {
              // create a link shape at center of view
              const baseW = 160 / (zoom || 1);
              const baseH = 28 / (zoom || 1);
              const shape = {
                id: `link-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
                kind: 'link',
                url: t,
                titolo: t,
                x: anchor.x - baseW / 2,
                y: anchor.y - baseH / 2,
                w: baseW,
                h: baseH,
                autoreUserId: utenteId
              };
              createShapeLocal(shape, true);
              e.preventDefault();
              return;
            }
          }
        } catch (_) {}
      } catch (_) {}
    }

    function insertLocalPastedImage(src) {
      try {
        const id = `img-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
        const anchor = pointerWorldRef.current || getWorldCenter();
        const baseWidth = 400 / (zoom || 1);
        const baseHeight = 300 / (zoom || 1);
        const shape = {
          id,
          kind: 'immagine',
          src,
          x: anchor.x - baseWidth / 2,
          y: anchor.y - baseHeight / 2,
          w: baseWidth,
          h: baseHeight,
          autoreUserId: utenteId
        };
        const img = new Image();
        img.onload = () => {
          const aspect = img.naturalWidth / img.naturalHeight || 1;
          const desiredW = Math.min(800, img.naturalWidth) / (zoom || 1);
          const desiredH = desiredW / aspect;
          shape.w = desiredW;
          shape.h = desiredH;
          shape.x = anchor.x - desiredW / 2;
          shape.y = anchor.y - desiredH / 2;
          setForme(prev => [...prev, shape]);
          drawAll();
        };
        img.onerror = () => { setForme(prev => [...prev, shape]); drawAll(); };
        img.src = src;
        return id;
      } catch (_) { return null; }
    }
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('paste', onPaste);
    };
  }, [selectedItems, tratti, forme, deleteShapeLocal, pasteClipboard, copySelection, cutSelection]);

  // helper: rounded rect
  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (typeof r === 'undefined') r = 5;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
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
    // Explicit link hit-test: use shape.w/h defaults if needed
    if (kind === 'link') {
      const baseX = Number(shape.x ?? 0);
      const baseY = Number(shape.y ?? 0);
      const width = Number(shape.w ?? 160);
      const height = Number(shape.h ?? 28);
      const minX = Math.min(baseX, baseX + width);
      const maxX = Math.max(baseX, baseX + width);
      const minY = Math.min(baseY, baseY + height);
      const maxY = Math.max(baseY, baseY + height);
      const withinX = x >= minX - tolerance && x <= maxX + tolerance;
      const withinY = y >= minY - tolerance && y <= maxY + tolerance;
      return !!(withinX && withinY);
    }
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
  // Provide sane defaults for link shapes so hit-testing and selection work
    if (kind === 'link') {
      // keep values in world units; if missing, provide a default visible size
      if (shape.w == null) shape.w = 160;
      if (shape.h == null) shape.h = 28;
    }
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
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const native = e?.nativeEvent;
    let clientX;
    let clientY;
    if (native && typeof native.clientX === 'number' && typeof native.clientY === 'number') {
      clientX = native.clientX;
      clientY = native.clientY;
    } else {
      clientX = typeof e?.clientX === 'number' ? e.clientX : 0;
      clientY = typeof e?.clientY === 'number' ? e.clientY : 0;
    }
    const offX = clientX - rect.left;
    const offY = clientY - rect.top;
    const currentPan = panRef.current || { x: 0, y: 0 };
    const currentZoom = zoomRef.current || 1;
    const x = currentPan.x + offX / currentZoom;
    const y = currentPan.y + offY / currentZoom;
    return { x, y };
  }, []);

  // Helper: given a world point, compute expected client (viewport) coords
  const screenFromWorld = useCallback((point) => {
    try {
      const canvas = canvasRef.current;
      if (!canvas || !point) return null;
      const rect = canvas.getBoundingClientRect();
      const currentPan = panRef.current || { x: 0, y: 0 };
      const currentZoom = zoomRef.current || 1;
      const sx = (point.x - currentPan.x) * currentZoom + rect.left;
      const sy = (point.y - currentPan.y) * currentZoom + rect.top;
      return { clientX: sx, clientY: sy, rect };
    } catch (err) {
      return null;
    }
  }, []);

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
    selectionClickRef.current = null;

    let cachedPoint = null;
    const getPointerWorld = () => {
      if (!cachedPoint) {
        cachedPoint = getPoint(e);
      }
      pointerWorldRef.current = cachedPoint;
      return cachedPoint;
    };

    if (btn === 2) {
      // Right-click: start context panning. If the current tool is not 'mano',
      // temporarily switch to 'mano' so the user can pan with right-drag and
      // see the hand cursor. We'll restore the previous tool on pointer up/cancel.
      e.preventDefault();
      if (spectatorLocked) {
        return;
      }
      try {
        // If not already the hand tool, remember current and switch to 'mano'
        if (strumento !== 'mano') {
          contextTempToolRef.current = strumento;
          setStrumento('mano');
        }
      } catch (_) {}
      try {
        canvas?.setPointerCapture?.(pointerId);
      } catch (_) {}
      panningRef.current.active = true;
      panningRef.current.viaContext = true;
      panningRef.current.lastX = native.clientX;
      panningRef.current.lastY = native.clientY;
      setContextPanning(true);
      setIsPanning(true);
      // hide any overlay while context panning starts
      try { const ov = overlayRef.current; if (ov) ov.style.display = 'none'; } catch(_) {}
      return;
    }

    if (native?.pointerType === 'touch') {
      touchesRef.current.set(pointerId, { x: native.clientX, y: native.clientY });
    }

    // Single-click on link shapes when using the hand tool: open URL and consume event
    try {
      if (btn === 0 && strumento === 'mano') {
        const p = getPoint(e);
        if (p) {
          for (const f of (forme || [])) {
            if (f.kind !== 'link') continue;
            if (hitTestShape(f, p.x, p.y, 12)) {
              openLinkShape(f);
              return;
            }
          }
        }
      }
    } catch (_) {}

      // If user clicked with the selection tool, begin a rectangular selection
      // (the 'lazo' rectangular mode). This restores expected selection behavior
      // which was previously inactive.
      if (strumento === 'selezione') {
        const p = getPointerWorld();
        selectingRef.current = selectingRef.current || {};
        selectingRef.current.active = true;
        selectingRef.current.start = p;
        setSelectionBox({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
        try {
          canvas?.setPointerCapture?.(pointerId);
        } catch (_) {}
        selectionClickRef.current = {
          pointerId,
          pointerTool: 'selezione',
          openCandidate: false,
          metaClick: !!(native?.ctrlKey || native?.metaKey),
          doubleTap: false,
          aborted: false,
          shapeId: null
        };
        return;
      }

      if (['rettangolo', 'cerchio', 'linea', 'triangolo', 'freccia', 'rombo', 'assi2', 'assi3'].includes(strumento)) {
      const p = getPointerWorld();
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

    if (strumento === 'mano') {
      if (spectatorLocked) {
        return;
      }
      getPointerWorld();
      try {
        canvas?.setPointerCapture?.(pointerId);
      } catch (_) {}
      panningRef.current.active = true;
  try { console.log('[LAVAGNA-STATE] panningRef.active = true (mano)'); } catch(_){}
      panningRef.current.lastX = native.clientX;
      panningRef.current.lastY = native.clientY;
      panningRef.current.viaContext = false;
      setContextPanning(false);
      setIsPanning(true);
      return;
    }

    setDisegnando(true);
    const punto = getPointerWorld();
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
    // ensure overlay visible and positioned on pointer down (support pen and eraser)
    try {
      const ov = overlayRef.current;
      const canvas = canvasRef.current;
      if (ov && canvas && (strumento === 'penna' || strumento === 'gomma')) {
        // Align overlay to world->screen computed position (avoids drift with zoom/pan)
        const expected = screenFromWorld(punto) || { clientX: e.nativeEvent.clientX, clientY: e.nativeEvent.clientY };
        const clientX = expected.clientX;
        const clientY = expected.clientY;
        ov.style.display = 'block';
        ov.style.left = `${clientX}px`;
        ov.style.top = `${clientY}px`;
        ov.style.width = `${overlaySize}px`;
        ov.style.height = `${overlaySize}px`;
        ov.style.borderRadius = '50%';
        if (strumento === 'gomma') {
          ov.style.background = colore;
          ov.style.opacity = '0.95';
          ov.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.6) inset';
          ov.style.border = 'none';
        } else {
          // Eraser overlay: translucent fill with dashed border
          ov.style.background = 'rgba(255,255,255,0.06)';
            try { console.log('[LAVAGNA-STATE] erasingRef = true (gomma intero-tratto)'); } catch(_){}
          ov.style.opacity = '1';
          ov.style.boxShadow = 'none';
          const borderPx = Math.max(2, Math.round(overlaySize * 0.08));
          ov.style.border = `${borderPx}px dashed rgba(15,31,83,0.95)`;
        }
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
          // If mismatch present, log rich details for debugging
          console.warn('[lavagna][diag] pointerDown mismatch', {
            distPx: Math.round(dist * 10) / 10,
            dx: Math.round(dx * 10) / 10,
            dy: Math.round(dy * 10) / 10,
            client: { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY },
            expected: { x: expected.clientX, y: expected.clientY },
            pan: { ...pan },
            zoom
          });
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
      // ensure overlay hidden while panning
      try { const ov = overlayRef.current; if (ov) ov.style.display = 'none'; } catch(_) {}
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

    // If we're dragging a selected shape(s), move them incrementally
    if (draggingSelectionRef.current && draggingSelectionRef.current.active) {
      try {
        const p = getPoint(e);
        pointerWorldRef.current = p;
        const dragInfo = draggingSelectionRef.current;
        if (p && dragInfo.lastWorld) {
          const last = dragInfo.lastWorld;
          const dx = p.x - last.x;
          const dy = p.y - last.y;
          if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
            const selectionSnapshot = dragInfo.selectionSnapshot || selectedItems;
            moveSelectionBy(dx, dy, true, selectionSnapshot);
            dragInfo.lastWorld = p;
            if (!dragInfo.moved) {
              const delta = Math.max(Math.abs(dx), Math.abs(dy));
              if (delta > 0.35) {
                dragInfo.moved = true;
              }
            }
            if (selectionClickRef.current && selectionClickRef.current.pointerId === dragInfo.pointerId) {
              selectionClickRef.current.aborted = true;
            }
            drawAll();
          }
        }
      } catch (_) {}
      return;
    }

    // Continuous erase while dragging in intero-tratto mode
    if (erasingRef.current) {
      const p = getPoint(e);
      pointerWorldRef.current = p;
      eraseShapesAt(p.x, p.y);
      eraseStrokeAt(p.x, p.y);
      // Update overlay position so the visual eraser follows the real input
      try {
        const ov = overlayRef.current;
        const canvas = canvasRef.current;
        if (ov && canvas) {
          const expected = screenFromWorld(p) || { clientX: e.nativeEvent.clientX, clientY: e.nativeEvent.clientY };
          const clientX = expected.clientX;
          const clientY = expected.clientY;
          // Only show overlay if not panning and not over toolbar
          const shouldShow = (strumento === 'penna' || strumento === 'gomma') && !panningRef.current.active && !inToolbar;
          if (shouldShow) {
            ov.style.display = 'block';
            ov.style.left = `${clientX}px`;
            ov.style.top = `${clientY}px`;
            ov.style.width = `${overlaySize}px`;
            ov.style.height = `${overlaySize}px`;
            ov.style.borderRadius = '50%';
            const borderPx = Math.max(2, Math.round(overlaySize * 0.08));
            ov.style.border = `${borderPx}px dashed rgba(15,31,83,0.95)`;
            ov.style.background = 'rgba(255,255,255,0.06)';
            ov.style.transform = 'translate(-50%, -50%)';
          } else {
            ov.style.display = 'none';
          }
        }
      } catch (_) {}
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
      pointerWorldRef.current = p;
      previewShapeRef.current.x2 = p.x; previewShapeRef.current.y2 = p.y;
      drawAll();
      return;
    }

  // Update selection box when the selection tool is dragging
    if (selectingRef.current.active) {
      const p = getPoint(e);
      pointerWorldRef.current = p;
      setSelectionBox({ x1: selectingRef.current.start.x, y1: selectingRef.current.start.y, x2: p.x, y2: p.y });
      return;
    }

    // If not drawing stroke, nothing to do
    // update overlay cursor position even when not drawing
    let memoPoint = null;
    const ensurePoint = () => {
      if (memoPoint) return memoPoint;
      memoPoint = getPoint(e);
      pointerWorldRef.current = memoPoint;
      return memoPoint;
    };
    try {
      const ov = overlayRef.current;
      // Only show overlay while actively drawing (avoid persistent overlay after release)
      // Show overlay while pointer is over the canvas and the active tool is
      // pen or eraser. Hide it while panning (mano) or when the pointer is
      // over the toolbar.
      if (ov) {
        const shouldShow = (strumento === 'penna' || strumento === 'gomma') && !panningRef.current.active && !inToolbar;
        if (shouldShow) {
          const worldPoint = ensurePoint();
          const expected = screenFromWorld(worldPoint) || { clientX: e.nativeEvent.clientX, clientY: e.nativeEvent.clientY };
          const clientX = expected.clientX;
          const clientY = expected.clientY;
          ov.style.display = 'block';
          ov.style.left = `${clientX}px`;
          ov.style.top = `${clientY}px`;
          ov.style.width = `${overlaySize}px`;
          ov.style.height = `${overlaySize}px`;
          ov.style.borderRadius = '50%';
          if (strumento === 'penna') {
            ov.style.background = colore;
            ov.style.opacity = '0.95';
            ov.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.6) inset';
            ov.style.border = 'none';
          } else {
            ov.style.background = 'rgba(255,255,255,0.06)';
            ov.style.opacity = '1';
            ov.style.boxShadow = 'none';
            const borderPx = Math.max(2, Math.round(overlaySize * 0.08));
            ov.style.border = `${borderPx}px dashed rgba(15,31,83,0.95)`;
          }
          ov.style.transform = 'translate(-50%, -50%)';
        } else {
          ov.style.display = 'none';
        }
      }
    } catch (_) {}

    // Occasional diagnostic: compare expected screen position for the last point
    try {
      if (disegnando) {
        const currentWorld = ensurePoint();
        const expected = screenFromWorld(currentWorld);
        if (expected) {
          const dx = expected.clientX - e.nativeEvent.clientX;
          const dy = expected.clientY - e.nativeEvent.clientY;
          const dist = Math.hypot(dx, dy);
          if (dist > 8) {
            console.warn('[lavagna][diag] pointerMove mismatch', {
              distPx: Math.round(dist * 10) / 10,
              dx: Math.round(dx * 10) / 10,
              dy: Math.round(dy * 10) / 10,
              client: { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY },
              expected: { x: expected.clientX, y: expected.clientY },
              pan: { ...pan },
              zoom
            });
          }
        }
      }
    } catch (_) {}

    if (!disegnando) return;

    const punto = ensurePoint();
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
    const pendingClick = selectionClickRef.current;
    const dragInfo = draggingSelectionRef.current;
    // (no-op) -- overlay visibility will be reconciled below depending on
    // whether the pointer remains over the canvas and current tool.
    // finalize any selection drag
    if (dragInfo && dragInfo.active) {
      try { canvasRef.current?.releasePointerCapture?.(pointerId); } catch(_) {}
      const shouldOpenLink = (() => {
        if (!pendingClick) return false;
        if (dragInfo.pointerTool !== 'selezione') return false;
        if (pendingClick.pointerId !== pointerId) return false;
        if (pendingClick.aborted) return false;
        if (dragInfo.moved) return false;
        if (!pendingClick.openCandidate) return false;
        return pendingClick.doubleTap || pendingClick.metaClick;
      })();
      const shapeToOpen = shouldOpenLink
        ? (forme || []).find((f) => f.id === pendingClick.shapeId)
        : null;
      dragInfo.active = false;
      dragInfo.lastWorld = null;
      dragInfo.moved = false;
      dragInfo.pointerTool = null;
      dragInfo.pointerId = null;
      dragInfo.primaryShapeId = null;
  dragInfo.primaryStrokeIndex = null;
      dragInfo.selectionSnapshot = null;
      selectionClickRef.current = null;
      drawAll();
      if (shapeToOpen) {
        openLinkShape(shapeToOpen);
      }
      return;
    }
    if (panningRef.current.active) {
      try {
        canvasRef.current?.releasePointerCapture?.(pointerId);
      } catch (_) {}
      panningRef.current.active = false;
      try { console.log('[LAVAGNA-STATE] panningRef.active = false'); } catch(_){}
      panningRef.current.viaContext = false;
      setIsPanning(false);
      setContextPanning(false);
      // restore original tool if we temporarily switched on right-click
      try {
        if (contextTempToolRef.current) {
          setStrumento(contextTempToolRef.current);
          contextTempToolRef.current = null;
        }
      } catch (_) {}
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
      // ensure we release any pointer capture held during erasing; do not forcibly
      // hide overlay here because pointer may still be hovering the canvas and
      // the cursor preview should remain visible while the user is over the board.
      try {
        canvasRef.current?.releasePointerCapture?.(pointerId);
      } catch (_) {}
      try { console.log('[LAVAGNA-STATE] erasing finished -> released capture'); } catch(_){}
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

  // If finishing a selection drag, compute selected items
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
      selectionClickRef.current = null;
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
      // Reconcile overlay: if pointer is still over the canvas and the active
      // tool is pen/gomma, keep the preview visible; otherwise hide it.
      try {
        const ov = overlayRef.current;
        const canvas = canvasRef.current;
        if (ov && canvas) {
          const rect = canvas.getBoundingClientRect();
          const cx = e?.nativeEvent?.clientX;
          const cy = e?.nativeEvent?.clientY;
          const inside = typeof cx === 'number' && typeof cy === 'number' && cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom;
          const shouldShow = inside && (strumento === 'penna' || strumento === 'gomma') && !panningRef.current.active && !inToolbar;
          if (shouldShow) {
            // position overlay at pointer location
            ov.style.display = 'block';
            ov.style.left = `${cx}px`;
            ov.style.top = `${cy}px`;
            ov.style.width = `${overlaySize}px`;
            ov.style.height = `${overlaySize}px`;
            ov.style.borderRadius = '50%';
            if (strumento === 'penna') {
              ov.style.background = colore;
              ov.style.opacity = '0.95';
              ov.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.6) inset';
              ov.style.border = 'none';
            } else {
              ov.style.background = 'rgba(255,255,255,0.06)';
              ov.style.opacity = '1';
              ov.style.boxShadow = 'none';
              const borderPx = Math.max(2, Math.round(overlaySize * 0.08));
              ov.style.border = `${borderPx}px dashed rgba(15,31,83,0.95)`;
            }
            ov.style.transform = 'translate(-50%, -50%)';
          } else {
            ov.style.display = 'none';
          }
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
      if (strumento === 'gomma' && gommaPuntuale) {
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
      // restore original tool if we temporarily switched on right-click
      try {
        if (contextTempToolRef.current) {
          setStrumento(contextTempToolRef.current);
          contextTempToolRef.current = null;
        }
      } catch (_) {}
      try { console.log('[LAVAGNA-STATE] pointerCancel: panningRef reset'); } catch(_){}
    }
    if (e?.nativeEvent?.pointerType === 'touch') {
      touchesRef.current.delete(e.nativeEvent.pointerId);
      if (touchesRef.current.size < 2 && gestureRef.current.mode === 'panzoom') {
        gestureRef.current.mode = 'none';
      }
    }
    if (draggingSelectionRef.current) {
      draggingSelectionRef.current.active = false;
      draggingSelectionRef.current.lastWorld = null;
      draggingSelectionRef.current.moved = false;
      draggingSelectionRef.current.pointerTool = null;
      draggingSelectionRef.current.pointerId = null;
      draggingSelectionRef.current.primaryShapeId = null;
      draggingSelectionRef.current.primaryStrokeIndex = null;
      draggingSelectionRef.current.selectionSnapshot = null;
    }
    selectionClickRef.current = null;
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
    else if (last.type === 'add-shape') {
      // remove the shape that was added
      const sid = last.shape.id;
      setForme((prev) => prev.filter((s) => s.id !== sid));
      if (last.shape.dbId && (isAdmin || last.shape.autoreUserId === utenteId)) {
        fetch(`/api/lavagna/shape/${last.shape.dbId}`, { method: 'DELETE' }).catch(() => {});
      }
      emitOrPublish('shape:delete', { id: sid, lavagnaId });
    } else if (last.type === 'delete-shape') {
      // restore deleted shape
      const shp = last.shape;
      setForme((prev) => [...prev, shp]);
      try {
        const normalized = normalizeShape(shp);
        emitOrPublish('shape:create', { ...normalized, lavagnaId });
        // try persist again
        persistShape(normalized).then((s) => {
          if (s && s.id) {
            setForme((prev) => prev.map((f) => (f.id === normalized.id ? { ...f, dbId: s.id } : f)));
          }
        }).catch(() => {});
      } catch(_) {}
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
    else if (action.type === 'add-shape') {
      // redo add: re-add shape
      const shp = action.shape;
      setForme((prev) => [...prev, shp]);
      try {
        const normalized = normalizeShape(shp);
        emitOrPublish('shape:create', { ...normalized, lavagnaId });
        persistShape(normalized).then((s) => {
          if (s && s.id) setForme((prev) => prev.map((f) => (f.id === normalized.id ? { ...f, dbId: s.id } : f)));
        }).catch(() => {});
      } catch(_) {}
    } else if (action.type === 'delete-shape') {
      // redo delete: remove shape
      const id = action.shape.id;
      setForme((prev) => prev.filter((f) => f.id !== id));
      emitOrPublish('shape:delete', { id, lavagnaId });
      if (action.shape.dbId && (isAdmin || action.shape.autoreUserId === utenteId)) {
        fetch(`/api/lavagna/shape/${action.shape.dbId}`, { method: 'DELETE' }).catch(() => {});
      }
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

    clearLavagnaState();
    emitOrPublish('clear-lavagna', { lavagnaId, attivitaId });

    fetch(`/api/lavagna/clear?lavagnaId=${lavagnaId}`, { method: 'DELETE' })
      .then((res) => {
        if (!res.ok) {
          console.error('[handleClear] Errore API nel pulire la lavagna:', res.statusText);
        }
      })
      .catch((error) => {
        console.error('[handleClear] Eccezione nella chiamata API per pulire la lavagna:', error);
      });
  }, [isAdmin, clearLavagnaState, emitOrPublish, lavagnaId, attivitaId]);

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
  const shapeActive = ['rettangolo','cerchio','linea','triangolo','rombo','freccia','assi2','assi3'].includes(strumento);
    const shapeButtonActive = shapeActive || showShapesPopover;
    const undoDisabled = !undoStack.length;
    const redoAvailable = redoStack.length > 0;

    return (
      <div style={st.bottomToolbarDock}>
        <div ref={toolbarRef} style={st.commandBar}>
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
              style={iconBtn(strumento === 'selezione')}
              onClick={() => {
                setStrumento('selezione');
                setShowPenPopover(false);
                setShowMoreMenu(false);
                setShowShapesPopover(false);
                setShowExportMenu(false);
              }}
              title="Selezione / Lazo"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M5 3l6.8 6.4 3-3.4 3.7 11.8-11.8-3.7 3.4-3-6.4-6.8z" stroke={strumento==='selezione' ? '#fff' : '#20489a'} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" fill={strumento==='selezione' ? '#fff' : 'none'} />
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
                  // If user is switching to the pen tool, set default color and
                  // do not immediately open the color popover. If the pen is
                  // already active, toggle the color popover.
                  if (strumento !== 'penna') {
                    setStrumento('penna');
                    // Do not override `colore` here: keep the last selected color.
                    setShowPenPopover(false);
                    setShowShapesPopover(false);
                    setShowMoreMenu(false);
                    setShowExportMenu(false);
                  } else {
                    setShowPenPopover((v) => !v);
                    setShowShapesPopover(false);
                    setShowMoreMenu(false);
                    setShowExportMenu(false);
                  }
                }}
                title="Penna"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style={{ transform: 'scale(0.92)' }}
                >
                  <defs>
                    <linearGradient id="pen-body-gradient" x1="20.828" y1="3.172" x2="12.343" y2="11.657" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FEFEFE" />
                      <stop offset="1" stopColor="#D7D7D7" />
                    </linearGradient>
                    <linearGradient id="pen-tip-gradient" x1="12.343" y1="11.657" x2="3.172" y2="20.828" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#4A4A4A" />
                      <stop offset="1" stopColor="#1A1A1A" />
                    </linearGradient>
                  </defs>
                  <path d="M20.828 3.172a4.09 4.09 0 0 1 0 5.784L9.13 20.654a2.06 2.06 0 0 1-1.23.595l-4.425.885a.5.5 0 0 1-.575-.575l.885-4.425a2.06 2.06 0 0 1 .595-1.23L15.043 3.172a4.09 4.09 0 0 1 5.785 0Z" fill="url(#pen-body-gradient)"/>
                  <path d="M15.043 3.172 3.345 14.87a2.06 2.06 0 0 0-.595 1.23l-.885 4.425a.5.5 0 0 0 .575.575l4.425-.885a2.06 2.06 0 0 0 1.23-.595L19.828 8.956a4.09 4.09 0 0 0 0-5.784L15.043 3.172Z" fill="url(#pen-tip-gradient)"/>
                  <path d="M19.121 4.586a2.061 2.061 0 0 1 0 2.916L7.424 19.199a1 1 0 0 1-.598.29l-2.212.442a.25.25 0 0 1-.288-.288l.442-2.212a1 1 0 0 1 .29-.598L16.205 4.586a2.061 2.061 0 0 1 2.916 0Z" fill="#111"/>
                  <path d="M6.01 17.785l-1.53 1.53a.5.5 0 0 0 0 .707l.823.823a.5.5 0 0 0 .707 0l1.53-1.53-1.53-1.53Z" fill="#4A4A4A"/>
                </svg>
                {/* pen scribble: always visible on the pen button (helps preview). */}
                <div style={{ position: 'absolute', right: 6, bottom: 6, pointerEvents: 'none', transform: 'scale(0.92)' }}>
                  <svg width="22" height="10" viewBox="0 0 22 10" fill="none" aria-hidden>
                    {/* path starts near left and is shorter so it visually emerges from the pen tip */}
                    <path d="M2 7c2-3 4 1 7-2 3-3 6 1 11-1" stroke={colore} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
                  </svg>
                </div>
              </button>
              {showPenPopover && (
                <div style={st.penPopover}>
                  <div style={st.penTray}>
                    {penPalette.map((entry) => {
                      const selected = entry.value === colore;
                      return (
                        <button
                          key={entry.value}
                          type="button"
                          onClick={() => setColore(entry.value)}
                          title={entry.label}
                          style={{
                            ...st.penSwatch,
                            boxShadow: selected ? '0 0 0 2px #fff, 0 0 0 4px rgba(28,125,247,0.45)' : st.penSwatch.boxShadow,
                            borderColor: selected ? '#1c7df7' : 'rgba(212,223,246,0.75)'
                          }}
                        >
                          <span
                            style={{
                              ...st.penSwatchIcon,
                              background: entry.preview || entry.value
                            }}
                          />
                        </button>
                      );
                    })}
                    <input
                      ref={colorInputRef}
                      type="color"
                      value={colore}
                      onChange={(e) => setColore(e.target.value)}
                      style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
                    />
                    <button
                      type="button"
                      onClick={() => colorInputRef.current?.click()}
                      title="Selettore colore"
                      style={{
                        ...st.penSwatch,
                        boxShadow: isCustomPenColor ? '0 0 0 2px #fff, 0 0 0 4px rgba(28,125,247,0.45)' : st.penSwatch.boxShadow,
                        borderColor: isCustomPenColor ? '#1c7df7' : 'rgba(212,223,246,0.75)'
                      }}
                    >
                      <span
                        style={{
                          ...st.penSwatchIcon,
                          background: 'conic-gradient(red,orange,yellow,green,cyan,blue,violet,red)'
                        }}
                      />
                    </button>
                  </div>
                  <div style={st.penOptionsRow}>
                    <span style={st.sizeLabel}>{spessore}px</span>
                    <input
                      type="range"
                      min={1}
                      max={25}
                      value={spessore}
                      onChange={(e) => setSpessore(Number(e.target.value))}
                      style={{ flex: 1, accentColor: '#1c7df7' }}
                    />
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
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4.9 14.1l6.8-6.8a2.4 2.4 0 0 1 3.4 0l3.8 3.8a2.4 2.4 0 0 1 0 3.4l-6.8 6.8H9.5a2.4 2.4 0 0 1-1.7-.7l-2.9-2.9a2.4 2.4 0 0 1 0-3.4z"
                  fill={strumento==='gomma' ? '#ffffff' : '#fde7ef'}
                  stroke={strumento==='gomma' ? '#0f1f53' : '#20489a'}
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path
                  d="M10.3 6.2l7.5 7.5-2.6 2.6-7.5-7.5z"
                  fill={strumento==='gomma' ? '#ffe5ed' : '#fbd1dd'}
                  opacity="0.85"
                />
                <path
                  d="M4.2 18.9h9.6"
                  stroke={strumento==='gomma' ? '#0f1f53' : '#20489a'}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  opacity="0.55"
                />
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <g stroke={shapeButtonActive ? '#fff' : '#20489a'} strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    {/* rotated square (top-left) */}
                    <rect x="2" y="2" width="10" height="10" rx="1.8" transform="rotate(-25 7 7)" />
                    {/* larger circle (moved closer) to intersect the square diagonally */}
                    <circle cx="13" cy="11" r="5" />
                  </g>
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
                    <button type="button" style={iconBtn(strumento === 'assi2')} onClick={() => { setStrumento('assi2'); setShowShapesPopover(false); setShowExportMenu(false); }} title="Assi (2)">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M12 3v18" stroke={strumento==='assi2'? '#fff':'#20489a'} strokeWidth="2" strokeLinecap="round" />
                        <path d="M3 12h18" stroke={strumento==='assi2'? '#fff':'#20489a'} strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                    <button type="button" style={iconBtn(strumento === 'assi3')} onClick={() => { setStrumento('assi3'); setShowShapesPopover(false); setShowExportMenu(false); }} title="Assi (3)">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M12 3v18" stroke={strumento==='assi3'? '#fff':'#20489a'} strokeWidth="2" strokeLinecap="round" />
                        <path d="M5 16l14-8" stroke={strumento==='assi3'? '#fff':'#20489a'} strokeWidth="2" strokeLinecap="round" />
                        <path d="M5 8l14 8" stroke={strumento==='assi3'? '#fff':'#20489a'} strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                    <button type="button" style={iconBtn(strumento === 'freccia')} onClick={() => { setStrumento('freccia'); setShowShapesPopover(false); setShowExportMenu(false); }} title="Freccia">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12h8" stroke={strumento==='freccia'? '#fff':'#20489a'} strokeWidth="2" strokeLinecap="round"/>
                        <path d="M13 7l6 5-6 5" stroke={strumento==='freccia'? '#fff':'#20489a'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
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
    if (strumento === 'gomma') {
      if (eraserCursor) {
        const hotspot = Math.round(eraserCursor.hotspot);
        return `url(${eraserCursor.url}) ${hotspot} ${hotspot}, auto`;
      }
      return 'crosshair';
    }
  if (strumento === 'selezione') return 'default';
  if (['rettangolo','cerchio','linea','triangolo','rombo','freccia','assi2','assi3'].includes(strumento)) {
      return 'crosshair';
    }
    if (!penCursor) return 'crosshair';
    const hotspot = Math.round(penCursor.hotspot);
    return `url(${penCursor.url}) ${hotspot} ${hotspot}, auto`;
  }, [contextPanning, strumento, isPanning, penCursor, eraserCursor]);

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
          // block native context menu so right-click is reserved for grab/pan
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDoubleClick={(e) => {
            try {
              const p = getPoint(e);
              if (!p) return;
              for (const f of (forme || [])) {
                if (f.kind !== 'link') continue;
                if (hitTestShape(f, p.x, p.y, 12)) {
                  openLinkShape(f);
                  return;
                }
              }
            } catch (_) {}
          }}
          style={{
            ...st.canvas,
            // When hovering toolbar, force default cursor and hide overlay via toolbar handlers
            cursor: inToolbar ? 'default' : (contextPanning ? canvasCursor : ((strumento === 'penna' || strumento === 'gomma') ? 'none' : canvasCursor))
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
  penPopover: {
    position: 'absolute',
    bottom: '110%',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(180deg, #f8fbff 0%, #eef3ff 100%)',
    border: '1px solid rgba(51,94,168,0.18)',
    boxShadow: '0 22px 38px rgba(16,42,105,0.16)',
    borderRadius: 18,
    padding: '14px 16px',
    minWidth: 220,
    zIndex: 6
  },
  penTray: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center'
  },
  penSwatch: {
    width: 34,
    height: 34,
    borderRadius: 12,
    border: '1.5px solid rgba(212,223,246,0.75)',
    background: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    boxShadow: '0 1px 2px rgba(17,43,94,0.18)',
    transition: 'box-shadow .18s ease, border-color .18s ease'
  },
  penSwatchIcon: {
    width: 22,
    height: 14,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.9)',
    boxShadow: 'inset 0 1px 1px rgba(15,42,105,0.18)'
  },
  penOptionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    width: '100%',
    padding: '10px 12px 6px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.72)'
  },
  sizeLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#20489a",
    minWidth: 48,
    textAlign: 'right'
  },
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
  }
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
