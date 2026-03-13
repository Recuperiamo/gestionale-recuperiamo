// @ts-nocheck
"use client";
import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const MATERIE = [
  "Matematica", "Fisica", "Chimica", "Biologia", "Scienze naturali", "Informatica",
  "Italiano", "Latino", "Storia", "Filosofia", "Inglese", "Storia dell'arte",
  "Scienze motorie", "Religione",
  "Altra materia",
];

const ANNI = ["I anno", "II anno", "III anno", "IV anno", "V anno"];

function readHtmlFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file, "utf-8");
  });
}

// ── Picker file per una sezione HTML ─────────────────────────────────────────
function HtmlFilePicker({ value, onChange }) {
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
    e.target.value = "";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => fileRef.current?.click()}
          style={{ background: "#1cb0f6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          Carica file .html
        </button>
        {hasContent && (
          <span style={{ fontSize: 12, color: "#12753a", fontWeight: 600, background: "#c7f7d7", borderRadius: 20, padding: "3px 10px" }}>✓ File caricato</span>
        )}
        {hasContent && (
          <button type="button" onClick={() => onChange("")}
            style={{ background: "#ffebee", color: "#c62828", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Rimuovi
          </button>
        )}
        <input ref={fileRef} type="file" accept=".html,.htm" style={{ display: "none" }} onChange={handleFile} />
      </div>
      {hasContent && (
        <details>
          <summary style={{ cursor: "pointer", fontSize: 13, color: "#20489a", fontWeight: 600 }}>Anteprima</summary>
          <iframe srcDoc={value} style={{ width: "100%", height: 300, border: "1px solid #dbe4f1", borderRadius: 8, marginTop: 6 }} sandbox="allow-scripts allow-same-origin" />
        </details>
      )}
      {!hasContent && (
        <p style={{ margin: 0, fontSize: 12, color: "#aaa" }}>Nessun file caricato. Clicca il pulsante per selezionare un file .html.</p>
      )}
    </div>
  );
}

// ── Modal crea/modifica argomento ─────────────────────────────────────────────
function ArgomentoModal({ argomento, clienti, initialTab, onClose, onSaved }) {
  const isEdit = !!argomento?.id;
  const [form, setForm] = useState({
    titolo: argomento?.titolo || "",
    materia: argomento?.materia || MATERIE[0],
    anno: argomento?.anno || "",
    tags: argomento?.tags || [],
    mappaHtml: argomento?.mappaHtml || "",
    teoriaHtml: argomento?.teoriaHtml || "",
    eserciziHtml: argomento?.eserciziHtml || "",
  });
  const [tagInput, setTagInput] = useState("");
  const [assegnati, setAssegnati] = useState([]);
  const [tab, setTab] = useState(initialTab || "info");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [search, setSearch] = useState("");

  function addTag(raw) {
    const t = raw.trim();
    if (!t || form.tags.includes(t)) { setTagInput(""); return; }
    setForm(f => ({ ...f, tags: [...f.tags, t] }));
    setTagInput("");
  }

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

            <div style={{ display: "flex", flexDirection: "column", fontSize: 13, fontWeight: 600, color: "#20489a" }}>
              Tag (branche disciplinari)
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, marginBottom: 6 }}>
                {form.tags.map(t => (
                  <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#e3eefe", color: "#20489a", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
                    {t}
                    <button type="button" onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "#4268b3", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }}
                  style={{ ...inp, marginTop: 0, flex: 1 }}
                  placeholder="es. Algebra, Geometria analitica… (Invio per aggiungere)"
                />
                <button type="button" onClick={() => addTag(tagInput)}
                  style={{ background: "#e3eefe", color: "#20489a", border: "none", borderRadius: 8, padding: "0 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  +
                </button>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "#aaa", fontWeight: 400 }}>
                I tag alimentano l'indice disciplinare trasversale agli anni
              </p>
            </div>
          </div>
        )}
        {tab === "mappa" && <HtmlFilePicker value={form.mappaHtml} onChange={v => setForm(f => ({ ...f, mappaHtml: v }))} />}
        {tab === "teoria" && <HtmlFilePicker value={form.teoriaHtml} onChange={v => setForm(f => ({ ...f, teoriaHtml: v }))} />}
        {tab === "esercizi" && <HtmlFilePicker value={form.eserciziHtml} onChange={v => setForm(f => ({ ...f, eserciziHtml: v }))} />}

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

// ── Modal assegna argomento rapido ─────────────────────────────────────────────
function AssegnaRapidaModal({ argomenti, clienti, onClose }) {
  const [selectedId, setSelectedId] = useState(null);
  const [assegnati, setAssegnati] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [searchA, setSearchA] = useState("");
  const [searchC, setSearchC] = useState("");

  const selectedArg = argomenti.find(a => a.id === selectedId);

  useEffect(() => {
    if (!selectedId) return;
    setSaved(false);
    fetch("/api/lezioni/" + selectedId + "/assegna", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(setAssegnati)
      .catch(() => {});
  }, [selectedId]);

  async function handleSave() {
    if (!selectedId) return;
    setSaving(true);
    try {
      await fetch("/api/lezioni/" + selectedId + "/assegna", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteIds: assegnati }),
      });
      setSaved(true);
    } catch {
      alert("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  const filteredArgs = argomenti.filter(a => a.titolo?.toLowerCase().includes(searchA.toLowerCase()) || a.materia?.toLowerCase().includes(searchA.toLowerCase()));
  const filteredClienti = clienti.filter(c => c.nomeReferente?.toLowerCase().includes(searchC.toLowerCase()));
  const inp = { display: "block", width: "100%", border: "1.5px solid #dbe4f1", borderRadius: 8, padding: "8px 12px", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", marginTop: 4 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", maxWidth: 700, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: "#20489a", fontWeight: 800 }}>Assegna argomento</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "#aaa", lineHeight: 1 }}>×</button>
        </div>

        {/* Step 1: pick argomento */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#20489a" }}>1. Seleziona un argomento</p>
          <input value={searchA} onChange={e => setSearchA(e.target.value)} style={inp} placeholder="Cerca per titolo o materia..." />
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto", marginTop: 8 }}>
            {filteredArgs.map(a => (
              <button key={a.id} onClick={() => setSelectedId(a.id)} type="button"
                style={{ textAlign: "left", border: "1.5px solid " + (selectedId === a.id ? "#1cb0f6" : "#e3eefe"), borderRadius: 8, padding: "8px 12px", background: selectedId === a.id ? "#e0f4ff" : "#f8faff", cursor: "pointer", fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: "#20489a" }}>{a.titolo}</span>
                <span style={{ fontSize: 11, color: "#4268b3", marginLeft: 8 }}>{a.materia}{a.anno ? " · " + a.anno : ""}</span>
              </button>
            ))}
            {filteredArgs.length === 0 && <p style={{ color: "#aaa", fontSize: 13, padding: "8px 0" }}>Nessun argomento trovato</p>}
          </div>
        </div>

        {/* Step 2: assign students */}
        {selectedArg && (
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#20489a" }}>
              2. Studenti assegnati a <span style={{ color: "#1cb0f6" }}>{selectedArg.titolo}</span>
            </p>
            <input value={searchC} onChange={e => setSearchC(e.target.value)} style={inp} placeholder="Cerca studente..." />
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto", marginTop: 8 }}>
              {filteredClienti.map(c => {
                const checked = assegnati.includes(c.id);
                return (
                  <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "7px 10px", borderRadius: 8, background: checked ? "#e0f4ff" : "#f5f8ff", border: "1px solid " + (checked ? "#90caf9" : "#e3eefe") }}>
                    <input type="checkbox" checked={checked} onChange={ev => setAssegnati(prev => ev.target.checked ? [...prev, c.id] : prev.filter(x => x !== c.id))} />
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#20489a" }}>{c.nomeReferente}</span>
                  </label>
                );
              })}
              {filteredClienti.length === 0 && <p style={{ color: "#aaa", fontSize: 13 }}>Nessun risultato</p>}
            </div>
            {saved && <p style={{ color: "#12753a", fontSize: 13, fontWeight: 600, marginTop: 8 }}>✓ Assegnazioni salvate</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={{ background: "#e3eefe", color: "#20489a", border: "none", borderRadius: 8, padding: "9px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Chiudi</button>
              <button onClick={handleSave} disabled={saving} style={{ background: "#1cb0f6", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                {saving ? "Salvataggio..." : "Salva assegnazioni"}
              </button>
            </div>
          </div>
        )}

        {!selectedArg && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ background: "#e3eefe", color: "#20489a", border: "none", borderRadius: 8, padding: "9px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Chiudi</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Card argomento ─────────────────────────────────────────────────────────────
function ArgomentoCard({ a, isAdmin, deleting, onEdit, onDelete }) {
  const sezioni = [
    a.mappaHtml && { key: "mappa", label: "Mappa" },
    a.teoriaHtml && { key: "teoria", label: "Teoria" },
    a.eserciziHtml && { key: "esercizi", label: "Esercizi" },
  ].filter(Boolean);

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", boxShadow: "0 2px 8px #20489a14", border: "1px solid #e3eefe" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <Link href={"/lezioni/" + a.id} style={{ textDecoration: "none", flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: "#20489a", fontWeight: 700, lineHeight: 1.3 }}>{a.titolo}</h3>
        </Link>
        {isAdmin && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button onClick={onEdit} style={{ background: "#e3eefe", border: "none", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#20489a" }}>Modifica</button>
            <button onClick={onDelete} disabled={deleting} style={{ background: "#ffebee", border: "none", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#c62828" }}>Elimina</button>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
        {sezioni.length > 0 ? sezioni.map(s => (
          <Link key={s.key} href={"/lezioni/" + a.id + "?tab=" + s.key}
            style={{ display: "inline-flex", alignItems: "center", background: "#e3eefe", color: "#20489a", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
            {s.label}
          </Link>
        )) : <span style={{ fontSize: 11, color: "#bbb" }}>Nessun contenuto</span>}
      </div>
      {isAdmin && a.assegnazioni?.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
          {a.assegnazioni.map(x => (
            <span key={x.clienteId} style={{ fontSize: 10, background: "#f0f7ff", border: "1px solid #c3d9f0", borderRadius: 4, padding: "1px 6px", color: "#20489a" }}>
              {x.cliente?.nomeReferente || "#" + x.clienteId}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Pagina principale ─────────────────────────────────────────────────────────
export default function LezioniPage() {
  return (
    <Suspense fallback={<div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px", fontFamily: "'Inter','Segoe UI',Arial,sans-serif" }}><p style={{ color: "#20489a" }}>Caricamento...</p></div>}>
      <LezioniPageInner />
    </Suspense>
  );
}

function LezioniPageInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const role = session?.user?.role;
  const isAdmin = role === "admin" || role === "operatore";

  const [argomenti, setArgomenti] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { argomento } | null
  const [assegnaModal, setAssegnaModal] = useState(false);
  const [deleting, setDeleting] = useState(null);

  // Accordion state
  const [openMaterie, setOpenMaterie] = useState(new Set());
  const [openAnni, setOpenAnni] = useState(new Set()); // key = "materia:::anno"

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

  // Raggruppa: materia → anno → argomenti
  const perMateria = useMemo(() => {
    const map = {}; // { materia: { anno: [argomento] } }
    for (const a of argomenti) {
      const m = a.materia || "Generale";
      const anno = a.anno || "—";
      if (!map[m]) map[m] = {};
      if (!map[m][anno]) map[m][anno] = [];
      map[m][anno].push(a);
    }
    const sorted = Object.entries(map).sort(([a], [b]) => {
      const ia = MATERIE.indexOf(a), ib = MATERIE.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1; if (ib === -1) return -1;
      return ia - ib;
    });
    // Sort anni within each materia
    return sorted.map(([materia, anniMap]) => {
      const sortedAnni = Object.entries(anniMap).sort(([a], [b]) => {
        const ia = ANNI.indexOf(a), ib = ANNI.indexOf(b);
        if (a === "—") return 1; if (b === "—") return -1;
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1; if (ib === -1) return -1;
        return ia - ib;
      });
      return [materia, sortedAnni];
    });
  }, [argomenti]);

  // Auto-apri materia/anno da URL params
  useEffect(() => {
    const urlMateria = searchParams?.get("materia");
    const urlAnno = searchParams?.get("anno");
    if (urlMateria) {
      setOpenMaterie(prev => new Set([...prev, urlMateria]));
      if (urlAnno) {
        setOpenAnni(prev => new Set([...prev, urlMateria + ":::" + urlAnno]));
      }
    }
  }, [searchParams, argomenti]);

  function toggleMateria(m) {
    setOpenMaterie(prev => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m); else next.add(m);
      return next;
    });
  }

  function toggleAnno(m, anno) {
    const key = m + ":::" + anno;
    setOpenAnni(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

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

  const pageStyle = { maxWidth: 960, margin: "0 auto", padding: "32px 20px", fontFamily: "'Inter','Segoe UI',Arial,sans-serif" };

  if (loading) return <div style={pageStyle}><p style={{ color: "#20489a" }}>Caricamento...</p></div>;

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, color: "#20489a", fontWeight: 800 }}>Lezioni</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#4268b3" }}>
            {isAdmin ? "Gestisci argomenti e assegnali agli studenti" : "Argomenti di studio assegnati dal tuo docente"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/lezioni/indice"
            style={{ background: "#f0f7ff", color: "#20489a", border: "1.5px solid #c3d9f0", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            Indice disciplinare
          </Link>
          {isAdmin && (
            <>
              <button onClick={() => setAssegnaModal(true)}
                style={{ background: "#fff", color: "#20489a", border: "1.5px solid #20489a", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Assegna argomento
              </button>
              <button onClick={() => setModal({ argomento: null })}
                style={{ background: "#1cb0f6", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                + Aggiungi lezione
              </button>
            </>
          )}
        </div>
      </div>

      {/* Contenuto */}
      {argomenti.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#4268b3" }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>📂</div>
          <p style={{ fontWeight: 600, fontSize: 15 }}>
            {isAdmin ? "Nessun argomento ancora. Clicca su + Aggiungi lezione per iniziare." : "Nessun materiale di studio assegnato al momento."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {perMateria.map(([materia, anni]) => {
            const isOpenM = openMaterie.has(materia);
            const totalArgomenti = anni.reduce((acc, [, list]) => acc + list.length, 0);
            return (
              <div key={materia} style={{ border: "1.5px solid #dbe4f1", borderRadius: 12, overflow: "hidden" }}>
                {/* Materia header */}
                <button
                  onClick={() => toggleMateria(materia)}
                  style={{ width: "100%", textAlign: "left", background: isOpenM ? "#20489a" : "#f5f8ff", border: "none", padding: "14px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <span style={{ fontWeight: 700, fontSize: 15, color: isOpenM ? "#fff" : "#20489a" }}>{materia}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: isOpenM ? "#c8d9ff" : "#4268b3", fontWeight: 600 }}>
                      {totalArgomenti} {totalArgomenti === 1 ? "argomento" : "argomenti"}
                    </span>
                    <span style={{ fontSize: 16, color: isOpenM ? "#fff" : "#4268b3", transition: "transform 0.2s", display: "inline-block", transform: isOpenM ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
                  </div>
                </button>

                {/* Anni accordion */}
                {isOpenM && (
                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {anni.map(([anno, lista]) => {
                      const annoKey = materia + ":::" + anno;
                      const isOpenA = openAnni.has(annoKey);
                      const annoLabel = anno === "—" ? "Tutti gli anni" : anno;
                      return (
                        <div key={anno} style={{ border: "1px solid #dbe4f1", borderRadius: 10, overflow: "hidden" }}>
                          {/* Anno header */}
                          <button
                            onClick={() => toggleAnno(materia, anno)}
                            style={{ width: "100%", textAlign: "left", background: isOpenA ? "#e3eefe" : "#fafbff", border: "none", padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                          >
                            <span style={{ fontWeight: 600, fontSize: 13, color: "#20489a" }}>{annoLabel}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 11, color: "#4268b3" }}>{lista.length} {lista.length === 1 ? "argomento" : "argomenti"}</span>
                              <span style={{ fontSize: 14, color: "#4268b3", transition: "transform 0.2s", display: "inline-block", transform: isOpenA ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
                            </div>
                          </button>

                          {/* Argomento cards */}
                          {isOpenA && (
                            <div style={{ padding: "10px 12px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
                              {lista.map(a => (
                                <ArgomentoCard
                                  key={a.id}
                                  a={a}
                                  isAdmin={isAdmin}
                                  deleting={deleting === a.id}
                                  onEdit={() => setModal({ argomento: a })}
                                  onDelete={() => handleDelete(a.id)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <ArgomentoModal
          argomento={modal.argomento}
          clienti={clienti}
          initialTab={modal.initialTab}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {assegnaModal && (
        <AssegnaRapidaModal
          argomenti={argomenti}
          clienti={clienti}
          onClose={() => setAssegnaModal(false)}
        />
      )}
    </div>
  );
}
