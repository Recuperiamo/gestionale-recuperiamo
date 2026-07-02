// @ts-nocheck
"use client";
import { useState, useEffect, useRef } from "react";
import QuizPlayer from "./QuizPlayer";
import Spinner from "../Spinner";

type TipoDomanda = "mcq" | "vero_falso" | "testo_libero" | "completamento";

interface Domanda {
  tipo: TipoDomanda;
  testo: string;
  opzioni?: string[];
  rispostaCorretta?: string;
  rispostaAttesa?: string;
}

interface LezioneRef {
  id: number;
  titolo: string;
  materia: string;
}

interface QuizItem {
  id: number;
  titolo: string;
  domande: Domanda[];
  createdAt: string;
  lezioni: { lezione: LezioneRef }[];
  _count?: { tentativi: number };
}

interface Tentativo {
  id: number;
  quizId: number;
  clienteId: number;
  risposte: Record<string, string>;
  punteggio: number | null;
  totaleAutomatico: number | null;
  correzioneManuale: Record<string, { corretto: boolean; nota?: string }> | null;
  allegati?: string[] | null;
  completatoAt: string;
  cliente: { id: number; nomeReferente: string; nome?: string; cognome?: string };
}

const TIPI: { value: TipoDomanda; label: string }[] = [
  { value: "mcq", label: "Scelta multipla" },
  { value: "vero_falso", label: "Vero / Falso" },
  { value: "completamento", label: "Completamento" },
  { value: "testo_libero", label: "Testo libero (manuale)" },
];

const MATERIE_ORDER = ["Matematica","Fisica","Chimica","Biologia","Informatica","Italiano","Latino","Storia","Filosofia","Inglese","Scienze","Generale"];
const MATERIE_COLORI: Record<string, string> = {
  Matematica:"#4f46e5", Fisica:"#7c3aed", Chimica:"#059669",
  Biologia:"#0891b2", Informatica:"#0369a1", Italiano:"#b45309",
  Latino:"#78350f", Storia:"#92400e", Filosofia:"#6d28d9",
  Inglese:"#be185d", Scienze:"#065f46", Generale:"#374151",
};
function colore(materia: string) { return MATERIE_COLORI[materia] || "#4f46e5"; }

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

// ── Editor singola domanda ────────────────────────────────────────────────────
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
          Risposta di riferimento
          <span style={{ fontWeight: 400, color: "#6b7280", fontSize: 11, marginLeft: 4 }}>
            (visibile al docente in fase di correzione — non usata per auto-grading)
          </span>
          <input value={d.rispostaAttesa || ""} onChange={e => set({ rispostaAttesa: e.target.value })}
            style={s.input} placeholder="Es. covalente, ibridati, adiacente..." />
        </label>
      )}

      {d.tipo === "testo_libero" && (
        <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>La risposta sarà corretta manualmente dall'admin.</p>
      )}
    </div>
  );
}

// ── Correzione tentativo ──────────────────────────────────────────────────────
function TentativoDetail({ tentativo, domande, onCorrezione, onAzzerato }: {
  tentativo: Tentativo;
  domande: Domanda[];
  onCorrezione: (tid: number, correzione: Record<string, { corretto: boolean; nota?: string }>) => void;
  onAzzerato: (tid: number) => void;
}) {
  const [corr, setCorr] = useState<Record<string, { corretto: boolean; nota?: string }>>(
    tentativo.correzioneManuale || {}
  );
  const [saving, setSaving] = useState(false);
  const [azzerando, setAzzerando] = useState(false);
  const risposte = tentativo.risposte as Record<string, string>;

  const nomeStu = [tentativo.cliente.nomeReferente, tentativo.cliente.nome, tentativo.cliente.cognome]
    .filter(Boolean).join(" ");

  const isManualeFn = (d: Domanda) => d.tipo === "testo_libero" || (d.tipo === "completamento" && !d.rispostaCorretta?.trim());
  const hasManuali = domande.some(isManualeFn);
  const tutteCorrete = !hasManuali || domande.every((d, i) => !isManualeFn(d) || corr[String(i)] !== undefined);

  async function salvaCorrezione() {
    setSaving(true);
    try {
      await fetch(`/api/quiz/${tentativo.quizId}/tentativo/${tentativo.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correzioneManuale: corr }),
      });
      onCorrezione(tentativo.id, corr);
    } finally {
      setSaving(false);
    }
  }

  async function azzeraTentativo() {
    if (!confirm(`Azzerare il tentativo di ${nomeStu}? Lo studente potrà riconsegnare il test.`)) return;
    setAzzerando(true);
    try {
      await fetch(`/api/quiz/${tentativo.quizId}/tentativo/${tentativo.id}`, {
        method: "DELETE", credentials: "include",
      });
      onAzzerato(tentativo.id);
    } finally {
      setAzzerando(false);
    }
  }

  return (
    <div style={{ background: "#f8faff", border: "1px solid #dbe4f1", borderRadius: 10, padding: "12px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: "#20489a" }}>{nomeStu}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            {new Date(tentativo.completatoAt).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
          <button onClick={azzeraTentativo} disabled={azzerando}
            style={{ background: "#fff0f0", color: "#c62828", border: "1px solid #fca5a5", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: azzerando ? "not-allowed" : "pointer", opacity: azzerando ? 0.6 : 1 }}>
            {azzerando ? "..." : "Azzera"}
          </button>
        </div>
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
          const isManuale = isManualeFn(d);
          const corrInfo = corr[String(i)];
          let autoCorretta: boolean | null = null;
          if (!isManuale) {
            autoCorretta = risposta
              ? String(risposta).trim() === String(d.rispostaCorretta).trim()
              : false;
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
                  <span style={{ marginLeft: 8, fontWeight: 700, color: autoCorretta ? "#12753a" : "#c62828" }}>
                    {autoCorretta ? "✓" : "✗"}
                  </span>
                </div>
              )}
              {isManuale && (
                <div style={{ marginTop: 8, padding: "8px 10px", background: "#f0f7ff", borderRadius: 8, border: "1px solid #c3d9f0" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#20489a", marginBottom: 6 }}>Correzione manuale</div>
                  {d.rispostaAttesa && (
                    <div style={{ fontSize: 12, color: "#059669", background: "#d1fae5", borderRadius: 6, padding: "4px 10px", marginBottom: 8, fontWeight: 600 }}>
                      Risposta di riferimento: <span style={{ fontWeight: 400 }}>{d.rispostaAttesa}</span>
                    </div>
                  )}
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
      {(tentativo.allegati as string[])?.length > 0 && (
        <div style={{ marginTop: 12, padding: "10px 12px", background: "#f0f7ff", border: "1px solid #c3d9f0", borderRadius: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5", marginBottom: 8 }}>📎 Foto allegate ({(tentativo.allegati as string[]).length})</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(tentativo.allegati as string[]).map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt={`Foto ${i + 1}`} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "2px solid #dbe4f1", cursor: "pointer" }} />
              </a>
            ))}
          </div>
        </div>
      )}
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

// ── Selezione lezioni (multi-select) ─────────────────────────────────────────
function LezioniSelect({ lezioni, selected, onChange }: {
  lezioni: LezioneRef[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const perMateria = MATERIE_ORDER.reduce((acc, m) => {
    const l = lezioni.filter(l => l.materia === m);
    if (l.length) acc[m] = l;
    return acc;
  }, {} as Record<string, LezioneRef[]>);

  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  }

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#20489a", marginBottom: 6 }}>
        Lezioni collegate
        {selected.length > 0 && (
          <span style={{ marginLeft: 8, background: "#e0e7ff", color: "#4f46e5", borderRadius: 10, padding: "1px 8px", fontWeight: 700 }}>
            {selected.length} selezionate
          </span>
        )}
      </div>
      <div style={{
        border: "1.5px solid #dbe4f1", borderRadius: 8, maxHeight: 220, overflowY: "auto", background: "#fafcff",
      }}>
        {Object.entries(perMateria).map(([materia, list]) => (
          <div key={materia}>
            <div style={{ padding: "6px 12px 4px", fontSize: 11, fontWeight: 700, color: colore(materia), background: "#f3f4f6", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0 }}>
              {materia}
            </div>
            {list.map(l => (
              <label key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", cursor: "pointer", borderBottom: "1px solid #f0f0f0", background: selected.includes(l.id) ? "#eff6ff" : "transparent" }}>
                <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggle(l.id)}
                  style={{ accentColor: "#4f46e5", width: 14, height: 14, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#1e1b4b" }}>{l.titolo}</span>
              </label>
            ))}
          </div>
        ))}
        {lezioni.length === 0 && (
          <div style={{ padding: 16, color: "#9ca3af", fontSize: 13, textAlign: "center" }}>Nessuna lezione disponibile</div>
        )}
      </div>
      {selected.length === 0 && (
        <p style={{ fontSize: 11, color: "#e07000", margin: "4px 0 0" }}>Seleziona almeno una lezione.</p>
      )}
    </div>
  );
}

// ── Form creazione/modifica quiz ──────────────────────────────────────────────
function QuizForm({ lezioni, defaultLezioneIds, initial, draft, onSaved, onCancel }: {
  lezioni: LezioneRef[];
  defaultLezioneIds?: number[];
  initial?: QuizItem;
  draft?: { titolo: string; domande: Domanda[] };
  onSaved: (q: QuizItem) => void;
  onCancel: () => void;
}) {
  const [titolo, setTitolo] = useState(initial?.titolo ?? draft?.titolo ?? "");
  const [domande, setDomande] = useState<Domanda[]>(
    initial?.domande?.length ? initial.domande : draft?.domande?.length ? draft.domande : [domandaVuota()]
  );
  const [selectedLezioneIds, setSelectedLezioneIds] = useState<number[]>(
    initial ? initial.lezioni.map(l => l.lezione.id) : defaultLezioneIds ?? []
  );
  const [saving, setSaving] = useState(false);

  const aggiornaDomanda = (i: number, d: Domanda) => setDomande(prev => prev.map((x, j) => j === i ? d : x));
  const rimuoviDomanda = (i: number) => setDomande(prev => prev.filter((_, j) => j !== i));

  const canSave = selectedLezioneIds.length > 0 && titolo.trim() && domande.length > 0 && domande.every(d => {
    if (!d.testo.trim()) return false;
    if (d.tipo === "mcq") {
      const valide = (d.opzioni || []).filter(o => o.trim());
      return valide.length >= 2 && d.rispostaCorretta && (d.opzioni || []).includes(d.rispostaCorretta);
    }
    if (d.tipo === "vero_falso") return !!d.rispostaCorretta;
    return true;
  });

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const url = initial ? `/api/quiz/${initial.id}` : "/api/quiz";
      const method = initial ? "PATCH" : "POST";
      const body = { lezioneIds: selectedLezioneIds, titolo: titolo.trim(), domande };
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
        {initial ? "Modifica test" : "Nuovo test"}
      </h3>

      <label style={{ ...s.label, marginBottom: 14 }}>
        Titolo del test
        <input value={titolo} onChange={e => setTitolo(e.target.value)} style={s.input} placeholder="Es. Verifica capitolo 3" />
      </label>

      <div style={{ marginBottom: 14 }}>
        <LezioniSelect lezioni={lezioni} selected={selectedLezioneIds} onChange={setSelectedLezioneIds} />
      </div>

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
          {saving ? "Salvataggio..." : initial ? "Salva modifiche" : "Crea test"}
        </button>
      </div>
    </div>
  );
}

// ── Parse JSON ────────────────────────────────────────────────────────────────
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
  }
  const domande: Domanda[] = obj.domande.map((d: any) => {
    const out: Domanda = { tipo: d.tipo, testo: d.testo.trim() };
    if (d.tipo === "mcq") { out.opzioni = d.opzioni.map(String); out.rispostaCorretta = d.rispostaCorretta; }
    if (d.tipo === "vero_falso") out.rispostaCorretta = d.rispostaCorretta;
    if (d.tipo === "completamento") {
      if (d.rispostaAttesa?.trim()) out.rispostaAttesa = d.rispostaAttesa.trim();
      if (d.rispostaCorretta?.trim()) out.rispostaCorretta = d.rispostaCorretta.trim();
    }
    return out;
  });
  return { titolo: obj.titolo.trim(), domande };
}

// ── Componente principale QuizEditor ─────────────────────────────────────────
export default function QuizEditor({
  lezioni,
  defaultLezioneId,
  onQuizChange,
}: {
  lezioni: LezioneRef[];
  defaultLezioneId?: number;
  onQuizChange?: () => void;
}) {
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<QuizItem | null>(null);
  const [expandedQuiz, setExpandedQuiz] = useState<number | null>(null);
  const [tentativi, setTentativi] = useState<Record<number, Tentativo[]>>({});
  const [loadingTentativi, setLoadingTentativi] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [importDraft, setImportDraft] = useState<{ titolo: string; domande: Domanda[] } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewQuizId, setPreviewQuizId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileDrop(file: File) {
    if (!file.name.endsWith(".json")) { setImportError("Il file deve avere estensione .json"); return; }
    const reader = new FileReader();
    reader.onload = (e) => { setImportText(String(e.target?.result || "")); setImportError(""); };
    reader.readAsText(file);
  }

  useEffect(() => {
    fetch("/api/quiz", { credentials: "include" })
      .then(r => r.json())
      .then(d => setQuizzes(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

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
    if (!confirm("Eliminare il test e tutti i tentativi associati?")) return;
    await fetch(`/api/quiz/${quizId}`, { method: "DELETE", credentials: "include" });
    setQuizzes(prev => prev.filter(q => q.id !== quizId));
    if (expandedQuiz === quizId) setExpandedQuiz(null);
    onQuizChange?.();
  }

  function handleSaved(quiz: QuizItem) {
    if (editingQuiz) {
      setQuizzes(prev => prev.map(q => q.id === quiz.id ? { ...q, ...quiz } : q));
      setEditingQuiz(null);
    } else {
      setQuizzes(prev => [{ ...quiz, _count: { tentativi: 0 } }, ...prev]);
      setShowForm(false);
    }
    setImportDraft(null);
    onQuizChange?.();
  }

  // Raggruppa quiz per materia (prima lezione collegata)
  const perMateria = MATERIE_ORDER.reduce((acc, m) => {
    const q = quizzes.filter(qz => qz.lezioni?.[0]?.lezione?.materia === m);
    if (q.length) acc[m] = q;
    return acc;
  }, {} as Record<string, QuizItem[]>);
  const senzaMateria = quizzes.filter(qz => !qz.lezioni?.length);

  if (loading) return <Spinner text="Carico i test..." />;

  return (
    <div style={{ padding: "16px 0" }}>

      {/* Toolbar */}
      {!showForm && !editingQuiz && !showImport && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 16 }}>
          <button onClick={() => setShowImport(true)} style={s.btnOutline}>Importa JSON</button>
          <button onClick={() => { setShowForm(true); }} style={s.btn()}>+ Nuovo test</button>
        </div>
      )}

      {/* Import JSON */}
      {showImport && !showForm && !editingQuiz && (
        <div style={{ background: "#f8faff", border: "1.5px solid #4268b3", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "#20489a" }}>Importa quiz da JSON</span>
            <button onClick={() => fileInputRef.current?.click()} style={{ ...s.btnOutline, fontSize: 11, padding: "4px 12px" }}>
              📂 Carica file
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept=".json,application/json" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileDrop(f); e.target.value = ""; }} />
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileDrop(f); }}
            style={{ position: "relative", borderRadius: 8, border: isDragging ? "2px dashed #4268b3" : "2px dashed transparent", background: isDragging ? "#e8f0fe" : "transparent", transition: "all .15s" }}>
            {isDragging && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#4268b3", fontWeight: 700, borderRadius: 8, pointerEvents: "none" }}>
                Rilascia il file .json qui
              </div>
            )}
            <textarea
              value={importText}
              onChange={e => { setImportText(e.target.value); setImportError(""); }}
              rows={8}
              style={{ ...s.input, fontFamily: "monospace", fontSize: 12, resize: "vertical", opacity: isDragging ? 0.3 : 1 }}
              placeholder={'{\n  "titolo": "Matematica — Eq. 2° grado — Ripasso",\n  "domande": [...]\n}'}
            />
          </div>
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
              style={s.btn()}>
              Carica nel form
            </button>
          </div>
        </div>
      )}

      {/* Form nuovo quiz */}
      {showForm && !editingQuiz && (
        <div style={{ marginBottom: 20 }}>
          <QuizForm
            lezioni={lezioni}
            defaultLezioneIds={defaultLezioneId ? [defaultLezioneId] : []}
            draft={importDraft || undefined}
            onSaved={handleSaved}
            onCancel={() => { setShowForm(false); setImportDraft(null); }}
          />
        </div>
      )}

      {/* Lista quiz per materia */}
      {Object.entries(perMateria).map(([materia, qList]) => (
        <div key={materia} style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "6px 0 6px 12px", borderLeft: `4px solid ${colore(materia)}` }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: colore(materia) }}>{materia}</span>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>{qList.length} test</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {qList.map(q => <QuizCard key={q.id} q={q} lezioni={lezioni} expandedQuiz={expandedQuiz} tentativi={tentativi} loadingTentativi={loadingTentativi} editingQuiz={editingQuiz} onEdit={setEditingQuiz} onSaved={handleSaved} onDelete={handleDelete} onLoadTentativi={loadTentativi} onPreview={setPreviewQuizId} onSetTentativi={setTentativi} setExpandedQuiz={setExpandedQuiz} />)}
          </div>
        </div>
      ))}

      {/* Quiz senza lezione */}
      {senzaMateria.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#9ca3af", marginBottom: 10 }}>Senza lezione collegata</div>
          {senzaMateria.map(q => <QuizCard key={q.id} q={q} lezioni={lezioni} expandedQuiz={expandedQuiz} tentativi={tentativi} loadingTentativi={loadingTentativi} editingQuiz={editingQuiz} onEdit={setEditingQuiz} onSaved={handleSaved} onDelete={handleDelete} onLoadTentativi={loadTentativi} onPreview={setPreviewQuizId} onSetTentativi={setTentativi} setExpandedQuiz={setExpandedQuiz} />)}
        </div>
      )}

      {quizzes.length === 0 && !showForm && (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "#9ca3af", fontSize: 13 }}>
          Nessun test ancora. Crea il primo!
        </div>
      )}

      {previewQuizId !== null && (
        <QuizPlayer quizId={previewQuizId} onClose={() => setPreviewQuizId(null)} previewMode={true} fullScreen={true} />
      )}
    </div>
  );
}

// ── Card singolo quiz ─────────────────────────────────────────────────────────
function QuizCard({ q, lezioni, expandedQuiz, tentativi, loadingTentativi, editingQuiz, onEdit, onSaved, onDelete, onLoadTentativi, onPreview, onSetTentativi, setExpandedQuiz }) {
  return (
    <div style={{ background: "#fff", border: "1.5px solid #dbe4f1", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 16px", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#20489a", marginBottom: 3 }}>{q.titolo}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {(q.domande as Domanda[]).length} domande · {q._count?.tentativi ?? "?"} tentativi
          </div>
          {q.lezioni?.length > 0 && (
            <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {q.lezioni.map(({ lezione }) => (
                <span key={lezione.id} style={{ fontSize: 11, background: "#e0e7ff", color: "#4f46e5", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>
                  {lezione.titolo}
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
          <button onClick={() => onPreview(q.id)} style={{ ...s.btnOutline, fontSize: 12, padding: "5px 12px" }}>👁 Testa</button>
          <button onClick={() => { onEdit(q); }} style={{ ...s.btnOutline, fontSize: 12, padding: "5px 12px" }}>Modifica</button>
          <button onClick={() => expandedQuiz === q.id ? setExpandedQuiz(null) : onLoadTentativi(q.id)}
            style={{ ...s.btn("#4268b3"), fontSize: 12, padding: "5px 12px" }}>
            {loadingTentativi === q.id ? "..." : expandedQuiz === q.id ? "Chiudi" : "Risultati"}
          </button>
          <button onClick={() => onDelete(q.id)} style={{ ...s.btn("#c62828"), fontSize: 12, padding: "5px 12px" }}>Elimina</button>
        </div>
      </div>

      {editingQuiz?.id === q.id && (
        <div style={{ borderTop: "1px solid #dbe4f1", padding: "12px 16px" }}>
          <QuizForm lezioni={lezioni} initial={editingQuiz} onSaved={onSaved} onCancel={() => onEdit(null)} />
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
                    onSetTentativi(prev => ({
                      ...prev,
                      [q.id]: prev[q.id].map(x => x.id === tid ? { ...x, correzioneManuale: corr } : x),
                    }));
                  }}
                  onAzzerato={(tid) => {
                    onSetTentativi(prev => ({
                      ...prev,
                      [q.id]: prev[q.id].filter(x => x.id !== tid),
                    }));
                  }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

