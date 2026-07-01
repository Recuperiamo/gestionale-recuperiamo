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
  mioTentativo?: Tentativo | null;
}

interface Tentativo {
  id: number;
  quizId: number;
  risposte: Record<string, string>;
  punteggio: number | null;
  totaleAutomatico: number | null;
  correzioneManuale: Record<string, { corretto: boolean; nota?: string }> | null;
  completatoAt: string;
}

const TIPI_LABEL: Record<TipoDomanda, string> = {
  mcq: "Scelta multipla",
  vero_falso: "Vero / Falso",
  completamento: "Completamento",
  testo_libero: "Risposta aperta",
};

const TIPI_COLOR: Record<TipoDomanda, string> = {
  mcq: "#4f46e5", vero_falso: "#059669", completamento: "#d97706", testo_libero: "#7c3aed",
};

function scoreColor(p: number | null) {
  if (p === null) return "#92400e";
  if (p >= 60) return "#12753a";
  if (p >= 40) return "#b45309";
  return "#c62828";
}
function scoreBg(p: number | null) {
  if (p === null) return "#fef3c7";
  if (p >= 60) return "#d1fae5";
  if (p >= 40) return "#fef3c7";
  return "#fee2e2";
}
function scoreEmoji(p: number | null) {
  if (p === null) return "⏳";
  if (p >= 80) return "🎉";
  if (p >= 60) return "👏";
  if (p >= 40) return "📖";
  return "💪";
}
function scoreMsg(p: number | null) {
  if (p === null) return "In attesa di correzione";
  if (p >= 80) return "Eccellente! Ottima preparazione.";
  if (p >= 60) return "Buon lavoro! Qualche piccola lacuna.";
  if (p >= 40) return "Quasi! Ripassate gli argomenti in rosso.";
  return "Da rivedere. Ripassate la lezione e chiedete aiuto.";
}

// Calcola risultato localmente per la modalità anteprima admin
function buildPreviewTentativo(domande: Domanda[], risposte: Record<string, string>): Tentativo {
  let corrette = 0; let totAuto = 0;
  const correzioneManuale: Record<string, { corretto: boolean }> = {};
  domande.forEach((d, i) => {
    if (d.tipo === "testo_libero") { correzioneManuale[String(i)] = { corretto: true }; return; }
    totAuto++;
    const r = risposte[String(i)] || "";
    const ok = d.tipo === "completamento"
      ? r.trim().toLowerCase() === (d.rispostaCorretta || "").trim().toLowerCase()
      : r.trim() === (d.rispostaCorretta || "").trim();
    if (ok) corrette++;
  });
  const hasManuali = domande.some(d => d.tipo === "testo_libero");
  const punteggio = hasManuali ? null : totAuto > 0 ? Math.round((corrette / totAuto) * 100) : 0;
  return { id: -1, quizId: -1, risposte, punteggio, totaleAutomatico: punteggio, correzioneManuale: hasManuali ? correzioneManuale : null, completatoAt: new Date().toISOString() };
}

// ── Schermata risultati ────────────────────────────────────────────────────────
function RisultatiView({ quiz, tentativo, previewMode }: { quiz: Quiz; tentativo: Tentativo; previewMode?: boolean }) {
  const domande = quiz.domande;
  const risposte = tentativo.risposte as Record<string, string>;
  const corr = tentativo.correzioneManuale as Record<string, { corretto: boolean; nota?: string }> | null;
  const p = tentativo.punteggio;

  return (
    <div>
      {previewMode && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "#92400e", fontWeight: 600, marginBottom: 16, textAlign: "center" }}>
          Modalità anteprima admin — risultati non salvati
        </div>
      )}

      {/* Score card */}
      <div style={{ background: scoreBg(p), border: `2px solid ${scoreColor(p)}22`, borderRadius: 16, padding: "28px 20px", textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 6 }}>{scoreEmoji(p)}</div>
        {p !== null ? (
          <>
            <div style={{ fontSize: 42, fontWeight: 900, color: scoreColor(p), lineHeight: 1, marginBottom: 8 }}>{p}%</div>
            <div style={{ width: "100%", maxWidth: 240, margin: "0 auto 12px", background: "#e5e7eb", borderRadius: 99, height: 8, overflow: "hidden" }}>
              <div style={{ width: `${p}%`, height: "100%", background: scoreColor(p), borderRadius: 99, transition: "width 0.6s ease" }} />
            </div>
          </>
        ) : (
          <div style={{ fontSize: 20, fontWeight: 800, color: scoreColor(p), marginBottom: 8 }}>In correzione</div>
        )}
        <div style={{ fontSize: 14, color: scoreColor(p), fontWeight: 600 }}>{scoreMsg(p)}</div>
      </div>

      {/* Riepilogo domande */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {domande.map((d, i) => {
          const risposta = risposte[String(i)];
          const isManu = d.tipo === "testo_libero";
          const corrInfo = corr?.[String(i)];
          let esito: "corretta" | "errata" | "attesa" = "attesa";
          if (isManu) {
            esito = corrInfo === undefined ? "attesa" : corrInfo.corretto ? "corretta" : "errata";
          } else {
            if (!risposta) { esito = "errata"; }
            else if (d.tipo === "completamento") {
              esito = risposta.trim().toLowerCase() === (d.rispostaCorretta || "").trim().toLowerCase() ? "corretta" : "errata";
            } else {
              esito = risposta.trim() === (d.rispostaCorretta || "").trim() ? "corretta" : "errata";
            }
          }
          const esitoColor = esito === "corretta" ? "#12753a" : esito === "attesa" ? "#92400e" : "#c62828";
          const esitoBg = esito === "corretta" ? "#d1fae5" : esito === "attesa" ? "#fef3c7" : "#fee2e2";
          const esitoIcon = esito === "corretta" ? "✓" : esito === "attesa" ? "⏳" : "✗";

          return (
            <div key={i} style={{ background: "#fff", border: `1.5px solid ${esitoBg === "#d1fae5" ? "#a7f3d0" : esitoBg === "#fef3c7" ? "#fde68a" : "#fca5a5"}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: esitoBg }}>
                <span style={{ width: 26, height: 26, borderRadius: "50%", background: esitoColor, color: "#fff", fontWeight: 900, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{esitoIcon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: esitoColor, flex: 1 }}>Domanda {i + 1}</span>
                <span style={{ fontSize: 11, background: `${TIPI_COLOR[d.tipo]}18`, color: TIPI_COLOR[d.tipo], borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>{TIPI_LABEL[d.tipo]}</span>
              </div>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#20489a", marginBottom: 8 }}>{d.testo}</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: risposta && !isManu && esito === "errata" ? 4 : 0 }}>
                  <span style={{ fontWeight: 600 }}>Risposta: </span>
                  {risposta ? <span style={{ color: "#20489a" }}>{risposta}</span> : <em style={{ color: "#aaa" }}>non risposto</em>}
                </div>
                {!isManu && esito === "errata" && d.rispostaCorretta && (
                  <div style={{ fontSize: 12, color: "#12753a", fontWeight: 700, background: "#d1fae5", borderRadius: 6, padding: "4px 10px", display: "inline-block", marginTop: 4 }}>
                    Corretta: {d.rispostaCorretta}
                  </div>
                )}
                {isManu && corrInfo?.nota && (
                  <div style={{ fontSize: 12, color: "#4f46e5", marginTop: 6, fontStyle: "italic", background: "#ede9fe", borderRadius: 6, padding: "4px 10px" }}>
                    Nota del docente: {corrInfo.nota}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Lista quiz disponibili per una lezione (studente) ─────────────────────────
export function QuizListLezione({ lezioneId }: { lezioneId: number }) {
  const [quizzes, setQuizzes] = useState<{ id: number; titolo: string; domande: Domanda[]; mioTentativo?: any }[]>([]);
  const [loading, setLoading] = useState(true);
  const [aperto, setAperto] = useState<number | null>(null);

  function loadQuizzes() {
    setLoading(true);
    fetch(`/api/quiz?lezioneId=${lezioneId}`, { credentials: "include" })
      .then(r => r.json())
      .then(async data => {
        if (!Array.isArray(data)) { setQuizzes([]); return; }
        const withT = await Promise.all(
          data.map(async q => {
            const r = await fetch(`/api/quiz/${q.id}/tentativo`, { credentials: "include" });
            const t = await r.json();
            return { ...q, mioTentativo: t };
          })
        );
        setQuizzes(withT);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadQuizzes(); }, [lezioneId]);

  if (loading) return <div style={{ padding: 20, color: "#20489a" }}>Caricamento quiz...</div>;

  if (aperto !== null) {
    return <QuizPlayer quizId={aperto} onClose={() => { setAperto(null); loadQuizzes(); }} />;
  }

  if (quizzes.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", color: "#aaa", fontSize: 13 }}>
        Nessun quiz disponibile per questa lezione.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: "#20489a", marginBottom: 4 }}>
        Mettiti alla prova ({quizzes.length})
      </div>
      {quizzes.map(q => {
        const fatto = !!q.mioTentativo;
        const p = q.mioTentativo?.punteggio;
        return (
          <div key={q.id} style={{ background: "#fff", border: "1.5px solid #dbe4f1", borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#20489a" }}>{q.titolo}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>
                {(q.domande as Domanda[]).length} domand{(q.domande as Domanda[]).length === 1 ? "a" : "e"}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              {fatto && (
                <span style={{ background: scoreBg(p), color: scoreColor(p), borderRadius: 20, padding: "3px 12px", fontWeight: 800, fontSize: 12 }}>
                  {p === null ? "In correzione" : `${p.toFixed(0)}%`}
                </span>
              )}
              <button onClick={() => setAperto(q.id)}
                style={{ background: fatto ? "#e3eefe" : "#1cb0f6", color: fatto ? "#20489a" : "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {fatto ? "Rivedi" : "Inizia"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Componente principale QuizPlayer ──────────────────────────────────────────
export default function QuizPlayer({ quizId, onClose, previewMode = false }: {
  quizId: number;
  onClose?: () => void;
  previewMode?: boolean;
}) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [risposte, setRisposte] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [inviato, setInviato] = useState(false);
  const [tentativo, setTentativo] = useState<Tentativo | null>(null);

  useEffect(() => {
    fetch(`/api/quiz/${quizId}`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        setQuiz(data);
        if (!previewMode && data.mioTentativo) {
          setTentativo(data.mioTentativo);
          setInviato(true);
        }
      })
      .finally(() => setLoading(false));
  }, [quizId]);

  async function handleSubmit() {
    if (!quiz) return;
    const nonRisposto = quiz.domande.some((_, i) => !risposte[String(i)]);
    if (nonRisposto && !confirm("Hai lasciato alcune risposte vuote. Inviare comunque?")) return;

    if (previewMode) {
      setTentativo(buildPreviewTentativo(quiz.domande, risposte));
      setInviato(true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/quiz/${quizId}/tentativo`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ risposte }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Errore invio");
        return;
      }
      setTentativo(await res.json());
      setInviato(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div style={{ padding: 24, color: "#20489a", textAlign: "center" }}>Caricamento...</div>;
  if (!quiz) return <div style={{ padding: 24, color: "#c62828" }}>Quiz non trovato.</div>;

  const domande = quiz.domande;
  const risposteCount = Object.values(risposte).filter(Boolean).length;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#20489a", lineHeight: 1.2 }}>{quiz.titolo}</h2>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6, display: "flex", alignItems: "center", gap: 10 }}>
              <span>{domande.length} domande</span>
              {!inviato && <span style={{ color: "#1cb0f6", fontWeight: 700 }}>{risposteCount}/{domande.length} risposte</span>}
              {inviato && <span style={{ background: "#d1fae5", color: "#12753a", borderRadius: 20, padding: "1px 10px", fontWeight: 700 }}>Completato</span>}
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ background: "transparent", border: "1px solid #dbe4f1", borderRadius: 8, padding: "7px 14px", color: "#6b7280", cursor: "pointer", fontSize: 13, flexShrink: 0 }}>
              ✕ Chiudi
            </button>
          )}
        </div>

        {/* Barra avanzamento */}
        {!inviato && (
          <div style={{ background: "#e5e7eb", borderRadius: 99, height: 6, overflow: "hidden" }}>
            <div style={{ width: `${(risposteCount / domande.length) * 100}%`, height: "100%", background: "#1cb0f6", borderRadius: 99, transition: "width 0.3s ease" }} />
          </div>
        )}
      </div>

      {inviato && tentativo ? (
        <RisultatiView quiz={quiz} tentativo={tentativo} previewMode={previewMode} />
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
            {domande.map((d, i) => {
              const risposta = risposte[String(i)] || "";
              const set = (v: string) => setRisposte(prev => ({ ...prev, [String(i)]: v }));
              const answered = !!risposta;

              return (
                <div key={i} style={{ background: "#fff", border: `2px solid ${answered ? "#bfdbfe" : "#e5e7eb"}`, borderRadius: 14, overflow: "hidden", transition: "border-color 0.2s" }}>
                  {/* Question header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: answered ? "#eff6ff" : "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    <span style={{ width: 28, height: 28, borderRadius: "50%", background: answered ? "#1cb0f6" : "#d1d5db", color: "#fff", fontWeight: 900, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}>
                      {answered ? "✓" : i + 1}
                    </span>
                    <span style={{ fontSize: 12, color: "#6b7280", flex: 1, fontWeight: 600 }}>Domanda {i + 1} di {domande.length}</span>
                    <span style={{ fontSize: 11, background: `${TIPI_COLOR[d.tipo]}15`, color: TIPI_COLOR[d.tipo], borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>{TIPI_LABEL[d.tipo]}</span>
                  </div>

                  {/* Question body */}
                  <div style={{ padding: "16px 18px" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1e1b4b", marginBottom: 16, lineHeight: 1.5 }}>{d.testo}</div>

                    {d.tipo === "mcq" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {(d.opzioni || []).filter(o => o.trim()).map((op, oi) => {
                          const sel = risposta === op;
                          return (
                            <label key={oi} onClick={() => set(op)} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "11px 14px", borderRadius: 10, border: `2px solid ${sel ? "#1cb0f6" : "#e5e7eb"}`, background: sel ? "#eff6ff" : "#fff", transition: "all 0.15s", userSelect: "none" }}>
                              <span style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${sel ? "#1cb0f6" : "#d1d5db"}`, background: sel ? "#1cb0f6" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                                {sel && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                              </span>
                              <span style={{ fontSize: 14, color: sel ? "#1e40af" : "#374151", fontWeight: sel ? 700 : 400 }}>{op}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {d.tipo === "vero_falso" && (
                      <div style={{ display: "flex", gap: 12 }}>
                        {[{ v: "vero", label: "✓ Vero", color: "#059669" }, { v: "falso", label: "✗ Falso", color: "#dc2626" }].map(({ v, label, color }) => {
                          const sel = risposta === v;
                          return (
                            <label key={v} onClick={() => set(v)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", padding: "14px", borderRadius: 10, border: `2px solid ${sel ? color : "#e5e7eb"}`, background: sel ? `${color}10` : "#fff", color: sel ? color : "#6b7280", fontWeight: sel ? 800 : 500, fontSize: 15, transition: "all 0.15s", userSelect: "none" }}>
                              {label}
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {d.tipo === "completamento" && (
                      <input value={risposta} onChange={e => set(e.target.value)}
                        style={{ display: "block", width: "100%", border: `2px solid ${risposta ? "#1cb0f6" : "#e5e7eb"}`, borderRadius: 10, padding: "11px 14px", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none", transition: "border-color 0.2s" }}
                        placeholder="Scrivi la tua risposta..." />
                    )}

                    {d.tipo === "testo_libero" && (
                      <div>
                        <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 8px", background: "#f3f0ff", borderRadius: 6, padding: "5px 10px", display: "inline-block" }}>✍️ La risposta sarà corretta dal docente</p>
                        <textarea value={risposta} onChange={e => set(e.target.value)} rows={4}
                          style={{ display: "block", width: "100%", border: `2px solid ${risposta ? "#7c3aed" : "#e5e7eb"}`, borderRadius: 10, padding: "11px 14px", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical", outline: "none", transition: "border-color 0.2s" }}
                          placeholder="Scrivi qui la tua risposta..." />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: risposteCount === domande.length ? "#12753a" : "#6b7280", fontWeight: 600 }}>
              {risposteCount === domande.length ? "✓ Tutto risposto" : `${domande.length - risposteCount} senza risposta`}
            </span>
            <button onClick={handleSubmit} disabled={submitting}
              style={{ background: submitting ? "#d1d5db" : "#1cb0f6", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontWeight: 800, fontSize: 15, cursor: submitting ? "not-allowed" : "pointer", transition: "background 0.2s" }}>
              {submitting ? "Invio..." : previewMode ? "Vedi risultati" : "Invia quiz"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
