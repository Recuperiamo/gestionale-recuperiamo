import React, { useEffect, useState } from "react";
import { validateClientiForm } from "../../utils/clienti/validateClientiForm";
export default function ClientiForm({ onAdd, form, setForm, editId, setEditId, loading }) {
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    setErrors([]);
  }, [form, editId]);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = e => {
    e.preventDefault();
    const validationErrors = validateClientiForm(form);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);
    onAdd(form);
    if (!editId) {
      setForm({
        nome: "",
        email: "",
        telefono: "",
        indirizzo: "",
        cf: "",
        piva: "",
        note: ""
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
      note: ""
    });
    setErrors([]);
  };

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
        <label className="block font-bold">Nome referente *</label>
        <input name="nome" value={form.nome} onChange={handleChange} required className="border px-2 py-1 rounded w-full" disabled={loading} />
      </div>
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