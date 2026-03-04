// @ts-nocheck
"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import ApprovaRichiestaModal from "../admin/modifiche/ApprovaRichiestaModal";

export default function RichiestePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [richiesteModifica, setRichiesteModifica] = useState([]);
  const [richiesteLavagna, setRichiesteLavagna] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("modifiche"); // "modifiche" | "lavagne"
  const [selectedRichiesta, setSelectedRichiesta] = useState(null);
  const [showModalModifica, setShowModalModifica] = useState(false);

  const isAdmin = ["admin", "operatore"].includes(session?.user?.role);
  const isCliente = session?.user?.role === "cliente";

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/signin");
      return;
    }
    loadRichieste();
  }, [status, session, router]);

  async function loadRichieste() {
    setLoading(true);
    try {
      // Carica richieste modifica
      const resModifica = await fetch("/api/modifiche");
      const dataModifica = await resModifica.json();
      let richiesteModificaData = Array.isArray(dataModifica.richieste) ? dataModifica.richieste : [];
      
      // Filtra per cliente se non admin
      if (isCliente && session?.user?.clienteId) {
        richiesteModificaData = richiesteModificaData.filter(r => 
          r.attivita?.clienteId === session.user.clienteId
        );
      }
      
      setRichiesteModifica(richiesteModificaData);

      // Carica richieste lavagna
      const resLavagna = await fetch("/api/richieste-lavagna");
      const dataLavagna = await resLavagna.json();
      let richiesteLavagnaData = Array.isArray(dataLavagna.richieste) ? dataLavagna.richieste : [];
      
      // Filtra per cliente se non admin
      if (isCliente && session?.user?.clienteId) {
        richiesteLavagnaData = richiesteLavagnaData.filter(r => 
          r.clienteId === session.user.clienteId
        );
      }
      
      setRichiesteLavagna(richiesteLavagnaData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprovaLavagna(id, noteAdmin = "") {
    try {
      const res = await fetch("/api/richieste-lavagna", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, azione: "approva", noteAdmin }),
      });
      if (res.ok) {
        alert("Lavagna creata con successo!");
        loadRichieste();
      } else {
        alert("Errore nell'approvazione");
      }
    } catch (e) {
      alert("Errore nell'approvazione");
    }
  }

  async function handleRifiutaLavagna(id, noteAdmin = "") {
    try {
      const res = await fetch("/api/richieste-lavagna", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, azione: "rifiuta", noteAdmin }),
      });
      if (res.ok) {
        alert("Richiesta rifiutata");
        loadRichieste();
      } else {
        alert("Errore nel rifiuto");
      }
    } catch (e) {
      alert("Errore nel rifiuto");
    }
  }

  async function handleEliminaLavagna(id) {
    if (!window.confirm("Sei sicuro di voler eliminare questa richiesta dallo storico?")) {
      return;
    }
    try {
      const res = await fetch(`/api/richieste-lavagna?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadRichieste();
      } else {
        alert("Errore nell'eliminazione");
      }
    } catch (e) {
      alert("Errore nell'eliminazione");
    }
  }

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f8ff" }}>
        <Navbar />
        <div style={{ padding: 50, textAlign: "center" }}>Caricamento…</div>
      </div>
    );
  }

  const richiesteModificaPending = richiesteModifica.filter(r => ["pending", "in_review"].includes(r.stato));
  const richiesteLavagnaPending = richiesteLavagna.filter(r => ["pending", "in_review"].includes(r.stato));

  return (
    <div style={{ minHeight: "100vh", background: "#f5f8ff" }}>
      <Navbar />
      <main style={mainStyle}>
        <h1 style={titleStyle}>Gestione Richieste</h1>

        <div style={tabContainerStyle}>
          <button
            onClick={() => setTab("modifiche")}
            style={{
              ...tabStyle,
              background: tab === "modifiche" ? "#3B82F6" : "#E5E7EB",
              color: tab === "modifiche" ? "#fff" : "#374151",
            }}
          >
            Richieste Modifica ({richiesteModificaPending.length})
          </button>
          <button
            onClick={() => setTab("lavagne")}
            style={{
              ...tabStyle,
              background: tab === "lavagne" ? "#10B981" : "#E5E7EB",
              color: tab === "lavagne" ? "#fff" : "#374151",
            }}
          >
            Richieste Lavagna ({richiesteLavagnaPending.length})
          </button>
        </div>

        {tab === "modifiche" && (
          <div>
            <h2 style={sectionTitleStyle}>Richieste di Modifica Attività</h2>
            {richiesteModificaPending.length === 0 ? (
              <div style={emptyStyle}>Nessuna richiesta di modifica in sospeso</div>
            ) : (
              <div style={gridStyle}>
                {richiesteModificaPending.map(r => (
                  <RichiestaModificaCard
                    key={r.id}
                    richiesta={r}
                    onGestisci={isAdmin ? () => {
                      setSelectedRichiesta(r);
                      setShowModalModifica(true);
                    } : undefined}
                    readonly={!isAdmin}
                  />
                ))}
              </div>
            )}

            <h3 style={{ ...sectionTitleStyle, marginTop: 40, fontSize: 20 }}>
              Storico Richieste Modifica
            </h3>
            <div style={gridStyle}>
              {richiesteModifica
                .filter(r => !["pending", "in_review"].includes(r.stato))
                .slice(0, 10)
                .map(r => (
                  <RichiestaModificaCard
                    key={r.id}
                    richiesta={r}
                    readonly
                  />
                ))}
            </div>
          </div>
        )}

        {tab === "lavagne" && (
          <div>
            <h2 style={sectionTitleStyle}>Richieste di Nuova Lavagna</h2>
            {richiesteLavagnaPending.length === 0 ? (
              <div style={emptyStyle}>Nessuna richiesta di lavagna in sospeso</div>
            ) : (
              <div style={gridStyle}>
                {richiesteLavagnaPending.map(r => (
                  <RichiestaLavagnaCard
                    key={r.id}
                    richiesta={r}
                    onApprova={isAdmin ? () => handleApprovaLavagna(r.id) : undefined}
                    onRifiuta={isAdmin ? () => {
                      const note = prompt("Motivo rifiuto (opzionale):");
                      if (note !== null) handleRifiutaLavagna(r.id, note);
                    } : undefined}
                    readonly={!isAdmin}
                  />
                ))}
              </div>
            )}

            <h3 style={{ ...sectionTitleStyle, marginTop: 40, fontSize: 20 }}>
              Storico Richieste Lavagna
            </h3>
            <div style={gridStyle}>
              {richiesteLavagna
                .filter(r => !["pending", "in_review"].includes(r.stato))
                .slice(0, 10)
                .map(r => (
                  <RichiestaLavagnaCard
                    key={r.id}
                    richiesta={r}
                    readonly
                    onElimina={() => handleEliminaLavagna(r.id)}
                  />
                ))}
            </div>
          </div>
        )}
      </main>

      {showModalModifica && selectedRichiesta && (
        <ApprovaRichiestaModal
          richiesta={selectedRichiesta}
          onClose={() => {
            setShowModalModifica(false);
            setSelectedRichiesta(null);
          }}
          onApproved={() => {
            setShowModalModifica(false);
            setSelectedRichiesta(null);
            loadRichieste();
          }}
          onRejected={() => {
            setShowModalModifica(false);
            setSelectedRichiesta(null);
            loadRichieste();
          }}
        />
      )}
    </div>
  );
}

function RichiestaModificaCard({ richiesta, onGestisci, readonly }) {
  const statoColors = {
    pending: { bg: "#FEF3C7", border: "#F59E0B", text: "#92400E" },
    in_review: { bg: "#DBEAFE", border: "#3B82F6", text: "#1E40AF" },
    approved: { bg: "#D1FAE5", border: "#10B981", text: "#065F46" },
    rejected: { bg: "#FEE2E2", border: "#EF4444", text: "#991B1B" },
    archived: { bg: "#F3F4F6", border: "#9CA3AF", text: "#374151" },
  };

  const colors = statoColors[richiesta.stato] || statoColors.pending;

  return (
    <div style={{
      ...cardStyle,
      borderLeft: `4px solid ${colors.border}`,
    }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{
            ...badgeStyle,
            background: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
          }}>
            {richiesta.stato}
          </span>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {new Date(richiesta.createdAt).toLocaleString("it-IT")}
          </span>
        </div>
      </div>

      <div style={infoRowStyle}>
        <strong>Tipo:</strong> {richiesta.tipo}
      </div>
      <div style={infoRowStyle}>
        <strong>Attività ID:</strong> {richiesta.attivitaId}
      </div>
      <div style={infoRowStyle}>
        <strong>Cliente ID:</strong> {richiesta.clienteId}
      </div>
      {richiesta.nuovaData && (
        <div style={infoRowStyle}>
          <strong>Nuova Data:</strong> {new Date(richiesta.nuovaData).toLocaleDateString("it-IT")}
        </div>
      )}
      {richiesta.nuovoOrario && (
        <div style={infoRowStyle}>
          <strong>Nuovo Orario:</strong> {new Date(richiesta.nuovoOrario).toLocaleString("it-IT")}
        </div>
      )}
      {richiesta.noteStudente && (
        <div style={{ ...infoRowStyle, marginTop: 8 }}>
          <strong>Note studente:</strong>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            {richiesta.noteStudente}
          </div>
        </div>
      )}
      {richiesta.noteAdmin && (
        <div style={{ ...infoRowStyle, marginTop: 8 }}>
          <strong>Note admin:</strong>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            {richiesta.noteAdmin}
          </div>
        </div>
      )}

      {!readonly && onGestisci && (
        <button onClick={onGestisci} style={btnPrimaryStyle}>
          Gestisci richiesta
        </button>
      )}
    </div>
  );
}

function RichiestaLavagnaCard({ richiesta, onApprova, onRifiuta, onElimina, readonly }) {
  const statoColors = {
    pending: { bg: "#FEF3C7", border: "#F59E0B", text: "#92400E" },
    in_review: { bg: "#DBEAFE", border: "#3B82F6", text: "#1E40AF" },
    approved: { bg: "#D1FAE5", border: "#10B981", text: "#065F46" },
    rejected: { bg: "#FEE2E2", border: "#EF4444", text: "#991B1B" },
  };

  const colors = statoColors[richiesta.stato] || statoColors.pending;

  return (
    <div style={{
      ...cardStyle,
      borderLeft: `4px solid ${colors.border}`,
    }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{
            ...badgeStyle,
            background: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
          }}>
            {richiesta.stato}
          </span>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {new Date(richiesta.createdAt).toLocaleString("it-IT")}
          </span>
        </div>
      </div>

      <div style={infoRowStyle}>
        <strong>Titolo:</strong> {richiesta.titolo || "Lavagna senza titolo"}
      </div>
      <div style={infoRowStyle}>
        <strong>Cliente ID:</strong> {richiesta.clienteId}
      </div>
      {richiesta.noteStudente && (
        <div style={{ ...infoRowStyle, marginTop: 8 }}>
          <strong>Note studente:</strong>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            {richiesta.noteStudente}
          </div>
        </div>
      )}
      {richiesta.noteAdmin && (
        <div style={{ ...infoRowStyle, marginTop: 8 }}>
          <strong>Note admin:</strong>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            {richiesta.noteAdmin}
          </div>
        </div>
      )}
      {richiesta.lavagnaId && (
        <div style={{ ...infoRowStyle, marginTop: 8 }}>
          <strong>Lavagna creata ID:</strong> {richiesta.lavagnaId}
        </div>
      )}

      {!readonly && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={onApprova} style={btnSuccessStyle}>
            ✅ Approva
          </button>
          <button onClick={onRifiuta} style={btnDangerStyle}>
            ❌ Rifiuta
          </button>
        </div>
      )}
      
      {readonly && onElimina && (
        <div style={{ marginTop: 12 }}>
          <button onClick={onElimina} style={btnDeleteStyle}>
            🗑️ Elimina dallo storico
          </button>
        </div>
      )}
    </div>
  );
}

const mainStyle = {
  maxWidth: 1400,
  margin: "60px auto 40px auto",
  padding: "40px 42px 48px",
  background: "#fff",
  borderRadius: 28,
  boxShadow: "0 6px 34px rgba(32,72,154,0.15)",
  fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
};

const titleStyle = {
  fontSize: 32,
  fontWeight: 800,
  textAlign: "center",
  color: "#20489a",
  marginBottom: 32,
};

const tabContainerStyle = {
  display: "flex",
  gap: 12,
  marginBottom: 32,
  justifyContent: "center",
};

const tabStyle = {
  padding: "12px 28px",
  borderRadius: 12,
  border: "none",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.3s",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};

const sectionTitleStyle = {
  fontSize: 24,
  fontWeight: 700,
  color: "#20489a",
  marginBottom: 20,
};

const emptyStyle = {
  textAlign: "center",
  padding: 40,
  color: "#94a3b8",
  fontSize: 16,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
  gap: 20,
  marginBottom: 20,
};

const cardStyle = {
  background: "#fff",
  borderRadius: 12,
  padding: 20,
  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
};

const badgeStyle = {
  padding: "4px 12px",
  borderRadius: 16,
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
};

const infoRowStyle = {
  marginBottom: 8,
  fontSize: 14,
  color: "#374151",
};

const btnPrimaryStyle = {
  marginTop: 16,
  padding: "10px 20px",
  background: "#3B82F6",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  width: "100%",
};

const btnSuccessStyle = {
  flex: 1,
  padding: "10px 16px",
  background: "#10B981",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const btnDangerStyle = {
  flex: 1,
  padding: "10px 16px",
  background: "#EF4444",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const btnDeleteStyle = {
  padding: "8px 16px",
  background: "#6B7280",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  width: "100%",
};
