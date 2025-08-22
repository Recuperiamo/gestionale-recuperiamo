import React, { useState } from "react";

export default function PacchettoEditForm({ pacchetto, onClose, onSuccess }) {
  const [descrizione, setDescrizione] = useState(pacchetto.descrizione || "");
  const [oreResidue, setOreResidue] = useState(pacchetto.oreResidue || "");
  const [sogliaOreResidue, setSogliaOreResidue] = useState(
    pacchetto.sogliaOreResidue !== null && pacchetto.sogliaOreResidue !== undefined
      ? pacchetto.sogliaOreResidue
      : ""
  );
  const [errore, setErrore] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrore("");
    setLoading(true);

    // Validazione base
    if (oreResidue !== "" && (isNaN(oreResidue) || Number(oreResidue) < 0)) {
      setErrore("Ore residue deve essere ≥ 0");
      setLoading(false);
      return;
    }
    if (sogliaOreResidue !== "" && (isNaN(sogliaOreResidue) || Number(sogliaOreResidue) < 0)) {
      setErrore("La soglia alert deve essere un numero ≥ 0 oppure vuota");
      setLoading(false);
      return;
    }

    const payload = {
      descrizione,
      oreResidue: oreResidue !== "" ? Number(oreResidue) : null,
      sogliaOreResidue: sogliaOreResidue !== "" ? Number(sogliaOreResidue) : null,
    };

    try {
      const res = await fetch(`/api/pacchetti/${pacchetto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onSuccess && onSuccess();
        onClose && onClose();
      } else {
        const { error } = await res.json();
        setErrore(error || "Errore modifica pacchetto");
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
        <h2>Modifica Pacchetto</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Descrizione:</label>
            <input
              type="text"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
            />
          </div>
          <div>
            <label>Ore residue:</label>
            <input
              type="number"
              min="0"
              value={oreResidue}
              onChange={(e) => setOreResidue(e.target.value)}
            />
          </div>
          <div>
            <label>Soglia alert ore residue:</label>
            <input
              type="number"
              min="0"
              value={sogliaOreResidue}
              onChange={e => setSogliaOreResidue(e.target.value)}
              placeholder="Soglia alert (es. 3)"
            />
          </div>
          {errore && (
            <div style={{ color: "red", margin: "5px 0" }}>{errore}</div>
          )}
          <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
            <button type="submit" disabled={loading}>
              {loading ? "Salvataggio..." : "Salva modifiche"}
            </button>
            <button type="button" onClick={onClose}>
              Annulla
            </button>
          </div>
        </form>
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
        .modal-content form > div { margin-bottom: 14px; }
        .modal-content label { display: block; font-weight: 500; }
        .modal-content input {
          width: 100%;
          padding: 7px 10px;
          border-radius: 4px;
          border: 1px solid #ccc;
          margin-top: 4px;
          font-size: 1rem;
        }
        .modal-content button {
          padding: 7px 18px;
          border-radius: 4px;
          border: none;
          background: #1a72e7;
          color: #fff;
          font-weight: 600;
          cursor: pointer;
        }
        .modal-content button[disabled] {
          background: #bcd;
          cursor: wait;
        }
      `}</style>
    </div>
  );
}