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
  const [purgeLoading, setPurgeLoading] = useState(false);

  // FILTRI
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroPacchetto, setFiltroPacchetto] = useState('');
  const [filtroDataDa, setFiltroDataDa] = useState('');
  const [filtroDataA, setFiltroDataA] = useState('');

  const fetchAttivita = () => {
    fetch('/api/attivita')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setAttivitaList(data))
      .catch(() => setAttivitaList([]));
  };
  const fetchClienti = () => {
    fetch('/api/clienti')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setClienti(data))
      .catch(() => setClienti([]));
  };
  const fetchPacchetti = () => {
    fetch('/api/pacchetti')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setPacchetti(data))
      .catch(() => setPacchetti([]));
  };

  useEffect(() => { fetchAttivita(); }, []);
  useEffect(() => { fetchClienti(); }, []);
  useEffect(() => { fetchPacchetti(); }, []);

  function isInRange(data, da, a) {
    if (!data) return false;
    if (da && data < da) return false;
    if (a && data > a) return false;
    return true;
  }

  const attivitaFiltrate = attivitaList.filter(a => {
    return (
      (!filtroCliente || a.pacchetto?.clienteId === parseInt(filtroCliente)) &&
      (!filtroPacchetto || a.pacchettoId === parseInt(filtroPacchetto)) &&
      isInRange(a.createdAt, filtroDataDa, filtroDataA)
    );
  });

  const handleAdd = () => { setFormInitialData(null); setShowForm(true); };
  const handleEdit = (attivita) => { setFormInitialData(attivita); setShowForm(true); };
  const handleSuccess = () => {
    fetchAttivita();
    fetchPacchetti();
    setShowForm(false);
    setFormInitialData(null);
  };
  const handleShowDettaglio = (attivita) => setDettaglioAttivita(attivita);
  const handleCloseDettaglio = () => setDettaglioAttivita(null);
  const handleDeleteDettaglio = async (attivita) => {
    if (window.confirm("Sei sicuro di voler eliminare questa attività?")) {
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
    setFiltroCliente(''); setFiltroPacchetto(''); setFiltroDataDa(''); setFiltroDataA('');
  };

  const handlePurgeAll = async () => {
    if (purgeLoading) return;
    const ok1 = window.confirm(
      "ATTENZIONE: questa operazione eliminerà TUTTE le attività in modo permanente. Vuoi continuare?"
    );
    if (!ok1) return;

    const text = window.prompt('Seconda conferma: digita esattamente "ELIMINA TUTTO" per procedere.');
    if (text !== "ELIMINA TUTTO") {
      window.alert("Operazione annullata: testo di conferma non corrispondente.");
      return;
    }

    try {
      setPurgeLoading(true);
      const res = await fetch("/api/attivita/purge", {
        method: "DELETE",
        credentials: "include",
        headers: { "Accept": "application/json" },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Purge error status:", res.status, "body:", text);
        let message = "impossibile svuotare le attività.";
        try { const j = JSON.parse(text); if (j?.error) message = j.error; } catch {}
        window.alert(`Errore: ${message}`);
        return;
      }

      const data = await res.json();
      window.alert(`Operazione completata. Attività eliminate: ${data.deleted}.`);
      fetchAttivita();
      fetchPacchetti();
      handleResetFiltri();
    } catch (e) {
      console.error("Network error during purge:", e);
      window.alert("Errore di rete durante lo svuotamento delle attività.");
    } finally {
      setPurgeLoading(false);
    }
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
        <h1 style={{ fontSize: "2rem", marginBottom: 12, marginTop: 0, fontWeight: 600, letterSpacing: "-0.5px" }}>
          Gestione Attività
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <button
            onClick={handleAdd}
            style={{
              background: "#1976d2", color: "#fff", border: "none", borderRadius: 5,
              padding: "8px 18px", fontWeight: 500, fontSize: "1rem", cursor: "pointer",
              boxShadow: "0 1px 4px #1976d220"
            }}
          >
            + Nuova attività
          </button>

          <button
            onClick={handlePurgeAll}
            disabled={purgeLoading}
            title="Elimina tutte le attività (doppia conferma)"
            style={{
              background: purgeLoading ? "#ef9a9a" : "#c62828",
              color: "#fff", border: "none", borderRadius: 5, padding: "8px 18px",
              fontWeight: 600, fontSize: "0.98rem",
              cursor: purgeLoading ? "not-allowed" : "pointer",
              boxShadow: "0 1px 4px #c6282820",
              opacity: purgeLoading ? 0.8 : 1
            }}
          >
            {purgeLoading ? "Svuotamento..." : "Svuota tutte le attività"}
          </button>

          <span style={{ color: "#666", fontStyle: "italic", marginLeft: 6 }}>Elenco Attività</span>
        </div>

        {/* ... resto invariato (filtri, form, lista, modali) ... */}
        {/* FILTRI, FORMS, LIST E MODALI RESTANO COME NEL TUO FILE ATTUALE */}
        {/* Per brevità, ho mantenuto tutto il resto identico al tuo file allegato */}
        {/* Assicurati di sostituire l'intero file con questa versione aggiornata */}
        <div style={{ display: "flex", gap: 18, marginBottom: 20, flexWrap: "wrap" }}>
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
            <input type="date" value={filtroDataDa} onChange={e => setFiltroDataDa(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 5, border: "1px solid #cbe5fc", background: "#f8fafd" }} />
          </div>
          <div>
            <label style={{ fontWeight: 500, fontSize: "0.97rem" }}>Al</label><br />
            <input type="date" value={filtroDataA} onChange={e => setFiltroDataA(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 5, border: "1px solid #cbe5fc", background: "#f8fafd" }} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="button" onClick={handleResetFiltri}
              style={{ marginLeft: 8, padding: "6px 14px", background: "#e0e3ea", border: "none", borderRadius: 5, fontSize: "0.97rem", fontWeight: 500, cursor: "pointer" }}>
              Reset
            </button>
          </div>
        </div>

        {showForm && (
          <AttivitaForm
            initialData={formInitialData}
            onSuccess={handleSuccess}
            onClose={() => { setShowForm(false); setFormInitialData(null); }}
          />
        )}
        <AttivitaList attivita={attivitaFiltrate} onEdit={handleEdit} onDettaglio={handleShowDettaglio} />
        <AttivitaDettaglioModal attivita={dettaglioAttivita} onClose={handleCloseDettaglio} onEdit={handleEdit} onDelete={handleDeleteDettaglio} />
      </div>
    </>
  );
}