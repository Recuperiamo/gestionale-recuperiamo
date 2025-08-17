console.log("RENDER ClientiTable (o ClientiForm, o ClienteDettaglioModal)");

/**
 * Modale dettaglio cliente.
 * Visualizza solo i campi effettivamente valorizzati.
 */
import React from "react";

export default function ClienteDettaglioModal({ cliente, onClose }) {
  if (!cliente) return null;

  // Campi da mostrare solo se valorizzati
  const campiOpzionali = [
    { label: "Telefono", key: "telefono" },
    { label: "Indirizzo", key: "indirizzo" },
    { label: "Codice Fiscale", key: "cf" },
    { label: "Partita IVA", key: "piva" },
    { label: "Note", key: "note" }
  ];

  return (
    <div className="modal" style={{ border: "1px solid #333", background: "#fff", padding: "16px", margin: "16px auto", maxWidth: 500 }}>
      <h2>Dettaglio Cliente</h2>
      <p><b>Nome:</b> {cliente.nome}</p>
      <p><b>Email:</b> {cliente.email}</p>
      {campiOpzionali.map(
        campo =>
          cliente[campo.key] &&
          String(cliente[campo.key]).trim() !== "" && (
            <p key={campo.key}>
              <b>{campo.label}:</b> {cliente[campo.key]}
            </p>
          )
      )}
      <button
        className="bg-gray-400 text-white px-2 py-1 rounded hover:bg-gray-600 ml-2"
        onClick={onClose}>
        Chiudi
      </button>
    </div>
  );
}