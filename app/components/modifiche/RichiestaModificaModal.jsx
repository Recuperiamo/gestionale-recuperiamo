"use client";
import React, { useEffect, useState } from "react";

const MS_1_DAY = 24 * 60 * 60 * 1000;
const LIMIT_CANCEL_DAYS = 7;
const LIMIT_WARN_DAYS = 3;

export default function RichiestaModificaModal({
  open,
  onClose,
  attivita,
  existingRichieste = [],
  onSuccess
}) {
  if (!open || !attivita) return null;

  const start = attivita.orario
    ? new Date(attivita.orario)
    : new Date(attivita.createdAt);
  const now = new Date();
  const diffDays = (start.getTime() - now.getTime()) / MS_1_DAY;

  const alreadyOpen = existingRichieste.some(r =>
    ["pending", "in_review"].includes(r.stato)
  );

  const [tipo, setTipo] = useState("cambio_orario");
  const [nuovaData, setNuovaData] = useState("");
  const [nuovoOrario, setNuovoOrario] = useState(""); // datetime-local
  const [note, setNote] = useState("");
  const [warningAccepted, setWarningAccepted] = useState(
    diffDays >= LIMIT_WARN_DAYS
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (attivita) {
      const iso = start.toISOString();
      setNuovaData(iso.slice(0, 10));
      setNuovoOrario(iso.slice(0, 16)); // yyyy-MM-ddTHH:mm
    }
  }, [attivita, start]);

  const showWarn = diffDays < LIMIT_WARN_DAYS && tipo !== "cancellazione";
  const disableCancel = diffDays < LIMIT_CANCEL_DAYS;

  const disabledSubmit =
    submitting ||
    alreadyOpen ||
    (tipo === "cambio_data" && !nuovaData) ||
    (tipo === "cambio_orario" && !nuovoOrario) ||
    (tipo === "cancellazione" && disableCancel) ||
    (showWarn && !warningAccepted);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        attivitaId: attivita.id,
        tipo,
        noteStudente: note || undefined
      };
      if (tipo === "cambio_data") {
        // se <3 giorni – deve essere stesso giorno; lato server validazione extra
        payload.nuovaData = new Date(
          `${nuovaData}T${start.toISOString().slice(11, 19)}`
        ).toISOString();
      } else if (tipo === "cambio_orario") {
        payload.nuovoOrario = new Date(nuovoOrario).toISOString();
      }
      const res = await fetch("/api/modifiche", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Errore " + res.status);
      } else {
        onSuccess && onSuccess(json);
        onClose();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <h3
          style={{
            margin: "0 0 12px",
            fontSize: 18,
            fontWeight: 700,
            color: "#20489a"
          }}
        >
          Richiedi modifica lezione
        </h3>

        {alreadyOpen && (
          <div style={alertBox}>
            Esiste già una richiesta aperta per questa lezione (pending / in
            revisione).
          </div>
        )}

        <div style={fieldGroup}>
          <label style={label}>Tipo richiesta</label>
          <select
            value={tipo}
            disabled={alreadyOpen}
            onChange={e => setTipo(e.target.value)}
            style={select}
          >
            <option value="cambio_orario">Cambio orario</option>
            <option value="cambio_data">Cambio data</option>
            <option value="cancellazione" disabled={disableCancel}>
              Cancellazione {disableCancel ? "(non consentita &lt; 7g)" : ""}
            </option>
          </select>
        </div>

        {tipo === "cambio_data" && (
          <div style={fieldGroup}>
            <label style={label}>Nuova data (stesso giorno se &lt; 3 giorni)</label>
            <input
              type="date"
              disabled={alreadyOpen || diffDays < LIMIT_WARN_DAYS}
              value={nuovaData}
              onChange={e => setNuovaData(e.target.value)}
              style={input}
            />
            {diffDays < LIMIT_WARN_DAYS && (
              <div style={hint}>
                Finestra &lt; 3 giorni: non puoi cambiare il giorno.
              </div>
            )}
          </div>
        )}

        {tipo === "cambio_orario" && (
          <div style={fieldGroup}>
            <label style={label}>Nuovo orario</label>
            <input
              type="datetime-local"
              disabled={alreadyOpen}
              value={nuovoOrario}
              onChange={e => setNuovoOrario(e.target.value)}
              style={input}
            />
          </div>
        )}

        <div style={fieldGroup}>
          <label style={label}>Note (opzionale)</label>
          <textarea
            rows={3}
            disabled={alreadyOpen}
            value={note}
            onChange={e => setNote(e.target.value)}
            style={textarea}
          />
        </div>

        {showWarn && (
          <div
            style={{
              ...warnBox,
              background: "#FFF6C7",
              border: "1px solid #FACC15"
            }}
          >
            <p
              style={{
                margin: "0 0 6px",
                fontWeight: 600,
                color: "#624900"
              }}
            >
              Attenzione: mancano meno di 3 giorni.
            </p>
            <p
              style={{
                margin: "0 0 10px",
                fontSize: 13,
                lineHeight: 1.3
              }}
            >
              La sostituzione non è garantita e, in caso di impossibilità
              dell'insegnante o dello studente a spostare la lezione, la lezione
              verrà contata come svolta. Vuoi procedere?
            </p>
            <label
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
            >
              <input
                type="checkbox"
                checked={warningAccepted}
                onChange={e => setWarningAccepted(e.target.checked)}
              />
              Confermo di aver compreso
            </label>
          </div>
        )}

        {error && <div style={errorBox}>{error}</div>}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 18
          }}
        >
          <button onClick={onClose} style={btnGhost}>
            Chiudi
          </button>
          <button
            disabled={disabledSubmit}
            onClick={handleSubmit}
            style={disabledSubmit ? btnDisabled : btnPrimary}
          >
            {submitting ? "Invio..." : "Invia richiesta"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============= Styles ============= */
const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(32,72,154,0.32)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 150
};
const modal = {
  background: "#fff",
  borderRadius: 14,
  padding: "26px 26px 22px",
  width: "min(460px,90vw)",
  boxShadow: "0 6px 30px rgba(32,72,154,0.25)",
  maxHeight: "85vh",
  overflowY: "auto"
};
const fieldGroup = {
  marginBottom: 14,
  display: "flex",
  flexDirection: "column",
  gap: 6
};
const label = {
  fontSize: 13,
  fontWeight: 600,
  color: "#20489a",
  letterSpacing: ".3px"
};
const input = {
  border: "1.4px solid #4268b3",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 14,
  color: "#20489a",
  background: "#fff"
};
const textarea = { ...input, resize: "vertical" };
const select = { ...input, cursor: "pointer" };
const btnPrimary = {
  background: "#1cb0f6",
  color: "#fff",
  border: "none",
  fontWeight: 700,
  padding: "8px 18px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 14
};
const btnDisabled = {
  ...btnPrimary,
  background: "#9dcfe7",
  cursor: "not-allowed"
};
const btnGhost = {
  background: "#e3eefe",
  color: "#20489a",
  border: "none",
  fontWeight: 600,
  padding: "8px 16px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 14
};
const warnBox = { borderRadius: 10, padding: "10px 12px", fontSize: 12 };
const alertBox = {
  ...warnBox,
  background: "#FFF3B0",
  border: "1px solid #E6C75F",
  color: "#8C7800"
};
const errorBox = {
  ...warnBox,
  background: "#F8D7DA",
  border: "1px solid #E58B94",
  color: "#721C24"
};
const hint = { fontSize: 11, color: "#4268b3" };