console.log("RENDER ClientiTable (o ClientiForm, o ClienteDettaglioModal)");

import React from "react";

export default function ClientiTable({ clienti, onEdit, onDelete, onViewDetails }) {
  return (
    <table className="w-full border">
      <thead>
        <tr>
          <th className="border px-2 py-1">ID</th>
          <th className="border px-2 py-1">Nome</th>
          <th className="border px-2 py-1">Email</th>
          <th className="border px-2 py-1">CF</th>
          <th className="border px-2 py-1">PIVA</th>
          <th className="border px-2 py-1">Azioni</th>
        </tr>
      </thead>
      <tbody>
        {clienti.length === 0 && (
          <tr>
            <td colSpan={6} className="text-center py-4">Nessun cliente presente.</td>
          </tr>
        )}
        {clienti.map(cl => (
          <tr key={cl.id}>
            <td className="border px-2 py-1">{cl.id}</td>
            <td className="border px-2 py-1">{cl.nome}</td>
            <td className="border px-2 py-1">{cl.email}</td>
            <td className="border px-2 py-1">{cl.cf || ""}</td>
            <td className="border px-2 py-1">{cl.piva || ""}</td>
            <td className="border px-2 py-1 flex gap-2">
              <button className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-700" onClick={() => onEdit(cl)}>Modifica</button>
              <button className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-800" onClick={() => onDelete(cl.id)}>Elimina</button>
              <button className="bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-700" onClick={() => onViewDetails(cl)}>Dettagli</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}