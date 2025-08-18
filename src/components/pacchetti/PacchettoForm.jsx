import React, { useState, useEffect, useRef } from "react";

const defaultPacchetto = {
  nome: "",
  oreTotali: "",
  note: ""
};

const PacchettoForm = ({ clienteId, pacchetto, onClose, onSubmit }) => {
  const [form, setForm] = useState(defaultPacchetto);
  const [error, setError] = useState(null);
  const nomeRef = useRef();

  useEffect(() => {
    if (pacchetto) setForm({
      nome: pacchetto.descrizione || pacchetto.nome || "",
      oreTotali: pacchetto.oreAcquistate || pacchetto.oreTotali || "",
      note: pacchetto.note || ""
    });
    else setForm(defaultPacchetto);
  }, [pacchetto]);

  useEffect(() => {
    if (nomeRef.current) nomeRef.current.focus();
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const validate = () => {
    if (!form.nome.trim()) {
      setError("Il campo Nome è obbligatorio.");
      return false;
    }
    if (!form.oreTotali || isNaN(Number(form.oreTotali)) || Number(form.oreTotali) <= 0) {
      setError("Inserisci un numero di ore valido (>0).");
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      clienteId,
      descrizione: form.nome,
      oreAcquistate: Number(form.oreTotali),
      oreResidue: Number(form.oreTotali),
      dataAttivazione: new Date().toISOString(),
      stato: "attivo",
      note: form.note
    };
    const url = pacchetto?.id ? `/api/pacchetti/${pacchetto.id}` : "/api/pacchetti";
    const method = pacchetto?.id ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      setError(null);
      onSubmit && onSubmit();
    } else {
      const errorText = await res.text();
      setError(`Errore salvataggio pacchetto: ${errorText}`);
      console.error("API error:", errorText);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <form onSubmit={handleSubmit} className="pacchetto-form">
          <h4 style={{marginBottom: 12}}>{pacchetto ? "Modifica" : "Nuovo"} Pacchetto Ore</h4>
          <fieldset style={{border: 0, padding: 0, margin: 0, minWidth: 0}}>
            {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}
            <div className="form-group">
              <label htmlFor="nome">Nome*:</label>
              <input
                ref={nomeRef}
                name="nome"
                id="nome"
                value={form.nome}
                onChange={handleChange}
                required
                autoComplete="off"
                placeholder="Nome pacchetto"
              />
            </div>
            <div className="form-group">
              <label htmlFor="oreTotali">Numero di ore*:</label>
              <input
                name="oreTotali"
                id="oreTotali"
                value={form.oreTotali}
                onChange={handleChange}
                required
                type="number"
                min={1}
                step={1}
                placeholder="Ore totali"
              />
            </div>
            <div className="form-group">
              <label htmlFor="note">Note:</label>
              <textarea
                name="note"
                id="note"
                value={form.note}
                onChange={handleChange}
                placeholder="Note opzionali"
                rows={2}
              />
            </div>
          </fieldset>
          <div style={{marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end"}}>
            <button type="submit" style={{ background: "#1976d2", color: "#fff", border: 0, padding: "8px 16px", borderRadius: 4, cursor: "pointer" }}>
              {pacchetto ? "Salva modifiche" : "Crea pacchetto"}
            </button>
            <button type="button" onClick={onClose} style={{ background: "#eee", color: "#333", border: 0, padding: "8px 16px", borderRadius: 4, cursor: "pointer" }}>
              Annulla
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .modal-overlay {
          position: fixed; left: 0; top: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.35); z-index: 1000;
          display: flex; align-items: center; justify-content: center;
        }
        .modal-content {
          background: #fff; padding: 28px 24px 18px 24px; border-radius: 10px; min-width: 320px; max-width: 95vw;
          box-shadow: 0 2px 16px rgba(0,0,0,0.18);
        }
        .pacchetto-form .form-group {
          margin-bottom: 12px;
          display: flex; flex-direction: column;
        }
        .pacchetto-form label {
          font-weight: 500; margin-bottom: 4px;
        }
        .pacchetto-form input, .pacchetto-form textarea {
          padding: 6px 8px; border-radius: 4px; border: 1px solid #bbb; font-size: 1rem;
        }
        .pacchetto-form input:focus, .pacchetto-form textarea:focus {
          outline: 2px solid #1976d2;
        }
      `}</style>
    </div>
  );
};

export default PacchettoForm;