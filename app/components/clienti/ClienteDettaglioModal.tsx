// @ts-nocheck
import React, { useState, useEffect } from "react";
import PacchettiClienteList from "./PacchettiClienteList";

export default function ClienteDettaglioModal({ cliente, onClose }) {
  const [lavagnaV2, setLavagnaV2] = useState(false);
  const [lavagnaV2Loading, setLavagnaV2Loading] = useState(false);

  useEffect(() => {
    if (!cliente?.id) return;
    fetch(`/api/clienti/${cliente.id}/lavagnav2`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setLavagnaV2(d.lavagnaV2Abilitata) })
      .catch(() => {});
  }, [cliente?.id]);

  const toggleLavagnaV2 = async () => {
    setLavagnaV2Loading(true);
    try {
      const res = await fetch(`/api/clienti/${cliente.id}/lavagnav2`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lavagnaV2Abilitata: !lavagnaV2 }),
      });
      if (res.ok) {
        const d = await res.json();
        setLavagnaV2(d.lavagnaV2Abilitata);
      }
    } finally {
      setLavagnaV2Loading(false);
    }
  };
  if (!cliente) return null;

  const nomeCliente = cliente?.nome || cliente?.nomeReferente || cliente?.ragioneSociale || "-";
  const emailCliente = cliente?.email || "-";
  const tipoLabel = cliente?.tipo === "STUDENTE" ? "Studente" : "Referente";
  const referenteLabel = cliente?.referente?.nomeReferente || cliente?.referente?.email || null;
  const studentiAssociati = Array.isArray(cliente?.studenti) ? cliente.studenti : [];
  const materieStudente = Array.isArray(cliente?.materie) ? cliente.materie : [];

  return (
    <div className="cliente-modal-overlay">
      <div className="cliente-modal-content">
        <div className="header">
          <h3>Dettaglio Cliente</h3>
          <button className="close-btn" onClick={onClose} aria-label="Chiudi">&times;</button>
        </div>
        <div className="info">
          <div><b>Nome:</b> {nomeCliente}</div>
          <div><b>Email:</b> {emailCliente}</div>
          <div><b>Tipo:</b> {tipoLabel}</div>
          {cliente?.tipo === "STUDENTE" && (
            <div><b>Referente:</b> {referenteLabel || "-"}</div>
          )}
          {cliente?.tipo === "STUDENTE" && (
            <div>
              <b>Materie seguite:</b> {materieStudente.length > 0 ? materieStudente.join(", ") : "-"}
            </div>
          )}
          {cliente?.tipo === "REFERENTE" && (
            <div>
              <b>Studenti collegati:</b>{" "}
              {studentiAssociati.length === 0 ? (
                <span>-</span>
              ) : (
                <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 18 }}>
                  {studentiAssociati.map((stud) => (
                    <li key={stud.id}>
                      {stud.nomeReferente || stud.email || `Studente #${stud.id}`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <div style={{ margin: "12px 0" }}>
          <a
            href={`/storico?clienteId=${cliente.id}`}
            style={{
              display: "inline-block",
              background: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              padding: "7px 18px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "1em",
              cursor: "pointer"
            }}
            target="_blank"
            rel="noopener noreferrer"
          >
            Vedi storico attività
          </a>
        </div>
        <hr />
        {/* Toggle accesso Lavagna v2 — solo per studenti */}
        {cliente?.tipo === "STUDENTE" && (
          <div style={{ margin: '12px 0', padding: '10px 14px', background: '#f0f7ff', borderRadius: 8, border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#1e40af' }}>Lavagna v2 (beta)</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {lavagnaV2 ? 'Studente abilitato ad accedere alla nuova lavagna' : 'Accesso alla nuova lavagna disabilitato'}
              </div>
            </div>
            <button
              onClick={toggleLavagnaV2}
              disabled={lavagnaV2Loading}
              style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: lavagnaV2 ? '#2563eb' : '#d1d5db',
                position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                opacity: lavagnaV2Loading ? 0.6 : 1,
              }}
              title={lavagnaV2 ? 'Disabilita accesso' : 'Abilita accesso'}
            >
              <span style={{
                position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%',
                background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                transition: 'left 0.2s', left: lavagnaV2 ? 23 : 3,
              }} />
            </button>
          </div>
        )}
        <PacchettiClienteList clienteId={cliente.id} />
        <div className="footer">
          <button className="close-btn" onClick={onClose}>Chiudi</button>
        </div>
      </div>
      <style>{`
        .cliente-modal-overlay {
          position: fixed; left: 0; top: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.2); z-index: 1400;
          display: flex; align-items: center; justify-content: center;
        }
        .cliente-modal-content {
          background: #fff; padding: 24px 22px 16px 22px; border-radius: 11px; min-width: 320px; max-width: 95vw;
          box-shadow: 0 2px 16px rgba(0,0,0,0.16);
          min-height: 230px;
        }
        .cliente-modal-content .header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px;
        }
        .cliente-modal-content .close-btn {
          background: none; border: none; font-size: 1.8em; color: #666; cursor: pointer; line-height: 1;
          padding: 0 6px;
        }
        .cliente-modal-content .info {
          margin-bottom: 8px;
        }
        .cliente-modal-content .footer {
          margin-top: 14px; display: flex; justify-content: flex-end;
        }
        .cliente-modal-content .footer .close-btn {
          background: #eee; color: #333; border: 0; border-radius: 5px; padding: 7px 16px; font-size: 1em; cursor: pointer;
        }
      `}</style>
    </div>
  );
}