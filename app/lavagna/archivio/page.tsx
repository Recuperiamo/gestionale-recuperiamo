// @ts-nocheck
"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import Navbar from "../../components/Navbar";
import AuthGuard from "../../components/AuthGuard";

function formatData(s: string) {
  return new Date(s).toLocaleString("it-IT", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ArchivioLavagnePage() {
  const { data: session, status } = useSession();
  const [lavagne, setLavagne] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cerca, setCerca] = useState("");

  const isAdmin = /^(admin|operatore)$/i.test(session?.user?.role || "");

  useEffect(() => {
    if (status !== "authenticated" || !isAdmin) return;
    setLoading(true);
    fetch("/api/lavagna-v2/archivio")
      .then(r => r.ok ? r.json() : { lavagne: [] })
      .then(d => setLavagne(Array.isArray(d.lavagne) ? d.lavagne : []))
      .catch(() => setLavagne([]))
      .finally(() => setLoading(false));
  }, [status, isAdmin]);

  // Raggruppa per studente
  const perStudente = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    const filtered = q
      ? lavagne.filter(l =>
          (l.titolo || "").toLowerCase().includes(q) ||
          (l.cliente?.nomeReferente || l.cliente?.email || "").toLowerCase().includes(q)
        )
      : lavagne;

    const map = new Map<string, { nome: string; clienteId: number | null; items: any[] }>();
    for (const l of filtered) {
      const nome = l.cliente?.nomeReferente || l.cliente?.email || "— Nessuno studente";
      const key = String(l.cliente?.id ?? "no-student");
      if (!map.has(key)) map.set(key, { nome, clienteId: l.cliente?.id ?? null, items: [] });
      map.get(key)!.items.push(l);
    }
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  }, [lavagne, cerca]);

  return (
    <AuthGuard allowedRoles={["admin", "operatore"]}>
      <div style={{ minHeight: "100vh", background: "#f0f4fa" }}>
        <Navbar />
        <main style={{ maxWidth: 820, margin: "0 auto", padding: "32px 16px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
            <button
              onClick={() => window.location.href = "/lavagna"}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center", gap: 6, fontSize: 13, padding: "6px 8px", borderRadius: 8 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Lista lavagne
            </button>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#1e3a5f" }}>Archivio lavagne</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>Lavagne compresse e archiviate dopo 30 giorni di inattività — sola lettura</div>
            </div>
          </div>

          {/* Cerca */}
          <div style={{ position: "relative", marginBottom: 20 }}>
            <input
              type="text"
              placeholder="Cerca per titolo o studente…"
              value={cerca}
              onChange={e => setCerca(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 36px", borderRadius: 10, border: "1px solid #b0c8f5", fontSize: 13, outline: "none", background: "#f8fbff" }}
            />
            <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#9ab0d4" strokeWidth="2"/>
              <path d="M16.5 16.5L21 21" stroke="#9ab0d4" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>

          {loading ? (
            <div style={{ color: "#9ab0d4", fontSize: 14, textAlign: "center", padding: 40 }}>Caricamento archivio…</div>
          ) : perStudente.length === 0 ? (
            <div style={{ color: "#6b7280", fontSize: 13, textAlign: "center", padding: 40 }}>
              {cerca ? `Nessun risultato per "${cerca}".` : "Nessuna lavagna archiviata."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {perStudente.map(gruppo => (
                <div key={gruppo.clienteId ?? "none"} style={{ background: "#fff", borderRadius: 14, border: "1px solid #dbe6f5", overflow: "hidden" }}>
                  {/* Intestazione gruppo studente */}
                  <div style={{ background: "#f0f6ff", borderBottom: "1px solid #dbe6f5", padding: "10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <div style={{ fontWeight: 700, color: "#1e3a5f", fontSize: 15 }}>{gruppo.nome}</div>
                    <div style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>{gruppo.items.length} lavagn{gruppo.items.length === 1 ? "a" : "e"}</div>
                  </div>

                  {/* Lista lavagne del gruppo */}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {gruppo.items.map((l, i) => (
                      <div
                        key={l.id}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderBottom: i < gruppo.items.length - 1 ? "1px solid #f1f5fb" : "none" }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: "#334155", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {l.titolo || "Lavagna"}
                          </div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {l.attivita?.orario && (
                              <span>Lezione: {formatData(l.attivita.orario)}</span>
                            )}
                            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                              Archiviata il {formatData(l.archivedAt)}
                            </span>
                          </div>
                        </div>
                        <span style={{ fontSize: 11, background: "#f1f5f9", color: "#64748b", borderRadius: 5, padding: "2px 7px", fontWeight: 600, flexShrink: 0 }}>
                          Archivio
                        </span>
                        <button
                          onClick={() => window.open(`/lavagna/canvas?lavagnaId=${l.id}`, "_blank")}
                          style={{ background: "#e0f2fe", color: "#0369a1", border: "none", borderRadius: 8, padding: "5px 13px", fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}
                        >
                          Visualizza
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
