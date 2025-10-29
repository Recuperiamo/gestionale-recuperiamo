import React, { useEffect, useMemo, useState } from "react";
import { validateClientiForm } from "../../utils/clienti/validateClientiForm";
import { MATERIE_AULA } from "../../../lib/materie";

export default function ClientiForm({ onAdd, form, setForm, editId, setEditId, loading, setAlert, clienti = [] }) {
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    setErrors([]);
  }, [form, editId]);

  const referenti = useMemo(
    () => clienti.filter(c => c.tipo === 'REFERENTE'),
    [clienti]
  );

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'tipo' && value === 'REFERENTE'
        ? { referenteId: '', materie: [] }
        : {})
    }));
  };

  const handleMateriaToggle = (materia) => {
    setForm(prev => {
      const current = Array.isArray(prev.materie) ? prev.materie : [];
      const exists = current.includes(materia);
      const updated = exists ? current.filter(m => m !== materia) : [...current, materia];
      return { ...prev, materie: updated };
    });
  };

  const handleSubmit = e => {
    e.preventDefault();
    const validationErrors = validateClientiForm(form);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      // MOSTRA ALERT ROSSO CON IL PRIMO ERRORE (o tutti aggregati se preferisci)
      setAlert && setAlert({ type: "error", message: validationErrors.join(" ") });
      return;
    }
    setErrors([]);
    if (setAlert) setAlert({ type: "", message: "" }); // chiudi eventuale alert errore precedente
    onAdd(form);
    if (!editId) {
      setForm({
        nome: "",
        email: "",
        telefono: "",
        indirizzo: "",
        cf: "",
        piva: "",
        note: "",
        tipo: "REFERENTE",
        referenteId: "",
        materie: [],
        coloreTema: "",
        linkVideolezione: ""
      });
    }
  };

  const handleCancel = () => {
    setEditId(null);
    setForm({
      nome: "",
      email: "",
      telefono: "",
      indirizzo: "",
      cf: "",
      piva: "",
      note: "",
      tipo: "REFERENTE",
      referenteId: "",
      materie: [],
      coloreTema: "",
      linkVideolezione: ""
    });
    setErrors([]);
    if (setAlert) setAlert({ type: "", message: "" });
  };

  const nomeLabel = form.tipo === 'STUDENTE' ? 'Nome studente *' : 'Nome referente *';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto my-8">
      {errors.length > 0 && (
        <div style={{ color: "red" }}>
          <ul>
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <label className="block font-bold">Tipo*</label>
        <select
          name="tipo"
          value={form.tipo}
          onChange={handleChange}
          className="border px-2 py-1 rounded w-full"
          disabled={loading}
        >
          <option value="REFERENTE">Referente</option>
          <option value="STUDENTE">Studente</option>
        </select>
      </div>
      <div>
        <label className="block font-bold">{nomeLabel}</label>
        <input name="nome" value={form.nome} onChange={handleChange} required className="border px-2 py-1 rounded w-full" disabled={loading} />
      </div>
      {form.tipo === 'STUDENTE' && (
        <div>
          <label className="block font-bold">Referente (opzionale)</label>
          <select
            name="referenteId"
            value={form.referenteId}
            onChange={handleChange}
            className="border px-2 py-1 rounded w-full"
            disabled={loading}
          >
            <option value="">-- Nessun referente --</option>
            {referenti
              .filter(ref => !editId || String(ref.id) !== String(editId))
              .map(ref => (
                <option key={ref.id} value={ref.id}>
                  {ref.nomeReferente || ref.email || `ID ${ref.id}`}
                </option>
              ))}
          </select>
        </div>
      )}
      {form.tipo === 'STUDENTE' && (
        <div>
          <span className="block font-bold mb-1">Materie seguite *</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MATERIE_AULA.map((materia) => {
              const checked = Array.isArray(form.materie) && form.materie.includes(materia);
              return (
                <label key={materia} className="flex items-center gap-2 text-sm bg-blue-50 border border-blue-100 rounded px-3 py-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleMateriaToggle(materia)}
                    className="accent-blue-600"
                  />
                  <span>{materia}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
      {form.tipo === 'STUDENTE' && (
        <>
          <div>
            <label className="block font-bold">Colore tema aula</label>
            <div className="flex gap-3 items-center">
              <input 
                type="color" 
                name="coloreTema" 
                value={form.coloreTema || "#1cb0f6"} 
                onChange={handleChange} 
                className="h-10 w-20 rounded border cursor-pointer" 
                disabled={loading}
                title="Scegli il colore tema per l'aula dello studente"
              />
              <span className="text-sm text-gray-600">Colore usato nelle tabs e badge dell'aula</span>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {["#1cb0f6", "#e74c3c", "#2ecc71", "#f39c12", "#9b59b6", "#34495e"].map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, coloreTema: color }))}
                  className="w-8 h-8 rounded border-2 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color, borderColor: form.coloreTema === color ? "#000" : "#ddd" }}
                  title={color}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block font-bold">Link videolezione</label>
            <input 
              name="linkVideolezione" 
              type="url"
              value={form.linkVideolezione || ""} 
              onChange={handleChange} 
              placeholder="https://meet.google.com/..." 
              className="border px-2 py-1 rounded w-full" 
              disabled={loading}
            />
            <span className="text-xs text-gray-500">URL della videolezione (Google Meet, Zoom, ecc.)</span>
          </div>
        </>
      )}
      <div>
        <label className="block font-bold">Email *</label>
        <input name="email" value={form.email} onChange={handleChange} required className="border px-2 py-1 rounded w-full" disabled={loading} />
      </div>
      <div>
        <label className="block font-bold">Telefono</label>
        <input name="telefono" value={form.telefono} onChange={handleChange} className="border px-2 py-1 rounded w-full" disabled={loading} />
      </div>
      <div>
        <label className="block font-bold">Indirizzo</label>
        <input name="indirizzo" value={form.indirizzo} onChange={handleChange} className="border px-2 py-1 rounded w-full" disabled={loading} />
      </div>
      <div>
        <label className="block font-bold">Codice Fiscale</label>
        <input name="cf" value={form.cf} onChange={handleChange} className="border px-2 py-1 rounded w-full" disabled={loading} />
      </div>
      <div>
        <label className="block font-bold">Partita IVA</label>
        <input name="piva" value={form.piva} onChange={handleChange} className="border px-2 py-1 rounded w-full" disabled={loading} />
      </div>
      <div>
        <label className="block font-bold">Note</label>
        <textarea name="note" value={form.note} onChange={handleChange} className="border px-2 py-1 rounded w-full" disabled={loading} />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className={`bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-800 ${loading ? "opacity-50" : ""}`}
          disabled={loading}
        >
          {editId ? "Aggiorna Cliente" : "Salva Cliente"}
        </button>
        {editId && (
          <button
            type="button"
            className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-600"
            onClick={handleCancel}
            disabled={loading}
          >
            Annulla Modifica
          </button>
        )}
      </div>
    </form>
  );
}