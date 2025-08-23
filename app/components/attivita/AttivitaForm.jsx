import React, { useState, useEffect } from "react";

export default function AttivitaForm({ initialData, onSuccess, onClose }) {
  const isEdit = !!initialData;
  const [descrizione, setDescrizione] = useState(initialData?.descrizione || "");
  const [ore, setOre] = useState(initialData?.oreConsumate || "");
  const [pacchettoId, setPacchettoId] = useState(initialData?.pacchettoId || "");
  const [clienteId, setClienteId] = useState(initialData?.clienteId || "");
  const [data, setData] = useState(initialData?.data || "");

  const [clienti, setClienti] = useState([]);
  const [pacchetti, setPacchetti] = useState([]);
  const [loadingClienti, setLoadingClienti] = useState(false);
  const [loadingPacchetti, setLoadingPacchetti] = useState(false);
  const [errorClienti, setErrorClienti] = useState(null);
  const [errorPacchetti, setErrorPacchetti] = useState(null);
  const [errorForm, setErrorForm] = useState(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  useEffect(() => {
    if (!isEdit) {
      setLoadingClienti(true);
      fetch("/api/clienti")
        .then((res) => {
          if (!res.ok) throw new Error("Errore nel caricamento clienti");
          return res.json();
        })
        .then((data) => {
          setClienti(data);
          setErrorClienti(null);
        })
        .catch(() => {
          setClienti([]);
          setErrorClienti("Impossibile caricare l'elenco clienti");
        })
        .finally(() => setLoadingClienti(false));
    }
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit && clienteId) {
      setLoadingPacchetti(true);
      setPacchetti([]);
      fetch(`/api/pacchetti?clienteId=${clienteId}&stato=attivo`)
        .then((res) => {
          if (!res.ok) throw new Error("Errore nel caricamento pacchetti");
          return res.json();
        })
        .then((data) => {
          setPacchetti(data);
          setErrorPacchetti(null);
        })
        .catch(() => {
          setPacchetti([]);
          setErrorPacchetti("Impossibile caricare i pacchetti per il cliente selezionato");
        })
        .finally(() => setLoadingPacchetti(false));
    } else if (!isEdit) {
      setPacchetti([]);
      setErrorPacchetti(null);
    }
  }, [clienteId, isEdit]);

  useEffect(() => {
    if (!isEdit) setPacchettoId("");
  }, [clienteId, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorForm(null);

    if (!descrizione || !ore || !data || (!isEdit && (!pacchettoId || !clienteId))) {
      setErrorForm("Compila tutti i campi obbligatori");
      return;
    }

    if (Number(ore) <= 0) {
      setErrorForm("Le ore devono essere maggiori di zero");
      return;
    }

    setLoadingSubmit(true);

    try {
      if (!isEdit) {
        const res = await fetch('/api/attivita', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            descrizione,
            pacchettoId: Number(pacchettoId),
            clienteId: Number(clienteId),
            oreConsumate: Number(ore),
            data
          })
        });
        const result = await res.json();
        if (!res.ok) {
          setErrorForm(result?.error || "Errore nella creazione attività");
          setLoadingSubmit(false);
          return;
        }
        if (onSuccess) onSuccess({
          ...result.attivita,
          pacchetto: result.pacchetto?.descrizione || "",
          cliente: clienti.find(c => String(c.id) === String(clienteId))?.nome_referente || "",
        });
      } else {
        // PATCH MODIFICA
        const res = await fetch('/api/attivita', {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: initialData.id,
            descrizione,
            oreConsumate: Number(ore),
            data
          })
        });
        const result = await res.json();
        if (!res.ok) {
          setErrorForm(result?.error || "Errore nella modifica attività");
          setLoadingSubmit(false);
          return;
        }
        if (onSuccess) onSuccess({
          ...result.attivita,
        });
      }
      setLoadingSubmit(false);
    } catch (err) {
      setErrorForm("Errore di rete o interno");
      setLoadingSubmit(false);
    }
  };

  return (
    <div
      className="modal"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "#1b253455",
        zIndex: 2100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          padding: 32,
          borderRadius: 10,
          minWidth: 370,
          maxWidth: 430,
          boxShadow: "0 8px 36px #1976d250",
        }}
      >
        <h3
          style={{
            color: "#1976d2",
            fontWeight: 700,
            marginTop: 0,
            marginBottom: 18,
          }}
        >
          {isEdit ? "Modifica attività" : "Nuova attività"}
        </h3>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="attivita-descrizione" style={{ fontWeight: 500 }}>Descrizione *</label>
          <br />
          <input
            id="attivita-descrizione"
            name="descrizione"
            type="text"
            value={descrizione}
            onChange={(e) => setDescrizione(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 10px",
              border: "1px solid #cbe5fc",
              borderRadius: 5,
              background: "#f8fafd",
            }}
            autoFocus
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="attivita-ore" style={{ fontWeight: 500 }}>Ore *</label>
          <br />
          <input
            id="attivita-ore"
            name="ore"
            type="number"
            min={0.5}
            step={0.5}
            value={ore}
            onChange={(e) => setOre(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 10px",
              border: "1px solid #cbe5fc",
              borderRadius: 5,
              background: "#f8fafd",
            }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="attivita-data" style={{ fontWeight: 500 }}>Data *</label>
          <br />
          <input
            id="attivita-data"
            name="data"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 10px",
              border: "1px solid #cbe5fc",
              borderRadius: 5,
              background: "#f8fafd",
            }}
          />
        </div>
        {!isEdit && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="attivita-cliente" style={{ fontWeight: 500 }}>Cliente *</label>
              <br />
              {loadingClienti ? (
                <div style={{ color: "#888" }}>Caricamento clienti...</div>
              ) : errorClienti ? (
                <div style={{ color: "red" }}>{errorClienti}</div>
              ) : (
                <select
                  id="attivita-cliente"
                  name="cliente"
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbe5fc",
                    borderRadius: 5,
                    background: "#f8fafd",
                  }}
                >
                  <option value="">Seleziona cliente</option>
                  {clienti.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_referente || c.ragione_sociale || c.nome || c.email}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="attivita-pacchetto" style={{ fontWeight: 500 }}>Pacchetto *</label>
              <br />
              {clienteId === "" ? (
                <div style={{ color: "#888" }}>Seleziona prima un cliente</div>
              ) : loadingPacchetti ? (
                <div style={{ color: "#888" }}>Caricamento pacchetti...</div>
              ) : errorPacchetti ? (
                <div style={{ color: "red" }}>{errorPacchetti}</div>
              ) : pacchetti.length === 0 ? (
                <div style={{ color: "#a00" }}>
                  Nessun pacchetto attivo per questo cliente
                </div>
              ) : (
                <select
                  id="attivita-pacchetto"
                  name="pacchetto"
                  value={pacchettoId}
                  onChange={(e) => setPacchettoId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbe5fc",
                    borderRadius: 5,
                    background: "#f8fafd",
                  }}
                >
                  <option value="">Seleziona pacchetto</option>
                  {pacchetti.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.descrizione || p.nome}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </>
        )}
        {errorForm && (
          <div style={{ color: "red", marginBottom: 10 }}>{errorForm}</div>
        )}
        <div style={{ textAlign: "right" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loadingSubmit}
            style={{
              background: "#e0e3ea",
              color: "#252525",
              border: "none",
              padding: "7px 16px",
              borderRadius: 5,
              fontWeight: 500,
              fontSize: "0.96rem",
              marginRight: 9,
              cursor: "pointer",
            }}
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={loadingSubmit}
            style={{
              background: "#1976d2",
              color: "#fff",
              border: "none",
              padding: "7px 16px",
              borderRadius: 5,
              fontWeight: 500,
              fontSize: "0.96rem",
              cursor: "pointer",
              opacity: loadingSubmit ? 0.7 : 1
            }}
          >
            {loadingSubmit ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </form>
    </div>
  );
}