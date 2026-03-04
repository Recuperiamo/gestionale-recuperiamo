// @ts-nocheck
import React, { useState } from "react";

// Rileva se almeno una nota è compilata
function hasAtLeastOneNote(clienti) {
  return clienti.some(c => c.note && c.note.trim() !== "");
}

function hasMaterie(clienti) {
  return clienti.some(c => Array.isArray(c.materie) && c.materie.length > 0);
}

function sortByNome(clienti, direction) {
  // Ordinamento case-insensitive, fallback se vuoto
  return [...clienti].sort((a, b) => {
    const nomeA = (a.nomeReferente || a.nome || "").toLowerCase();
    const nomeB = (b.nomeReferente || b.nome || "").toLowerCase();
    if (nomeA < nomeB) return direction === "asc" ? -1 : 1;
    if (nomeA > nomeB) return direction === "asc" ? 1 : -1;
    return 0;
  });
}

function formatTipo(tipo) {
  if (tipo === "STUDENTE") return "Studente";
  if (tipo === "REFERENTE") return "Referente";
  return tipo || "-";
}

function formatReferente(cliente) {
  if (!cliente?.referente) return "-";
  return cliente.referente.nomeReferente || cliente.referente.email || `ID ${cliente.referente.id}`;
}

export default function ClientiTable({ clienti, onEdit, onDelete, onViewDetails, dettaglioCliente }) {
  const showNote = hasAtLeastOneNote(clienti);
  const showMaterie = hasMaterie(clienti);

  // Stato ordinamento: null = nessun ordinamento, altrimenti {direction: "asc"|"desc"}
  const [nomeSort, setNomeSort] = useState(null);

  // Applica ordinamento se attivo
  const clientiOrdinati = nomeSort
    ? sortByNome(clienti, nomeSort)
    : clienti;

  // Gestione click su intestazione
  const handleSortClick = () => {
    if (!nomeSort) setNomeSort("asc");
    else if (nomeSort === "asc") setNomeSort("desc");
    else setNomeSort(null);
  };

  // Icona ordinamento
  const renderSortIcon = () => {
    if (nomeSort === "asc") return <span> ▲</span>;
    if (nomeSort === "desc") return <span> ▼</span>;
    return null;
  };

  return (
    <table className="w-full border mt-4">
      <thead>
        <tr className="bg-gray-100">
          <th className="px-2 py-2 border">ID</th>
          <th
            className="px-2 py-2 border cursor-pointer select-none"
            onClick={handleSortClick}
            title="Ordina per Nome referente"
            style={{ userSelect: "none" }}
          >
            Nome referente
            {renderSortIcon()}
          </th>
          <th className="px-2 py-2 border">Tipo</th>
          <th className="px-2 py-2 border">Referente</th>
          <th className="px-2 py-2 border">Email</th>
          {showMaterie && <th className="px-2 py-2 border">Materie</th>}
          {showNote && <th className="px-2 py-2 border">Note</th>}
          <th className="px-2 py-2 border">Azioni</th>
        </tr>
      </thead>
      <tbody>
        {clientiOrdinati.length === 0 ? (
          <tr>
            <td colSpan={6 + (showMaterie ? 1 : 0) + (showNote ? 1 : 0)} className="text-center py-4">
              Nessun cliente presente
            </td>
          </tr>
        ) : (
          clientiOrdinati.map((c) => (
            <tr key={c.id} className="align-top">
              <td className="border px-2 py-3">{c.id}</td>
              <td className="border px-2 py-3">{c.nomeReferente || c.nome || ""}</td>
              <td className="border px-2 py-3">{formatTipo(c.tipo)}</td>
              <td className="border px-2 py-3">{formatReferente(c)}</td>
              <td className="border px-2 py-3">{c.email}</td>
              {showMaterie && (
                <td className="border px-2 py-3">
                  {Array.isArray(c.materie) && c.materie.length > 0 ? c.materie.join(", ") : "-"}
                </td>
              )}
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