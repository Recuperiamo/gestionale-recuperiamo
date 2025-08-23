import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

export default function StoricoAttivitaTable({ attivita, clienti, pacchetti }) {
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroPacchetto, setFiltroPacchetto] = useState("");
  const [dal, setDal] = useState("");
  const [al, setAl] = useState("");

  const attivitaFiltrate = useMemo(() => {
    return attivita.filter(a => {
      const matchCliente = !filtroCliente || a.pacchetto?.clienteId === Number(filtroCliente);
      const matchPacchetto = !filtroPacchetto || a.pacchettoId === Number(filtroPacchetto);
      const matchDal = !dal || new Date(a.createdAt) >= new Date(dal);
      const matchAl = !al || new Date(a.createdAt) <= new Date(al);
      return matchCliente && matchPacchetto && matchDal && matchAl;
    });
  }, [attivita, filtroCliente, filtroPacchetto, dal, al]);

  // Export XLSX
  function exportToXls(data) {
    const rows = data.map(a => ({
      Descrizione: a.descrizione,
      Ore: a.oreConsumate,
      Pacchetto: a.pacchetto?.descrizione || "",
      Cliente: a.pacchetto?.cliente?.nomeReferente || "",
      Data: a.createdAt ? new Date(a.createdAt).toLocaleDateString("it-IT") : ""
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "StoricoAttivita");
    XLSX.writeFile(workbook, "storico_attivita.xlsx");
  }

  // Export PDF - solo lato client, import dinamico
  async function exportToPdf(data) {
    if (typeof window === "undefined") return;

    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    doc.text("Storico Attività", 14, 18);

    const tableColumn = ["Descrizione", "Ore", "Pacchetto", "Cliente", "Data"];
    const tableRows = data.map(a => [
      a.descrizione,
      a.oreConsumate,
      a.pacchetto?.descrizione || "",
      a.pacchetto?.cliente?.nomeReferente || "",
      a.createdAt ? new Date(a.createdAt).toLocaleDateString("it-IT") : ""
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 24,
      theme: "grid",
      headStyles: { fillColor: [25, 118, 210] },
      styles: { halign: "center", valign: "middle" }
    });

    doc.save("storico_attivita.pdf");
  }

  return (
    <div>
      <h2 style={{ color: "#1976d2", marginBottom: 20 }}>Storico Attività</h2>
      <div style={{ display: "flex", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
        <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}>
          <option value="">Tutti i clienti</option>
          {clienti.map(c => (
            <option key={c.id} value={c.id}>
              {c.nomeReferente || c.ragioneSociale || c.nome || c.email}
            </option>
          ))}
        </select>
        <select value={filtroPacchetto} onChange={e => setFiltroPacchetto(e.target.value)}>
          <option value="">Tutti i pacchetti</option>
          {pacchetti.map(p => (
            <option key={p.id} value={p.id}>
              {p.descrizione}
            </option>
          ))}
        </select>
        <input type="date" value={dal} onChange={e => setDal(e.target.value)} placeholder="Dal" />
        <input type="date" value={al} onChange={e => setAl(e.target.value)} placeholder="Al" />
        <button onClick={() => { setFiltroCliente(""); setFiltroPacchetto(""); setDal(""); setAl(""); }}>Reset</button>
        <button onClick={() => exportToPdf(attivitaFiltrate)}>Export PDF</button>
        <button onClick={() => exportToXls(attivitaFiltrate)}>Export XLS</button>
      </div>
      <table style={{
        width: "100%", background: "#fff", borderCollapse: "collapse",
        boxShadow: "0 2px 12px #1976d255", borderRadius: 8, overflow: "hidden"
      }}>
        <thead>
          <tr style={{ background: "#f4f8fc" }}>
            <th style={{ padding: "12px 8px", textAlign: "center", verticalAlign: "middle" }}>Descrizione</th>
            <th style={{ padding: "12px 8px", textAlign: "center", verticalAlign: "middle" }}>Ore</th>
            <th style={{ padding: "12px 8px", textAlign: "center", verticalAlign: "middle" }}>Pacchetto</th>
            <th style={{ padding: "12px 8px", textAlign: "center", verticalAlign: "middle" }}>Cliente</th>
            <th style={{ padding: "12px 8px", textAlign: "center", verticalAlign: "middle" }}>Data</th>
          </tr>
        </thead>
        <tbody>
          {attivitaFiltrate.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ color: "#888", textAlign: "center", padding: 32, verticalAlign: "middle" }}>
                Nessuna attività trovata
              </td>
            </tr>
          ) : (
            attivitaFiltrate.map(a => (
              <tr key={a.id}>
                <td style={{ textAlign: "center", verticalAlign: "middle" }}>{a.descrizione}</td>
                <td style={{ textAlign: "center", verticalAlign: "middle" }}>{a.oreConsumate}</td>
                <td style={{ textAlign: "center", verticalAlign: "middle" }}>{a.pacchetto?.descrizione || ""}</td>
                <td style={{ textAlign: "center", verticalAlign: "middle" }}>{a.pacchetto?.cliente?.nomeReferente || ""}</td>
                <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                  {a.createdAt ? new Date(a.createdAt).toLocaleDateString("it-IT") : ""}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}