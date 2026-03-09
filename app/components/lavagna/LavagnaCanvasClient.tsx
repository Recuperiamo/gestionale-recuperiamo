// @ts-nocheck
"use client";
/**
 * LavagnaCanvasClient — implementazione tldraw con sync real-time via Ably.
 *
 * Pattern: onMount={setEditor} (riferimento stabile) + useEffect per il setup.
 * Questo evita il bug in cui tldraw ri-chiama onMount ad ogni re-render,
 * causando la sparizione del canvas.
 *
 * Flusso:
 * 1. tldraw monta e chiama setEditor(editor)
 * 2. useEffect si attiva → carica snapshot dal DB
 * 3. Si connette al canale Ably "lavagna:{lavagnaId}"
 * 4. Le modifiche locali vengono pubblicate come diff su Ably
 * 5. Le modifiche remote vengono applicate con store.mergeRemoteChanges()
 * 6. Auto-save ogni 5s e all'unmount
 */
import { useState, useEffect, useRef } from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { getAblyChannelAsync } from "../../lib/realtime/ablyClient";

const SAVE_INTERVAL_MS = 5_000; // 5 secondi

export default function LavagnaCanvasClient({
  lavagnaId,
  attivitaId,
  utenteId,
  altezza = 600,
  openInNewWindow = false,
  // Legacy — non usati con tldraw, mantenuti per compatibilità prop
  trattiIniziali,
  formeIniziali,
  clienteId,
  ruolo,
}) {
  // setEditor è una funzione stabile (React garantisce stabilità dei setter)
  // → nessun re-firing di onMount ad ogni render
  const [editor, setEditor] = useState(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!editor) return;

    let cancelled = false;
    let unsubStore = null;
    let saveTimer = null;

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
          const data = await r.json();
          // Controlla che lo snapshot sia un oggetto valido con contenuto
          if (
            data.snapshot &&
            typeof data.snapshot === "object" &&
            Object.keys(data.snapshot).length > 0
          ) {
            editor.loadSnapshot(data.snapshot);
          }
        }
      } catch (e) {
        console.error("[Lavagna] Errore caricamento snapshot:", e);
      }

      if (cancelled) return;

      // ── 2. Connetti canale Ably ───────────────────────────────────────────
      const channel = await getAblyChannelAsync(`lavagna:${lavagnaId}`);
      if (cancelled || !channel) return;
      channelRef.current = channel;

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

      // ── 5. Auto-save ogni 5 secondi ──────────────────────────────────────
      saveTimer = setInterval(saveSnapshot, SAVE_INTERVAL_MS);
    }

    setup();

    return () => {
      cancelled = true;
      saveSnapshot(); // fire-and-forget
      if (unsubStore) unsubStore();
      if (saveTimer) clearInterval(saveTimer);
      if (channelRef.current) {
        channelRef.current.detach();
        channelRef.current = null;
      }
    };
  }, [editor, lavagnaId, utenteId]);

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
      <Tldraw
        onMount={setEditor}
        licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY}
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
