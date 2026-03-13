// @ts-nocheck
"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const MATERIE = [
  // Scientifiche
  "Matematica", "Fisica", "Chimica", "Biologia", "Scienze naturali", "Informatica",
  // Umanistiche
  "Italiano", "Latino", "Storia", "Filosofia", "Inglese", "Storia dell'arte",
  "Scienze motorie", "Religione",
  // Altro
  "Altra materia",
];

const ANNI = ["I anno", "II anno", "III anno", "IV anno", "V anno"];

// Legge un file HTML e restituisce il contenuto come stringa
function readHtmlFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file, "utf-8");
  });
}

// ── Picker file per una sezione HTML ─────────────────────────────────────────
function HtmlFilePicker({ label, value, onChange }) {
  const fileRef = useRef(null);
  const hasContent = !!value;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const html = await readHtmlFile(file);
      onChange(html);
    } catch {
      alert("Errore nella lettura del file");
    }
    // reset input so the same file can be reloaded
    e.target.value = "";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{ background: "#1cb0f6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          Carica file .html
        </button>
        {hasContent && (
          <span style={{ fontSize: 12, color: "#12753a", fontWeight: 600, background: "#c7f7d7", borderRadius: 20, padding: "3px 10px" }}>
            ✓ File caricato
          </span>
        )}
        {hasContent && (
          <button
            type="button"
            onClick={() => onChange("")}
            style={{ background: "#ffebee", color: "#c62828", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            Rimuovi
          </button>
        )}
        <input ref={fileRef} type="file" accept=".html,.htm" style={{ display: "none" }} onChange={handleFile} />
      </div>

      {hasContent && (
        <details>
          <summary style={{ cursor: "pointer", fontSize: 13, color: "#20489a", fontWeight: 600 }}>Anteprima</summary>
          <iframe
            srcDoc={value}
            style={{ width: "100%", height: 300, border: "1px solid #dbe4f1", borderRadius: 8, marginTop: 6 }}
            sandbox="allow-scripts allow-same-origin"
          />
        </details>
      )}

      {!hasContent && (
        <p style={{ margin: 0, fontSize: 12, color: "#aaa" }}>
          Nessun file caricato. Clicca il pulsante per selezionare un file .html dal tuo computer.
        </p>
      )}
    </div>
  );
}

// ── Modal crea/modifica ───────────────────────────────────────────────────────
function ArgomentoModal({ argomento, clienti, onClose, onSaved }) {
  const isEdit = !!argomento?.id;
  const [form, setForm] = useState({
    titolo: argomento?.titolo || "",
    materia: argomento?.materia || MATERIE[0],
    anno: argomento?.anno || "",
    mappaHtml: argomento?.mappaHtml || "",
    teoriaHtml: argomento?.teoriaHtml || "",
    eserciziHtml: argomento?.eserciziHtml || "",
  });
  const [assegnati, setAssegnati] = useState([]);
  const [tab, setTab] = useState("info");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    fetch("/api/lezioni/" + argomento.id + "/assegna", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(setAssegnati)
      .catch(() => {});
  }, [argomento?.id, isEdit]);

  async function handleSave() {
    if (!form.titolo.trim()) { setErr("Titolo obbligatorio"); return; }
    setSaving(true); setErr(null);
    try {
      const url = isEdit ? "/api/lezioni/" + argomento.id : "/api/lezioni";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      await fetch("/api/lezioni/" + saved.id + "/assegna", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteIds: assegnati }),
      });
      onSaved({ ...saved, assegnazioni: assegnati.map(id => ({ clienteId: id, cliente: clienti.find(c => c.id === id) })) });
    } catch (e) {
      setErr(e.message || "Errore");
    } finally {
      setSaving(false);
    }
  }

  const nMateriale = [form.mappaHtml, form.teoriaHtml, form.eserciziHtml].filter(Boolean).length;
  const TABS = [
    { key: "info", label: "Info" },
    { key: "mappa", label: "Mappa" + (form.mappaHtml ? " ✓" : "") },
    { key: "teoria", label: "Teoria" + (form.teoriaHtml ? " ✓" : "") },
    { key: "esercizi", label: "Esercizi" + (form.eserciziHtml ? " ✓" : "") },
    { key: "assegna", label: assegnati.length > 0 ? "Assegna (" + assegnati.length + ")" : "Assegna" },
  ];

  const inp = { display: "block", width: "100%", border: "1.5px solid #dbe4f1", borderRadius: 8, padding: "9px 12px", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", marginTop: 4 };
  const filtered = clienti.filter(c => c.nomeReferente?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", maxWidth: 680, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: "#20489a", fontWeight: 800 }}>
            {isEdit ? "Modifica: " + argomento.titolo : "Nuovo argomento"}
          </h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "#aaa", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 18, flexWrap: "wrap" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ border: "none", borderRadius: 8, padding: "6px 13px", fontWeight: 600, fontSize: 13, cursor: "pointer", background: tab === t.key ? "#1cb0f6" : "#e3eefe", color: tab === t.key ? "#fff" : "#20489a" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Info */}
        {tab === "info" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={{ display: "flex", flexDirection: "column", fontSize: 13, fontWeight: 600, color: "#20489a" }}>
              Titolo *
              <input value={form.titolo} onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))} style={inp} placeholder="es. La circonferenza" autoFocus />
            </label>

            <label style={{ display: "flex", flexDirection: "column", fontSize: 13, fontWeight: 600, color: "#20489a" }}>
              Materia
              <select value={form.materia} onChange={e => setForm(f => ({ ...f, materia: e.target.value }))} style={inp}>
                {MATERIE.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", fontSize: 13, fontWeight: 600, color: "#20489a" }}>
              Anno scolastico
              <select value={form.anno} onChange={e => setForm(f => ({ ...f, anno: e.target.value }))} style={inp}>
                <option value="">— Tutti gli anni —</option>
                {ANNI.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>

            {/* Riepilogo materiale caricato */}
            {nMateriale > 0 && (
              <div style={{ background: "#f0f7ff", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#20489a" }}>
                Materiale caricato: {[form.mappaHtml && "Mappa", form.teoriaHtml && "Teoria", form.eserciziHtml && "Esercizi"].filter(Boolean).join(", ")}
              </div>
            )}
          </div>
        )}

        {/* Tab Mappa */}
        {tab === "mappa" && (
          <div>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#4268b3" }}>
              Carica il file HTML della mappa concettuale
            </p>
            <HtmlFilePicker value={form.mappaHtml} onChange={v => setForm(f => ({ ...f, mappaHtml: v }))} />
          </div>
        )}

        {/* Tab Teoria */}
        {tab === "teoria" && (
          <div>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#4268b3" }}>
              Carica il file HTML del materiale teorico/discorsivo
            </p>
            <HtmlFilePicker value={form.teoriaHtml} onChange={v => setForm(f => ({ ...f, teoriaHtml: v }))} />
          </div>
        )}

        {/* Tab Esercizi */}
        {tab === "esercizi" && (
          <div>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#4268b3" }}>
              Carica il file HTML degli esercizi / simulazioni di verifica
            </p>
            <HtmlFilePicker value={form.eserciziHtml} onChange={v => setForm(f => ({ ...f, eserciziHtml: v }))} />
          </div>
        )}

        {/* Tab Assegna */}
        {tab === "assegna" && (
          <div>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "#4268b3" }}>Studenti che possono vedere questo argomento</p>
            <input value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, marginBottom: 10 }} placeholder="Cerca studente..." />
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
              {filtered.map(c => {
                const checked = assegnati.includes(c.id);
                return (
                  <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "7px 10px", borderRadius: 8, background: checked ? "#e0f4ff" : "#f5f8ff", border: "1px solid " + (checked ? "#90caf9" : "#e3eefe") }}>
                    <input type="checkbox" checked={checked} onChange={ev => setAssegnati(prev => ev.target.checked ? [...prev, c.id] : prev.filter(x => x !== c.id))} />
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#20489a" }}>{c.nomeReferente}</span>
                    {c.tipo === "STUDENTE" && <span style={{ fontSize: 11, background: "#1cb0f620", color: "#1565c0", borderRadius: 4, padding: "1px 6px" }}>studente</span>}
                  </label>
                );
              })}
              {filtered.length === 0 && <p style={{ color: "#aaa", fontSize: 13 }}>Nessun risultato</p>}
            </div>
          </div>
        )}

        {err && <p style={{ color: "#d32f2f", fontSize: 13, marginTop: 10 }}>{err}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "#e3eefe", color: "#20489a", border: "none", borderRadius: 8, padding: "9px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Annulla</button>
          <button onClick={handleSave} disabled={saving} style={{ background: "#1cb0f6", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {saving ? "Salvataggio..." : isEdit ? "Salva modifiche" : "Crea argomento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pagina principale ─────────────────────────────────────────────────────────
export default function LezioniPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === "admin" || role === "operatore";

  const [argomenti, setArgomenti] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetch("/api/lezioni", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(data => { setArgomenti(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/clienti", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(data => setClienti(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [isAdmin]);

  // Raggruppa per materia → anno
  const perMateria = useMemo(() => {
    const map = {};
    for (const a of argomenti) {
      const m = a.materia || "Generale";
      if (!map[m]) map[m] = [];
      map[m].push(a);
    }
    // Ordina materie secondo MATERIE[], poi le rimanenti
    const sorted = Object.entries(map).sort(([a], [b]) => {
      const ia = MATERIE.indexOf(a);
      const ib = MATERIE.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return sorted;
  }, [argomenti]);

  async function handleDelete(id) {
    if (!confirm("Eliminare questo argomento?")) return;
    setDeleting(id);
    await fetch("/api/lezioni/" + id, { method: "DELETE", credentials: "include" });
    setArgomenti(prev => prev.filter(a => a.id !== id));
    setDeleting(null);
  }

  function handleSaved(saved) {
    setArgomenti(prev => {
      const idx = prev.findIndex(a => a.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...prev[idx], ...saved }; return next; }
      return [...prev, saved];
    });
    setModal(null);
  }

  if (loading) return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px", fontFamily: "'Inter','Segoe UI',Arial,sans-serif" }}>
      <p style={{ color: "#20489a" }}>Caricamento...</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px", fontFamily: "'Inter','Segoe UI',Arial,sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, color: "#20489a", fontWeight: 800 }}>Lezioni</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#4268b3" }}>
            {isAdmin ? "Gestisci argomenti e assegnali agli studenti" : "Argomenti di studio assegnati dal tuo docente"}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setModal({ argomento: null })} style={{ background: "#1cb0f6", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            + Nuovo argomento
          </button>
        )}
      </div>

      {argomenti.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#4268b3" }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>📂</div>
          <p style={{ fontWeight: 600, fontSize: 15 }}>
            {isAdmin ? "Nessun argomento ancora. Clicca su + Nuovo argomento per iniziare." : "Nessun materiale di studio assegnato al momento."}
          </p>
        </div>
      ) : (
        perMateria.map(([materia, lista]) => (
          <section key={materia} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#20489a", margin: "0 0 12px", paddingBottom: 6, borderBottom: "2px solid #dbe4f1" }}>
              {materia}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
              {lista.map(a => {
                const sezioni = [
                  a.mappaHtml && { key: "mappa", label: "Mappa" },
                  a.teoriaHtml && { key: "teoria", label: "Teoria" },
                  a.eserciziHtml && { key: "esercizi", label: "Esercizi" },
                ].filter(Boolean);
                return (
                  <div key={a.id} style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", boxShadow: "0 2px 8px #20489a18", border: "1px solid #e3eefe" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <Link href={"/lezioni/" + a.id} style={{ textDecoration: "none", flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: 15, color: "#20489a", fontWeight: 700, lineHeight: 1.3 }}>{a.titolo}</h3>
                        {a.anno && <span style={{ fontSize: 11, color: "#4268b3", fontWeight: 600 }}>{a.anno}</span>}
                      </Link>
                      {isAdmin && (
                        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                          <button onClick={() => setModal({ argomento: a })} style={{ background: "#e3eefe", border: "none", borderRadius: 6, padding: "4px 9px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#20489a" }}>Modifica</button>
                          <button onClick={() => handleDelete(a.id)} disabled={deleting === a.id} style={{ background: "#ffebee", border: "none", borderRadius: 6, padding: "4px 9px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#c62828" }}>Elimina</button>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                      {sezioni.length > 0 ? sezioni.map(s => (
                        <Link key={s.key} href={"/lezioni/" + a.id + "?tab=" + s.key} style={{ display: "inline-flex", alignItems: "center", background: "#e3eefe", color: "#20489a", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                          {s.label}
                        </Link>
                      )) : <span style={{ fontSize: 12, color: "#bbb" }}>Nessun contenuto</span>}
                    </div>
                    {isAdmin && a.assegnazioni?.length > 0 && (
                      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {a.assegnazioni.map(x => (
                          <span key={x.clienteId} style={{ fontSize: 11, background: "#f0f7ff", border: "1px solid #c3d9f0", borderRadius: 4, padding: "1px 7px", color: "#20489a" }}>
                            {x.cliente?.nomeReferente || "#" + x.clienteId}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      {modal && (
        <ArgomentoModal
          argomento={modal.argomento}
          clienti={clienti}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
