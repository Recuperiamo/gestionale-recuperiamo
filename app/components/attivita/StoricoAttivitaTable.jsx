import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

export default function StoricoAttivitaTable({
  attivita = [],
  filtroCliente,
  filtroPacchetto,
  dal,
  al,
}) {
  // Export XLSX
  function exportToXls(data) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "StoricoAttivita");
    XLSX.writeFile(workbook, "storico_attivita.xlsx");
  }

  // Export PDF - solo lato client, import dinamico
  async function exportToPdf(data) {
    const doc = new jsPDF();
    doc.text("Storico Attività", 10, 10);
    // Semplice esempio, puoi migliorare la formattazione
    data.forEach((a, idx) => {
      doc.text(
        `${a.data} - ${a.descrizione} - Ore: ${a.oreConsumate || a.ore || "-"}`,
        10,
        20 + idx * 10
      );
    });
    doc.save("storico_attivita.pdf");
  }

  // Filtro attività (usa array vuoto se attivita non inizializzata per qualunque motivo)
  const attivitaFiltrate = useMemo(() => {
    if (!Array.isArray(attivita)) return [];
    return attivita.filter((a) => {
      const matchCliente =
        !filtroCliente || a.pacchetto?.clienteId === Number(filtroCliente);
      const matchPacchetto =
        !filtroPacchetto || a.pacchettoId === Number(filtroPacchetto);
      const matchDal = !dal || new Date(a.data) >= new Date(dal);
      const matchAl = !al || new Date(a.data) <= new Date(al);
      return matchCliente && matchPacchetto && matchDal && matchAl;
    });
  }, [attivita, filtroCliente, filtroPacchetto, dal, al]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => exportToPdf(attivitaFiltrate)}>Export PDF</button>
        <button onClick={() => exportToXls(attivitaFiltrate)}>Export XLS</button>
      </div>
      <table className="w-full border">
        <thead>
          <tr>
            <th>Data</th>
            <th>Cliente</th>
            <th>Pacchetto</th>
            <th>Descrizione</th>
            <th>Ore</th>
          </tr>
        </thead>
        <tbody>
          {attivitaFiltrate.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center">
                Nessuna attività trovata
              </td>
            </tr>
          ) : (
            attivitaFiltrate.map((a) => (
              <tr key={a.id}>
                <td>{a.data}</td>
                <td>{a.pacchetto?.cliente?.nome || "-"}</td>
                <td>{a.pacchetto?.descrizione || "-"}</td>
                <td>{a.descrizione}</td>
                <td>{a.oreConsumate || a.ore || "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}