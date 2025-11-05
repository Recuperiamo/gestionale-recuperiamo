"use client";
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo
} from "react";
import { getAblyChannel, getAblyChannelAsync, whenChannelAttachedAsync } from "../../lib/realtime/ablyClient";

export default function LavagnaCanvas({
  lavagnaId,
  attivitaId,
  trattiIniziali,
  formeIniziali,
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
  const ablyRef = useRef({ ch: null, buffer: [] });

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
  const [enablePinchZoom, setEnablePinchZoom] = useState(true);
  const [enableSingleFingerPan, setEnableSingleFingerPan] = useState(false);
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
      { value: "#14b8a6", label: "Acqua", preview: "#14b8a6" }
    ],
    []
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
  const zoomControlsRef = useRef(null);
  const [pan, setPan] = useState({ x: 0, y: 0 }); // pan in unità mondo
  const [isPanning, setIsPanning] = useState(false);
  const [contextPanning, setContextPanning] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [proportionalResize, setProportionalResize] = useState(true); // Lucchetto proporzioni
  const panningRef = useRef({ active: false, lastX: 0, lastY: 0, viaContext: false });
  const contextTempToolRef = useRef(null); // when right-click temporarily switches tool to 'mano'
  const touchesRef = useRef(new Map()); // pointerId -> { x,y }
  const gestureRef = useRef({ mode: 'none', startZoom: 1, startPan: { x: 0, y: 0 }, startDist: 0, startMidWorld: { x: 0, y: 0 } });
  const enablePinchZoomRef = useRef(enablePinchZoom);
  const enableSingleFingerPanRef = useRef(enableSingleFingerPan);
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

  // Mobile responsive hook
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const penCursor = useMemo(() => {
    if (strumento !== "penna") return null;
  // Always show a simple colored circular cursor (even smaller now).
  // Use a compact scale factor so the visible cursor is minimal and
  // consistent while drawing.
  const effectiveSize = spessore * 2 * (zoom || 1);
  const diameter = Math.max(8, Math.min(effectiveSize, 28));
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
  // make overlay slightly smaller than before so it matches the new pen cursor
  // For pen we will not show the DOM overlay (we rely on CSS cursor). Keep overlay
  // sizing for eraser only.
  const desired = Math.max(8, Math.min(spessore * 2 * zoom, 48));
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
      try {
        const ch = ablyRef.current.ch;
        
        if (ch) {
          console.log('[LAVAGNA-PUBLISH] Publishing directly', { event: name });
          ch.publish(name, data);
        } else {
          console.log('[LAVAGNA-PUBLISH] Channel not ready, buffering message', { event: name });
          ablyRef.current.buffer.push({ name, data });
        }
      } catch (e) {
        console.error('[LAVAGNA-PUBLISH-ERROR]', { event: name, error: e.message || e });
      }
    },
    []
  );

  // Shapes and selection
  const [forme, setForme] = useState(() =>
    (formeIniziali || []).map((s) => ({
      ...s,
      dbId: s.id,
      id: `shape-${s.id}` // Unique client-side ID
    }))
  ); // shapes: { id, kind, x,y,w,h, x2,y2, colore, spessore }
  const pendingDeletions = useRef(new Map()); // localId -> true (queued for deletion once dbId arrives)
  const previewShapeRef = useRef(null);
  const drawingShapeRef = useRef(false);
  const rightClickLineRef = useRef({ active: false, start: null }); // for right-click straight line while pen mode
  const erasingRef = useRef(false);
  const selectingRef = useRef({ active: false, start: null });
  const rotatingRef = useRef({ active: false, center: null, startAngle: 0, originals: {} });
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
  const resizingSelectionRef = useRef({
    active: false,
    handle: null, // e.g., 'top-left', 'bottom-right'
    aspectRatio: 1,
    originalBounds: null,
    selectionSnapshot: null,
  });
  const selectionClickRef = useRef(null);
  const [showShapesPopover, setShowShapesPopover] = useState(false);

  const getResizeCursor = (handle) => {
    switch (handle) {
      case 'top-left':
      case 'bottom-right':
        return 'nwse-resize';
      case 'top-right':
      case 'bottom-left':
        return 'nesw-resize';
      case 'top':
      case 'bottom':
        return 'ns-resize';
      case 'left':
      case 'right':
        return 'ew-resize';
      default:
        return 'default';
    }
  };

  const isAdmin = String(ruolo || "").toLowerCase() === "admin";
  const eraseSessionRef = useRef({
    strokeIds: new Set(),
    shapeIds: new Set()
  });
  const animationFrameId = useRef(null);

  // Disegno incrementale: disegna solo i nuovi punti di uno stroke remoto senza cancellare tutto
  const drawIncrementalStroke = useCallback((streamData, newPoints) => {
    const ctx = ctxRef.current;
    if (!ctx || !newPoints || newPoints.length === 0) return;
    
    const canvas = ctx.canvas;
    const dpr = window.devicePixelRatio || 1;
    const safeZoom = Math.max(zoom, 0.0001);
    const worldScale = safeZoom * dpr;
    
    // Applica la stessa trasformazione world di drawAll
    ctx.save();
    ctx.setTransform(worldScale, 0, 0, worldScale, (-pan.x) * worldScale, (-pan.y) * worldScale);
    
    ctx.globalCompositeOperation = streamData.strumento === 'gomma' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = streamData.strumento === 'gomma' ? '#fff' : streamData.colore || '#20489a';
    ctx.lineWidth = streamData.spessore || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Disegna solo i nuovi segmenti
    const allPoints = streamData.punti;
    const startIdx = Math.max(0, allPoints.length - newPoints.length - 1);
    
    if (startIdx < allPoints.length) {
      ctx.beginPath();
      ctx.moveTo(allPoints[startIdx].x, allPoints[startIdx].y);
      for (let i = startIdx + 1; i < allPoints.length; i++) {
        ctx.lineTo(allPoints[i].x, allPoints[i].y);
      }
      ctx.stroke();
    }
    
    ctx.restore();
  }, [zoom, pan]);

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
        // If the shape carries a rotation, apply a world-space transform so
        // rendering rotates around the shape's center. We keep this minimal
        // (rotation only affects visual rendering), bounding boxes/hit-tests
        // remain axis-aligned for now to avoid larger geometry changes.
        try {
          const rot = Number(f.rotation) || 0;
          if (rot && isFinite(rot)) {
            const bb = f._bb ?? getShapeBounds(f) ?? { minX: 0, minY: 0, maxX: 0, maxY: 0 };
            // rotate around the top-left corner of the shape's bounding box
            const px = bb.minX;
            const py = bb.minY;
            ctx.translate(px, py);
            ctx.rotate(rot);
            ctx.translate(-px, -py);
          }
        } catch(_) {}

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
        case 'assi2d': {
          // Assi cartesiani 2D: X e Y estesi in entrambe le direzioni, frecce solo sui semiassi positivi (destra e alto)
          const x = f.x;
          const y = f.y;
          const w = f.w;
          const h = f.h;
          const cx = x + w / 2;
          const cy = y + h / 2;
          const arrowSize = Math.max(10, (f.spessore || 3) * 3);

          // Asse X (orizzontale, bidirezionale)
          ctx.beginPath();
          ctx.moveTo(x, cy);
          ctx.lineTo(x + w, cy);
          ctx.stroke();
          // Freccia: destra (positivo)
          ctx.beginPath();
          ctx.moveTo(x + w, cy);
          ctx.lineTo(x + w - arrowSize, cy - arrowSize * 0.5);
          ctx.lineTo(x + w - arrowSize, cy + arrowSize * 0.5);
          ctx.closePath();
          ctx.fillStyle = f.colore || '#20489a';
          ctx.fill();

          // Asse Y (verticale, bidirezionale)
          ctx.beginPath();
          ctx.moveTo(cx, y);
          ctx.lineTo(cx, y + h);
          ctx.stroke();
          // Freccia: alto (positivo)
          ctx.beginPath();
          ctx.moveTo(cx, y);
          ctx.lineTo(cx - arrowSize * 0.5, y + arrowSize);
          ctx.lineTo(cx + arrowSize * 0.5, y + arrowSize);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'assi3d': {
          // Assi cartesiani 3D: X, Y bidirezionali con frecce solo sui positivi (destra e alto).
          // Z diagonale orientata NE <-> SW con freccia solo sul semiasse positivo (SW).
          const x = f.x;
          const y = f.y;
          const w = f.w;
          const h = f.h;
          const cx = x + w / 2;
          const cy = y + h / 2;
          const arrowSize = Math.max(10, (f.spessore || 3) * 3);

          // Asse X (orizzontale, bidirezionale)
          ctx.beginPath();
          ctx.moveTo(x, cy);
          ctx.lineTo(x + w, cy);
          ctx.stroke();
          // Freccia: destra (positivo)
          ctx.beginPath();
          ctx.moveTo(x + w, cy);
          ctx.lineTo(x + w - arrowSize, cy - arrowSize * 0.5);
          ctx.lineTo(x + w - arrowSize, cy + arrowSize * 0.5);
          ctx.closePath();
          ctx.fillStyle = f.colore || '#20489a';
          ctx.fill();

          // Asse Y (verticale, bidirezionale)
          ctx.beginPath();
          ctx.moveTo(cx, y);
          ctx.lineTo(cx, y + h);
          ctx.stroke();
          // Freccia: alto (positivo)
          ctx.beginPath();
          ctx.moveTo(cx, y);
          ctx.lineTo(cx - arrowSize * 0.5, y + arrowSize);
          ctx.lineTo(cx + arrowSize * 0.5, y + arrowSize);
          ctx.closePath();
          ctx.fill();

          // Asse Z (diagonale nord-est <-> sud-ovest)
          const dx1 = x + w; // top-right
          const dy1 = y;
          const dx2 = x;     // bottom-left
          const dy2 = y + h;
          ctx.beginPath();
          ctx.moveTo(dx1, dy1);
          ctx.lineTo(dx2, dy2);
          ctx.stroke();
          // Freccia solo sul semiasse positivo: sud-ovest (dx2,dy2)
          ctx.beginPath();
          ctx.moveTo(dx2, dy2);
          ctx.lineTo(dx2 + arrowSize * 0.8, dy2 - arrowSize * 0.3);
          ctx.lineTo(dx2 + arrowSize * 0.3, dy2 - arrowSize * 0.8);
          ctx.closePath();
          ctx.fill();
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

          // diagonal extra axis: extends from top-right to bottom-left through center
          // with arrow at bottom-left end only (matching the pattern of the other axes)
          const dx1 = cx + hw; // start top-right
          const dy1 = cy - hh;
          const dx2 = cx - hw; // end bottom-left
          const dy2 = cy + hh;
          const angleDR = Math.atan2(dy2 - dy1, dx2 - dx1);
          const uxDR = Math.cos(angleDR);
          const uyDR = Math.sin(angleDR);
          ctx.beginPath();
          // draw from top-right to bottom-left, shortening at arrow end
          ctx.moveTo(dx1, dy1);
          ctx.lineTo(dx2 - headLength * uxDR, dy2 - headLength * uyDR);
          ctx.stroke();
          // arrowhead at bottom-left end
          ctx.beginPath();
          ctx.moveTo(dx2, dy2);
          ctx.lineTo(dx2 - headLength * uxDR + headWidth * uyDR, dy2 - headLength * uyDR - headWidth * uxDR);
          ctx.lineTo(dx2 - headLength * uxDR - headWidth * uyDR, dy2 - headLength * uyDR + headWidth * uxDR);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'immagine': {
          // Draw images: prefer a small realtime preview (srcPreview or srcData)
          // for immediate visibility, but attempt to load the server-hosted
          // src as well so it can replace the preview when available.
          try {
            const candidates = [];
            if (f.srcPreview) candidates.push(f.srcPreview);
            if (f.srcData) candidates.push(f.srcData);
            if (f.src) candidates.push(f.src);
            let drawn = false;
            for (const src of candidates) {
              if (!src) continue;
              const cached = imageCacheRef.current.get(src);
              if (cached === 'err') continue;
              let imgEl = cached;
              if (!imgEl) {
                imgEl = new Image();
                // allow cross-origin images where possible
                try { imgEl.crossOrigin = 'anonymous'; } catch (_) {}
                imgEl.onload = () => { imageCacheRef.current.set(src, imgEl); drawAll(); };
                imgEl.onerror = () => { imageCacheRef.current.set(src, 'err'); drawAll(); };
                imgEl.src = src;
                imageCacheRef.current.set(src, imgEl);
              }
              if (imgEl && imgEl !== 'err' && imgEl.complete && imgEl.naturalWidth) {
                // Preserve aspect ratio when rendering images
                const imgAspect = imgEl.naturalWidth / imgEl.naturalHeight;
                let w = f.w || imgEl.naturalWidth / (window.devicePixelRatio || 1);
                let h = f.h || imgEl.naturalHeight / (window.devicePixelRatio || 1);
                
                // If both w and h are set, adjust to maintain aspect ratio
                // by using the width and calculating height from aspect ratio
                if (f.w && f.h) {
                  h = w / imgAspect;
                }
                
                ctx.drawImage(imgEl, f.x, f.y, w, h);
                drawn = true;
                break;
              }
            }
            // nothing to draw now; onload handlers will call drawAll when ready
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

          // Draw resize handles
          const handleSize = 10 / safeZoom;
          const handleOffset = handleSize / 2;
          const handles = {
            'top-left': { x: bounds.minX, y: bounds.minY },
            'top-right': { x: bounds.maxX, y: bounds.minY },
            'bottom-left': { x: bounds.minX, y: bounds.maxY },
            'bottom-right': { x: bounds.maxX, y: bounds.maxY },
            'top': {x: bounds.minX + width/2, y: bounds.minY},
            'bottom': {x: bounds.minX + width/2, y: bounds.maxY},
            'left': {x: bounds.minX, y: bounds.minY + height/2},
            'right': {x: bounds.maxX, y: bounds.minY + height/2},
          };

          ctx.fillStyle = '#2563eb';
          for (const key in handles) {
            const pos = handles[key];
            ctx.fillRect(pos.x - handleOffset, pos.y - handleOffset, handleSize, handleSize);
          }
          
          // Draw proportional resize lock icon above selection
          const lockSize = 24 / safeZoom;
          const lockX = bounds.minX + width / 2;
          const lockY = bounds.minY - padding - lockSize - 8 / safeZoom;
          
          // Lock background
          ctx.fillStyle = proportionalResize ? '#2563eb' : '#94a3b8';
          ctx.fillRect(lockX - lockSize/2, lockY, lockSize, lockSize);
          
          // Lock icon
          ctx.strokeStyle = '#ffffff';
          ctx.fillStyle = '#ffffff';
          ctx.lineWidth = 2 / safeZoom;
          
          if (proportionalResize) {
            // Closed lock
            const lockBodyW = 12 / safeZoom;
            const lockBodyH = 10 / safeZoom;
            const lockBodyX = lockX - lockBodyW / 2;
            const lockBodyY = lockY + lockSize - lockBodyH - 2 / safeZoom;
            ctx.fillRect(lockBodyX, lockBodyY, lockBodyW, lockBodyH);
            
            // Lock shackle
            const shackleW = 8 / safeZoom;
            const shackleH = 6 / safeZoom;
            ctx.beginPath();
            ctx.arc(lockX, lockBodyY, shackleW / 2, Math.PI, 0, false);
            ctx.stroke();
          } else {
            // Open lock
            const lockBodyW = 12 / safeZoom;
            const lockBodyH = 10 / safeZoom;
            const lockBodyX = lockX - lockBodyW / 2;
            const lockBodyY = lockY + lockSize - lockBodyH - 2 / safeZoom;
            ctx.fillRect(lockBodyX, lockBodyY, lockBodyW, lockBodyH);
            
            // Open shackle (offset to the right)
            const shackleW = 8 / safeZoom;
            ctx.beginPath();
            ctx.arc(lockX + shackleW / 2, lockBodyY, shackleW / 2, Math.PI, 0, false);
            ctx.stroke();
          }
          
          // Draw rotation button to the right of lock icon - much easier to use!
          const rotateSize = 30 / safeZoom;
          const rotateX = lockX + lockSize/2 + rotateSize/2 + 8 / safeZoom;
          const rotateY = lockY + lockSize/2;
          
          // Rotation button background (circular)
          ctx.fillStyle = '#2563eb';
          ctx.beginPath();
          ctx.arc(rotateX, rotateY, rotateSize/2, 0, Math.PI * 2);
          ctx.fill();
          
          // Rotation icon - circular arrow
          ctx.strokeStyle = '#ffffff';
          ctx.fillStyle = '#ffffff';
          ctx.lineWidth = 2.5 / safeZoom;
          const arcR = 9 / safeZoom;
          const startA = Math.PI * 0.25;
          const endA = Math.PI * 2.25;
          ctx.beginPath();
          ctx.arc(rotateX, rotateY, arcR, startA, endA, false);
          ctx.stroke();
          // Arrow head
          const ex = rotateX + arcR * Math.cos(endA);
          const ey = rotateY + arcR * Math.sin(endA);
          const headLen = 6 / safeZoom;
          const ang = Math.atan2(ey - rotateY, ex - rotateX);
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(
            ex - headLen * Math.cos(ang) + headLen * 0.5 * Math.sin(ang),
            ey - headLen * Math.sin(ang) - headLen * 0.5 * Math.cos(ang)
          );
          ctx.lineTo(
            ex - headLen * Math.cos(ang) - headLen * 0.5 * Math.sin(ang),
            ey - headLen * Math.sin(ang) + headLen * 0.5 * Math.cos(ang)
          );
          ctx.closePath();
          ctx.fill();
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

      // Draw rotation handle for current selection (top-center) so users
      // can discover the rotate affordance. This is drawn in world units.
      try {
        const selIds = (selectedItems && selectedItems.forme) || [];
        if (selIds && selIds.length) {
          const selBounds = getSelectionBoundsForIds(selIds);
          if (selBounds) {
              // Draw small corner rotation affordances. When the pointer is
              // hovering one of the corners, show a circular-arrow icon to
              // indicate that clicking there will start rotation around the
              // selection center.
              const corners = [
                { x: selBounds.minX, y: selBounds.minY },
                { x: selBounds.maxX, y: selBounds.minY },
                { x: selBounds.minX, y: selBounds.maxY },
                { x: selBounds.maxX, y: selBounds.maxY }
              ];
              const pw = pointerWorldRef.current;
              const cornerHitRadius = Math.max(10, 12 / safeZoom);
              let hoveredCornerIndex = -1;
              if (pw) {
                for (let i = 0; i < corners.length; i++) {
                  const c = corners[i];
                  const dx = pw.x - c.x;
                  const dy = pw.y - c.y;
                  if (Math.hypot(dx, dy) <= cornerHitRadius) { hoveredCornerIndex = i; break; }
                }
              }
              // Draw each corner indicator
              for (let i = 0; i < corners.length; i++) {
                const c = corners[i];
                ctx.save();
                // Draw a circular-arrow icon at each corner. When hovered it is
                // highlighted (thicker & with arrow head); otherwise drawn subtly.
                const arcR = (i === hoveredCornerIndex) ? Math.max(14, 18 / safeZoom) : Math.max(9, 12 / safeZoom);
                const arcCx = c.x;
                const arcCy = c.y;
                const startA = Math.PI * 0.25;
                const endA = Math.PI * 2.25;
                if (i === hoveredCornerIndex) {
                  ctx.strokeStyle = '#2563eb';
                  ctx.fillStyle = '#2563eb';
                  ctx.lineWidth = 2 / safeZoom;
                  ctx.beginPath(); ctx.arc(arcCx, arcCy, arcR, startA, endA, false); ctx.stroke();
                  // arrowhead
                  const ex = arcCx + arcR * Math.cos(endA);
                  const ey = arcCy + arcR * Math.sin(endA);
                  const headLen = Math.max(8, 10 / safeZoom);
                  const ang = Math.atan2(ey - arcCy, ex - arcCx);
                  const left = { x: ex - headLen * Math.cos(ang) + headLen * 0.5 * Math.sin(ang), y: ey - headLen * Math.sin(ang) - headLen * 0.5 * Math.cos(ang) };
                  const right = { x: ex - headLen * Math.cos(ang) - headLen * 0.5 * Math.sin(ang), y: ey - headLen * Math.sin(ang) + headLen * 0.5 * Math.cos(ang) };
                  ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(left.x, left.y); ctx.lineTo(right.x, right.y); ctx.closePath(); ctx.fill();
                  // subtle white halo beneath arrow tip for contrast
                  try { ctx.beginPath(); ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.9; ctx.arc(ex, ey, Math.max(3, 5 / safeZoom), 0, Math.PI * 2); ctx.fill(); } catch(_){}
                } else {
                  // subtle stroke-only arc for non-hovered corners
                  ctx.strokeStyle = 'rgba(37,99,235,0.6)';
                  ctx.lineWidth = 1 / safeZoom;
                  ctx.beginPath(); ctx.arc(arcCx, arcCy, arcR, startA, endA, false); ctx.stroke();
                }
                ctx.restore();
              }
              // If we detected a hovered corner, suggest pointer cursor
              try {
                const canvasEl = canvasRef.current;
                if (canvasEl) canvasEl.style.cursor = (hoveredCornerIndex >= 0 ? 'crosshair' : 'default');
              } catch(_){}
            }
          }
      } catch (_) {}

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

  useEffect(() => {
    enablePinchZoomRef.current = enablePinchZoom;
  }, [enablePinchZoom]);

  useEffect(() => {
    enableSingleFingerPanRef.current = enableSingleFingerPan;
  }, [enableSingleFingerPan]);

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
    // Hide overlay when pointer is over toolbar or zoom/export controls
    const els = [toolbarRef.current, exportMenuRef.current, zoomControlsRef.current].filter(Boolean);
    if (!els.length) return;
    function onEnter() {
      setInToolbar(true);
      try { const ov = overlayRef.current; if (ov) ov.style.display = 'none'; } catch(_) {}
    }
    function onLeave() {
      setInToolbar(false);
      try {
        const ov = overlayRef.current;
        if (!ov) return;
        // Restore overlay only for eraser (we rely on the CSS cursor for the pen)
        if (strumento === 'gomma' && !panningRef.current.active) {
          ov.style.display = 'block';
        }
      } catch(_) {}
    }
    els.forEach((el) => {
      el.addEventListener('pointerenter', onEnter);
      el.addEventListener('pointerleave', onLeave);
    });
    return () => {
      els.forEach((el) => {
        try { el.removeEventListener('pointerenter', onEnter); } catch(_) {}
        try { el.removeEventListener('pointerleave', onLeave); } catch(_) {}
      });
    };
  }, [toolbarRef, exportMenuRef, zoomControlsRef, strumento]);

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
      } else {
        // Default: modalità spettatore DISABILITATA (da rifare da capo)
        setSpectatorMode(false);
      }
    } catch (_) {}
  }, [spectatorStorageKey, isAdmin]);

  useEffect(() => {
    if (!spectatorStorageKey) return;
    if (typeof window === 'undefined') return;
    if (isAdmin) return; // Admin non usa spectatorMode storage
    try {
      if (spectatorMode) {
        window.localStorage.setItem(spectatorStorageKey, '1');
      } else {
        // Salva '0' per ricordare che l'utente ha disattivato manualmente
        window.localStorage.setItem(spectatorStorageKey, '0');
      }
    } catch (_) {}
  }, [spectatorMode, spectatorStorageKey, isAdmin]);

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
    // Quando si attiva spectatorMode, richiedi viewport corrente dall'admin
    if (spectatorMode && !isAdmin) {
      console.log('[LAVAGNA-SPECTATOR] Requesting viewport from admin');
      emitOrPublish('viewport:request', {
        lavagnaId,
        attivitaId,
        requesterId: utenteId,
        ts: Date.now()
      });
    }
  }, [spectatorMode, emitOrPublish, lavagnaId, attivitaId, utenteId, ruolo, isAdmin]);

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
    // DON'T clear image cache - keep images loaded in memory
    // imageCacheRef.current?.clear?.();
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
    const { pan: remotePan, zoom: remoteZoom, visibleRect } = view;
    
    // If the admin sent a visibleRect, compute a fit-to-view for spectators so
    // they scale and center the admin's view into their own canvas (responsive).
    if (visibleRect && visibleRect.width > 0 && visibleRect.height > 0) {
      try {
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const localW = rect.width;
          const localH = rect.height;
          // Compute zoom to fit admin's visible rect into our canvas
          const scaleX = localW / visibleRect.width;
          const scaleY = localH / visibleRect.height;
          const targetZoom = Math.min(scaleX, scaleY);
          // Clamp zoom to allowed range
          const clampedZoom = Math.max(0.1, Math.min(5, targetZoom));
          // Center the admin's visible rect in our canvas
          const centerX = visibleRect.x + visibleRect.width / 2;
          const centerY = visibleRect.y + visibleRect.height / 2;
          const newPan = {
            x: centerX - (localW / 2) / clampedZoom,
            y: centerY - (localH / 2) / clampedZoom
          };
          // Apply the computed fit
          setPan((prev) => {
            if (prev.x === newPan.x && prev.y === newPan.y) return prev;
            return newPan;
          });
          setZoom((prev) => (prev === clampedZoom ? prev : clampedZoom));
          return;
        }
      } catch (_) {}
    }
    
    // Fallback: if no visibleRect, apply admin pan/zoom directly (old behavior)
    if (remotePan && typeof remotePan.x === 'number' && typeof remotePan.y === 'number') {
      setPan((prev) => {
        if (prev.x === remotePan.x && prev.y === remotePan.y) return prev;
        return { x: remotePan.x, y: remotePan.y };
      });
    }
    if (typeof remoteZoom === 'number' && !Number.isNaN(remoteZoom)) {
      setZoom((prev) => (prev === remoteZoom ? prev : remoteZoom));
    }
  }, []);  // Empty deps - uses only refs and stable setters

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
    // Continua finché si disegna - throttle a 20/sec (50ms) invece di 60fps per evitare rate limit
    if (disegnando) {
      outgoingRAFRef.current = setTimeout(flushOutgoing, 50);
    } else {
      outgoingRAFRef.current = null;
    }
  }, [emitOrPublish, disegnando]);

  useEffect(() => {
    if (!isAdmin) return;
    // Compute the visible world-space rectangle so spectators can scale to fit
    const canvas = canvasRef.current;
    let visibleRect = null;
    let canvasSize = null;
    if (canvas) {
      try {
        const rect = canvas.getBoundingClientRect();
        const cssW = rect.width;
        const cssH = rect.height;
        canvasSize = { width: cssW, height: cssH };
        const worldW = cssW / zoom;
        const worldH = cssH / zoom;
        visibleRect = {
          x: pan.x,
          y: pan.y,
          width: worldW,
          height: worldH
        };
      } catch (_) {}
    }
    viewportBroadcastRef.current.payload = {
      lavagnaId,
      attivitaId,
      senderId: utenteId,
      pan: { x: pan.x, y: pan.y },
      zoom,
      canvasSize,
      visibleRect,
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

        // Flush buffer
        if (ablyRef.current.buffer.length > 0) {
          console.log(`[LAVAGNA-PUBLISH] Channel is ready, flushing ${ablyRef.current.buffer.length} buffered messages.`);
          ablyRef.current.buffer.forEach(msg => {
            try {
              ch.publish(msg.name, msg.data);
              console.log(`[LAVAGNA-PUBLISH] Flushed message: ${msg.name}`);
            } catch (e) {
              console.error(`[LAVAGNA-PUBLISH] Error flushing message ${msg.name}:`, e);
            }
          });
          ablyRef.current.buffer = []; // Clear buffer
        }

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
          if (process.env.NODE_ENV !== 'production') {
            try { console.log('[LAVAGNA-RECV] stroke:start', { streamId, start }); } catch(_) {}
          }
          remoteStreams.current.set(streamId, {
            strumento,
            colore,
            spessore,
            punti: [start]
          });
          // Non serve ridisegnare - il primo punto sarà disegnato con stroke:points
        };

        const onPoints = (msg) => {
          const { data } = msg || {};
          const { streamId, points } = data || {};
          if (!streamId || !Array.isArray(points) || points.length === 0) return;
          if (process.env.NODE_ENV !== 'production') {
            try { console.log('[LAVAGNA-RECV] stroke:points', { streamId, n: points.length }); } catch(_) {}
          }
          const st = remoteStreams.current.get(streamId);
          if (!st) return;
          st.punti.push(...points);
          // Disegna solo i nuovi punti invece di ridisegnare tutto
          drawIncrementalStroke(st, points);
        };

        const onDone = (msg) => {
          const { data } = msg || {};
          const { streamId } = data || {};
          if (process.env.NODE_ENV !== 'production') {
            try { console.log('[LAVAGNA-RECV] stroke:done', { streamId }); } catch(_) {}
          }
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
          // Non serve ridisegnare tutto - il tratto è già stato disegnato incrementalmente
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
          console.log('[LAVAGNA-RECV] shape:create RAW', { 
            hasData: !!data, 
            kind: data?.kind, 
            id: data?.id, 
            autoreUserId: data?.autoreUserId,
            senderId: data?.senderId,
            myUserId: utenteId,
            msgStructure: Object.keys(data || {})
          });
          if (!data) return;
          
          // Con echoMessages attivo, usa senderId per ignorare solo i propri messaggi echo
          // NON usare autoreUserId perché quello indica chi ha creato la forma (può essere diverso dal sender)
          if (data.senderId && data.senderId === utenteId) {
            console.log('[LAVAGNA-RECV] Ignoring own shape:create (echo)', { senderId: data.senderId, myUserId: utenteId });
            return;
          }
          
          const normalized = normalizeShape(data);
          if (!normalized) return;
          
          console.log('[LAVAGNA-RECV] shape:create PROCESSING', { 
            id: normalized.id, 
            kind: normalized.kind,
            autore: normalized.autoreUserId,
            willAdd: true
          });
          
          // If the creator included an inline data URL fallback (srcData), prefer it
          // for immediate rendering on clients that cannot fetch /api/materiale.
          try {
            // accept either srcData (older) or srcPreview (preferred small preview)
            const preview = data.srcPreview || data.srcData;
            if (preview && normalized.kind === 'immagine') {
              normalized.src = preview;
            }
          } catch (_) {}
          setForme((prev) => {
            if (prev.find((f) => f.id === normalized.id)) {
              console.log('[LAVAGNA-RECV] Shape already exists, skipping:', normalized.id);
              return prev;
            }
            console.log('[LAVAGNA-RECV] Adding new shape:', normalized.id);
            return [...prev, normalized];
          });
          // Per le immagini, precarica e ridisegna quando pronta
          if (normalized.kind === 'immagine' && normalized.src) {
            const img = new Image();
            img.onload = () => {
              drawAll();
            };
            img.onerror = () => {
              drawAll(); // Disegna comunque anche se errore
            };
            img.src = normalized.src;
          } else {
            drawAll();
          }
        };
        const onShapeUpdate = (msg) => {
          const { data } = msg || {};
          if (!data || !data.id) return;
          const normalized = normalizeShape(data);
          if (!normalized) return;
          try {
            const preview = data.srcPreview || data.srcData;
            if (preview && normalized.kind === 'immagine') {
              normalized.src = preview;
            }
          } catch (_) {}
          setForme((prev) => prev.map((f) => (f.id === data.id ? { ...f, ...normalized } : f)));
          // Per le immagini, precarica e ridisegna quando pronta
          if (normalized.kind === 'immagine' && normalized.src) {
            const img = new Image();
            img.onload = () => {
              drawAll();
            };
            img.onerror = () => {
              drawAll();
            };
            img.src = normalized.src;
          } else {
            drawAll();
          }
        };
        const onShapeDelete = (msg) => {
          const { data } = msg || {};
          if (!data || !data.id) return;
          console.log('[LAVAGNA-REMOTE-DELETE] Received shape:delete event:', data);
          // Only remove from local state; persistence is handled by the originating client
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
        const pendingViewportRef = useRef(null);
        const viewportApplyRAFRef = useRef(null);
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
            // Buffer viewport update and apply once per animation frame to prevent "jittering"
            pendingViewportRef.current = snapshot;
            if (viewportApplyRAFRef.current) {
              cancelAnimationFrame(viewportApplyRAFRef.current);
            }
            viewportApplyRAFRef.current = requestAnimationFrame(() => {
              if (pendingViewportRef.current) {
                applyViewport(pendingViewportRef.current);
              }
              viewportApplyRAFRef.current = null;
            });
          }
        };
        const onViewportRequest = (msg) => {
          console.log('[LAVAGNA-RECV] viewport:request RAW MESSAGE:', msg);
          const { data } = msg || {};
          const { requesterId } = data || {};
          console.log('[LAVAGNA-RECV] viewport:request PARSED:', { 
            isAdmin, 
            myUserId: utenteId, 
            requesterId,
            willRespond: isAdmin && requesterId !== utenteId
          });
          if (!isAdmin) {
            console.log('[LAVAGNA-RECV] Not admin, ignoring viewport:request');
            return;
          }
          // Se echoMessages è attivo, ignora la propria richiesta
          if (requesterId === utenteId) {
            console.log('[LAVAGNA-RECV] Ignoring own viewport:request (echo)');
            return;
          }
          // Calcola visibleRect come nel broadcast normale
          const canvas = canvasRef.current;
          let visibleRect = null;
          let canvasSize = null;
          if (canvas) {
            try {
              const rect = canvas.getBoundingClientRect();
              const cssW = rect.width;
              const cssH = rect.height;
              canvasSize = { width: cssW, height: cssH };
              const currentZoom = zoomRef.current;
              const currentPan = panRef.current;
              const worldW = cssW / currentZoom;
              const worldH = cssH / currentZoom;
              visibleRect = {
                x: currentPan.x,
                y: currentPan.y,
                width: worldW,
                height: worldH
              };
            } catch (_) {}
          }
          console.log('[LAVAGNA-VIEWPORT] Admin responding to viewport:request from', requesterId, { visibleRect, canvasSize });
          emitOrPublish('viewport:update', {
            lavagnaId,
            attivitaId,
            senderId: utenteId,
            pan: { x: panRef.current.x, y: panRef.current.y },
            zoom: zoomRef.current,
            canvasSize,
            visibleRect,
            ts: Date.now()
          });
        };
        const onSpectatorToggle = (msg) => {
          console.log('[LAVAGNA-SPECTATOR-TOGGLE] RAW MESSAGE:', msg);
          const { data } = msg || {};
          const { userId, active } = data || {};
          console.log('[LAVAGNA-SPECTATOR-TOGGLE] PARSED:', { 
            userId, 
            active, 
            isAdmin, 
            myUserId: utenteId,
            willProcess: userId && userId !== utenteId
          });
          if (!userId) return;
          // Ignora il proprio toggle (echoMessages attivo)
          if (userId === utenteId) {
            console.log('[LAVAGNA-SPECTATOR-TOGGLE] Ignoring own toggle (echo)');
            return;
          }
          const roster = spectatorRosterRef.current;
          if (active) {
            console.log('[LAVAGNA-SPECTATOR-TOGGLE] Adding user to roster:', userId);
            roster.add(userId);
          } else {
            console.log('[LAVAGNA-SPECTATOR-TOGGLE] Removing user from roster:', userId);
            roster.delete(userId);
          }
          setSpectatorCount(roster.size);
          console.log('[LAVAGNA-SPECTATOR-TOGGLE] Roster updated, count:', roster.size, 'roster:', Array.from(roster));
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

    return () => {
      try {
        cleanup();
      } catch (_) {}
    };
  }, [channelName]);

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
    if (emit) {
      // Include srcPreview for realtime sync of pasted images
      const payload = { ...normalized, lavagnaId, senderId: utenteId };
      if (normalized.kind === 'immagine' && normalized.src && normalized.src.startsWith('data:')) {
        payload.srcPreview = normalized.src; // Include data URL for realtime clients
      }
      console.log('[LAVAGNA-SEND] Publishing shape:create', { 
        id: normalized.id, 
        kind: normalized.kind,
        senderId: utenteId
      });
      emitOrPublish('shape:create', payload);
    }
    // try persist async (best-effort)
    persistShape(normalized).then((s) => {
      if (s && s.id) {
        console.log('[LAVAGNA-CREATE] Shape persisted, mapping dbId:', { localId: normalized.id, dbId: s.id, kind: normalized.kind });
        setForme((prev) => {
          const found = prev.find((f) => f.id === normalized.id);
          console.log('[LAVAGNA-CREATE] setForme mapping:', { localId: normalized.id, foundInState: !!found });
          return prev.map((f) => (f.id === normalized.id ? { ...f, dbId: s.id } : f));
        });
        // If this shape was queued for deletion before dbId arrived, delete now
        console.log('[LAVAGNA-CREATE] Checking pendingDeletions:', { 
          localId: normalized.id, 
          hasPending: pendingDeletions.current.has(normalized.id),
          queueSize: pendingDeletions.current.size,
          queueKeys: Array.from(pendingDeletions.current.keys())
        });
        if (pendingDeletions.current.has(normalized.id)) {
          pendingDeletions.current.delete(normalized.id);
          console.log('[LAVAGNA-DELAYED-DELETE] Shape was deleted before persist, deleting now with dbId:', { localId: normalized.id, dbId: s.id, kind: normalized.kind });
          fetch(`/api/lavagna/shape/${s.id}`, { method: 'DELETE' })
            .then(res => console.log('[LAVAGNA-DELAYED-DELETE] DELETE response:', res.status))
            .catch(err => console.error('[LAVAGNA-DELAYED-DELETE] DELETE error:', err));
        }
      } else {
        console.warn('[LAVAGNA-CREATE] Shape persist failed or returned no id:', s);
      }
    }).catch(err => console.error('[LAVAGNA-CREATE] Error persisting shape:', err));
  }, [emitOrPublish, lavagnaId, persistShape, utenteId]);

  const updateShapeLocal = useCallback((shape, emit = true) => {
    const normalized = normalizeShape(shape);
    if (!normalized) return;
    setForme((prev) => prev.map((f) => (f.id === normalized.id ? { ...f, ...normalized } : f)));
    if (emit) {
      // Include srcPreview for realtime sync of updated images
      const payload = { ...normalized, lavagnaId };
      if (normalized.kind === 'immagine' && normalized.src && normalized.src.startsWith('data:')) {
        payload.srcPreview = normalized.src;
      }
      emitOrPublish('shape:update', payload);
    }
    const dbId = shape.dbId || shape.id;
    console.log('[LAVAGNA-UPDATE] Updating shape:', { localId: shape.id, dbId, normalized });
    fetch(`/api/lavagna/shape/${dbId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...normalized, dbId })
    })
      .then(res => {
        console.log('[LAVAGNA-UPDATE] Response status:', res.status);
        return res.json();
      })
      .then(data => console.log('[LAVAGNA-UPDATE] Response data:', data))
      .catch(err => console.error('[LAVAGNA-UPDATE] Error:', err));
  }, [emitOrPublish, lavagnaId]);

  const deleteShapeLocal = useCallback((id, emit = true, force = false) => {
    console.log('[LAVAGNA-DELETE] deleteShapeLocal called:', { id, emit, force, formeLengthBefore: forme.length });
    
    // Find the shape BEFORE removing it from state
    const target = forme.find((f) => f.id === id);
    console.log('[LAVAGNA-DELETE] Found target shape:', { id, found: !!target, kind: target?.kind });
    
    if (!target) {
      console.warn('[LAVAGNA-DELETE] Shape not found:', { id });
      return;
    }
    
    if (!force && !isAdmin && target.autoreUserId && target.autoreUserId !== utenteId) {
      console.log('[LAVAGNA-DELETE] Permission denied:', { isAdmin, targetAuthor: target.autoreUserId, utenteId });
      return;
    }
    
    // Now remove from state
    setForme((prev) => prev.filter((f) => f.id !== id));
    
    // register undo entry for deletions performed by this user
    try {
      if (!target.autoreUserId || target.autoreUserId === utenteId || isAdmin) {
        setUndoStack((prev) => [...prev, { type: 'delete-shape', shape: target }]);
        setRedoStack([]);
      }
    } catch (_) {}
    
    if (emit) emitOrPublish('shape:delete', { id, lavagnaId });
    
    // revoke any temporary object URL used by this shape
    try {
      if (target.src && typeof target.src === 'string' && target.src.startsWith('blob:')) {
        try { URL.revokeObjectURL(target.src); } catch(_) {}
      }
    } catch (_) {}
    
    const dbId = target.dbId || id;
    console.log('[LAVAGNA-DELETE] Removing shape:', { localId: id, dbId, kind: target.kind, dbIdType: typeof dbId });
    
    // If dbId is not numeric, queue for deletion when persist completes
    if (typeof dbId !== 'number' && isNaN(Number(dbId))) {
      console.log('[LAVAGNA-DELETE] dbId not yet assigned, queuing deletion:', { localId: id, kind: target.kind });
      pendingDeletions.current.set(id, true);
      return;
    }
    
    // Send DELETE to server
    console.log('[LAVAGNA-DELETE] Sending DELETE to server:', { localId: id, dbId, kind: target.kind });
    fetch(`/api/lavagna/shape/${dbId}`, { method: 'DELETE' })
      .then(res => {
        console.log('[LAVAGNA-DELETE] DELETE response:', { status: res.status, dbId, kind: target.kind });
        return res.json();
      })
      .then(data => console.log('[LAVAGNA-DELETE] DELETE success:', { data, dbId, kind: target.kind }))
      .catch(err => console.error('[LAVAGNA-DELETE] DELETE error:', { err, dbId, kind: target.kind }));
  }, [emitOrPublish, lavagnaId, isAdmin, utenteId, forme]);

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
        console.log('[LAVAGNA-DELETE-KEY] Delete pressed, selectedItems:', selectedItems);
        selectedItems.forme.forEach(id => {
          console.log('[LAVAGNA-DELETE-KEY] Calling deleteShapeLocal for id:', id);
          deleteShapeLocal(id, true);
        });
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
              // Pasted images stay ONLY in the lavagna (not uploaded to materiale).
              // Convert to data URL and store directly in the shape.
              (async () => {
                try {
                  // Create a compressed data URL for storage and realtime sync
                  const srcData = await createPreviewDataURL(file, { maxDim: 1200, quality: 0.8 });
                  console.log('[LAVAGNA-PASTE] Image pasted, data URL length:', srcData?.length);
                  
                  const id = `img-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
                  const baseWidth = 400 / (zoom || 1);
                  const baseHeight = 300 / (zoom || 1);
                  
                  // Create shape with embedded data URL
                  const tempShape = {
                    id,
                    kind: 'immagine',
                    src: srcData,
                    x: anchor.x - baseWidth / 2,
                    y: anchor.y - baseHeight / 2,
                    w: baseWidth,
                    h: baseHeight,
                    autoreUserId: utenteId
                  };
                  
                  // Preload to get actual dimensions
                  const img = new Image();
                  img.onload = () => {
                    const aspect = img.naturalWidth / img.naturalHeight || 1;
                    const desiredW = Math.min(800, img.naturalWidth) / (zoom || 1);
                    const desiredH = desiredW / aspect;
                    tempShape.w = desiredW;
                    tempShape.h = desiredH;
                    tempShape.x = anchor.x - desiredW / 2;
                    tempShape.y = anchor.y - desiredH / 2;
                    
                    // Create shape locally and persist to lavagna DB (not materiale!)
                    createShapeLocal(tempShape, true);
                    drawAll();
                  };
                  img.onerror = () => {
                    // Even if preload fails, create the shape with default size
                    createShapeLocal(tempShape, true);
                    drawAll();
                  };
                  img.src = srcData;
                } catch (err) {
                  console.warn('[lavagna] error processing pasted image', err);
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
              createShapeLocal(shape, true); // <-- emit = true
              e.preventDefault();
              return;
            }
          }
        } catch (_) {}
      } catch (_) {}
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

  // Helper: convert File/Blob to data URL (Promise)
  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('fileToDataURL error'));
        reader.readAsDataURL(file);
      } catch (err) { reject(err); }
    });
  }

  // Create a resized preview data URL (JPEG or original type if small) suitable
  // for realtime transport. Returns a data URL string.
  async function createPreviewDataURL(file, opts = { maxDim: 800, quality: 0.7 }) {
    const maxDim = opts.maxDim || 800;
    const quality = typeof opts.quality === 'number' ? opts.quality : 0.7;
    const dataUrl = await fileToDataURL(file);
    // If file is small (< 256KB) return original data URL to save decoding/encode
    try {
      const approxSize = Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4);
      if (approxSize < 256 * 1024) return dataUrl;
    } catch (_) {}
    return await new Promise((resolve, reject) => {
      try {
        const img = new Image();
        img.onload = () => {
          try {
            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;
            let tw = w;
            let th = h;
            if (Math.max(w, h) > maxDim) {
              if (w > h) {
                tw = maxDim;
                th = Math.round((maxDim * h) / w);
              } else {
                th = maxDim;
                tw = Math.round((maxDim * w) / h);
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = tw;
            canvas.height = th;
            const cctx = canvas.getContext('2d');
            cctx.drawImage(img, 0, 0, tw, th);
            const out = canvas.toDataURL('image/jpeg', quality);
            resolve(out);
          } catch (err) { resolve(dataUrl); }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      } catch (err) { resolve(dataUrl); }
    });
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

  // Simple smoothing helper: remove very-close consecutive points and
  // apply Chaikin subdivision to make handwriting curves smoother. This
  // reduces jitter from tablet sampling while preserving the general
  // shape (good for letters like 'S' and 'E').
  function chaikinSubdivision(points, iterations = 4) {
    if (!Array.isArray(points) || points.length < 2) return points || [];
    let pts = points.map(p => ({ x: p.x, y: p.y }));
    for (let it = 0; it < iterations; it++) {
      const out = [];
      out.push(pts[0]);
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        const q = { x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y };
        const r = { x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y };
        out.push(q);
        out.push(r);
      }
      out.push(pts[pts.length - 1]);
      pts = out;
    }
    return pts;
  }

  // Resample a polyline to approximately `target` points distributed along
  // arc-length. Keeps overall shape while capping point-count for performance.
  const MAX_STROKE_POINTS = 4000;
  function resamplePoints(points, target = MAX_STROKE_POINTS) {
    if (!Array.isArray(points) || points.length < 2) return points || [];
    if (points.length <= target) return points.slice();
    // compute cumulative distances
    const dists = [0];
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i-1].x;
      const dy = points[i].y - points[i-1].y;
      const seg = Math.hypot(dx, dy);
      total += seg;
      dists.push(total);
    }
    if (total === 0) return [points[0]];
    const out = [];
    for (let k = 0; k < target; k++) {
      const t = (k / (target - 1)) * total;
      // find segment containing t
      let idx = 0;
      while (idx < dists.length - 1 && dists[idx+1] < t) idx++;
      const d0 = dists[idx];
      const d1 = dists[idx+1] || d0;
      const p0 = points[idx];
      const p1 = points[Math.min(idx+1, points.length-1)];
      const segLen = d1 - d0;
      const u = segLen <= 0 ? 0 : (t - d0) / segLen;
      out.push({ x: p0.x + (p1.x - p0.x) * u, y: p0.y + (p1.y - p0.y) * u });
    }
    return out;
  }

  function simplifyAndSmooth(rawPoints) {
    if (!Array.isArray(rawPoints) || rawPoints.length < 2) return rawPoints || [];
  const z = zoomRef.current || 1;
  // COMPLETAMENTE DISABILITATO: accetta TUTTI i punti per catturare anche
  // i tratti più corti (punti su i, simboli × ÷, numeri 2/3, lettera z)
  // Nessun filtro di distanza minima - ogni punto catturato viene mantenuto
  const minDist = 0; // ZERO = accetta tutto, nessun filtro
    const dedup = [];
    let last = null;
    for (const p of rawPoints) {
      if (!last) { dedup.push(p); last = p; continue; }
      const dx = p.x - last.x; const dy = p.y - last.y;
      if (Math.hypot(dx, dy) >= minDist) {
        dedup.push(p);
        last = p;
      }
    }

    
    if (dedup.length < 2) return dedup;
    // apply Chaikin smoothing to reduce jitter.
    // Keep iterations moderate — more iterations increase density but also
    // can oversmooth small features. 4 iterations is a good balance.
    const smoothed = chaikinSubdivision(dedup, 4);
    // If the subdivision produced an extremely large number of points (e.g.
    // when input was already dense), resample down to a safe cap while
    // preserving arc-length distribution so we don't lose visual detail.
    const capped = smoothed.length > MAX_STROKE_POINTS ? resamplePoints(smoothed, MAX_STROKE_POINTS) : smoothed;
    return capped;
  }

  // == STROKE PREVIEW ==
  const previewStroke = useCallback((p1, p2) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const safeZoom = Math.max(zoom, 0.0001);
    const worldScale = safeZoom * dpr;
    ctx.save();
    ctx.setTransform(worldScale, 0, 0, worldScale, (-pan.x) * worldScale, (-pan.y) * worldScale);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = colore;
    ctx.lineWidth = spessore;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
  }, [colore, spessore, zoom, pan]);

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
  {!isMobile && (
    <div ref={zoomControlsRef} style={st.zoomControls}>
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
  )}
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
            cursor: inToolbar ? 'default' : (contextPanning ? canvasCursor : ((strumento === 'gomma') ? 'none' : canvasCursor))
          }}
        />
      </div>
    </div>
  );
};

// == STYLES ==
const st = {
  wrapper: { width: "100%", userSelect: "none" },
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
  shapesPopover: {
    position: 'absolute',
    bottom: '110%',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(180deg, #f8fbff 0%, #eef3ff 100%)',
    border: '1px solid rgba(51,94,168,0.18)',
    boxShadow: '0 22px 38px rgba(16,42,105,0.16)',
    borderRadius: 18,
    padding: '14px 16px',
    minWidth: 200,
    zIndex: 6
  },
  shapesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8
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
