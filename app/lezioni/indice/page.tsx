// @ts-nocheck
"use client";
import { useEffect, useState, useMemo, Suspense } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

function LezioniIndiceInner() {
  const { data: session } = useSession();
  const [argomenti, setArgomenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openTag, setOpenTag] = useState(null); // null = tutti aperti inizialmente? No, partiamo tutti chiusi

  useEffect(() => {
    fetch("/api/lezioni", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(data => { setArgomenti(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Raggruppa per tag. Un argomento con più tag compare in più sezioni.
  const perTag = useMemo(() => {
    const filtered = search
      ? argomenti.filter(a =>
          a.titolo?.toLowerCase().includes(search.toLowerCase()) ||
          a.materia?.toLowerCase().includes(search.toLowerCase()) ||
          a.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
        )
      : argomenti;

    const map = {}; // { tag: [argomento] }
    const noTag = [];

    for (const a of filtered) {
      if (!a.tags?.length) {
        noTag.push(a);
      } else {
        for (const t of a.tags) {
          if (!map[t]) map[t] = [];
          map[t].push(a);
        }
      }
    }

    const sorted = Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b, "it"))
      .map(([tag, lista]) => [tag, lista.sort((a, b) => a.titolo.localeCompare(b.titolo, "it"))]);

    if (noTag.length > 0) {
      sorted.push(["—", noTag.sort((a, b) => a.titolo.localeCompare(b.titolo, "it"))]);
    }

    return sorted;
  }, [argomenti, search]);

  // Conta totale argomenti con almeno un tag
  const conTag = useMemo(() => argomenti.filter(a => a.tags?.length > 0).length, [argomenti]);
  const senzaTag = argomenti.length - conTag;

  function toggleTag(tag) {
    setOpenTag(prev => prev === tag ? null : tag);
  }

  const pageStyle = { maxWidth: 960, margin: "0 auto", padding: "32px 20px", fontFamily: "'Inter','Segoe UI',Arial,sans-serif" };

  if (loading) return <div style={pageStyle}><p style={{ color: "#20489a" }}>Caricamento...</p></div>;

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Link href="/lezioni" style={{ color: "#1cb0f6", fontWeight: 600, textDecoration: "none", fontSize: 14 }}>← Lezioni</Link>
          <span style={{ color: "#ccc" }}>/</span>
          <span style={{ color: "#20489a", fontWeight: 700, fontSize: 14 }}>Indice disciplinare</span>
        </div>
        <h1 style={{ margin: "0 0 6px", fontSize: 22, color: "#20489a", fontWeight: 800 }}>Indice disciplinare</h1>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "#4268b3" }}>
          Tutti gli argomenti ordinati per branca disciplinare, indipendentemente dall'anno scolastico.
        </p>
        <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#4268b3", marginBottom: 16, flexWrap: "wrap" }}>
          <span><strong style={{ color: "#20489a" }}>{argomenti.length}</strong> argomenti totali</span>
          <span><strong style={{ color: "#20489a" }}>{perTag.filter(([t]) => t !== "—").length}</strong> branche disciplinari</span>
          {senzaTag > 0 && <span style={{ color: "#bbb" }}>{senzaTag} senza tag</span>}
        </div>

        {/* Ricerca */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cerca argomento, materia o tag..."
          style={{ display: "block", width: "100%", maxWidth: 400, border: "1.5px solid #dbe4f1", borderRadius: 8, padding: "9px 14px", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none" }}
        />
      </div>

      {/* Indice rapido (tag pills) */}
      {perTag.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 28 }}>
          {perTag.map(([tag]) => (
            <button
              key={tag}
              onClick={() => {
                toggleTag(tag);
                setTimeout(() => {
                  document.getElementById("tag-" + tag)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 50);
              }}
              style={{
                background: openTag === tag ? "#20489a" : "#e3eefe",
                color: openTag === tag ? "#fff" : "#20489a",
                border: "none", borderRadius: 20, padding: "5px 14px",
                fontSize: 12, fontWeight: 600, cursor: "pointer"
              }}
            >
              {tag === "—" ? "Non classificati" : tag}
            </button>
          ))}
        </div>
      )}

      {/* Sezioni per tag */}
      {perTag.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#4268b3" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏷️</div>
          <p style={{ fontWeight: 600, fontSize: 15 }}>
            {search ? "Nessun risultato per questa ricerca." : "Nessun argomento ha ancora un tag disciplinare."}
          </p>
          {!search && (
            <p style={{ fontSize: 13, color: "#aaa", marginTop: 8 }}>
              Aggiungi tag agli argomenti dal modal di modifica in <Link href="/lezioni" style={{ color: "#1cb0f6" }}>Lezioni</Link>.
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {perTag.map(([tag, lista]) => {
            const isOpen = openTag === tag || openTag === null;
            const labelTag = tag === "—" ? "Non classificati" : tag;
            return (
              <div key={tag} id={"tag-" + tag} style={{ border: "1.5px solid #dbe4f1", borderRadius: 12, overflow: "hidden" }}>
                {/* Tag header */}
                <button
                  onClick={() => toggleTag(tag)}
                  style={{
                    width: "100%", textAlign: "left", border: "none",
                    background: isOpen ? (tag === "—" ? "#f5f5f5" : "#20489a") : "#f5f8ff",
                    padding: "14px 18px", cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center"
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 15, color: isOpen ? (tag === "—" ? "#888" : "#fff") : "#20489a", fontStyle: tag === "—" ? "italic" : "normal" }}>
                    {labelTag}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: isOpen ? (tag === "—" ? "#999" : "#c8d9ff") : "#4268b3", fontWeight: 600 }}>
                      {lista.length} {lista.length === 1 ? "argomento" : "argomenti"}
                    </span>
                    <span style={{ fontSize: 16, color: isOpen ? "#fff" : "#4268b3", display: "inline-block", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>›</span>
                  </div>
                </button>

                {/* Lista argomenti */}
                {isOpen && (
                  <div style={{ padding: "12px 16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                      {lista.map(a => {
                        const sezioni = [
                          a.mappaHtml && "Mappa",
                          a.teoriaHtml && "Teoria",
                          a.eserciziHtml && "Esercizi",
                        ].filter(Boolean);
                        return (
                          <Link
                            key={a.id}
                            href={"/lezioni/" + a.id}
                            style={{ textDecoration: "none", background: "#fff", border: "1px solid #e3eefe", borderRadius: 10, padding: "12px 14px", display: "block", boxShadow: "0 1px 4px #20489a0d" }}
                          >
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#20489a", marginBottom: 4, lineHeight: 1.3 }}>{a.titolo}</div>
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                              <span style={{ fontSize: 11, color: "#4268b3", background: "#e3eefe", borderRadius: 12, padding: "1px 8px", fontWeight: 600 }}>{a.materia}</span>
                              {a.anno && <span style={{ fontSize: 11, color: "#4268b3", background: "#e3eefe", borderRadius: 12, padding: "1px 8px", fontWeight: 600 }}>{a.anno}</span>}
                              {sezioni.length > 0 && sezioni.map(s => (
                                <span key={s} style={{ fontSize: 10, color: "#12753a", background: "#c7f7d7", borderRadius: 12, padding: "1px 7px", fontWeight: 600 }}>{s}</span>
                              ))}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LezioniIndicePage() {
  return (
    <Suspense fallback={<div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px", fontFamily: "'Inter','Segoe UI',Arial,sans-serif" }}><p style={{ color: "#20489a" }}>Caricamento...</p></div>}>
      <LezioniIndiceInner />
    </Suspense>
  );
}
