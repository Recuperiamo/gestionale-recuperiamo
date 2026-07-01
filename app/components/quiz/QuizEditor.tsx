// @ts-nocheck
"use client";
import { useState, useEffect } from "react";

type TipoDomanda = "mcq" | "vero_falso" | "testo_libero" | "completamento";

interface Domanda {
  tipo: TipoDomanda;
  testo: string;
  opzioni?: string[];
  rispostaCorretta?: string;
}

interface Quiz {
  id: number;
  titolo: string;
  domande: Domanda[];
  createdAt: string;
  _count?: { tentativi: number };
}

interface Tentativo {
  id: number;
  clienteId: number;
  risposte: Record<string, string>;
  punteggio: number | null;
  totaleAutomatico: number | null;
  correzioneManuale: Record<string, { corretto: boolean; nota?: string }> | null;
  completatoAt: string;
  cliente: { id: number; nomeReferente: string; nome?: string; cognome?: string };
}

const TIPI: { value: TipoDomanda; label: string }[] = [
  { value: "mcq", label: "Scelta multipla" },
  { value: "vero_falso", label: "Vero / Falso" },
  { value: "completamento", label: "Completamento" },
  { value: "testo_libero", label: "Testo libero (manuale)" },
];

const s = {
  btn: (color = "#1cb0f6") => ({
    background: color, color: "#fff", border: "none", borderRadius: 7,
    padding: "7px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer",
  }),
  btnOutline: {
    background: "#fff", color: "#20489a", border: "1.5px solid #dbe4f1", borderRadius: 7,
    padding: "7px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer",
  },
  input: {
    display: "block", width: "100%", border: "1.5px solid #dbe4f1", borderRadius: 8,
    padding: "8px 12px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" as const,
  },
  label: { display: "flex" as const, flexDirection: "column" as const, fontSize: 12, fontWeight: 700, color: "#20489a", gap: 4 },
};

function domandaVuota(): Domanda {
  return { tipo: "mcq", testo: "", opzioni: ["", "", "", ""], rispostaCorretta: "" };
}

function DomandaEditor({ d, idx, onChange, onRemove }: {
  d: Domanda; idx: number;
  onChange: (updated: Domanda) => void;
  onRemove: () => void;
}) {
  const set = (patch: Partial<Domanda>) => onChange({ ...d, ...patch });

  return (
    <div style={{ background: "#f8faff", border: "1.5px solid #dbe4f1", borderRadius: 10, padding: "14px 16px", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#20489a" }}>Domanda {idx + 1}</span>
        <button onClick={onRemove} style={{ background: "#ffebee", color: "#c62828", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Rimuovi</button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <label style={{ ...s.label, flex: 1 }}>
          Tipo
          <select value={d.tipo} onChange={e => {
            const tipo = e.target.value as TipoDomanda;
            const patch: Partial<Domanda> = { tipo, rispostaCorretta: "" };
            if (tipo === "mcq") patch.opzioni = ["", "", "", ""];
            else delete (patch as any).opzioni;
            set(patch);
          }} style={s.input}>
            {TIPI.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
      </div>

      <label style={{ ...s.label, marginBottom: 10 }}>
        Testo della domanda
        <textarea value={d.testo} onChange={e => set({ testo: e.target.value })}
          rows={2} style={{ ...s.input, resize: "vertical" as const }} placeholder="Scrivi la domanda..." />
      </label>

      {d.tipo === "mcq" && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#20489a", marginBottom: 6 }}>Opzioni (seleziona quella corretta)</div>
          {(d.opzioni || []).map((op, oi) => (
            <div key={oi} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <input type="radio" name={`corr-${idx}`} checked={d.rispostaCorretta === op && op !== ""}
                onChange={() => set({ rispostaCorretta: op })}
                style={{ accentColor: "#1cb0f6", width: 16, height: 16, flexShrink: 0 }} />
              <input value={op} onChange={e => {
                const nuove = [...(d.opzioni || [])];
                const wasCorrect = d.rispostaCorretta === op;
                nuove[oi] = e.target.value;
                set({ opzioni: nuove, rispostaCorretta: wasCorrect ? e.target.value : d.rispostaCorretta });
              }} style={{ ...s.input, flex: 1 }} placeholder={`Opzione ${oi + 1}`} />
              {(d.opzioni || []).length > 2 && (
                <button onClick={() => {
                  const nuove = (d.opzioni || []).filter((_, i) => i !== oi);
                  set({ opzioni: nuove, rispostaCorretta: d.rispostaCorretta === op ? "" : d.rispostaCorretta });
                }} style={{ background: "transparent", border: "none", color: "#aaa", cursor: "pointer", fontSize: 16 }}>✕</button>
              )}
            </div>
          ))}
          {(d.opzioni || []).length < 6 && (
            <button onClick={() => set({ opzioni: [...(d.opzioni || []), ""] })}
              style={{ ...s.btnOutline, fontSize: 12, padding: "4px 12px", marginTop: 4 }}>+ Aggiungi opzione</button>
          )}
          {!d.rispostaCorretta && <p style={{ fontSize: 11, color: "#e07000", marginTop: 6 }}>Seleziona la risposta corretta.</p>}
        </div>
      )}

      {d.tipo === "vero_falso" && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#20489a", marginBottom: 6 }}>Risposta corretta</div>
          <div style={{ display: "flex", gap: 16 }}>
            {["vero", "falso"].map(v => (
              <label key={v} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                <input type="radio" checked={d.rispostaCorretta === v} onChange={() => set({ rispostaCorretta: v })}
                  style={{ accentColor: "#1cb0f6" }} />
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </label>
            ))}
          </div>
        </div>
      )}

      {d.tipo === "completamento" && (
        <label style={{ ...s.label, marginBottom: 10 }}>
          Risposta attesa <span style={{ fontWeight: 400, color: "#6b7280", fontSize: 11 }}>(confronto case-insensitive)</span>
          <input value={d.rispostaCorretta || ""} onChange={e => set({ rispostaCorretta: e.target.value })}
            style={s.input} placeholder="Parola o frase attesa..." />
        </label>
      )}

      {d.tipo === "testo_libero" && (
        <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>La risposta sarà corretta manualmente dall'admin.</p>
      )}
    </div>
  );
}

// ── Vista risultati di un singolo tentativo ────────────────────────────────────
function TentativoDetail({ tentativo, domande, onCorrezione }: {
  tentativo: Tentativo;
  domande: Domanda[];
  onCorrezione: (tid: number, correzione: Record<string, { corretto: boolean; nota?: string }>) => void;
}) {
  const [corr, setCorr] = useState<Record<string, { corretto: boolean; nota?: string }>>(
    tentativo.correzioneManuale || {}
  );
  const [saving, setSaving] = useState(false);
  const risposte = tentativo.risposte as Record<string, string>;

  const nomeStu = [tentativo.cliente.nomeReferente, tentativo.cliente.nome, tentativo.cliente.cognome]
    .filter(Boolean).join(" ");

  const hasManuali = domande.some(d => d.tipo === "testo_libero");
  const tutteCorrete = !hasManuali || domande.every((d, i) => d.tipo !== "testo_libero" || corr[String(i)] !== undefined);

  async function salvaCorrezione() {
    setSaving(true);
    try {
      const res = await fetch(`/api/quiz/${tentativo.quizId}/tentativo/${tentativo.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correzioneManuale: corr }),
      });
      if (!res.ok) throw new Error("Errore");
      const updated = await res.json();
      onCorrezione(tentativo.id, corr);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: "#f8faff", border: "1px solid #dbe4f1", borderRadius: 10, padding: "12px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: "#20489a" }}>{nomeStu}</span>
        <span style={{ fontSize: 12, color: "#6b7280" }}>
          {new Date(tentativo.completatoAt).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      {tentativo.punteggio !== null && (
        <div style={{ marginBottom: 10 }}>
          <span style={{
            background: tentativo.punteggio >= 60 ? "#c7f7d7" : "#ffebee",
            color: tentativo.punteggio >= 60 ? "#12753a" : "#c62828",
            borderRadius: 20, padding: "3px 12px", fontWeight: 700, fontSize: 13,
          }}>
            Punteggio: {tentativo.punteggio.toFixed(0)}%
          </span>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {domande.map((d, i) => {
          const risposta = risposte[String(i)];
          const isManuale = d.tipo === "testo_libero";
          const corrInfo = corr[String(i)];
          let autoCorretta: boolean | null = null;
          if (!isManuale) {
            if (!risposta) { autoCorretta = false; }
            else if (d.tipo === "completamento") {
              autoCorretta = String(risposta).trim().toLowerCase() === String(d.rispostaCorretta).trim().toLowerCase();
            } else {
              autoCorretta = String(risposta).trim() === String(d.rispostaCorretta).trim();
            }
          }
          return (
            <div key={i} style={{ background: "#fff", border: "1px solid #e8edf5", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                Dom. {i + 1} · <span style={{ fontStyle: "italic" }}>{TIPI.find(t => t.value === d.tipo)?.label}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#20489a", marginBottom: 6 }}>{d.testo}</div>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: "#6b7280" }}>Risposta: </span>
                <span style={{ fontWeight: 600 }}>{risposta || <em style={{ color: "#aaa" }}>non risposto</em>}</span>
              </div>
              {!isManuale && d.tipo !== "testo_libero" && (
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  <span style={{ color: "#6b7280" }}>Corretta: </span>
                  <span style={{ fontWeight: 700 }}>{d.rispostaCorretta}</span>
                  <span style={{
                    marginLeft: 8, fontWeight: 700,
                    color: autoCorretta ? "#12753a" : "#c62828",
                  }}>{autoCorretta ? "✓" : "✗"}</span>
                </div>
              )}
              {isManuale && (
                <div style={{ marginTop: 8, padding: "8px 10px", background: "#f0f7ff", borderRadius: 8, border: "1px solid #c3d9f0" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#20489a", marginBottom: 6 }}>Correzione manuale</div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    {["corretto", "errato"].map(v => (
                      <label key={v} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 13 }}>
                        <input type="radio" name={`corrm-${tentativo.id}-${i}`}
                          checked={corrInfo?.corretto === (v === "corretto")}
                          onChange={() => setCorr(prev => ({ ...prev, [String(i)]: { ...prev[String(i)], corretto: v === "corretto" } }))}
                          style={{ accentColor: v === "corretto" ? "#12753a" : "#c62828" }} />
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                      </label>
                    ))}
                    <input value={corrInfo?.nota || ""} onChange={e => setCorr(prev => ({ ...prev, [String(i)]: { ...prev[String(i)] || { corretto: false }, nota: e.target.value } }))}
                      style={{ ...s.input, flex: 1, minWidth: 120 }} placeholder="Nota (opzionale)" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {hasManuali && (
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={salvaCorrezione} disabled={saving || !tutteCorrete}
            style={{ ...s.btn(), opacity: saving || !tutteCorrete ? 0.6 : 1 }}>
            {saving ? "Salvataggio..." : "Salva correzione"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Form creazione/modifica quiz ───────────────────────────────────────────────
function QuizForm({ lezioneId, initial, draft, onSaved, onCancel }: {
  lezioneId: number;
  initial?: Quiz;
  draft?: { titolo: string; domande: Domanda[] };
  onSaved: (q: Quiz) => void;
  onCancel: () => void;
}) {
  const [titolo, setTitolo] = useState(initial?.titolo ?? draft?.titolo ?? "");
  const [domande, setDomande] = useState<Domanda[]>(
    initial?.domande?.length ? initial.domande : draft?.domande?.length ? draft.domande : [domandaVuota()]
  );
  const [saving, setSaving] = useState(false);

  const aggiornaDomanda = (i: number, d: Domanda) => setDomande(prev => prev.map((x, j) => j === i ? d : x));
  const rimuoviDomanda = (i: number) => setDomande(prev => prev.filter((_, j) => j !== i));

  const canSave = titolo.trim() && domande.length > 0 && domande.every(d => {
    if (!d.testo.trim()) return false;
    if (d.tipo === "mcq") {
      const valide = (d.opzioni || []).filter(o => o.trim());
      return valide.length >= 2 && d.rispostaCorretta && (d.opzioni || []).includes(d.rispostaCorretta);
    }
    if (d.tipo === "vero_falso") return !!d.rispostaCorretta;
    if (d.tipo === "completamento") return !!d.rispostaCorretta?.trim();
    return true; // testo_libero
  });

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const url = initial ? `/api/quiz/${initial.id}` : "/api/quiz";
      const method = initial ? "PATCH" : "POST";
      const body = initial
        ? { titolo: titolo.trim(), domande }
        : { lezioneId, titolo: titolo.trim(), domande };
      const res = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      const saved = await res.json();
      onSaved(saved);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: "#fff", border: "1.5px solid #1cb0f6", borderRadius: 12, padding: "18px 20px" }}>
      <h3 style={{ margin: "0 0 14px", color: "#20489a", fontSize: 15, fontWeight: 800 }}>
        {initial ? "Modifica quiz" : "Nuovo quiz"}
      </h3>
      <label style={{ ...s.label, marginBottom: 14 }}>
        Titolo del quiz
        <input value={titolo} onChange={e => setTitolo(e.target.value)} style={s.input} placeholder="Es. Verifica capitolo 3" />
      </label>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
        {domande.map((d, i) => (
          <DomandaEditor key={i} d={d} idx={i}
            onChange={updated => aggiornaDomanda(i, updated)}
            onRemove={() => rimuoviDomanda(i)} />
        ))}
      </div>

      <button onClick={() => setDomande(prev => [...prev, domandaVuota()])}
        style={{ ...s.btnOutline, marginBottom: 16 }}>
        + Aggiungi domanda
      </button>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={s.btnOutline}>Annulla</button>
        <button onClick={handleSave} disabled={saving || !canSave}
          style={{ ...s.btn(), opacity: saving || !canSave ? 0.6 : 1 }}>
          {saving ? "Salvataggio..." : initial ? "Salva modifiche" : "Crea quiz"}
        </button>
      </div>
    </div>
  );
}

function parseQuizJson(text: string): { titolo: string; domande: Domanda[] } | string {
  let obj: any;
  try { obj = JSON.parse(text); } catch { return "JSON non valido: controlla virgole e parentesi."; }
  if (!obj || typeof obj !== "object") return "Il JSON deve essere un oggetto.";
  if (!obj.titolo || typeof obj.titolo !== "string" || !obj.titolo.trim()) return 'Campo "titolo" mancante o vuoto.';
  if (!Array.isArray(obj.domande) || obj.domande.length === 0) return 'Campo "domande" mancante o array vuoto.';
  const tipiValidi = new Set(["mcq", "vero_falso", "completamento", "testo_libero"]);
  for (let i = 0; i < obj.domande.length; i++) {
    const d = obj.domande[i];
    if (!d || typeof d !== "object") return `Domanda ${i + 1}: non è un oggetto.`;
    if (!tipiValidi.has(d.tipo)) return `Domanda ${i + 1}: "tipo" deve essere mcq, vero_falso, completamento o testo_libero.`;
    if (!d.testo || !d.testo.trim()) return `Domanda ${i + 1}: "testo" mancante.`;
    if (d.tipo === "mcq") {
      if (!Array.isArray(d.opzioni) || d.opzioni.length < 2) return `Domanda ${i + 1}: "opzioni" deve avere almeno 2 elementi.`;
      if (!d.rispostaCorretta || !d.opzioni.includes(d.rispostaCorretta)) return `Domanda ${i + 1}: "rispostaCorretta" deve essere identica a una delle opzioni.`;
    }
    if (d.tipo === "vero_falso" && d.rispostaCorretta !== "vero" && d.rispostaCorretta !== "falso")
      return `Domanda ${i + 1}: "rispostaCorretta" deve essere "vero" o "falso".`;
    if (d.tipo === "completamento" && (!d.rispostaCorretta || !d.rispostaCorretta.trim()))
      return `Domanda ${i + 1}: "rispostaCorretta" mancante per il completamento.`;
  }
  const domande: Domanda[] = obj.domande.map((d: any) => {
    const out: Domanda = { tipo: d.tipo, testo: d.testo.trim() };
    if (d.tipo === "mcq") { out.opzioni = d.opzioni.map(String); out.rispostaCorretta = d.rispostaCorretta; }
    if (d.tipo === "vero_falso") out.rispostaCorretta = d.rispostaCorretta;
    if (d.tipo === "completamento") out.rispostaCorretta = d.rispostaCorretta.trim();
    return out;
  });
  return { titolo: obj.titolo.trim(), domande };
}

// ── Componente principale QuizEditor ──────────────────────────────────────────
export default function QuizEditor({ lezioneId, onQuizChange }: { lezioneId: number; onQuizChange?: () => void }) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [expandedQuiz, setExpandedQuiz] = useState<number | null>(null);
  const [tentativi, setTentativi] = useState<Record<number, Tentativo[]>>({});
  const [loadingTentativi, setLoadingTentativi] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [importDraft, setImportDraft] = useState<{ titolo: string; domande: Domanda[] } | null>(null);

  useEffect(() => {
    fetch(`/api/quiz?lezioneId=${lezioneId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setQuizzes(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [lezioneId]);

  async function loadTentativi(quizId: number) {
    if (tentativi[quizId]) { setExpandedQuiz(quizId); return; }
    setLoadingTentativi(quizId);
    try {
      const res = await fetch(`/api/quiz/${quizId}/tentativo`, { credentials: "include" });
      const data = await res.json();
      setTentativi(prev => ({ ...prev, [quizId]: Array.isArray(data) ? data : [] }));
      setExpandedQuiz(quizId);
    } finally {
      setLoadingTentativi(null);
    }
  }

  async function handleDelete(quizId: number) {
    if (!confirm("Eliminare il quiz e tutti i tentativi associati?")) return;
    await fetch(`/api/quiz/${quizId}`, { method: "DELETE", credentials: "include" });
    setQuizzes(prev => prev.filter(q => q.id !== quizId));
    if (expandedQuiz === quizId) setExpandedQuiz(null);
    onQuizChange?.();
  }

  function handleSaved(quiz: Quiz) {
    if (editingQuiz) {
      setQuizzes(prev => prev.map(q => q.id === quiz.id ? { ...q, ...quiz } : q));
      setEditingQuiz(null);
    } else {
      setQuizzes(prev => [...prev, { ...quiz, _count: { tentativi: 0 } }]);
      setShowForm(false);
    }
    onQuizChange?.();
  }

  if (loading) return <div style={{ padding: 20, color: "#20489a" }}>Caricamento...</div>;

  return (
    <div style={{ padding: "16px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: "#20489a" }}>
          {quizzes.length} quiz {quizzes.length === 1 ? "associato" : "associati"} a questa lezione
        </span>
        {!showForm && !editingQuiz && !showImport && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowImport(true)} style={s.btnOutline}>Importa JSON</button>
            <button onClick={() => setShowForm(true)} style={s.btn()}>+ Nuovo quiz</button>
          </div>
        )}
      </div>

      {showImport && !showForm && !editingQuiz && (
        <div style={{ background: "#f8faff", border: "1.5px solid #4268b3", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#20489a", marginBottom: 8 }}>
            Importa quiz da JSON
          </div>
          <textarea
            value={importText}
            onChange={e => { setImportText(e.target.value); setImportError(""); }}
            rows={8}
            style={{ ...s.input, fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
            placeholder={'{\n  "titolo": "Matematica — Eq. 2° grado — Ripasso",\n  "domande": [...]\n}'}
          />
          {importError && <p style={{ fontSize: 12, color: "#c62828", margin: "6px 0 0", fontWeight: 600 }}>{importError}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
            <button onClick={() => { setShowImport(false); setImportText(""); setImportError(""); }} style={s.btnOutline}>Annulla</button>
            <button
              onClick={() => {
                const result = parseQuizJson(importText);
                if (typeof result === "string") { setImportError(result); return; }
                setImportDraft(result);
                setShowImport(false);
                setImportText("");
                setImportError("");
                setShowForm(true);
              }}
              style={s.btn()}
            >
              Carica nel form
            </button>
          </div>
        </div>
      )}

      {(showForm && !editingQuiz) && (
        <div style={{ marginBottom: 16 }}>
          <QuizForm
            lezioneId={lezioneId}
            draft={importDraft || undefined}
            onSaved={q => { setImportDraft(null); handleSaved(q); }}
            onCancel={() => { setShowForm(false); setImportDraft(null); }}
          />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {quizzes.map(q => (
          <div key={q.id} style={{ background: "#fff", border: "1.5px solid #dbe4f1", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#20489a" }}>{q.titolo}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  {(q.domande as Domanda[]).length} domande · {q._count?.tentativi ?? "?"} tentativi
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setEditingQuiz(q); setShowForm(false); }}
                  style={{ ...s.btnOutline, fontSize: 12, padding: "5px 12px" }}>Modifica</button>
                <button onClick={() => expandedQuiz === q.id ? setExpandedQuiz(null) : loadTentativi(q.id)}
                  style={{ ...s.btn("#4268b3"), fontSize: 12, padding: "5px 12px" }}>
                  {loadingTentativi === q.id ? "..." : expandedQuiz === q.id ? "Chiudi risultati" : "Vedi risultati"}
                </button>
                <button onClick={() => handleDelete(q.id)}
                  style={{ ...s.btn("#c62828"), fontSize: 12, padding: "5px 12px" }}>Elimina</button>
              </div>
            </div>

            {editingQuiz?.id === q.id && (
              <div style={{ borderTop: "1px solid #dbe4f1", padding: "12px 16px" }}>
                <QuizForm lezioneId={lezioneId} initial={editingQuiz}
                  onSaved={handleSaved} onCancel={() => setEditingQuiz(null)} />
              </div>
            )}

            {expandedQuiz === q.id && (
              <div style={{ borderTop: "1px solid #dbe4f1", padding: "12px 16px" }}>
                {!tentativi[q.id]?.length ? (
                  <p style={{ color: "#aaa", fontSize: 13, margin: 0 }}>Nessun tentativo ancora.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {tentativi[q.id].map(t => (
                      <TentativoDetail key={t.id} tentativo={t} domande={q.domande as Domanda[]}
                        onCorrezione={(tid, corr) => {
                          setTentativi(prev => ({
                            ...prev,
                            [q.id]: prev[q.id].map(x => x.id === tid ? { ...x, correzioneManuale: corr } : x),
                          }));
                        }} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {quizzes.length === 0 && !showForm && (
          <div style={{ textAlign: "center", padding: "30px 20px", color: "#aaa", fontSize: 13 }}>
            Nessun quiz associato a questa lezione.
          </div>
        )}
      </div>
    </div>
  );
}
