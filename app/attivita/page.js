"use client";

import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import AttivitaList from '../components/attivita/AttivitaList';
import AttivitaForm from '../components/attivita/AttivitaForm';
import AttivitaDettaglioModal from '../components/attivita/AttivitaDettaglioModal';

const DUMMY_ATTIVITA = [
  {
    id: 1,
    descrizione: "Consulenza strategica",
    oreConsumate: 3,
    pacchetto: "Ore Consulenza 2025",
    pacchettoId: 1,
    cliente: "Alfa Srl",
    clienteId: 1,
    data: "2025-08-22"
  },
  {
    id: 2,
    descrizione: "Formazione personale",
    oreConsumate: 2,
    pacchetto: "Pacchetto Training",
    pacchettoId: 2,
    cliente: "Beta Spa",
    clienteId: 2,
    data: "2025-08-21"
  }
];

const PACCHETTI_DUMMY = [
  { id: 1, nome: "Ore Consulenza 2025" },
  { id: 2, nome: "Pacchetto Training" }
];
const CLIENTI_DUMMY = [
  { id: 1, nome: "Alfa Srl" },
  { id: 2, nome: "Beta Spa" }
];

export default function AttivitaPage() {
  const [attivitaList, setAttivitaList] = useState(DUMMY_ATTIVITA);
  const [showForm, setShowForm] = useState(false);
  const [formInitialData, setFormInitialData] = useState(null);
  const [dettaglioAttivita, setDettaglioAttivita] = useState(null);

  // FILTRI
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroPacchetto, setFiltroPacchetto] = useState('');
  const [filtroDataDa, setFiltroDataDa] = useState('');
  const [filtroDataA, setFiltroDataA] = useState('');

  // Funzione per filtrare per data in intervallo [da, a]
  function isInRange(data, da, a) {
    if (!data) return false;
    if (da && data < da) return false;
    if (a && data > a) return false;
    return true;
  }

  // Applica i filtri
  const attivitaFiltrate = attivitaList.filter(a => {
    return (
      (!filtroCliente || a.clienteId === parseInt(filtroCliente)) &&
      (!filtroPacchetto || a.pacchettoId === parseInt(filtroPacchetto)) &&
      isInRange(a.data, filtroDataDa, filtroDataA)
    );
  });

  // Apri form per nuova attività
  const handleAdd = () => {
    setFormInitialData(null);
    setShowForm(true);
  };
  // Apri form per modifica attività
  const handleEdit = (attivita) => {
    setFormInitialData(attivita);
    setShowForm(true);
  };
  // Chiudi form dopo submit/annulla + aggiorna lista
  const handleSuccess = (data) => {
    if (data && data.descrizione) {
      if (data.id) {
        // Modifica
        setAttivitaList(list => list.map(a => a.id === data.id ? { ...a, ...data } : a));
      } else {
        // Nuova
        setAttivitaList(list => [
          ...list,
          { ...data, id: Math.max(0, ...list.map(a => a.id)) + 1 }
        ]);
      }
    }
    setShowForm(false);
    setFormInitialData(null);
  };

  // Mostra dettaglio attività
  const handleShowDettaglio = (attivita) => setDettaglioAttivita(attivita);
  // Chiudi modale dettaglio
  const handleCloseDettaglio = () => setDettaglioAttivita(null);
  // Elimina attività
  const handleDeleteDettaglio = (attivita) => {
    if (window.confirm("Sei sicuro di voler eliminare questa attività?")) {
      setAttivitaList(list => list.filter(a => a.id !== attivita.id));
      setDettaglioAttivita(null);
    }
  };

  const handleResetFiltri = () => {
    setFiltroCliente('');
    setFiltroPacchetto('');
    setFiltroDataDa('');
    setFiltroDataA('');
  };

  return (
    <>
      <Navbar />
      <div style={{
        maxWidth: 1100,
        margin: "30px auto 0 auto",
        padding: "20px 24px 40px 24px",
        background: "#fff",
        borderRadius: 10,
        boxShadow: "0 2px 8px #0001",
        minHeight: 520
      }}>
        <h1 style={{
          fontSize: "2rem",
          marginBottom: 12,
          marginTop: 0,
          fontWeight: 600,
          letterSpacing: "-0.5px"
        }}>Gestione Attività</h1>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
          <button
            onClick={handleAdd}
            style={{
              background: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: 5,
              padding: "8px 18px",
              fontWeight: 500,
              fontSize: "1rem",
              cursor: "pointer",
              marginRight: 18,
              boxShadow: "0 1px 4px #1976d220"
            }}
          >
            + Nuova attività
          </button>
          <span style={{ color: "#666", fontStyle: "italic" }}>Elenco Attività</span>
        </div>

        {/* FILTRI */}
        <div style={{ display: "flex", gap: 18, marginBottom: 20 }}>
          <div>
            <label style={{ fontWeight: 500, fontSize: "0.97rem" }}>Cliente</label><br />
            <select
              value={filtroCliente}
              onChange={e => setFiltroCliente(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 5, border: "1px solid #cbe5fc", background: "#f8fafd" }}>
              <option value="">Tutti</option>
              {CLIENTI_DUMMY.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: 500, fontSize: "0.97rem" }}>Pacchetto</label><br />
            <select
              value={filtroPacchetto}
              onChange={e => setFiltroPacchetto(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 5, border: "1px solid #cbe5fc", background: "#f8fafd" }}>
              <option value="">Tutti</option>
              {PACCHETTI_DUMMY.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: 500, fontSize: "0.97rem" }}>Dal</label><br />
            <input
              type="date"
              value={filtroDataDa}
              onChange={e => setFiltroDataDa(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 5, border: "1px solid #cbe5fc", background: "#f8fafd" }}
            />
          </div>
          <div>
            <label style={{ fontWeight: 500, fontSize: "0.97rem" }}>Al</label><br />
            <input
              type="date"
              value={filtroDataA}
              onChange={e => setFiltroDataA(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 5, border: "1px solid #cbe5fc", background: "#f8fafd" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              type="button"
              onClick={handleResetFiltri}
              style={{
                marginLeft: 8,
                padding: "6px 14px",
                background: "#e0e3ea",
                border: "none",
                borderRadius: 5,
                fontSize: "0.97rem",
                fontWeight: 500,
                cursor: "pointer"
              }}
            >Reset</button>
          </div>
        </div>

        {showForm && (
          <AttivitaForm
            initialData={formInitialData}
            onSuccess={handleSuccess}
            onClose={() => { setShowForm(false); setFormInitialData(null); }}
          />
        )}
        <AttivitaList
          attivita={attivitaFiltrate}
          onEdit={handleEdit}
          onDettaglio={handleShowDettaglio}
        />
        <AttivitaDettaglioModal
          attivita={dettaglioAttivita}
          onClose={handleCloseDettaglio}
          onEdit={handleEdit}
          onDelete={handleDeleteDettaglio}
        />
      </div>
    </>
  );
}