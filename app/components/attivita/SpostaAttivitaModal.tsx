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

  const ore = attivita.oreConsumate ?? attivita.durataOre ?? 0;
  const sorgente = attivita.pacchetto?.descrizione ?? `Pacchetto #${attivita.pacchettoId}` ?? "Nessun pacchetto";

  useEffect(() => {
    if (!attivita.clienteId) return;
    fetch(`/api/pacchetti?clienteId=${attivita.clienteId}&stato=attivo`)
      .then((r) => r.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : [];
        // Esclude il pacchetto corrente
        setPacchetti(lista.filter((p) => p.id !== attivita.pacchettoId));
      })
      .catch(() => setPacchetti([]))
      .finally(() => setLoading(false));
  }, [attivita.clienteId, attivita.pacchettoId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!targetId) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/attivita/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attivitaId: attivita.id, targetPacchettoId: Number(targetId) }),
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

  const targetPacchetto = pacchetti.find((p) => p.id === Number(targetId));

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
              Nessun pacchetto attivo disponibile per questo cliente (escluso quello corrente).
            </div>
          ) : (
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
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
                  {p.descrizione || `#${p.id}`} — {p.oreResidue ?? "?"} ore residue
                </option>
              ))}
            </select>
          )}

          {/* Avviso ore insufficienti */}
          {targetPacchetto && !attivita.extraPacchetto && (targetPacchetto.oreResidue ?? 0) < ore && (
            <div style={{
              background: "#ffe6e6", border: "1px solid #f99", borderRadius: 7,
              padding: "8px 12px", fontSize: 13, marginBottom: 12, color: "#a00",
            }}>
              Ore insufficienti: il pacchetto ha {targetPacchetto.oreResidue} ore residue, la lezione ne richiede {ore}.
            </div>
          )}

          {error && (
            <div style={{
              background: "#fdecea", border: "1px solid #f5c6c6",
              borderRadius: 7, padding: "8px 12px", fontSize: 13, marginBottom: 12, color: "#c00",
            }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
            <button type="button" onClick={onClose} disabled={saving} style={{
              background: "#e3eefe", color: "#20489a", border: "none",
              borderRadius: 8, padding: "8px 18px", fontWeight: 600, cursor: "pointer",
            }}>
              Annulla
            </button>
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
    </div>
  );
}
