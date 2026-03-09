// @ts-nocheck
"use client";
/**
 * LavagnaCanvasClient — lavagna collaborativa con Excalidraw (MIT) + Ably.
 *
 * Flusso:
 * 1. Carica snapshot dal DB (GET /api/lavagna/snapshot)
 * 2. Renderizza Excalidraw con i dati caricati come initialData
 * 3. onChange → pubblica elementi su Ably (throttle 30ms)
 * 4. Ably → updateScene() per applicare modifiche remote
 * 5. Auto-save ogni 5s e all'unmount
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { getAblyChannelAsync } from "../../lib/realtime/ablyClient";

const SAVE_INTERVAL_MS = 5_000;   // salvataggio DB ogni 5s
const PUBLISH_THROTTLE_MS = 30;   // throttle Ably: max ~33 msg/s durante il disegno

export default function LavagnaCanvasClient({
  lavagnaId,
  attivitaId,
  utenteId,
  altezza = 600,
  openInNewWindow = false,
  // Legacy — ignorati con Excalidraw
  trattiIniziali,
  formeIniziali,
  clienteId,
  ruolo,
}) {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [initialData, setInitialData] = useState(undefined);
  const [dataLoaded, setDataLoaded] = useState(false);

  const channelRef = useRef(null);
  const isApplyingRemoteRef = useRef(false);
  const publishTimerRef = useRef(null);
  const pendingElementsRef = useRef(null);

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
                // Non ripristinare la selezione attiva al caricamento
                selectedElementIds: {},
                selectedGroupIds: {},
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
      if (!excalidrawAPI || cancelled) return;
      try {
        const elements = [...excalidrawAPI.getSceneElements()];
        const appState = excalidrawAPI.getAppState();
        await fetch("/api/lavagna/snapshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lavagnaId,
            snapshot: { elements, appState },
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

      // Ricevi modifiche remote → applica al canvas
      channel.subscribe("excalidraw:scene", (msg) => {
        const { senderId, elements } = msg.data;
        if (senderId === String(utenteId)) return; // ignora echo
        isApplyingRemoteRef.current = true;
        excalidrawAPI.updateScene({ elements });
        // Resetta il flag dopo che React ha processato l'aggiornamento
        setTimeout(() => {
          isApplyingRemoteRef.current = false;
        }, 100);
      });

      // Auto-save ogni 5s
      saveTimer = setInterval(saveSnapshot, SAVE_INTERVAL_MS);
    }

    setup();

    return () => {
      cancelled = true;
      saveSnapshot(); // salva all'unmount (fire-and-forget)
      if (saveTimer) clearInterval(saveTimer);
      if (publishTimerRef.current) clearTimeout(publishTimerRef.current);
      if (channelRef.current) {
        channelRef.current.detach();
        channelRef.current = null;
      }
    };
  }, [excalidrawAPI, dataLoaded, lavagnaId, utenteId]);

  // ── 3. Pubblica modifiche locali su Ably (throttle 30ms) ─────────────────
  const onChange = useCallback(
    (elements) => {
      if (isApplyingRemoteRef.current) return; // evita echo loop
      if (!channelRef.current) return;

      // Accumula gli elementi più recenti e pubblica al massimo ogni 30ms
      pendingElementsRef.current = elements;
      if (publishTimerRef.current) return;
      publishTimerRef.current = setTimeout(() => {
        publishTimerRef.current = null;
        if (!channelRef.current || !pendingElementsRef.current) return;
        channelRef.current.publish("excalidraw:scene", {
          senderId: String(utenteId),
          elements: [...pendingElementsRef.current],
        });
      }, PUBLISH_THROTTLE_MS);
    },
    [utenteId]
  );

  // Stato di caricamento
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
    <div style={{ position: "relative", width: "100%", height: altezza }}>
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
