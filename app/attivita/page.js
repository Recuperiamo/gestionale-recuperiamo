"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import AttivitaList from '../components/attivita/AttivitaList';
import AttivitaForm from '../components/attivita/AttivitaForm';
import AttivitaDettaglioModal from '../components/attivita/AttivitaDettaglioModal';

export default function AttivitaPage() {
  const [attivitaList, setAttivitaList] = useState([]);
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  console.log("Attività passate ad AttivitaList:", attivitaList);

  const [clienti, setClienti] = useState([]);
  const [pacchetti, setPacchetti] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formInitialData, setFormInitialData] = useState(null);
  const [dettaglioAttivita, setDettaglioAttivita] = useState(null);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [batchEdit, setBatchEdit] = useState(false); // Nuovo stato per modifica batch selezione multipla

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

  const handleDeleteMultiple = async () => {
    if (!selectedIds.size) return window.alert("Seleziona almeno un'attività.");
    if (!window.confirm(`Eliminare ${selectedIds.size} attività selezionate?`)) return;
    let success = 0, failed = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch('/api/attivita', {
          method: 'DELETE',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id })
        });
        if (res.ok) success++; else failed++;
      } catch { failed++; }
    }
    window.alert(`Operazione completata.\nEliminate: ${success}\nFallite: ${failed}`);
    setSelectedIds(new Set());
    setMultiSelect(false);
    fetchAttivita();
    fetchPacchetti();
  };

  const handleBatchEdit = () => {
    if (!selectedIds.size) return window.alert("Seleziona almeno un'attività.");
    setBatchEdit(true);
  };

  const handleBatchEditSubmit = async (modifiche) => {
    if (!selectedIds.size) return;
    
    let success = 0, failed = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch('/api/attivita', {
          method: 'PATCH',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...modifiche })
        });
        if (res.ok) success++; else failed++;
      } catch { failed++; }
    }
    
    window.alert(`Modifica completata.\nAggiornate: ${success}\nFallite: ${failed}`);
    setSelectedIds(new Set());
    setMultiSelect(false);
    setBatchEdit(false);
    fetchAttivita();
    fetchPacchetti();
  };

  const toggleRow = (id, checked) => {
    setSelectedIds(prev => {
      const updated = new Set(prev);
      if (checked) updated.add(id);
      else updated.delete(id);
      return updated;
    });
  };

  const toggleAll = (checked) => {
    if (checked) setSelectedIds(new Set(attivitaFiltrate.map(a => a.id)));
    else setSelectedIds(new Set());
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
            onClick={() => setMultiSelect(prev => !prev)}
            style={{
              background: multiSelect ? "#1976d2" : "#e3eafc", color: multiSelect ? "#fff" : "#1976d2",
              border: "none", borderRadius: 5, padding: "8px 18px",
              fontWeight: 500, fontSize: "1rem", cursor: "pointer",
              boxShadow: multiSelect ? "0 1px 4px #1976d220" : "none"
            }}
          >
            {multiSelect ? "Selezione multipla: ON" : "Selezione multipla"}
          </button>

          {multiSelect && selectedIds.size > 0 && (
            <>
              <button
                onClick={handleBatchEdit}
                style={{
                  background: "#f59e0b", color: "#fff", border: "none", borderRadius: 5,
                  padding: "8px 18px", fontWeight: 600, fontSize: "1rem", cursor: "pointer",
                  boxShadow: "0 1px 4px rgba(245, 158, 11, 0.3)"
                }}
              >
                Modifica selezionate ({selectedIds.size})
              </button>
              <button
                onClick={handleDeleteMultiple}
                style={{
                  background: "#c62828", color: "#fff", border: "none", borderRadius: 5,
                  padding: "8px 18px", fontWeight: 600, fontSize: "1rem", cursor: "pointer",
                  boxShadow: "0 1px 4px #c6282820"
                }}
              >
                Elimina selezionate ({selectedIds.size})
              </button>
            </>
          )}

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
        <AttivitaList
          attivita={attivitaFiltrate}
          onEdit={handleEdit}
          onDettaglio={handleShowDettaglio}
          multiSelect={multiSelect}
          selectedIds={selectedIds}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
        />
        <AttivitaDettaglioModal attivita={dettaglioAttivita} onClose={handleCloseDettaglio} onEdit={handleEdit} onDelete={handleDeleteDettaglio} />
        
        {/* Modale modifica batch */}
        {batchEdit && <BatchEditModal 
          count={selectedIds.size}
          onClose={() => setBatchEdit(false)}
          onSubmit={handleBatchEditSubmit}
        />}
      </div>
    </>
  );
}

// Componente modale per modifica batch
function BatchEditModal({ count, onClose, onSubmit }) {
  const [descrizione, setDescrizione] = useState('');
  const [durataOre, setDurataOre] = useState('');
  const [data, setData] = useState('');
  const [ora, setOra] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const modifiche = {};
    if (descrizione.trim()) modifiche.descrizione = descrizione.trim();
    if (durataOre) {
      const val = Number(durataOre);
      if (val > 0) {
        modifiche.durataOre = val;
        modifiche.oreConsumate = val;
      }
    }
    if (data && ora) {
      const orarioISO = new Date(`${data}T${ora}:00`);
      if (!isNaN(orarioISO.getTime())) {
        modifiche.orario = orarioISO.toISOString();
        modifiche.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      }
    }

    if (Object.keys(modifiche).length === 0) {
      alert('Inserisci almeno un campo da modificare');
      return;
    }

    if (!confirm(`Applicare le modifiche a ${count} attività?`)) return;
    
    onSubmit(modifiche);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 2100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#fff',
        borderRadius: 12,
        padding: '28px 32px',
        maxWidth: 500,
        width: '90%',
        boxShadow: '0 12px 48px rgba(0,0,0,0.3)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1976d2', fontWeight: 600 }}>
          Modifica {count} attività selezionate
        </h3>
        <p style={{ margin: '0 0 24px 0', color: '#666', fontSize: 14 }}>
          Compila solo i campi che vuoi modificare. I campi vuoti non verranno modificati.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 500, fontSize: 14 }}>Descrizione</label>
          <input 
            type="text"
            value={descrizione}
            onChange={e => setDescrizione(e.target.value)}
            placeholder="Lascia vuoto per non modificare"
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbe5fc', borderRadius: 5, background: '#f8fafd', marginTop: 4 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 500, fontSize: 14 }}>Durata (ore)</label>
          <input 
            type="number"
            step="0.5"
            min="0"
            value={durataOre}
            onChange={e => setDurataOre(e.target.value)}
            placeholder="Lascia vuoto per non modificare"
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbe5fc', borderRadius: 5, background: '#f8fafd', marginTop: 4 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 500, fontSize: 14 }}>Data</label>
            <input 
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbe5fc', borderRadius: 5, background: '#f8fafd', marginTop: 4 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 500, fontSize: 14 }}>Ora</label>
            <input 
              type="time"
              value={ora}
              onChange={e => setOra(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbe5fc', borderRadius: 5, background: '#f8fafd', marginTop: 4 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              background: '#e0e3ea',
              color: '#252525',
              border: 'none',
              borderRadius: 7,
              padding: '10px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Annulla
          </button>
          <button
            type="submit"
            style={{
              flex: 1,
              background: '#f59e0b',
              color: '#fff',
              border: 'none',
              borderRadius: 7,
              padding: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)'
            }}
          >
            Applica modifiche
          </button>
        </div>
      </form>
    </div>
  );
}