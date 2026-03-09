// @ts-nocheck
"use client";
/**
 * LavagnaCanvasClient — implementazione tldraw con sync real-time via Ably.
 *
 * Flusso:
 * 1. tldraw monta il canvas e chiama onMount(editor)
 * 2. Viene caricato lo snapshot dal DB (GET /api/lavagna/snapshot)
 * 3. Si connette al canale Ably "lavagna:{lavagnaId}"
 * 4. Le modifiche locali vengono pubblicate come diff su Ably
 * 5. Le modifiche remote vengono applicate con store.mergeRemoteChanges()
 * 6. Auto-save ogni 20s e al momento dell'unmount
 */
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { getAblyChannelAsync } from "../../lib/realtime/ablyClient";

const SAVE_INTERVAL_MS = 5_000; // 5 secondi — snapshot frequente per chi apre a metà sessione

interface LavagnaCanvasProps {
  lavagnaId: number;
  attivitaId: number;
  clienteId?: number;
  utenteId: number | string;
  ruolo: string;
  altezza?: number;
  openInNewWindow?: boolean;
  // Legacy — non usati con tldraw, mantenuti per compatibilità prop
  trattiIniziali?: unknown[];
  formeIniziali?: unknown[];
}

export default function LavagnaCanvasClient({
  lavagnaId,
  attivitaId,
  utenteId,
  ruolo,
  altezza = 600,
  openInNewWindow = false,
}: LavagnaCanvasProps) {
  /**
   * onMount viene chiamato da tldraw una volta sola quando l'editor è pronto.
   * Restituisce una funzione di cleanup chiamata al momento dell'unmount.
   */
  function handleMount(editor) {
    let cancelled = false;
    let unsubStore: (() => void) | null = null;
    let channel: Awaited<ReturnType<typeof getAblyChannelAsync>> | null = null;
    let saveTimer: ReturnType<typeof setInterval> | null = null;

    /** Salva l'intero snapshot tldraw nel DB. */
    async function saveSnapshot() {
      if (!editor || cancelled) return;
      try {
        const snapshot = editor.getSnapshot();
        await fetch("/api/lavagna/snapshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lavagnaId, snapshot }),
        });
      } catch (e) {
        console.error("[Lavagna] Errore salvataggio snapshot:", e);
      }
    }

    async function setup() {
      // ── 1. Carica snapshot esistente dal DB ──────────────────────────────
      try {
        const r = await fetch(`/api/lavagna/snapshot?lavagnaId=${lavagnaId}`);
        if (!cancelled && r.ok) {
          const { snapshot } = await r.json();
          if (snapshot) {
            editor.loadSnapshot(snapshot);
          }
        }
      } catch (e) {
        console.error("[Lavagna] Errore caricamento snapshot:", e);
      }

      if (cancelled) return;

      // ── 2. Connetti canale Ably ───────────────────────────────────────────
      channel = await getAblyChannelAsync(`lavagna:${lavagnaId}`);
      if (cancelled || !channel) return;

      // ── 3. Ricevi modifiche remote → applica allo store ──────────────────
      channel.subscribe("tldraw:diff", (msg) => {
        const { senderId, changes } = msg.data;
        // Ignora i messaggi che abbiamo pubblicato noi stessi
        if (senderId === String(utenteId)) return;

        editor.store.mergeRemoteChanges(() => {
          const { added, updated, removed } = changes;
          if (added) editor.store.put(Object.values(added));
          if (updated)
            editor.store.put(Object.values(updated).map(([, after]) => after));
          if (removed) editor.store.remove(Object.keys(removed));
        });
      });

      // ── 4. Pubblica modifiche locali su Ably ─────────────────────────────
      unsubStore = editor.store.listen(
        (entry) => {
          if (entry.source !== "user") return;
          channel.publish("tldraw:diff", {
            senderId: String(utenteId),
            changes: entry.changes,
          });
        },
        { source: "user", scope: "document" }
      );

      // ── 5. Auto-save ogni 20 secondi ─────────────────────────────────────
      saveTimer = setInterval(saveSnapshot, SAVE_INTERVAL_MS);
    }

    setup();

    // Cleanup: chiamato da tldraw quando il componente si smonta
    return () => {
      cancelled = true;
      saveSnapshot(); // fire-and-forget — il browser completa la fetch
      if (unsubStore) unsubStore();
      if (saveTimer) clearInterval(saveTimer);
      if (channel) {
        channel.detach();
        channel = null;
      }
    };
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
      <Tldraw onMount={handleMount} />
    </div>
  );
}

const openBtnStyle: React.CSSProperties = {
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
