import React from "react";

// Rileva se almeno una nota è compilata
function hasAtLeastOneNote(clienti) {
  return clienti.some(c => c.note && c.note.trim() !== "");
}

export default function ClientiTable({ clienti, onEdit, onDelete, onViewDetails, dettaglioCliente }) {
  const showNote = hasAtLeastOneNote(clienti);

  return (
    <table className="w-full border mt-4">
      <thead>
        <tr className="bg-gray-100">
          <th className="px-2 py-2 border">ID</th>
          <th className="px-2 py-2 border">Nome referente</th>
          <th className="px-2 py-2 border">Email</th>
          {showNote && <th className="px-2 py-2 border">Note</th>}
          <th className="px-2 py-2 border">Azioni</th>
        </tr>
      </thead>
      <tbody>
        {clienti.length === 0 ? (
          <tr>
            <td colSpan={showNote ? 5 : 4} className="text-center py-4">
              Nessun cliente presente
            </td>
          </tr>
        ) : (
          clienti.map((c) => (
            <tr key={c.id} className="align-top">
              <td className="border px-2 py-3">{c.id}</td>
              <td className="border px-2 py-3">{c.nomeReferente || c.nome || ""}</td>
              <td className="border px-2 py-3">{c.email}</td>
              {showNote && (
                <td className="border px-2 py-3">
                  {c.note && c.note.trim() !== "" ? c.note : ""}
                </td>
              )}
              <td className="border px-2 py-3 flex gap-2">
                <button
                  className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-700"
                  onClick={() => onEdit(c)}
                >
                  Modifica
                </button>
                <button
                  className={`bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-700 ${dettaglioCliente && dettaglioCliente.id === c.id ? "ring-2 ring-gray-700" : ""}`}
                  onClick={() => onViewDetails(c)}
                >
                  Dettagli
                </button>
                <button
                  className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-700"
                  onClick={() => onDelete(c.id)}
                >
                  Elimina
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}