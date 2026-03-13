// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function LezioneDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params?.id;
  const role = session?.user?.role;
  const isAdmin = role === "admin" || role === "operatore";

  const [argomento, setArgomento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(searchParams?.get("tab") || "mappa");

  useEffect(() => {
    if (!id) return;
    fetch("/api/lezioni/" + id, { credentials: "include" })
      .then(r => {
        if (!r.ok) throw new Error("Non autorizzato o non trovato");
        return r.json();
      })
      .then(data => { setArgomento(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [id]);

  // Determina tab attivo (salta le sezioni vuote)
  useEffect(() => {
    if (!argomento) return;
    const urlTab = searchParams?.get("tab");
    const available = [];
    if (argomento.mappaHtml) available.push("mappa");
    if (argomento.teoriaHtml) available.push("teoria");
    if (argomento.eserciziHtml) available.push("esercizi");
    if (available.length === 0) return;
    if (urlTab && available.includes(urlTab)) { setTab(urlTab); return; }
    setTab(available[0]);
  }, [argomento, searchParams]);

  if (loading) return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px", fontFamily: "'Inter','Segoe UI',Arial,sans-serif" }}>
      <p style={{ color: "#20489a" }}>Caricamento...</p>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px", fontFamily: "'Inter','Segoe UI',Arial,sans-serif" }}>
      <div style={{ background: "#ffebee", border: "1px solid #ffcdd2", borderRadius: 10, padding: 20, color: "#c62828", fontWeight: 600 }}>
        {error}
      </div>
      <Link href="/lezioni" style={{ display: "inline-block", marginTop: 16, color: "#1cb0f6", fontWeight: 600, textDecoration: "none" }}>← Torna alle lezioni</Link>
    </div>
  );

  const sezioni = [
    argomento.mappaHtml && { key: "mappa", label: "Mappa concettuale" },
    argomento.teoriaHtml && { key: "teoria", label: "Teoria" },
    argomento.eserciziHtml && { key: "esercizi", label: "Esercizi" },
  ].filter(Boolean);

  const htmlContent = { mappa: argomento.mappaHtml, teoria: argomento.teoriaHtml, esercizi: argomento.eserciziHtml };
  const currentHtml = htmlContent[tab] || "";

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px", fontFamily: "'Inter','Segoe UI',Arial,sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Link href="/lezioni" style={{ color: "#1cb0f6", fontWeight: 600, textDecoration: "none", fontSize: 14 }}>← Lezioni</Link>
        <span style={{ color: "#ccc" }}>/</span>
        <span style={{ color: "#4268b3", fontSize: 14 }}>{argomento.materia}</span>
        <span style={{ color: "#ccc" }}>/</span>
        <span style={{ color: "#20489a", fontWeight: 700, fontSize: 14 }}>{argomento.titolo}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, color: "#20489a", fontWeight: 800 }}>{argomento.titolo}</h1>
          <span style={{ fontSize: 13, color: "#4268b3", background: "#e3eefe", padding: "2px 10px", borderRadius: 20, fontWeight: 600 }}>{argomento.materia}</span>
        </div>
        {isAdmin && (
          <Link href="/lezioni" style={{ background: "#e3eefe", color: "#20489a", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
            Gestisci
          </Link>
        )}
      </div>

      {sezioni.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#4268b3" }}>
          <p style={{ fontWeight: 600 }}>Nessun contenuto disponibile per questo argomento.</p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 4, marginBottom: 0, borderBottom: "2px solid #dbe4f1", paddingBottom: 0 }}>
            {sezioni.map(s => (
              <button key={s.key} onClick={() => setTab(s.key)} style={{ border: "none", borderBottom: tab === s.key ? "3px solid #1cb0f6" : "3px solid transparent", borderRadius: 0, padding: "10px 20px", fontWeight: 600, fontSize: 14, cursor: "pointer", background: "transparent", color: tab === s.key ? "#1cb0f6" : "#4268b3", marginBottom: -2 }}>
                {s.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 0, border: "1px solid #dbe4f1", borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
            {currentHtml ? (
              <iframe
                key={tab}
                srcDoc={currentHtml}
                style={{ width: "100%", minHeight: 600, border: "none", display: "block" }}
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            ) : (
              <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>
                <p>Nessun contenuto per questa sezione.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
