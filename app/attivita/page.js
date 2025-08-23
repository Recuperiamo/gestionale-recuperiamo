"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import AttivitaList from '../components/attivita/AttivitaList';
import AttivitaForm from '../components/attivita/AttivitaForm';
import AttivitaDettaglioModal from '../components/attivita/AttivitaDettaglioModal';

export default function AttivitaPage() {
  const [attivitaList, setAttivitaList] = useState([]);
    console.log("Attività passate ad AttivitaList:", attivitaList);

  const [clienti, setClienti] = useState([]);
  const [pacchetti, setPacchetti] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formInitialData, setFormInitialData] = useState(null);
  const [dettaglioAttivita, setDettaglioAttivita] = useState(null);

  // FILTRI
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroPacchetto, setFiltroPacchetto] = useState('');
  const [filtroDataDa, setFiltroDataDa] = useState('');
  const [filtroDataA, setFiltroDataA] = useState('');

  // Carica attività da API
  const fetchAttivita = () => {
    fetch('/api/attivita')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setAttivitaList(data))
      .catch(() => setAttivitaList([]));
  };

  // Carica clienti reali da API
  const fetchClienti = () => {
    fetch('/api/clienti')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setClienti(data))
      .catch(() => setClienti([]));
  };

  // Carica pacchetti reali da API
  const fetchPacchetti = () => {
    fetch('/api/pacchetti')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setPacchetti(data))
      .catch(() => setPacchetti([]));
  };

  useEffect(() => {
    fetchAttivita();
  }, []);

  useEffect(() => {
    fetchClienti();
  }, []);

  useEffect(() => {
    fetchPacchetti();
  }, []);

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
    (!filtroCliente || a.pacchetto?.clienteId === parseInt(filtroCliente)) &&
    (!filtroPacchetto || a.pacchettoId === parseInt(filtroPacchetto)) &&
    isInRange(a.createdAt, filtroDataDa, filtroDataA)
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
  // Chiudi form dopo submit/annulla + aggiorna lista da API
  const handleSuccess = () => {
    // Dopo operazione, ricarica dati veri da backend!
    fetchAttivita();
    fetchPacchetti();
    setShowForm(false);
    setFormInitialData(null);
  };

  // Mostra dettaglio attività
  const handleShowDettaglio = (attivita) => setDettaglioAttivita(attivita);
  // Chiudi modale dettaglio
  const handleCloseDettaglio = () => setDettaglioAttivita(null);
  // Elimina attività
  const handleDeleteDettaglio = async (attivita) => {
    if (window.confirm("Sei sicuro di voler eliminare questa attività?")) {
      // DELETE reale
      await fetch('/api/attivita', {
        method: 'DELETE',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: attivita.id })
      });
      fetchAttivita();
      fetchPacchetti();
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
              {clienti.map(c => (
                <option key={c.id} value={c.id}>{c.nome_referente || c.ragione_sociale || c.nome || c.email}</option>
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
              {pacchetti.map(p => (
                <option key={p.id} value={p.id}>{p.descrizione || p.nome}</option>
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