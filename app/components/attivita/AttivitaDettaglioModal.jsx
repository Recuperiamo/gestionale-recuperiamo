import React from "react";

export default function AttivitaDettaglioModal({ attivita, onClose, onEdit, onDelete }) {
  if (!attivita) return null;

  const pacchettoLabel = attivita.pacchetto?.descrizione || attivita.pacchetto?.nome || "";

  const clienteLabel =
    attivita.pacchetto?.cliente?.nomeReferente ||
    attivita.pacchetto?.cliente?.ragione_sociale ||
    attivita.pacchetto?.cliente?.nome ||
    attivita.pacchetto?.cliente?.email ||
    "";

  // PATCH: verifica se la lezione è parte di una ricorrenza
  const isRicorrente = !!attivita.ricorrenzaId;

  // Funzione di formattazione data
  function formatDate(date) {
    try {
      return new Date(date).toLocaleString("it-IT");
    } catch {
      return date;
    }
  }

  const orarioLezione = attivita.orario ? formatDate(attivita.orario) : formatDate(attivita.createdAt);
  const dataCreazione = attivita.createdAt ? formatDate(attivita.createdAt) : "";

  return (
    <div className="modal-overlay" style={{ zIndex: 40 }}>
      <div className="modal" style={{ maxWidth: 470 }}>
        <button
          className="modal-close"
          onClick={onClose}
          style={{
            position: "absolute",
            right: 22,
            top: 19,
            background: "#f5f8ff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: 20,
            lineHeight: "20px",
            color: "#4268b3"
          }}
        >
          ×
        </button>
        <h3 style={{ color: "#1976d2", fontWeight: 600, marginTop: 0 }}>Dettaglio Lezione</h3>

        {/* PATCH: info ricorrenza */}
        {isRicorrente && (
          <div style={{
            background: "#e3eaff",
            color: "#20489a",
            border: "1.5px solid #20489a90",
            borderRadius: 7,
            padding: "9px 15px",
            marginBottom: 14,
            fontWeight: 500
          }}>
            ℹ️ Questa lezione fa parte di una ricorrenza.
          </div>
        )}

        <div style={{ margin: "18px 0 8px 0" }}>
          <b>Descrizione:</b> {attivita.descrizione}
        </div>
        <div style={{ marginBottom: 8 }}>
          <b>Ore:</b> {attivita.oreConsumate}
        </div>
        <div style={{ marginBottom: 8 }}>
          <b>Orario lezione:</b> {orarioLezione}
        </div>
        {dataCreazione && (
          <div style={{ marginBottom: 8 }}>
            <b>Creato il:</b> {dataCreazione}
          </div>
        )}
        <div style={{ marginBottom: 8 }}>
          <b>Pacchetto:</b> {pacchettoLabel}
        </div>
        <div style={{ marginBottom: 8 }}>
          <b>Cliente:</b> {clienteLabel}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 22, gap: 10 }}>
          <button
            onClick={() => onEdit(attivita)}
            style={{
              background: "#1cb0f6",
              color: "#fff",
              border: "none",
              borderRadius: 7,
              padding: "7px 14px",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              boxShadow: "0 1px 4px #1cb0f640"
            }}
          >
            Modifica lezione
          </button>
          <button
            onClick={() => onDelete && onDelete(attivita)}
            style={{
              background: "#f44336",
              color: "#fff",
              border: "none",
              borderRadius: 7,
              padding: "7px 14px",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              boxShadow: "0 1px 4px #f4433640"
            }}
          >
            Elimina lezione
          </button>
        </div>
      </div>
      <style>{`
        .modal-overlay {
          position: fixed;
          left: 0; top: 0; width: 100vw; height: 100vh;
          background: rgba(32,72,154,0.19);
          display: flex; align-items: center; justify-content: center;
        }
        .modal {
          background: #fff;
          padding: 32px 30px 24px 26px;
          border-radius: 17px;
          box-shadow: 0 6px 32px #20489a2c;
          position: relative;
        }
      `}</style>
    </div>
  );
}