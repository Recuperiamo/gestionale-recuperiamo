'use client';

import React, { useState, useEffect } from 'react';
import Alert from '@/components/Alert';

export default function ClientiPage() {
  const [form, setForm] = useState({
    nomeReferente: '',
    email: '',
    telefono: '',
    indirizzo: '',
    codiceFiscale: '',
    partitaIva: '',
    note: '',
  });
  const [alert, setAlert] = useState({ message: '', type: 'error' });
  const [loading, setLoading] = useState(false);
  const [clienti, setClienti] = useState([]);
  const [editId, setEditId] = useState(null);

  // Carica lista clienti
  useEffect(() => {
    fetchClienti();
  }, []);

  const fetchClienti = async () => {
    const res = await fetch('/api/clienti');
    const data = await res.json();
    setClienti(Array.isArray(data) ? data : []);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ message: '', type: 'error' });
    setLoading(true);
    try {
      const res = await fetch('/api/clienti', {
        method: editId ? 'PUT' : 'POST',
        body: JSON.stringify(editId ? { ...form, id: editId } : form),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        setAlert({ message: data.error || 'Errore inatteso', type: 'error' });
        setLoading(false);
        return;
      }
      setAlert({ message: editId ? 'Cliente aggiornato con successo!' : 'Cliente creato con successo!', type: 'success' });
      setForm({
        nomeReferente: '',
        email: '',
        telefono: '',
        indirizzo: '',
        codiceFiscale: '',
        partitaIva: '',
        note: '',
      });
      setEditId(null);
      fetchClienti();
    } catch (e) {
      setAlert({ message: 'Errore di rete o server', type: 'error' });
    }
    setLoading(false);
  };

  const handleEdit = (cliente) => {
    setForm({
      nomeReferente: cliente.nomeReferente || '',
      email: cliente.email || '',
      telefono: cliente.telefono || '',
      indirizzo: cliente.indirizzo || '',
      codiceFiscale: cliente.codiceFiscale || '',
      partitaIva: cliente.partitaIva || '',
      note: cliente.note || '',
    });
    setEditId(cliente.id);
    setAlert({ message: '', type: 'error' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo cliente?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/clienti', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        setAlert({ message: data.error || 'Errore eliminazione', type: 'error' });
        setLoading(false);
        return;
      }
      setAlert({ message: 'Cliente eliminato con successo!', type: 'success' });
      fetchClienti();
    } catch (e) {
      setAlert({ message: 'Errore di rete o server', type: 'error' });
    }
    setLoading(false);
  };

  return (
    <>
      <Alert message={alert.message} type={alert.type} onClose={() => setAlert({ message: '', type: 'error' })} />

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto my-8">
        <div>
          <label className="block font-bold">Nome referente *</label>
          <input
            name="nomeReferente"
            value={form.nomeReferente}
            onChange={handleChange}
            required
            className="border px-2 py-1 rounded w-full"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block font-bold">Email *</label>
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className="border px-2 py-1 rounded w-full"
            disabled={loading}
          />
        </div>
        {/* Campi opzionali */}
        <div>
          <label className="block font-bold">Telefono</label>
          <input
            name="telefono"
            value={form.telefono}
            onChange={handleChange}
            className="border px-2 py-1 rounded w-full"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block font-bold">Indirizzo</label>
          <input
            name="indirizzo"
            value={form.indirizzo}
            onChange={handleChange}
            className="border px-2 py-1 rounded w-full"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block font-bold">Codice Fiscale</label>
          <input
            name="codiceFiscale"
            value={form.codiceFiscale}
            onChange={handleChange}
            className="border px-2 py-1 rounded w-full"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block font-bold">Partita IVA</label>
          <input
            name="partitaIva"
            value={form.partitaIva}
            onChange={handleChange}
            className="border px-2 py-1 rounded w-full"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block font-bold">Note</label>
          <textarea
            name="note"
            value={form.note}
            onChange={handleChange}
            className="border px-2 py-1 rounded w-full"
            disabled={loading}
          />
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
              onClick={() => { setEditId(null); setForm({ nomeReferente: '', email: '', telefono: '', indirizzo: '', codiceFiscale: '', partitaIva: '', note: '' }); }}
              disabled={loading}
            >
              Annulla Modifica
            </button>
          )}
        </div>
      </form>

      <div className="max-w-3xl mx-auto my-8">
        <h2 className="text-xl font-bold mb-2">Lista Clienti</h2>
        <table className="w-full border">
          <thead>
            <tr>
              <th className="border px-2 py-1">ID</th>
              <th className="border px-2 py-1">Nome</th>
              <th className="border px-2 py-1">Email</th>
              <th className="border px-2 py-1">CF</th>
              <th className="border px-2 py-1">PIVA</th>
              <th className="border px-2 py-1">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {clienti.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-4">Nessun cliente presente.</td>
              </tr>
            )}
            {clienti.map(cliente => (
              <tr key={cliente.id}>
                <td className="border px-2 py-1">{cliente.id}</td>
                <td className="border px-2 py-1">{cliente.nomeReferente}</td>
                <td className="border px-2 py-1">{cliente.email}</td>
                <td className="border px-2 py-1">{cliente.codiceFiscale}</td>
                <td className="border px-2 py-1">{cliente.partitaIva}</td>
                <td className="border px-2 py-1 flex gap-2">
                  <button
                    className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-700"
                    onClick={() => handleEdit(cliente)}
                    disabled={loading}
                  >
                    Modifica
                  </button>
                  <button
                    className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-800"
                    onClick={() => handleDelete(cliente.id)}
                    disabled={loading}
                  >
                    Elimina
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}