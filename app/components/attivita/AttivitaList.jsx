import React from 'react';

function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString('it-IT');
}

export default function AttivitaList({ attivita, onDettaglio }) {
  console.log("AttivitaList riceve:", attivita);
  return (
    <section>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: "#f8fafd", borderRadius: 8, boxShadow: "0 1px 4px #1976d220", fontSize: "1rem", marginTop: 8 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "12px 14px", fontWeight: 700, fontSize: "1.08rem", color: "#252525" }}>Descrizione</th>
            <th style={{ textAlign: "right", padding: "12px 10px", fontWeight: 700 }}>Ore</th>
            <th style={{ textAlign: "left", padding: "12px 10px", fontWeight: 700 }}>Pacchetto</th>
            <th style={{ textAlign: "left", padding: "12px 10px", fontWeight: 700 }}>Cliente</th>
            <th style={{ textAlign: "center", padding: "12px 10px", fontWeight: 700 }}>Data</th>
            <th style={{ textAlign: "center", padding: "12px 10px", fontWeight: 700 }}>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {attivita.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", color: "#888", padding: 24 }}>
                Nessuna attività trovata
              </td>
            </tr>
          ) : attivita.map(a => (
            <tr key={a.id}
              style={{
                background: "#fff",
                borderTop: "1px solid #e3eafc",
                transition: "background 0.2s"
              }}
              onMouseOver={e => e.currentTarget.style.background = "#f2faff"}
              onMouseOut={e => e.currentTarget.style.background = "#fff"}
            >
              <td style={{ padding: "10px 14px" }}>{a.descrizione}</td>
              <td style={{ padding: "10px", textAlign: "right" }}>{a.oreConsumate}</td>
              <td style={{ padding: "10px" }}>{a.pacchetto?.descrizione || ""}</td>
              <td style={{ padding: "10px" }}>{a.pacchetto?.cliente?.nomeReferente || a.pacchetto?.cliente?.ragione_sociale || a.pacchetto?.cliente?.nome || a.pacchetto?.cliente?.email || ""}</td>
              <td style={{ padding: "10px", textAlign: "center" }}>{formatDate(a.createdAt)}</td>
              <td style={{ padding: "10px", textAlign: "center" }}>
                <button
                  style={{
                    fontSize: "0.98rem",
                    padding: "4px 10px",
                    border: "none",
                    borderRadius: 3,
                    marginRight: 5,
                    background: "#e3eafc",
                    color: "#1976d2",
                    cursor: "pointer",
                    fontWeight: 500,
                    transition: "background 0.2s"
                  }}
                  onClick={() => onDettaglio(a)}
                >Dettaglio</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}