import React from "react";

const PacchettiList = ({ pacchetti, onEdit, onDelete }) => {
  if (!Array.isArray(pacchetti) || pacchetti.length === 0) {
    return <div>Nessun pacchetto disponibile.</div>;
  }
  return (
    <table className="pacchetti-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Stato</th>
          <th>Ore residue</th>
          <th>Data creazione</th>
          <th>Azioni</th>
        </tr>
      </thead>
      <tbody>
        {pacchetti.map((p) => (
          <tr key={p.id}>
            <td>{p.descrizione || p.nome}</td>
            <td>{p.stato || "-"}</td>
            <td>{p.oreResidue ?? p.oreAcquistate ?? "-"}</td>
            <td>{p.dataAttivazione ? new Date(p.dataAttivazione).toLocaleDateString() : "-"}</td>
            <td>
              <button onClick={() => onEdit?.(p)}>Modifica</button>
              <button onClick={() => onDelete?.(p.id)}>Elimina</button>
            </td>
          </tr>
        ))}
      </tbody>
      <style>{`
        .pacchetti-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 4px;
        }
        .pacchetti-table th, .pacchetti-table td {
          border: 1px solid #eee;
          padding: 5px 8px;
          font-size: .96em;
        }
        .pacchetti-table th {
          font-weight: bold;
        }
      `}</style>
    </table>
  );
};

export default PacchettiList;