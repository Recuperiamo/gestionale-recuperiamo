// @ts-nocheck
"use client";
import React, { useEffect, useState } from "react";

interface SpostaAttivitaModalProps {
  attivita: {
    id: number;
    descrizione?: string;
    oreConsumate?: number;
    durataOre?: number;
    clienteId: number;
    pacchettoId?: number;
    pacchetto?: { id: number; descrizione?: string };
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function SpostaAttivitaModal({ attivita, onClose, onSuccess }: SpostaAttivitaModalProps) {
  const [pacchetti, setPacchetti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [targetId, setTargetId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmForza, setConfirmForza] = useState(false);

  const ore = attivita.oreConsumate ?? attivita.durataOre ?? 0;
  const sorgente = attivita.pacchetto?.descrizione ?? `Pacchetto #${attivita.pacchettoId}` ?? "Nessun pacchetto";

  useEffect(() => {
    if (!attivita.clienteId) return;
    // Carica tutti i pacchetti (attivi e non) per permettere il force-move
    fetch(`/api/pacchetti?clienteId=${attivita.clienteId}`)
      .then((r) => r.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : [];
        setPacchetti(lista.filter((p) => p.id !== attivita.pacchettoId));
      })
      .catch(() => setPacchetti([]))
      .finally(() => setLoading(false));
  }, [attivita.clienteId, attivita.pacchettoId]);

  async function doMove(forza: boolean) {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/attivita/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attivitaId: attivita.id, targetPacchettoId: Number(targetId), forza }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Errore spostamento");
        return;
      }
      onSuccess();
    } catch {
      setError("Errore di rete");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!targetId) return;
    await doMove(false);
  }

  const targetPacchetto = pacchetti.find((p) => p.id === Number(targetId));
  const oreInsufficienti = !attivita.extraPacchetto && targetPacchetto && (targetPacchetto.oreResidue ?? 0) < ore;
  const nonAttivo = targetPacchetto && targetPacchetto.stato !== "attivo";
  const puoForzare = !!targetId && (oreInsufficienti || nonAttivo || error.includes("insufficienti") || error.includes("attivo"));

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(32,72,154,0.22)",
      zIndex: 2200, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#fff", borderRadius: 14, padding: "32px 30px 26px",
        minWidth: 360, maxWidth: 460, boxShadow: "0 8px 40px #20489a28",
        position: "relative",
      }}>
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 14, right: 18, background: "none",
            border: "none", fontSize: 22, cursor: "pointer", color: "#4268b3", lineHeight: 1,
          }}
        >×</button>

        <h3 style={{ color: "#20489a", fontWeight: 700, marginTop: 0, marginBottom: 6 }}>
          Sposta lezione
        </h3>

        <div style={{ background: "#f5f8ff", borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontSize: 14 }}>
          <div><b>Lezione:</b> {attivita.descrizione || `#${attivita.id}`}</div>
          <div><b>Ore:</b> {ore}</div>
          <div><b>Pacchetto attuale:</b> {sorgente}</div>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 6 }}>
            Pacchetto destinazione *
          </label>

          {loading ? (
            <div style={{ color: "#9ab0d4", fontSize: 13, marginBottom: 16 }}>Caricamento pacchetti…</div>
          ) : pacchetti.length === 0 ? (
            <div style={{
              background: "#fff3cd", border: "1px solid #ffc107",
              borderRadius: 7, padding: "10px 12px", fontSize: 13, marginBottom: 16, color: "#856404",
            }}>
              Nessun pacchetto disponibile per questo cliente (escluso quello corrente).
            </div>
          ) : (
            <select
              value={targetId}
              onChange={(e) => { setTargetId(e.target.value); setError(""); }}
              required
              style={{
                width: "100%", padding: "8px 10px", borderRadius: 7,
                border: "1.5px solid #b0c8f5", fontSize: 14, marginBottom: 4,
                background: "#f8fbff", color: "#20489a",
              }}
            >
              <option value="">— Seleziona pacchetto —</option>
              {pacchetti.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.descrizione || `#${p.id}`} — {p.oreResidue ?? "?"} ore residue{p.stato !== "attivo" ? ` (${p.stato})` : ""}
                </option>
              ))}
            </select>
          )}

          {/* Avviso ore insufficienti */}
          {oreInsufficienti && (
            <div style={{
              background: "#ffe6e6", border: "1px solid #f99", borderRadius: 7,
              padding: "8px 12px", fontSize: 13, marginBottom: 8, color: "#a00",
            }}>
              Ore insufficienti: il pacchetto ha {targetPacchetto.oreResidue} ore residue, la lezione ne richiede {ore}.
            </div>
          )}

          {/* Avviso pacchetto non attivo */}
          {nonAttivo && (
            <div style={{
              background: "#ffe6e6", border: "1px solid #f99", borderRadius: 7,
              padding: "8px 12px", fontSize: 13, marginBottom: 8, color: "#a00",
            }}>
              Il pacchetto destinazione non è attivo.
            </div>
          )}

          {error && (
            <div style={{
              background: "#fdecea", border: "1px solid #f5c6c6",
              borderRadius: 7, padding: "8px 12px", fontSize: 13, marginBottom: 8, color: "#c00",
            }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18, flexWrap: "wrap" }}>
            <button type="button" onClick={onClose} disabled={saving} style={{
              background: "#e3eefe", color: "#20489a", border: "none",
              borderRadius: 8, padding: "8px 18px", fontWeight: 600, cursor: "pointer",
            }}>
              Annulla
            </button>

            {puoForzare && (
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmForza(true)}
                style={{
                  background: saving ? "#ccc" : "#f59e0b",
                  color: "#fff", border: "none", borderRadius: 8,
                  padding: "8px 18px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                Forza spostamento
              </button>
            )}

            <button
              type="submit"
              disabled={saving || !targetId || pacchetti.length === 0}
              style={{
                background: saving || !targetId ? "#9ab0d4" : "#1cb0f6",
                color: "#fff", border: "none", borderRadius: 8,
                padding: "8px 20px", fontWeight: 700, cursor: saving || !targetId ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Spostamento…" : "Sposta"}
            </button>
          </div>
        </form>
      </div>

      {/* Dialog conferma saldo */}
      {confirmForza && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          zIndex: 2300, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "#fff", borderRadius: 14, padding: "28px 26px 22px",
            maxWidth: 420, width: "90%", boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
          }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#b45309", marginBottom: 12 }}>
              Conferma saldo ore
            </div>
            <div style={{ fontSize: 14, color: "#374151", marginBottom: 20, lineHeight: 1.6 }}>
              Stai forzando lo spostamento verso <b>{targetPacchetto?.descrizione || `Pacchetto #${targetId}`}</b>
              {oreInsufficienti && <> che ha <b>{targetPacchetto?.oreResidue ?? 0} ore residue</b> (la lezione ne richiede <b>{ore}</b>)</>}.
              <br /><br />
              Il pacchetto verrà aggiornato aggiungendo <b>{ore} ore acquistate</b> per registrare il pagamento extra.
              <br /><br />
              <b>Confermi che le {ore} ore aggiuntive sono già state saldate dal cliente?</b>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmForza(false)}
                disabled={saving}
                style={{
                  background: "#e3eefe", color: "#20489a", border: "none",
                  borderRadius: 8, padding: "8px 18px", fontWeight: 600, cursor: "pointer",
                }}
              >
                Annulla
              </button>
              <button
                onClick={async () => { setConfirmForza(false); await doMove(true); }}
                disabled={saving}
                style={{
                  background: saving ? "#ccc" : "#f59e0b",
                  color: "#fff", border: "none", borderRadius: 8,
                  padding: "8px 20px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Spostamento…" : "Sì, ho ricevuto il saldo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
