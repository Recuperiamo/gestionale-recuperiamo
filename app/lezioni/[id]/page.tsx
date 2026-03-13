// @ts-nocheck
"use client";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

function readHtmlFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file, "utf-8");
  });
}

function UploadSection({ label, htmlKey, value, onUploaded }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const html = await readHtmlFile(file);
      await onUploaded(htmlKey, html);
    } catch {
      alert("Errore nella lettura del file");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#20489a", minWidth: 60 }}>{label}</span>
      {value ? (
        <span style={{ fontSize: 12, color: "#12753a", fontWeight: 600, background: "#c7f7d7", borderRadius: 20, padding: "3px 10px" }}>✓ Caricato</span>
      ) : (
        <span style={{ fontSize: 12, color: "#aaa" }}>Nessun file</span>
      )}
      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
        style={{ background: "#1cb0f6", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
        {uploading ? "..." : value ? "Sostituisci" : "Carica .html"}
      </button>
      {value && (
        <button type="button" onClick={() => onUploaded(htmlKey, null)}
          style={{ background: "#ffebee", color: "#c62828", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Rimuovi
        </button>
      )}
      <input ref={fileRef} type="file" accept=".html,.htm" style={{ display: "none" }} onChange={handleFile} />
    </div>
  );
}

export default function LezioneDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id;
  const role = session?.user?.role;
  const isAdmin = role === "admin" || role === "operatore";

  const [argomento, setArgomento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(searchParams?.get("tab") || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch("/api/lezioni/" + id, { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error("Non autorizzato o non trovato"); return r.json(); })
      .then(data => { setArgomento(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [id]);

  // Seleziona tab iniziale
  useEffect(() => {
    if (!argomento) return;
    const urlTab = searchParams?.get("tab");
    const available = [];
    if (argomento.mappaHtml) available.push("mappa");
    if (argomento.teoriaHtml) available.push("teoria");
    if (argomento.eserciziHtml) available.push("esercizi");
    if (urlTab && available.includes(urlTab)) { setTab(urlTab); return; }
    if (available.length > 0) setTab(available[0]);
  }, [argomento, searchParams]);

  async function handleUploaded(key, html) {
    setSaving(true);
    try {
      const res = await fetch("/api/lezioni/" + id, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: html }),
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      const updated = await res.json();
      setArgomento(prev => ({ ...prev, ...updated }));
      // Seleziona il tab appena caricato (se non vuoto)
      if (html) setTab(key.replace("Html", ""));
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  const pageStyle = { maxWidth: 1100, margin: "0 auto", padding: "28px 20px", fontFamily: "'Inter','Segoe UI',Arial,sans-serif" };

  if (loading) return <div style={pageStyle}><p style={{ color: "#20489a" }}>Caricamento...</p></div>;

  if (error) return (
    <div style={pageStyle}>
      <div style={{ background: "#ffebee", border: "1px solid #ffcdd2", borderRadius: 10, padding: 20, color: "#c62828", fontWeight: 600 }}>{error}</div>
      <Link href="/lezioni" style={{ display: "inline-block", marginTop: 16, color: "#1cb0f6", fontWeight: 600, textDecoration: "none" }}>← Torna alle lezioni</Link>
    </div>
  );

  const allSezioni = [
    { key: "mappa", htmlKey: "mappaHtml", label: "Mappa concettuale" },
    { key: "teoria", htmlKey: "teoriaHtml", label: "Teoria" },
    { key: "esercizi", htmlKey: "eserciziHtml", label: "Esercizi" },
  ];
  const sezioniConContenuto = allSezioni.filter(s => argomento[s.htmlKey]);
  const htmlContent = { mappa: argomento.mappaHtml, teoria: argomento.teoriaHtml, esercizi: argomento.eserciziHtml };
  const currentHtml = htmlContent[tab] || "";

  return (
    <div style={pageStyle}>
      {/* Breadcrumb cliccabile */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <Link href="/lezioni" style={{ color: "#1cb0f6", fontWeight: 600, textDecoration: "none", fontSize: 14 }}>← Lezioni</Link>
        <span style={{ color: "#ccc" }}>/</span>
        <Link href={"/lezioni?materia=" + encodeURIComponent(argomento.materia)} style={{ color: "#4268b3", fontSize: 14, textDecoration: "none", fontWeight: 600 }}>{argomento.materia}</Link>
        {argomento.anno && <>
          <span style={{ color: "#ccc" }}>/</span>
          <Link href={"/lezioni?materia=" + encodeURIComponent(argomento.materia) + "&anno=" + encodeURIComponent(argomento.anno)} style={{ color: "#4268b3", fontSize: 14, textDecoration: "none", fontWeight: 600 }}>{argomento.anno}</Link>
        </>}
        <span style={{ color: "#ccc" }}>/</span>
        <span style={{ color: "#20489a", fontWeight: 700, fontSize: 14 }}>{argomento.titolo}</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, color: "#20489a", fontWeight: 800 }}>{argomento.titolo}</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#4268b3", background: "#e3eefe", padding: "2px 10px", borderRadius: 20, fontWeight: 600 }}>{argomento.materia}</span>
          {argomento.anno && <span style={{ fontSize: 13, color: "#4268b3", background: "#e3eefe", padding: "2px 10px", borderRadius: 20, fontWeight: 600 }}>{argomento.anno}</span>}
        </div>
      </div>

      {/* Sezione upload per admin */}
      {isAdmin && (
        <div style={{ background: "#f8faff", border: "1px solid #dbe4f1", borderRadius: 12, padding: "14px 18px", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#20489a" }}>Gestione contenuti</span>
            {saving && <span style={{ fontSize: 12, color: "#1cb0f6" }}>Salvataggio...</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <UploadSection label="Mappa" htmlKey="mappaHtml" value={argomento.mappaHtml} onUploaded={handleUploaded} />
            <UploadSection label="Teoria" htmlKey="teoriaHtml" value={argomento.teoriaHtml} onUploaded={handleUploaded} />
            <UploadSection label="Esercizi" htmlKey="eserciziHtml" value={argomento.eserciziHtml} onUploaded={handleUploaded} />
          </div>
        </div>
      )}

      {/* Contenuto */}
      {sezioniConContenuto.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#4268b3" }}>
          <p style={{ fontWeight: 600 }}>{isAdmin ? "Carica i file HTML qui sopra per aggiungere contenuto." : "Nessun contenuto disponibile per questo argomento."}</p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #dbe4f1" }}>
            {sezioniConContenuto.map(s => (
              <button key={s.key} onClick={() => setTab(s.key)} style={{ border: "none", borderBottom: tab === s.key ? "3px solid #1cb0f6" : "3px solid transparent", borderRadius: 0, padding: "10px 22px", fontWeight: 600, fontSize: 14, cursor: "pointer", background: "transparent", color: tab === s.key ? "#1cb0f6" : "#4268b3", marginBottom: -2 }}>
                {s.label}
              </button>
            ))}
          </div>
          <div style={{ border: "1px solid #dbe4f1", borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
            {currentHtml ? (
              <iframe key={tab} srcDoc={currentHtml} style={{ width: "100%", minHeight: 620, border: "none", display: "block" }} sandbox="allow-scripts allow-same-origin allow-forms" />
            ) : (
              <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Nessun contenuto per questa sezione.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
