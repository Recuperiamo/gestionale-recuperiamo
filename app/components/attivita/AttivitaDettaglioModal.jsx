import React from 'react';

export default function AttivitaDettaglioModal({ attivita, onClose, onEdit, onDelete }) {
  if (!attivita) return null;

  const handleDelete = () => {
    if (onDelete) onDelete(attivita);
    if (onClose) onClose();
  };

  // Utility per data
  function formatDate(dateString) {
    if (!dateString) return "";
    const d = new Date(dateString);
    return d.toLocaleDateString('it-IT');
  }

  // Accesso sicuro alle proprietà pacchetto/cliente
  const pacchettoLabel = attivita.pacchetto?.descrizione || attivita.pacchetto?.nome || "";
  const clienteLabel =
    attivita.pacchetto?.cliente?.nomeReferente ||
    attivita.pacchetto?.cliente?.ragione_sociale ||
    attivita.pacchetto?.cliente?.nome ||
    attivita.pacchetto?.cliente?.email ||
    "";

  return (
    <div
      className="modal"
      style={{
        position: "fixed",
        top: 0, left: 0,
        width: "100vw", height: "100vh",
        background: "#1b253433",
        zIndex: 2000,
        display: "flex", alignItems: "center", justifyContent: "center"
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 28,
          borderRadius: 9,
          minWidth: 340,
          maxWidth: 400,
          boxShadow: "0 8px 36px #1976d250"
        }}
      >
        <h3 style={{ color: "#1976d2", fontWeight: 600, marginTop: 0 }}>Dettaglio Attività</h3>
        <div style={{ marginBottom: 12 }}>
          <b>Descrizione:</b> {attivita.descrizione}
        </div>
        <div style={{ marginBottom: 12 }}>
          <b>Ore:</b> {attivita.oreConsumate}
        </div>
        <div style={{ marginBottom: 12 }}>
          <b>Pacchetto:</b> {pacchettoLabel}
        </div>
        <div style={{ marginBottom: 12 }}>
          <b>Cliente:</b> {clienteLabel}
        </div>
        <div style={{ marginBottom: 12 }}>
          <b>Data:</b> {formatDate(attivita.createdAt)}
        </div>
        <div style={{ margin: "20px 0 0 0", display: "flex", gap: 14, justifyContent: "flex-end" }}>
          {onEdit && (
            <button
              onClick={() => onEdit(attivita)}
              style={{
                background: "#e3eafc",
                color: "#1976d2",
                border: "none",
                borderRadius: 5,
                padding: "7px 16px",
                fontWeight: 500,
                fontSize: "0.96rem",
                cursor: "pointer"
              }}
            >Modifica</button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              style={{
                background: "#ffebee",
                color: "#c62828",
                border: "none",
                borderRadius: 5,
                padding: "7px 16px",
                fontWeight: 500,
                fontSize: "0.96rem",
                cursor: "pointer"
              }}
            >Elimina</button>
          )}
          <button
            onClick={onClose}
            style={{
              background: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: 5,
              padding: "7px 16px",
              fontWeight: 500,
              fontSize: "0.96rem",
              cursor: "pointer"
            }}
          >Chiudi</button>
        </div>
      </div>
    </div>
  );
}