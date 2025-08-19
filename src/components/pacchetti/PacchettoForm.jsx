import React, { useState, useEffect } from "react";
import { useClienti } from "../../context/ClientiContext";

// Calcolo progressivo da backend
async function fetchProgressivo(clienteId, dataAttivazione) {
  if (!clienteId || !dataAttivazione) return "";
  const res = await fetch(
    `/api/pacchetti/progressivo?clienteId=${clienteId}&dataAttivazione=${dataAttivazione}`
  );
  if (!res.ok) return "";
  const { progressivo } = await res.json();
  return progressivo;
}

export default function PacchettoForm({ onClose, onSuccess }) {
  const { clienti, loading: clientiLoading, error: clientiError } = useClienti();
  const [clienteId, setClienteId] = useState("");
  const [oreAcquistate, setOreAcquistate] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [progressivo, setProgressivo] = useState("");
  const [dataAttivazione, setDataAttivazione] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [sogliaOreResidue, setSogliaOreResidue] = useState(""); // NUOVO CAMPO
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState("");
  const [toccatoCliente, setToccatoCliente] = useState(false);

  const [stato] = useState("attivo");

  useEffect(() => {
    if (!clienteId || !dataAttivazione) {
      setProgressivo("");
      return;
    }
    fetchProgressivo(clienteId, dataAttivazione).then(setProgressivo);
  }, [clienteId, dataAttivazione]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setToccatoCliente(true);
    setErrore("");

    if (!clienteId) {
      setErrore("Seleziona un cliente!");
      return;
    }
    if (!oreAcquistate || isNaN(oreAcquistate) || Number(oreAcquistate) < 1) {
      setErrore("Inserisci un numero valido di ore acquistate.");
      return;
    }
    if (sogliaOreResidue !== "" && (isNaN(sogliaOreResidue) || Number(sogliaOreResidue) < 0)) {
      setErrore("La soglia alert deve essere un numero ≥ 0 oppure lasciata vuota.");
      return;
    }

    setLoading(true);

    const payload = {
      clienteId: Number(clienteId),
      descrizione: descrizione.trim() === "" ? progressivo : descrizione,
      oreAcquistate: Number(oreAcquistate),
      dataAttivazione,
      stato,
      sogliaOreResidue: sogliaOreResidue !== "" ? Number(sogliaOreResidue) : null, // NUOVO CAMPO
    };

    console.log("PAYLOAD CREAZIONE PACCHETTO:", payload); // DEBUG

    try {
      const res = await fetch("/api/pacchetti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onSuccess && onSuccess();
        onClose && onClose();
      } else {
        const { error } = await res.json();
        setErrore(error || "Errore creazione pacchetto");
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
        <h2>Nuovo Pacchetto Ore</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Cliente*:</label>
            <select
              value={clienteId}
              onChange={e => {
                setClienteId(e.target.value);
                setToccatoCliente(true);
              }}
              required
              disabled={clientiLoading || clienti.length === 0}
              style={
                toccatoCliente && !clienteId
                  ? { border: "1.5px solid #d22", background: "#fff6f6" }
                  : undefined
              }
            >
              <option value="" disabled hidden>
                {clientiLoading
                  ? "Caricamento clienti..."
                  : clienti.length === 0
                  ? "Nessun cliente disponibile"
                  : "Seleziona cliente"}
              </option>
              {clienti.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nomeReferente}
                </option>
              ))}
            </select>
            {clientiError && (
              <div style={{ color: "#c22", fontSize: "0.97em", marginTop: "5px" }}>
                {clientiError}
              </div>
            )}
          </div>
          <div>
            <label>Ore acquistate*:</label>
            <input
              type="number"
              min="1"
              value={oreAcquistate}
              onChange={(e) => setOreAcquistate(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Nome pacchetto:</label>
            <input
              type="text"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              placeholder="Lascia vuoto per nome automatico"
            />
          </div>
          <div>
            <label>Progressivo pacchetto:</label>
            <input
              type="text"
              value={progressivo}
              readOnly
              disabled
              style={{ background: "#f3f3f3" }}
              tabIndex={-1}
            />
          </div>
          <div>
            <label>Data attivazione:</label>
            <input
              type="date"
              value={dataAttivazione}
              onChange={(e) => setDataAttivazione(e.target.value)}
            />
          </div>
          <div>
            <label>
              Soglia alert ore residue:
              <span style={{ fontWeight: 400, fontSize: 12, marginLeft: 4 }}>
                (se &lt;= a questo valore appare un alert; lascia vuoto per nessun alert)
              </span>
            </label>
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
            <button type="submit" disabled={loading || clientiLoading || clienti.length === 0}>
              {loading ? "Salvataggio..." : "Crea"}
            </button>
            <button type="button" onClick={onClose}>
              Annulla
            </button>
          </div>
        </form>
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
          .modal-content input, .modal-content select {
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
    </div>
  );
}