// @ts-nocheck
import React, { useState } from "react";

export default function ConfirmDeleteModal({ pacchetto, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState("");

  const handleDelete = async () => {
    setLoading(true);
    setErrore("");
    try {
      const res = await fetch(`/api/pacchetti/${pacchetto.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onSuccess && onSuccess();
        onClose && onClose();
      } else {
        const { error } = await res.json();
        setErrore(error || "Errore eliminazione pacchetto");
      }
    } catch (err) {
      setErrore("Errore di rete");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Conferma eliminazione</h2>
        <p>
          Sei sicuro di voler eliminare il pacchetto <b>{pacchetto.descrizione || pacchetto.id}</b>?
        </p>
        {errore && <div style={{ color: "red", margin: "10px 0" }}>{errore}</div>}
        <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
          <button onClick={handleDelete} disabled={loading} style={{ background: "#d22" }}>
            {loading ? "Eliminazione..." : "Elimina"}
          </button>
          <button onClick={onClose}>Annulla</button>
        </div>
      </div>
      <style>{`
        .modal-overlay {
          position: fixed;
          z-index: 1000;
          left: 0; top: 0; width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.13);
          display: flex; align-items: center; justify-content: center;
        }
        .modal-content {
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 4px 24px #0002;
          padding: 24px 32px;
          min-width: 350px;
          max-width: 500px;
          width: 100%;
        }
        .modal-content h2 { margin-top: 0; }
      `}</style>
    </div>
  );
}