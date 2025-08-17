import React from "react";

export default function ClienteDettaglioModal({ cliente, onClose }) {
  if (!cliente) return null;

  // Helper: mostra solo i campi valorizzati
  const dettagli = [
    { label: "ID", value: cliente.id },
    { label: "Nome referente", value: cliente.nomeReferente || cliente.nome },
    { label: "Email", value: cliente.email },
    { label: "Telefono", value: cliente.telefono },
    { label: "Indirizzo", value: cliente.indirizzo },
    { label: "Codice Fiscale", value: cliente.codiceFiscale || cliente.cf },
    { label: "Partita IVA", value: cliente.partitaIva || cliente.piva },
    { label: "Note", value: cliente.note }
  ].filter(d => d.value && d.value !== "");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <h3 className="text-xl font-bold mb-4">Dettagli Cliente</h3>
        <ul>
          {dettagli.map(({ label, value }) => (
            <li key={label} className="mb-3">
              <span className="font-bold">{label}:</span> <span>{value}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2 mt-6">
          <button
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-700"
            onClick={onClose}
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}