import React from "react";
import PacchettiClienteList from "./PacchettiClienteList";

export default function ClienteDettaglioModal({ cliente, onClose }) {
  if (!cliente) return null;

  const nomeCliente = cliente?.nome || cliente?.nomeReferente || cliente?.ragioneSociale || "-";
  const emailCliente = cliente?.email || "-";

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
        </div>
        <hr />
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