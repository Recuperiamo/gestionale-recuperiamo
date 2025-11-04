"use client";
import React, { useEffect, useState } from "react";
import { getAblyChannel, getAblyChannelAsync } from "../../lib/realtime/ablyClient";

export default function LavagneList({ clienteId, onSelect, sessionUser }) {
  const [lavagne, setLavagne] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [attivitaList, setAttivitaList] = useState([]);
  const [selectedAttivita, setSelectedAttivita] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const isAdmin = sessionUser && /^(admin|operatore)$/i.test(sessionUser.role || "");

  useEffect(() => {
    if (!clienteId) return;
    setLoading(true);
    async function fetchLavagne() {
      try {
        const res = await fetch(`/api/lavagna/list?clienteId=${clienteId}`);
        const js = await res.json();
        setLavagne(Array.isArray(js.lavagne) ? js.lavagne : []);
      } catch (e) {
        setLavagne([]);
      } finally {
        setLoading(false);
      }
    }
    fetchLavagne();
  }, [clienteId]);

  useEffect(() => {
    if (!clienteId) return;
    let cleanupAbly = () => {};

    (async () => {
      try {
        const ch = await getAblyChannelAsync(`lavagna:list:${clienteId}`);
        if (ch) {
          if (process.env.NODE_ENV !== 'production') console.log('[LavagneList] Ably channel attached lavagna:list:' + clienteId);
          const onNew = ({ data }) => {
            if (process.env.NODE_ENV !== 'production') console.log('[LavagneList] received new-lavagna', data);
            const { lavagna } = data || {};
            if (!lavagna) return;
            setLavagne((prev) => prev.some((l) => l.id === lavagna.id) ? prev : [...prev, lavagna]);
          };
          const onDel = ({ data }) => {
            if (process.env.NODE_ENV !== 'production') console.log('[LavagneList] received delete-lavagna', data);
            const { lavagnaId } = data || {};
            if (!lavagnaId) return;
            setLavagne((prev) => prev.filter((l) => l.id !== lavagnaId));
          };
          const onDelAll = () => {
            if (process.env.NODE_ENV !== 'production') console.log('[LavagneList] received delete-all-lavagne');
            setLavagne([]);
          };

          ch.subscribe('new-lavagna', onNew);
          ch.subscribe('delete-lavagna', onDel);
          ch.subscribe('delete-all-lavagne', onDelAll);
          cleanupAbly = () => {
            try {
              ch.unsubscribe("new-lavagna", onNew);
              ch.unsubscribe("delete-lavagna", onDel);
              ch.unsubscribe("delete-all-lavagne", onDelAll);
              ch.detach?.();
            } catch {}
          };
        }
      } catch (err) {
        console.error('[LavagneList] Errore connessione Ably:', err);
      }
    })();

    return () => {
      try { cleanupAbly(); } catch {}
    };
  }, [clienteId]);

  async function handleDeleteLavagna(lavagnaId) {
    if (!window.confirm("Sei sicuro di voler eliminare questa lavagna? L'azione è irreversibile.")) return;
    try {
      const res = await fetch(`/api/lavagna?id=${lavagnaId}`, { method: "DELETE" });
      if (res.ok) {
        setLavagne((prev) => prev.filter((l) => l.id !== lavagnaId));
        const ch = getAblyChannel(`lavagna:list:${clienteId}`);
        if (ch) {
          if (process.env.NODE_ENV !== 'production') console.log('[LavagneList] publish delete-lavagna', { lavagnaId, clienteId });
          ch.publish("delete-lavagna", { lavagnaId, clienteId }, (err) => {
            if (err) console.error('[LavagneList] publish error delete-lavagna', err);
          });
        }
      }
    } catch (e) {
      alert("Errore nell'eliminazione lavagna.");
    }
  }

  async function handleDeleteAll() {
    if (!window.confirm("Sei sicuro di voler eliminare TUTTE le lavagne di questo cliente? L'azione è irreversibile.")) return;
    try {
      const res = await fetch(`/api/lavagna/bulk-delete?clienteId=${clienteId}`, { method: "DELETE" });
      if (res.ok) {
        setLavagne([]);
        const ch = getAblyChannel(`lavagna:list:${clienteId}`);
        if (ch) {
          if (process.env.NODE_ENV !== 'production') console.log('[LavagneList] publish delete-all-lavagne', { clienteId });
          ch.publish("delete-all-lavagne", { clienteId }, (err) => {
            if (err) console.error('[LavagneList] publish error delete-all-lavagne', err);
          });
        }
      }
    } catch (e) {
      alert("Errore nell'eliminazione di tutte le lavagne.");
    }
  }

  function handleSelect(lavagna) {
    console.log('[LavagneList] handleSelect chiamato con:', lavagna);
    console.log('[LavagneList] onSelect è una funzione?', typeof onSelect === "function");
    if (typeof onSelect === "function") {
      console.log('[LavagneList] Chiamando onSelect...');
      onSelect(lavagna);
    } else {
      console.error('[LavagneList] onSelect non è una funzione!', onSelect);
    }
  }

  // --- LOGICA CREAZIONE NUOVA LAVAGNA ---
  async function openCreateLavagna() {
    setShowCreate(true);
    setAttivitaList([]);
    setSelectedAttivita("");
    // Carica tutte le lezioni/attività disponibili per il cliente
    try {
      const res = await fetch(`/api/attivita/list?clienteId=${clienteId}`);
      const js = await res.json();
      setAttivitaList(js.attivita || []);
    } catch (e) {
      setAttivitaList([]);
    }
  }

  async function handleCreateLavagna(e) {
    e.preventDefault();
    
    // LATO CLIENTE: Invia richiesta invece di creare direttamente
    if (!isAdmin) {
      if (!clienteId) {
        alert("Errore: cliente non identificato.");
        return;
      }
      setCreating(true);
      try {
        const res = await fetch("/api/richieste-lavagna", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            clienteId: Number(clienteId), 
            titolo: newTitle || `Lavagna ${new Date().toLocaleString("it-IT")}`,
            noteStudente: "Richiesta dal cliente"
          })
        });
        if (res.ok) {
          alert("Richiesta inviata con successo! L'admin dovrà approvarla.");
          setShowCreate(false);
          setNewTitle("");
        } else {
          alert("Errore nell'invio della richiesta");
        }
      } catch (e) {
        alert("Errore nell'invio della richiesta");
      } finally {
        setCreating(false);
      }
      return;
    }
    
    // LATO ADMIN: Crea direttamente come prima
    if (!selectedAttivita && !clienteId) {
      alert("Seleziona uno studente o specifica un cliente.");
      return;
    }
    setCreating(true);
    try {
      // POST per creare lavagna
      let body = {};
      if (selectedAttivita === "ad-hoc" || !selectedAttivita) {
        // create ad-hoc lavagna/attivita for cliente
        body = { clienteId: Number(clienteId), titolo: newTitle || undefined };
      } else {
        body = { attivitaId: Number(selectedAttivita), titolo: newTitle || undefined };
      }
      const res = await fetch("/api/lavagna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const js = await res.json();
        setLavagne((prev) => prev.some(l => l.id === js.lavagna.id) ? prev : [...prev, js.lavagna]);
        // Notifica realtime
        const ch = getAblyChannel(`lavagna:list:${clienteId}`);
        if (ch) {
          if (process.env.NODE_ENV !== 'production') console.log('[LavagneList] publish new-lavagna', { lavagna: js.lavagna, clienteId });
          ch.publish("new-lavagna", { lavagna: js.lavagna, clienteId }, (err) => {
            if (err) console.error('[LavagneList] publish error new-lavagna', err);
          });
        }
        setShowCreate(false);
        setSelectedAttivita("");
        setNewTitle("");
        // Apri automaticamente la lavagna appena creata
        if (typeof onSelect === "function") {
          onSelect(js.lavagna);
        }
      } else {
        alert("Errore nella creazione lavagna");
      }
    } catch (e) {
      alert("Errore nella creazione lavagna");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h3 style={{ marginBottom: 12, display: "flex", alignItems: "center" }}>
      
        {isAdmin && lavagne.length > 0 && (
          <button
            onClick={handleDeleteAll}
            style={{
              marginLeft: 8, background: "#ff6464", color: "#fff", padding: "6px 14px",
              borderRadius: 8, border: 0, fontWeight: 700, cursor: "pointer"
            }}>
            Elimina tutte
          </button>
        )}
        {isAdmin && (
          <button
            onClick={openCreateLavagna}
            style={{
              marginLeft: 8, background: "#1cb0f6", color: "#fff", padding: "6px 14px",
              borderRadius: 8, border: 0, fontWeight: 700, cursor: "pointer"
            }}>
            Crea nuova lavagna
          </button>
        )}
        {!isAdmin && (
          <button
            onClick={openCreateLavagna}
            style={{
              marginLeft: 8, background: "#10B981", color: "#fff", padding: "6px 14px",
              borderRadius: 8, border: 0, fontWeight: 700, cursor: "pointer"
            }}>
            Richiedi lavagna
          </button>
        )}
      </h3>

      {showCreate && (
        <form onSubmit={handleCreateLavagna} style={{
          background: "#e3eefe", padding: 16, borderRadius: 12, marginBottom: 14
        }}>
          {isAdmin ? (
            <>
              <label style={{ display: 'block', marginBottom: 8 }}>
                Seleziona lezione/attività:
                <select
                  value={selectedAttivita}
                  onChange={e => setSelectedAttivita(e.target.value)}
                  style={{ marginLeft: 8, padding: 4, fontSize: 15 }}
                >
                  <option value="">-- scegli --</option>
                  {attivitaList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.descrizione || "Lezione"} ({a.id}) {a.orario ? `- ${new Date(a.orario).toLocaleString("it-IT")}` : ""}
                    </option>
                  ))}
                  <option value="ad-hoc">Crea nuova lezione ad-hoc per questo studente</option>
                </select>
              </label>

              <label style={{ display: 'block', marginBottom: 8 }}>
                Titolo lavagna (opzionale):
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Es. Spiegazione algebra"
                  style={{ marginLeft: 8, padding: 6, fontSize: 15, minWidth: 260 }}
                />
              </label>
              <button
                type="submit"
                disabled={!selectedAttivita || creating}
                style={{
                  marginLeft: 12, background: "#1cb0f6", color: "#fff", borderRadius: 8, border: 0,
                  fontWeight: 700, cursor: "pointer", padding: "6px 14px"
                }}>
                {creating ? "Creazione..." : "Crea"}
              </button>
            </>
          ) : (
            <>
              <label style={{ display: 'block', marginBottom: 8 }}>
                Titolo lavagna (opzionale):
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder={`Lavagna ${new Date().toLocaleString("it-IT")}`}
                  style={{ marginLeft: 8, padding: 6, fontSize: 15, minWidth: 260 }}
                />
              </label>
              <button
                type="submit"
                disabled={creating}
                style={{
                  marginLeft: 12, background: "#10B981", color: "#fff", borderRadius: 8, border: 0,
                  fontWeight: 700, cursor: "pointer", padding: "6px 14px"
                }}>
                {creating ? "Invio richiesta..." : "Invia richiesta"}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            style={{
              marginLeft: 8, background: "#ddd", color: "#222", borderRadius: 8, border: 0,
              fontWeight: 500, cursor: "pointer", padding: "6px 14px"
            }}>
            Annulla
          </button>
        </form>
      )}

      {loading && <div style={{ fontSize: 14, marginBottom: 8 }}>Caricamento lavagne…</div>}
      <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
        {lavagne.length === 0 && !loading && !isAdmin && (
          <li style={{
            background: "#e3eefe",
            border: "1px solid #4268b3",
            color: "#20489a",
            padding: "12px 16px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 8
          }}>
            Nessuna lavagna disponibile.
          </li>
        )}
        {lavagne.map((l) => (
          <li key={l.id} style={{
            marginBottom: 8,
            background: "#f8fbff",
            borderRadius: 8,
            border: "1px solid #dbe6f5",
            padding: "8px 14px",
            cursor: "pointer",
            fontWeight: 600,
            color: "#20489a",
            display: "flex", alignItems: "center",
            transition: "background 0.2s"
          }}>
            <span onClick={() => handleSelect(l)} tabIndex={0} style={{ flex: 1 }}>
              <span style={{ fontWeight: 700 }}>{l.titolo || "Lavagna"}</span>
              {l.createdAt && (
                <span style={{ fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
                  ({new Date(l.createdAt).toLocaleString("it-IT")})
                </span>
              )}
            </span>
            {isAdmin && (
              <button
                onClick={() => handleDeleteLavagna(l.id)}
                style={{
                  marginLeft: 8, background: "#ffbdbd", color: "#c00", border: 0,
                  borderRadius: 6, fontWeight: 700, cursor: "pointer", padding: "4px 10px"
                }}>
                Elimina
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}