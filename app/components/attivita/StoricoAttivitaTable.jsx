import React, { useState, useMemo } from "react";

// Funzione di export dummy
function exportToPdf(data) {
  alert("Export PDF non ancora implementato.");
}
function exportToXls(data) {
  alert("Export XLS non ancora implementato.");
}

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
            <th style={{ padding: "7px 8px" }}>Descrizione</th>
            <th>Ore</th>
            <th>Pacchetto</th>
            <th>Cliente</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          {attivitaFiltrate.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ color: "#888", textAlign: "center", padding: 16 }}>
                Nessuna attività trovata
              </td>
            </tr>
          ) : (
            attivitaFiltrate.map(a => (
              <tr key={a.id}>
                <td>{a.descrizione}</td>
                <td>{a.oreConsumate}</td>
                <td>{a.pacchetto?.descrizione || ""}</td>
                <td>{a.pacchetto?.cliente?.nomeReferente || ""}</td>
                <td>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}