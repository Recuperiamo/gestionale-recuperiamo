import React, { useState, useEffect } from "react";

export default function PacchettoForm({ onClose, onSuccess, clienteId: propClienteId }) {
  const [clienti, setClienti] = useState([]);
  const [clienteId, setClienteId] = useState(
    propClienteId !== undefined && propClienteId !== null
      ? Number(propClienteId)
      : null
  );
  const [dataAttivazione, setDataAttivazione] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [oreAcquistate, setOreAcquistate] = useState("");
  const [oreResidue, setOreResidue] = useState("");
  const [sogliaOreResidue, setSogliaOreResidue] = useState("");
  const [errore, setErrore] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchClienti() {
      try {
        const res = await fetch("/api/clienti?tipo=STUDENTE");
        if (!res.ok) throw new Error("Errore caricamento clienti");
        const data = await res.json();
        setClienti(Array.isArray(data) ? data : []);
        if (propClienteId !== undefined && propClienteId !== null) {
          setClienteId(Number(propClienteId));
        }
      } catch (err) {
        setClienti([]);
      }
    }
    fetchClienti();
  }, [propClienteId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrore("");
    setSuccess(false);
    if (
      typeof clienteId !== "number" ||
      isNaN(clienteId) ||
      clienteId <= 0 ||
      !clienti.find((c) => c.id === clienteId)
    ) {
      setErrore("Devi selezionare un cliente valido.");
      return;
    }
    if (!dataAttivazione) {
      setErrore("Devi inserire una data di attivazione.");
      return;
    }
    if (!oreAcquistate || isNaN(Number(oreAcquistate)) || Number(oreAcquistate) <= 0) {
      setErrore("Ore acquistate deve essere un numero positivo.");
      return;
    }
    if (
      sogliaOreResidue !== "" &&
      (isNaN(Number(sogliaOreResidue)) || Number(sogliaOreResidue) < 0)
    ) {
      setErrore("La soglia alert deve essere un numero ≥ 0 oppure lasciata vuota.");
      return;
    }

    const payload = {
      clienteId,
      dataAttivazione,
      descrizione,
      oreAcquistate: Number(oreAcquistate),
      oreResidue: oreResidue ? Number(oreResidue) : Number(oreAcquistate),
      sogliaOreResidue: sogliaOreResidue === "" ? null : Number(sogliaOreResidue),
    };



    try {
      const res = await fetch("/api/pacchetti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Errore creazione pacchetto");
      }
      setSuccess(true);
      onSuccess && onSuccess(); // callback a componente padre per refresh/chiusura
    } catch (err) {
      setErrore(err.message || "Errore creazione pacchetto");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2>Nuovo Pacchetto Ore</h2>
      {errore && <div className="text-red-600">{errore}</div>}
      {success && (
        <div className="text-green-700 font-bold">Pacchetto creato con successo!</div>
      )}

      {/* Cliente come select */}
      <div>
        <label>Cliente:</label>
        <select
          value={clienteId !== null ? String(clienteId) : ""}
          onChange={(e) => setClienteId(Number(e.target.value))}
          disabled={!!propClienteId}
          className="ml-2 px-2 py-1 rounded"
          required
        >
          <option value="">-- Seleziona cliente --</option>
          {clienti.map((cl) => (
            <option key={cl.id} value={cl.id}>
              {cl.nomeReferente
                ? `${cl.nomeReferente} (${cl.email || cl.id})`
                : cl.email || cl.id}
              {cl.referente ? ` – Ref. ${cl.referente.nomeReferente || cl.referente.email || cl.referente.id}` : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Data attivazione:</label>
        <input
          type="date"
          value={dataAttivazione}
          onChange={(e) => setDataAttivazione(e.target.value)}
          required
          className="px-2 py-1 rounded"
        />
      </div>
      <div>
        <label>Nome pacchetto:</label>
        <input
          type="text"
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
          className="px-2 py-1 rounded"
        />
      </div>
      <div>
        <label>Ore acquistate:</label>
        <input
          type="number"
          value={oreAcquistate}
          onChange={(e) => setOreAcquistate(e.target.value)}
          required
          min="1"
          className="px-2 py-1 rounded"
        />
      </div>
      <div>
        <label>Ore residue:</label>
        <input
          type="number"
          value={oreResidue}
          onChange={(e) => setOreResidue(e.target.value)}
          min="0"
          className="px-2 py-1 rounded"
        />
      </div>
      <div>
        <label>Soglia alert ore residue:</label>
        <input
          type="number"
          value={sogliaOreResidue}
          onChange={(e) => setSogliaOreResidue(e.target.value)}
          min="0"
          placeholder="Soglia alert (es. 3)"
          className="px-2 py-1 rounded"
        />
        <div className="text-xs text-gray-500">
          (se &lt;= a questo valore appare un alert; lascia vuoto per nessun alert)
        </div>
      </div>
      <div className="space-x-2">
        <button
          type="submit"
          className="bg-green-600 text-white px-3 py-1 rounded"
        >
          Salva
        </button>
        <button
          type="button"
          className="bg-gray-400 text-white px-3 py-1 rounded"
          onClick={() => onClose && onClose()}
        >
          Annulla
        </button>
      </div>
    </form>
  );
}