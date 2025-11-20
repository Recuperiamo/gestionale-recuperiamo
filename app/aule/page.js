'use client';

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "../components/AuthGuard";
import AdminOnly from "../components/auth/AdminOnly";
import Navbar from "../components/Navbar";
import CalendarioAttivita from "../components/calendario/CalendarioAttivita";


export default function AulePage() {
    // Stato per studente selezionato
    const [selectedStudente, setSelectedStudente] = useState(null);
  const [referenti, setReferenti] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        // Fetch referenti with their studenti
        const refRes = await fetch("/api/clienti?tipo=REFERENTE&includeStudenti=1");
        if (!refRes.ok) throw new Error("Errore caricamento referenti");
        const refData = await refRes.json();

        // Also fetch students so we can include orphan students (no referente)
        const studRes = await fetch("/api/clienti?tipo=STUDENTE");
        const studData = studRes.ok ? await studRes.json() : [];

        // Normalize arrays
        const referentiArr = Array.isArray(refData) ? refData : [];
        const studentiArr = Array.isArray(studData) ? studData : [];

        // Map referenti by id for quick lookup
        const refMap = new Map(referentiArr.map(r => [String(r.id), { ...r, studenti: Array.isArray(r.studenti) ? r.studenti.slice() : [] }]));

        const orphanStudents = [];
        for (const stud of studentiArr) {
          const rid = stud.referenteId ? String(stud.referenteId) : null;
          if (rid && refMap.has(rid)) {
            const entry = refMap.get(rid);
            // avoid duplicates
            if (!entry.studenti.some(s => String(s.id) === String(stud.id))) entry.studenti.push(stud);
          } else if (rid) {
            // Referente record not returned in referentiArr, create a minimal placeholder
            const placeholder = { id: Number(rid), nomeReferente: "Referente non registrato", email: "", studenti: [stud] };
            refMap.set(String(rid), placeholder);
          } else {
            orphanStudents.push(stud);
          }
        }

        // Compose final list: existing referenti plus a synthetic "Studenti" group if needed
        const finalReferenti = Array.from(refMap.values());
        if (orphanStudents.length > 0) {
          finalReferenti.push({ id: "_orphan", nomeReferente: "Studenti", email: "", studenti: orphanStudents });
        }

        if (isMounted) setReferenti(finalReferenti);
      } catch (e) {
        if (isMounted) {
          setError(e.message || "Errore di rete");
          setReferenti([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredReferenti = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return referenti;
    return referenti.filter(ref => {
      const refName = `${ref.nomeReferente || ""} ${ref.email || ""}`.toLowerCase();
      if (refName.includes(query)) return true;
      if (Array.isArray(ref.studenti)) {
        return ref.studenti.some(stud =>
          `${stud.nomeReferente || ""} ${stud.email || ""}`.toLowerCase().includes(query)
        );
      }
      return false;
    });
  }, [referenti, search]);

  const totalStudenti = useMemo(() => {
    return referenti.reduce((acc, ref) => acc + (Array.isArray(ref.studenti) ? ref.studenti.length : 0), 0);
  }, [referenti]);

  return (
    <AuthGuard>
      <AdminOnly redirectTo="/profilo">
        <Navbar />
        <main style={mainStyle}>
          {/* Minicalendario per studente selezionato */}
          {selectedStudente && (
            <section style={{ margin: "32px 0 24px", background: "#fff", borderRadius: "18px", boxShadow: "0 4px 18px rgba(32,72,154,0.10)", padding: "18px 18px 8px 18px", maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: 10, color: "#20489a" }}>
                Calendario studente: {selectedStudente.nomeReferente || selectedStudente.email || `Studente #${selectedStudente.id}`}
              </h2>
              <CalendarioAttivita
                externalMode="month"
                allowModeSwitch={false}
                allowNavigation={true}
                showLegend={true}
                enableStudentRequests={false}
                forceClienteId={selectedStudente.id}
                // Mostra solo le attività di questo studente
              />
            </section>
          )}
          <header style={headerBox}>
            <div>
              <h1 style={title}>Aule studenti</h1>
              <p style={subtitle}>Seleziona lo studente per aprire lo spazio Aula e gestire i materiali condivisi.</p>
            </div>
            <div style={statsBox}>
              <span style={statsNumber}>{totalStudenti}</span>
              <span style={statsLabel}>Studenti attivi</span>
            </div>
          </header>

          {/* Calendario delle attività */}
          <section style={{ margin: "40px 0 32px", background: "#fff", borderRadius: "18px", boxShadow: "0 4px 18px rgba(32,72,154,0.10)", padding: "24px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: 18, color: "#20489a" }}>Calendario attività</h2>
            <CalendarioAttivita
              externalMode="month"
              allowModeSwitch={false}
              allowNavigation={true}
              showLegend={true}
              enableStudentRequests={false}
              // forceClienteId non passato: mostra tutte le attività
            />
          </section>

          <section style={filtersRow}>
            <input
              type="search"
              placeholder="Cerca per studente o referente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={searchInputStyle}
            />
          </section>

          {loading && <div style={infoBox}>Caricamento dati…</div>}
          {error && !loading && <div style={{ ...infoBox, background: "#fee2e2", color: "#7f1d1d" }}>{error}</div>}

          {!loading && !error && filteredReferenti.length === 0 && (
            <div style={infoBox}>Nessun referente con studenti trovato.</div>
          )}

          <div style={cardsGrid}>
            {filteredReferenti.map(ref => (
              <article key={ref.id} style={card}>
                <div style={cardHeader}>
                  <div>
                    <div style={cardReferente}>{ref.nomeReferente || ref.email || `Referente #${ref.id}`}</div>
                    <div style={cardEmail}>{ref.email}</div>
                  </div>
                  <div style={badge}>{Array.isArray(ref.studenti) ? ref.studenti.length : 0} studenti</div>
                </div>
                <div style={studentsGrid}>
                  {Array.isArray(ref.studenti) && ref.studenti.length > 0 ? (
                    ref.studenti.map(stud => (
                      <div key={stud.id} style={studentCardWrapper}>
                        <div
                          style={{ ...studentCard, cursor: "pointer", border: selectedStudente && selectedStudente.id === stud.id ? "2.5px solid #1cb0f6" : studentCard.border }}
                          onClick={() => setSelectedStudente(stud)}
                          title="Seleziona per vedere il calendario"
                        >
                          <div style={studentCardInfo}>
                            <div style={studentName}>{stud.nomeReferente || stud.email || `Studente #${stud.id}`}</div>
                            {Array.isArray(stud.materie) && stud.materie.length > 0 && (
                              <div style={studentSubjects}>{stud.materie.slice(0, 2).join(", ")}{stud.materie.length > 2 ? '...' : ''}</div>
                            )}
                          </div>
                          <div style={enterButtonCompact}>→</div>
                        </div>
                        {/* Videolezione link - placeholder (sarà attivato quando aggiungi linkVideolezione al DB) */}
                        <button
                          onClick={() => {
                            const link = stud.linkVideolezione;
                            if (link) {
                              window.open(link, '_blank', 'noopener,noreferrer');
                            } else {
                              alert('Link videolezione non configurato per questo studente');
                            }
                          }}
                          style={videoButton}
                          title="Apri videolezione"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="23 7 16 12 23 17 23 7"></polygon>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                          </svg>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={emptyStudent}>Nessuno studente associato.</div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </main>
      </AdminOnly>
    </AuthGuard>
  );
}

const mainStyle = {
  maxWidth: "1100px",
  margin: "40px auto 60px",
  padding: "0 24px 60px",
  fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
  color: "#20489a"
};

const headerBox = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "24px",
  background: "#20489a",
  color: "#fff",
  padding: "24px",
  borderRadius: "24px",
  boxShadow: "0 12px 32px rgba(32,72,154,0.35)"
};

const title = { margin: 0, fontSize: "28px", fontWeight: 800 };
const subtitle = { margin: "8px 0 0", fontSize: "15px", opacity: 0.85 };

const statsBox = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end"
};

const statsNumber = { fontSize: "36px", fontWeight: 800 };
const statsLabel = { fontSize: "13px", opacity: 0.85 };

const filtersRow = {
  marginTop: "30px",
  marginBottom: "24px"
};

const searchInputStyle = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: "12px",
  border: "1.5px solid #4268b3",
  fontSize: "15px",
  color: "#20489a",
  boxShadow: "0 4px 18px rgba(32,72,154,0.10)"
};

const infoBox = {
  background: "#e3eefe",
  border: "1px dashed #9bb4e8",
  padding: "16px",
  borderRadius: "14px",
  fontWeight: 600,
  color: "#20489a",
  textAlign: "center",
  marginTop: "18px"
};

const cardsGrid = {
  display: "grid",
  gap: "36px",
  gridTemplateColumns: "1fr"
};

const card = {
  background: "#fff",
  borderRadius: "18px",
  padding: "28px",
  boxShadow: "0 12px 28px rgba(32,72,154,0.12)",
  border: "1px solid #e2e8f0",
  display: "flex",
  flexDirection: "column",
  gap: "24px"
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  paddingBottom: "16px",
  borderBottom: "2px solid #e3eefe"
};

const cardReferente = { fontWeight: 700, fontSize: "16px", color: "#20489a" };
const cardEmail = { fontSize: "13px", color: "#5a6d90", marginTop: "4px" };

const badge = {
  background: "#1cb0f6",
  color: "#fff",
  padding: "6px 12px",
  borderRadius: "999px",
  fontWeight: 700,
  fontSize: "12px"
};

const studentsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
  gap: "20px"
};

const studentCardWrapper = {
  display: "flex",
  alignItems: "stretch",
  gap: "8px"
};

const studentCard = {
  flex: 1,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
  background: "linear-gradient(135deg, #f5f8ff 0%, #e3eefe 100%)",
  padding: "16px",
  borderRadius: "14px",
  border: "1.5px solid #d8e3fb",
  textDecoration: "none",
  transition: "all 0.2s ease",
  cursor: "pointer"
};

const videoButton = {
  background: "#1cb0f6",
  color: "#fff",
  border: "none",
  width: "44px",
  height: "auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "12px",
  cursor: "pointer",
  transition: "all 0.2s ease",
  padding: "0",
  flexShrink: 0
};

const studentCardInfo = {
  flex: 1,
  minWidth: 0
};

const studentName = { 
  fontWeight: 600, 
  fontSize: "14px", 
  color: "#20489a",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis"
};

const studentSubjects = { 
  fontSize: "11px", 
  color: "#1e3a8a", 
  marginTop: "4px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis"
};

const enterButtonCompact = {
  background: "#20489a",
  color: "#fff",
  width: "32px",
  height: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "8px",
  fontWeight: 700,
  fontSize: "18px",
  flexShrink: 0
};

const emptyStudent = {
  fontSize: "13px",
  color: "#5a6d90",
  textAlign: "center",
  padding: "20px",
  gridColumn: "1 / -1"
};
