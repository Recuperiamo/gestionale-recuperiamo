// @ts-nocheck
"use client";
/**
 * LavagnaCanvasClient — lavagna collaborativa con Excalidraw (MIT) + Ably.
 *
 * Flusso docente:
 * 1. Carica snapshot dal DB (GET /api/lavagna/snapshot)
 * 2. Renderizza Excalidraw con i dati caricati come initialData
 * 3. onChange → pubblica elementi + viewport su Ably (throttle 30ms)
 * 4. Auto-save ogni 5s e all'unmount
 *
 * Flusso studente (ruolo === 'cliente'):
 * 1. Carica snapshot dal DB come sopra
 * 2. Excalidraw in viewModeEnabled (sola lettura)
 * 3. Ably → updateScene(elements) + segue il viewport del docente in tempo reale
 * 4. Non pubblica, non salva
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { getAblyChannelAsync } from "../../lib/realtime/ablyClient";

const SAVE_INTERVAL_MS = 5_000;
const PUBLISH_THROTTLE_MS = 30;

// Cursore a forma di penna per lo strumento disegno libero.
// Hotspot in (4,20): la punta della penna.
const PEN_CURSOR_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E" +
  "%3Cpath d='M4 20 L8 20 L20 8 L16 4 L4 16 Z' fill='%23111' stroke='white' stroke-width='0.8'/%3E" +
  "%3Cpath d='M4 20 L8 20 L4 16 Z' fill='%23555'/%3E" +
  "%3Ccircle cx='4' cy='20' r='1' fill='%23111'/%3E" +
  "%3C/svg%3E\") 4 20, crosshair";

export default function LavagnaCanvasClient({
  lavagnaId,
  attivitaId,
  utenteId,
  altezza = 600,
  openInNewWindow = false,
  ruolo,
  // Legacy — ignorati con Excalidraw
  trattiIniziali,
  formeIniziali,
  clienteId,
}) {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [initialData, setInitialData] = useState(undefined);
  const [dataLoaded, setDataLoaded] = useState(false);

  const wrapperRef = useRef(null);
  const channelRef = useRef(null);
  const isApplyingRemoteRef = useRef(false);
  const publishTimerRef = useRef(null);
  const pendingElementsRef = useRef(null);
  const pendingViewportRef = useRef(null);
  const activeToolRef = useRef(null);

  const isCliente = ruolo === "cliente";

  // ── 1. Carica snapshot dal DB ─────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const r = await fetch(`/api/lavagna/snapshot?lavagnaId=${lavagnaId}`);
        if (r.ok) {
          const data = await r.json();
          if (data.snapshot && Array.isArray(data.snapshot.elements)) {
            setInitialData({
              elements: data.snapshot.elements,
              appState: {
                ...(data.snapshot.appState || {}),
                selectedElementIds: {},
                selectedGroupIds: {},
                // collaborators è una Map in Excalidraw ma JSON la serializza come oggetto
                // → reinizializzare sempre come Map per evitare il crash .forEach
                collaborators: new Map(),
              },
              scrollToContent: true,
            });
          }
        }
      } catch (e) {
        console.error("[Lavagna] Errore caricamento snapshot:", e);
      } finally {
        setDataLoaded(true);
      }
    }
    load();
  }, [lavagnaId]);

  // ── 2. Setup Ably + auto-save quando API e dati sono pronti ──────────────
  useEffect(() => {
    if (!excalidrawAPI || !dataLoaded) return;

    let cancelled = false;
    let saveTimer = null;

    async function saveSnapshot() {
      if (!excalidrawAPI || cancelled || isCliente) return;
      try {
        const elements = [...excalidrawAPI.getSceneElements()];
        // Rimuovere collaborators prima di serializzare: è una Map, non
        // serializzabile correttamente in JSON (causa crash .forEach al reload)
        const { collaborators, ...appStateToSave } = excalidrawAPI.getAppState();
        await fetch("/api/lavagna/snapshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lavagnaId,
            snapshot: { elements, appState: appStateToSave },
          }),
        });
      } catch (e) {
        console.error("[Lavagna] Errore salvataggio:", e);
      }
    }

    async function setup() {
      const channel = await getAblyChannelAsync(`lavagna:${lavagnaId}`);
      if (cancelled || !channel) return;
      channelRef.current = channel;

      channel.subscribe("excalidraw:scene", (msg) => {
        const { senderId, elements, viewport } = msg.data;
        if (senderId === String(utenteId)) return;

        isApplyingRemoteRef.current = true;

        // Studente: segue anche il viewport del docente (scrollX, scrollY, zoom)
        const appStateUpdate =
          isCliente && viewport
            ? { scrollX: viewport.scrollX, scrollY: viewport.scrollY, zoom: viewport.zoom }
            : undefined;

        excalidrawAPI.updateScene({
          elements,
          ...(appStateUpdate ? { appState: appStateUpdate } : {}),
        });

        setTimeout(() => {
          isApplyingRemoteRef.current = false;
        }, 100);
      });

      if (!isCliente) {
        saveTimer = setInterval(saveSnapshot, SAVE_INTERVAL_MS);
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (!isCliente) saveSnapshot();
      if (saveTimer) clearInterval(saveTimer);
      if (publishTimerRef.current) clearTimeout(publishTimerRef.current);
      if (channelRef.current) {
        channelRef.current.detach();
        channelRef.current = null;
      }
    };
  }, [excalidrawAPI, dataLoaded, lavagnaId, utenteId, isCliente]);

  // ── 3. onChange: cursore penna + pubblica su Ably (solo docente) ──────────
  const onChange = useCallback(
    (elements, appState) => {
      // Aggiorna il cursore quando si cambia strumento
      const toolType = appState?.activeTool?.type;
      if (toolType !== activeToolRef.current) {
        activeToolRef.current = toolType;
        if (wrapperRef.current) {
          wrapperRef.current.classList.toggle(
            "lavagna-freedraw-active",
            toolType === "freedraw"
          );
        }
      }

      if (isCliente) return;
      if (isApplyingRemoteRef.current) return;
      if (!channelRef.current) return;

      pendingElementsRef.current = elements;
      if (appState) {
        pendingViewportRef.current = {
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
          zoom: appState.zoom,
        };
      }

      if (publishTimerRef.current) return;
      publishTimerRef.current = setTimeout(() => {
        publishTimerRef.current = null;
        if (!channelRef.current || !pendingElementsRef.current) return;
        channelRef.current.publish("excalidraw:scene", {
          senderId: String(utenteId),
          elements: [...pendingElementsRef.current],
          viewport: pendingViewportRef.current,
        });
      }, PUBLISH_THROTTLE_MS);
    },
    [utenteId, isCliente]
  );

  if (!dataLoaded) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: altezza,
          background: "#f5f8ff",
          color: "#20489a",
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
        }}
      >
        Caricamento lavagna…
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", width: "100%", height: altezza }}
    >
      {/* Cursore a penna quando lo strumento freedraw è attivo */}
      <style>{`
        .lavagna-freedraw-active .excalidraw canvas.interactive {
          cursor: ${PEN_CURSOR_URL} !important;
        }
      `}</style>

      {openInNewWindow && (
        <button
          style={openBtnStyle}
          onClick={() =>
            window.open(`/lavagna/full?attivitaId=${attivitaId}`, "_blank")
          }
        >
          ⛶ Apri a schermo intero
        </button>
      )}

      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        initialData={initialData}
        onChange={onChange}
        langCode="it"
        viewModeEnabled={isCliente}
        UIOptions={{
          tools: { image: true },
          canvasActions: {
            saveToActiveFile: false,
            loadScene: false,
          },
        }}
      />
    </div>
  );
}

const openBtnStyle = {
  position: "absolute",
  top: 10,
  right: 10,
  zIndex: 500,
  background: "#20489a",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "7px 14px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(32,72,154,0.18)",
};
