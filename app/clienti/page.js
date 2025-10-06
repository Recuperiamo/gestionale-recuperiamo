'use client';

import React, { useState, useEffect } from "react";
import AuthGuard from '../components/AuthGuard';
import Navbar from '../components/Navbar';
import Alert from '../components/Alert';
import ClientiForm from '../components/clienti/ClientiForm';
import ClientiTable from '../components/clienti/ClientiTable';
import ClienteDettaglioModal from '../components/clienti/ClienteDettaglioModal';
import AdminOnly from '../components/auth/AdminOnly';

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

  const [showForm, setShowForm] = useState(false);
  const [showList, setShowList] = useState(false);

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
    setDettaglioCliente(null);
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
      setForm({ nome: '', email: '', telefono: '', indirizzo: '', cf: '', piva: '', note: '' });
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
    if (editId) handleUpdate(data);
    else handleAdd(data);
  };

  const handleViewDetails = (cliente) => {
    if (dettaglioCliente && dettaglioCliente.id === cliente.id) {
      setDettaglioCliente(null);
    } else {
      setDettaglioCliente(cliente);
    }
  };

  const handleCloseDetails = () => setDettaglioCliente(null);

  return (
    <AuthGuard>
      <AdminOnly redirectTo="/profilo">
        <Navbar />
        <Alert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert({ message: '', type: 'error' })}
        />

        <div className="max-w-3xl mx-auto mb-4 border-b border-gray-200">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left text-lg font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-t transition"
            aria-expanded={showForm}
            onClick={() => setShowForm(s => !s)}
          >
            <span>➕ Nuovo cliente</span>
            <span className="ml-2">{showForm ? "▲" : "▼"}</span>
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${showForm ? "max-h-[800px] py-4 px-4 bg-white" : "max-h-0"}`}>
            {showForm && (
              <ClientiForm
                onAdd={handleFormSubmit}
                form={form}
                setForm={setForm}
                editId={editId}
                setEditId={setEditId}
                loading={loading}
                setAlert={setAlert}
              />
            )}
          </div>
        </div>

        <div className="max-w-3xl mx-auto mb-4 border-b border-gray-200">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left text-lg font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-t transition"
            aria-expanded={showList}
            onClick={() => setShowList(s => !s)}
          >
            <span>📋 Lista clienti</span>
            <span className="ml-2">{showList ? "▲" : "▼"}</span>
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${showList ? "max-h-[2000px] py-4 px-2 bg-white" : "max-h-0"}`}>
            {showList && (
              <>
                <h2 className="text-xl font-bold mb-2">Lista Clienti</h2>
                <ClientiTable
                  clienti={clienti}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onViewDetails={handleViewDetails}
                  dettaglioCliente={dettaglioCliente}
                />
              </>
            )}
          </div>
        </div>

        {dettaglioCliente && (
          <ClienteDettaglioModal
            cliente={dettaglioCliente}
            onClose={handleCloseDetails}
          />
        )}
      </AdminOnly>
    </AuthGuard>
  );
}