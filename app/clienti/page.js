'use client';

import React, { useState, useEffect } from 'react';
import Alert from '@/components/Alert';
import ClientiForm from '@/components/clienti/ClientiForm';
import ClientiTable from '@/components/clienti/ClientiTable';
import ClienteDettaglioModal from '@/components/clienti/ClienteDettaglioModal';

console.log("DEBUG APP ENTRY POINT - clienti/page.js - 2025-08-17 12:00 UTC+2");

export default function ClientiPage() {
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefono: '',
    indirizzo: '',
    cf: '',
    piva: '',
    note: ''
  });
  const [alert, setAlert] = useState({ message: '', type: 'error' });
  const [loading, setLoading] = useState(false);
  const [clienti, setClienti] = useState([]);
  const [editId, setEditId] = useState(null);
  const [dettaglioCliente, setDettaglioCliente] = useState(null);

  // Carica lista clienti
  useEffect(() => {
    fetchClienti();
  }, []);

  const fetchClienti = async () => {
    try {
      const res = await fetch('/api/clienti');
      const data = await res.json();
      setClienti(Array.isArray(data) ? data : []);
    } catch (e) {
      setAlert({ message: 'Errore di rete', type: 'error' });
    }
  };

  // PATCH: mapping campi frontend → backend
  const mapFormToApi = (formData) => ({
    nomeReferente: formData.nome,
    email: formData.email,
    telefono: formData.telefono,
    indirizzo: formData.indirizzo,
    codiceFiscale: formData.cf,
    partitaIva: formData.piva,
    note: formData.note
  });

  const handleAdd = async (formData) => {
    setAlert({ message: '', type: 'error' });
    setLoading(true);
    try {
      const apiData = mapFormToApi(formData);
      const res = await fetch('/api/clienti', {
        method: 'POST',
        body: JSON.stringify(apiData),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        setAlert({ message: data.error || 'Errore inatteso', type: 'error' });
        setLoading(false);
        return;
      }
      setAlert({ message: 'Cliente creato con successo!', type: 'success' });
      fetchClienti();
    } catch (e) {
      setAlert({ message: 'Errore di rete', type: 'error' });
    }
    setLoading(false);
  };

  const handleEdit = (cliente) => {
    setForm({
      nome: cliente.nomeReferente || cliente.nome || "",
      email: cliente.email || '',
      telefono: cliente.telefono || '',
      indirizzo: cliente.indirizzo || '',
      cf: cliente.codiceFiscale || cliente.cf || '',
      piva: cliente.partitaIva || cliente.piva || '',
      note: cliente.note || '',
    });
    setEditId(cliente.id);
    setDettaglioCliente(null); // chiudi la modale se era aperta
    setAlert({ message: '', type: 'error' });
  };

  const handleUpdate = async (formData) => {
    setAlert({ message: '', type: 'error' });
    setLoading(true);
    try {
      const apiData = { ...mapFormToApi(formData), id: editId };
      const res = await fetch('/api/clienti', {
        method: 'PUT',
        body: JSON.stringify(apiData),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        setAlert({ message: data.error || 'Errore inatteso', type: 'error' });
        setLoading(false);
        return;
      }
      setAlert({ message: 'Cliente aggiornato con successo!', type: 'success' });
      setEditId(null);
      setForm({
        nome: '',
        email: '',
        telefono: '',
        indirizzo: '',
        cf: '',
        piva: '',
        note: ''
      });
      fetchClienti();
    } catch (e) {
      setAlert({ message: 'Errore di rete', type: 'error' });
    }
    setLoading(false);
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

  const handleFormSubmit = (data) => {
    if (editId) {
      handleUpdate(data);
    } else {
      handleAdd(data);
    }
  };

  // --- PATCH: chiudi dettagli se ri-clicchi Dettagli sullo stesso cliente ---
  const handleViewDetails = (cliente) => {
    if (dettaglioCliente && dettaglioCliente.id === cliente.id) {
      setDettaglioCliente(null); // se già aperto su questo cliente, chiudi
    } else {
      setDettaglioCliente(cliente);
    }
  };

  const handleCloseDetails = () => {
    setDettaglioCliente(null);
  };

  return (
    <>
      <Alert message={alert.message} type={alert.type} onClose={() => setAlert({ message: '', type: 'error' })} />
      <ClientiForm
        onAdd={handleFormSubmit}
        form={form}
        setForm={setForm}
        editId={editId}
        setEditId={setEditId}
        loading={loading}
        setAlert={setAlert}
      />
      <div className="max-w-3xl mx-auto my-8">
        <h2 className="text-xl font-bold mb-2">Lista Clienti</h2>
        <ClientiTable
          clienti={clienti}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
          dettaglioCliente={dettaglioCliente}
        />
      </div>
      {dettaglioCliente && (
        <ClienteDettaglioModal
          cliente={dettaglioCliente}
          onClose={handleCloseDetails}
        />
      )}
    </>
  );
}