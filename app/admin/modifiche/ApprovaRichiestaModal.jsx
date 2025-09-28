"use client";
import React, { useEffect, useState } from "react";

export default function ApprovaRichiestaModal({
  richiesta,
  onClose,
  onApproved,
}) {
  if (!richiesta) return null;

  const tipo = richiesta.tipo; // cambio_orario | cambio_data | cancellazione
  const att = richiesta.attivita;

  const originaleStart = att?.orario || att?.createdAt;
  const richiestaDate =
    tipo === "cambio_orario"
      ? richiesta.nuovoOrario
      : tipo === "cambio_data"
      ? richiesta.nuovaData
      : null;

  // Campo datetime-local (unificato)
  function toLocalValue(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    // yyyy-MM-ddTHH:mm
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0") +
      "T" +
      String(d.getHours()).padStart(2, "0") +
      ":" +
      String(d.getMinutes()).padStart(2, "0")
    );
  }

  const [dtValue, setDtValue] = useState(toLocalValue(richiestaDate || originaleStart));
  const [durataOverride, setDurataOverride] = useState("");
  const [noteAdmin, setNoteAdmin] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(false);

  const canOverrideDurata = true; // lasciare attivo (se non usi basta non compilare)

  async function submit() {
    setLoading(true);
    setErr(null);
    setOk(false);
    try {
      // Se cancellazione non dovremmo essere qui; ma gestiamo comunque fallback
      const payload = {
        id: richiesta.id,
        action: "approve",
        noteAdmin: noteAdmin || undefined,
      };

      if (tipo !== "cancellazione") {
        if (!dtValue) {
          setErr("Data/Orario obbligatorio");
          setLoading(false);
          return;
        }
        const iso = new Date(dtValue).toISOString();
        payload.overrideOrario = iso;

        if (durataOverride) {
          const n = Number(durataOverride);
            if (isNaN(n) || n <= 0) {
            setErr("Durata non valida");
            setLoading(false);
            return;
          }
          payload.overrideDurataOre = n;
        }
      }

      const res = await fetch("/api/modifiche", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error || "Errore");
      } else {
        setOk(true);
        onApproved && onApproved(json);
        setTimeout(() => onClose && onClose(), 500);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <h3 style={title}>Approva modifica (ID richiesta {richiesta.id})</h3>

        <Info label="Tipo">
          {tipo}
        </Info>
        <Info label="Attività">
          {richiesta.attivitaId}
        </Info>
        <Info label="Originale data/orario">
          {originaleStart ? new Date(originaleStart).toLocaleString("it-IT") : "—"}
        </Info>
        {richiestaDate && (
          <Info label="Richiesto">
            {new Date(richiestaDate).toLocaleString("it-IT")}
          </Info>
        )}

        {tipo !== "cancellazione" && (
          <div style={field}>
            <label style={lbl}>Data/Orario da applicare</label>
            <input
              type="datetime-local"
              value={dtValue}
              disabled={loading}
              onChange={e => setDtValue(e.target.value)}
              style={input}
            />
          </div>
        )}

        {canOverrideDurata && (
          <div style={field}>
            <label style={lbl}>Durata nuova (opzionale – override ore)</label>
            <input
              type="number"
              min="1"
              placeholder={att?.oreConsumate || att?.durataOre || "1"}
              value={durataOverride}
              disabled={loading}
              onChange={e => setDurataOverride(e.target.value)}
              style={input}
            />
            <small style={{ color: "#4d647f" }}>
              Lascia vuoto per non modificare la durata. Se cambi, le ore del pacchetto vengono ricalcolate automaticamente.
            </small>
          </div>
        )}

        {richiesta.noteStudente && (
          <Info label="Nota studente">
            {richiesta.noteStudente}
          </Info>
        )}

        <div style={field}>
          <label style={lbl}>Note admin (opzionale)</label>
          <textarea
            value={noteAdmin}
            disabled={loading}
            onChange={e => setNoteAdmin(e.target.value)}
            rows={3}
            style={{ ...input, resize: "vertical" }}
          />
        </div>

        {err && <div style={errBox}>{err}</div>}
        {ok && !err && <div style={okBox}>Approvata</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 18 }}>
          <button onClick={onClose} disabled={loading} style={btnGhost}>Chiudi</button>
          <button onClick={submit} disabled={loading} style={btnPrimary}>
            {loading ? "Salvo..." : "Applica e Approva"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Presentational */
function Info({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#20489a", letterSpacing: ".3px" }}>
        {label}:
      </span>{" "}
      <span style={{ fontSize: 14 }}>{children}</span>
    </div>
  );
}

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(32,72,154,0.28)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2500
};
const modal = {
  background: "#fff",
  padding: "28px 30px 30px",
  borderRadius: 20,
  width: "min(520px,92vw)",
  maxHeight: "88vh",
  overflowY: "auto",
  boxShadow: "0 10px 38px rgba(32,72,154,0.25)",
  fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
  color: "#20489a"
};
const title = { margin: "0 0 16px", fontSize: 20, fontWeight: 800, color: "#20489a" };
const field = { marginBottom: 16, display: "flex", flexDirection: "column", gap: 6 };
const lbl = { fontSize: 12, fontWeight: 600, letterSpacing: ".3px" };
const input = {
  border: "1.6px solid #4268b3",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 14,
  background: "#fff",
  color: "#20489a"
};
const btnPrimary = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 18px",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 14,
  boxShadow: "0 2px 6px rgba(22,163,74,0.35)"
};
const btnGhost = {
  background: "#e3eefe",
  color: "#20489a",
  border: "none",
  borderRadius: 10,
  padding: "10px 18px",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14
};
const errBox = {
  background: "#F8D7DA",
  border: "1px solid #E58B94",
  color: "#721C24",
  padding: "10px 12px",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 600
};
const okBox = {
  background: "#DCFCE7",
  border: "1px solid #86EFAC",
  color: "#166534",
  padding: "10px 12px",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 600
};