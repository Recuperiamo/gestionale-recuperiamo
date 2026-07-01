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
  mcq: "Scelta multipla", vero_falso: "Vero / Falso",
  completamento: "Completamento", testo_libero: "Risposta aperta",
};
const TIPI_COLOR: Record<TipoDomanda, string> = {
  mcq: "#4f46e5", vero_falso: "#059669", completamento: "#d97706", testo_libero: "#7c3aed",
};

function scoreColor(p) { return p === null ? "#92400e" : p >= 60 ? "#12753a" : p >= 40 ? "#b45309" : "#c62828"; }
function scoreBg(p) { return p === null ? "#fef3c7" : p >= 60 ? "#d1fae5" : p >= 40 ? "#fef3c7" : "#fee2e2"; }
function scoreEmoji(p) { return p === null ? "⏳" : p >= 80 ? "🎉" : p >= 60 ? "👏" : p >= 40 ? "📖" : "💪"; }
function scoreMsg(p) {
  if (p === null) return "Le risposte aperte sono in attesa di correzione.";
  if (p >= 80) return "Eccellente! Ottima preparazione.";
  if (p >= 60) return "Buon lavoro! Qualche piccola lacuna.";
  if (p >= 40) return "Quasi! Ripassate gli argomenti in rosso.";
  return "Da rivedere. Ripassate la lezione e chiedete aiuto.";
}

function buildPreviewTentativo(domande, risposte) {
  let corrette = 0; let totAuto = 0;
  const correzioneManuale = {};
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
function RisultatiView({ quiz, tentativo, previewMode }) {
  const domande = quiz.domande;
  const risposte = tentativo.risposte;
  const corr = tentativo.correzioneManuale;
  const p = tentativo.punteggio;

  return (
    <div>
      {previewMode && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#92400e", fontWeight: 600, marginBottom: 20, textAlign: "center" }}>
          Modalità anteprima — risultati non salvati
        </div>
      )}

      <div style={{ background: scoreBg(p), border: `2px solid ${scoreColor(p)}30`, borderRadius: 20, padding: "36px 24px", textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>{scoreEmoji(p)}</div>
        {p !== null ? (
          <>
            <div style={{ fontSize: 52, fontWeight: 900, color: scoreColor(p), lineHeight: 1, marginBottom: 10 }}>{p}%</div>
            <div style={{ width: "100%", maxWidth: 280, margin: "0 auto 16px", background: "#e5e7eb", borderRadius: 99, height: 10, overflow: "hidden" }}>
              <div style={{ width: `${p}%`, height: "100%", background: scoreColor(p), borderRadius: 99, transition: "width 0.8s ease" }} />
            </div>
          </>
        ) : (
          <div style={{ fontSize: 24, fontWeight: 800, color: scoreColor(p), marginBottom: 12 }}>In correzione</div>
        )}
        <div style={{ fontSize: 15, color: scoreColor(p), fontWeight: 600 }}>{scoreMsg(p)}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {domande.map((d, i) => {
          const risposta = risposte[String(i)];
          const isManu = d.tipo === "testo_libero";
          const corrInfo = corr?.[String(i)];
          let esito = "attesa";
          if (!isManu) {
            if (!risposta) { esito = "errata"; }
            else if (d.tipo === "completamento") {
              esito = risposta.trim().toLowerCase() === (d.rispostaCorretta || "").trim().toLowerCase() ? "corretta" : "errata";
            } else {
              esito = risposta.trim() === (d.rispostaCorretta || "").trim() ? "corretta" : "errata";
            }
          } else {
            esito = corrInfo === undefined ? "attesa" : corrInfo.corretto ? "corretta" : "errata";
          }
          const ec = esito === "corretta" ? "#12753a" : esito === "attesa" ? "#92400e" : "#c62828";
          const eb = esito === "corretta" ? "#d1fae5" : esito === "attesa" ? "#fef3c7" : "#fee2e2";
          const ei = esito === "corretta" ? "✓" : esito === "attesa" ? "⏳" : "✗";

          return (
            <div key={i} style={{ background: "#fff", border: `1.5px solid ${eb === "#d1fae5" ? "#a7f3d0" : eb === "#fef3c7" ? "#fde68a" : "#fca5a5"}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: eb }}>
                <span style={{ width: 30, height: 30, borderRadius: "50%", background: ec, color: "#fff", fontWeight: 900, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{ei}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: ec, flex: 1 }}>Domanda {i + 1}</span>
                <span style={{ fontSize: 11, background: `${TIPI_COLOR[d.tipo]}18`, color: TIPI_COLOR[d.tipo], borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>{TIPI_LABEL[d.tipo]}</span>
              </div>
              <div style={{ padding: "14px 18px" }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#20489a", marginBottom: 8 }}>{d.testo}</div>
                <div style={{ fontSize: 14, color: "#374151", marginBottom: esito === "errata" && !isManu ? 6 : 0 }}>
                  <span style={{ color: "#6b7280" }}>La tua risposta: </span>
                  {risposta ? <span style={{ fontWeight: 600 }}>{risposta}</span> : <em style={{ color: "#aaa" }}>non risposto</em>}
                </div>
                {!isManu && esito === "errata" && d.rispostaCorretta && (
                  <div style={{ fontSize: 13, color: "#12753a", fontWeight: 700, background: "#d1fae5", borderRadius: 8, padding: "6px 12px", display: "inline-block", marginTop: 4 }}>
                    Risposta corretta: {d.rispostaCorretta}
                  </div>
                )}
                {isManu && corrInfo?.nota && (
                  <div style={{ fontSize: 13, color: "#4f46e5", marginTop: 8, fontStyle: "italic", background: "#ede9fe", borderRadius: 8, padding: "6px 12px" }}>
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
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aperto, setAperto] = useState(null);

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
    return <QuizPlayer quizId={aperto} onClose={() => { setAperto(null); loadQuizzes(); }} fullScreen />;
  }

  if (quizzes.length === 0) {
    return <div style={{ textAlign: "center", padding: "40px 20px", color: "#aaa", fontSize: 13 }}>Nessun quiz disponibile per questa lezione.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: "#20489a", marginBottom: 4 }}>Mettiti alla prova ({quizzes.length})</div>
      {quizzes.map(q => {
        const fatto = !!q.mioTentativo;
        const p = q.mioTentativo?.punteggio;
        return (
          <div key={q.id} style={{ background: "#fff", border: "1.5px solid #dbe4f1", borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#20489a" }}>{q.titolo}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>{q.domande.length} domande</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              {fatto && (
                <span style={{ background: scoreBg(p), color: scoreColor(p), borderRadius: 20, padding: "3px 12px", fontWeight: 800, fontSize: 12 }}>
                  {p === null ? "In correzione" : `${p}%`}
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
export default function QuizPlayer({ quizId, onClose, previewMode = false, fullScreen = false }: {
  quizId: number;
  onClose?: () => void;
  previewMode?: boolean;
  fullScreen?: boolean;
}) {
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [risposte, setRisposte] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [inviato, setInviato] = useState(false);
  const [tentativo, setTentativo] = useState(null);

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
      if (!res.ok) { const err = await res.json(); alert(err.error || "Errore invio"); return; }
      setTentativo(await res.json());
      setInviato(true);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Contenuto interno ────────────────────────────────────────────────────────
  if (loading) {
    const inner = <div style={{ padding: 40, textAlign: "center", color: "#20489a", fontSize: 15 }}>Caricamento...</div>;
    return fullScreen ? <FullScreenWrap onClose={onClose} title="">{inner}</FullScreenWrap> : inner;
  }
  if (!quiz) {
    const inner = <div style={{ padding: 40, color: "#c62828" }}>Quiz non trovato.</div>;
    return fullScreen ? <FullScreenWrap onClose={onClose} title="">{inner}</FullScreenWrap> : inner;
  }

  const domande = quiz.domande;
  const risposteCount = Object.values(risposte).filter(Boolean).length;
  const progressPct = Math.round((risposteCount / domande.length) * 100);

  const body = inviato && tentativo ? (
    <>
      <RisultatiView quiz={quiz} tentativo={tentativo} previewMode={previewMode} />
      {onClose && (
        <div style={{ marginTop: 28, textAlign: "center" }}>
          <button onClick={onClose} style={{ background: "#20489a", color: "#fff", border: "none", borderRadius: 10, padding: "12px 36px", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
            ← Torna indietro
          </button>
        </div>
      )}
    </>
  ) : (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
        {domande.map((d, i) => {
          const risposta = risposte[String(i)] || "";
          const set = (v) => setRisposte(prev => ({ ...prev, [String(i)]: v }));
          const answered = !!risposta;

          return (
            <div key={i} style={{ background: "#fff", border: `2px solid ${answered ? "#bfdbfe" : "#e5e7eb"}`, borderRadius: 16, overflow: "hidden", transition: "border-color 0.2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", background: answered ? "#eff6ff" : "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <span style={{ width: 30, height: 30, borderRadius: "50%", background: answered ? "#1cb0f6" : "#d1d5db", color: "#fff", fontWeight: 900, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}>
                  {answered ? "✓" : i + 1}
                </span>
                <span style={{ fontSize: 13, color: "#6b7280", flex: 1, fontWeight: 600 }}>Domanda {i + 1} di {domande.length}</span>
                <span style={{ fontSize: 12, background: `${TIPI_COLOR[d.tipo]}15`, color: TIPI_COLOR[d.tipo], borderRadius: 20, padding: "3px 12px", fontWeight: 700 }}>{TIPI_LABEL[d.tipo]}</span>
              </div>
              <div style={{ padding: "20px 20px" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1e1b4b", marginBottom: 18, lineHeight: 1.5 }}>{d.testo}</div>

                {d.tipo === "mcq" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(d.opzioni || []).filter(o => o.trim()).map((op, oi) => {
                      const sel = risposta === op;
                      return (
                        <label key={oi} onClick={() => set(op)} style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer", padding: "13px 16px", borderRadius: 12, border: `2px solid ${sel ? "#1cb0f6" : "#e5e7eb"}`, background: sel ? "#eff6ff" : "#fff", transition: "all 0.15s", userSelect: "none" }}>
                          <span style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${sel ? "#1cb0f6" : "#d1d5db"}`, background: sel ? "#1cb0f6" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                            {sel && <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#fff" }} />}
                          </span>
                          <span style={{ fontSize: 15, color: sel ? "#1e40af" : "#374151", fontWeight: sel ? 700 : 400 }}>{op}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {d.tipo === "vero_falso" && (
                  <div style={{ display: "flex", gap: 14 }}>
                    {[{ v: "vero", label: "✓  Vero", color: "#059669" }, { v: "falso", label: "✗  Falso", color: "#dc2626" }].map(({ v, label, color }) => {
                      const sel = risposta === v;
                      return (
                        <label key={v} onClick={() => set(v)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: "18px", borderRadius: 14, border: `2px solid ${sel ? color : "#e5e7eb"}`, background: sel ? `${color}12` : "#fff", color: sel ? color : "#9ca3af", fontWeight: sel ? 800 : 500, fontSize: 17, transition: "all 0.15s", userSelect: "none", gap: 8 }}>
                          {label}
                        </label>
                      );
                    })}
                  </div>
                )}

                {d.tipo === "completamento" && (
                  <input value={risposta} onChange={e => set(e.target.value)}
                    style={{ display: "block", width: "100%", border: `2px solid ${risposta ? "#1cb0f6" : "#e5e7eb"}`, borderRadius: 12, padding: "13px 16px", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box", outline: "none", transition: "border-color 0.2s" }}
                    placeholder="Scrivi la tua risposta..." />
                )}

                {d.tipo === "testo_libero" && (
                  <div>
                    <p style={{ fontSize: 12, color: "#7c3aed", margin: "0 0 10px", background: "#f3f0ff", borderRadius: 8, padding: "6px 12px", display: "inline-block", fontWeight: 600 }}>✍️ Risposta corretta dal docente</p>
                    <textarea value={risposta} onChange={e => set(e.target.value)} rows={5}
                      style={{ display: "block", width: "100%", border: `2px solid ${risposta ? "#7c3aed" : "#e5e7eb"}`, borderRadius: 12, padding: "13px 16px", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical", outline: "none", transition: "border-color 0.2s" }}
                      placeholder="Scrivi qui la tua risposta..." />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 14, color: risposteCount === domande.length ? "#12753a" : "#6b7280", fontWeight: 600 }}>
          {risposteCount === domande.length ? "✓ Tutto risposto" : `${domande.length - risposteCount} senza risposta`}
        </span>
        <button onClick={handleSubmit} disabled={submitting}
          style={{ background: submitting ? "#d1d5db" : "#1cb0f6", color: "#fff", border: "none", borderRadius: 12, padding: "14px 36px", fontWeight: 800, fontSize: 16, cursor: submitting ? "not-allowed" : "pointer", transition: "background 0.2s" }}>
          {submitting ? "Invio..." : previewMode ? "Vedi risultati" : "Invia quiz"}
        </button>
      </div>
    </>
  );

  if (fullScreen) {
    return (
      <FullScreenWrap
        title={quiz.titolo}
        onClose={inviato ? onClose : undefined}
        progress={inviato ? null : { pct: progressPct, count: risposteCount, total: domande.length }}
        previewMode={previewMode}
      >
        {body}
      </FullScreenWrap>
    );
  }

  return <div style={{ maxWidth: 700, margin: "0 auto" }}>{body}</div>;
}

// ── Wrapper fullscreen ────────────────────────────────────────────────────────
function FullScreenWrap({ title, onClose, progress, previewMode, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#f0f4ff", overflowY: "auto", display: "flex", flexDirection: "column" }}>
      {/* Barra superiore */}
      <div style={{ background: "#20489a", position: "sticky", top: 0, zIndex: 10, padding: "0 20px", display: "flex", alignItems: "center", gap: 16, minHeight: 56, flexShrink: 0 }}>
        {onClose && (
          <button onClick={onClose} style={{ background: "transparent", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 8, padding: "6px 14px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            ← Esci
          </button>
        )}
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {previewMode && <span style={{ fontSize: 11, background: "#f59e0b", color: "#fff", borderRadius: 6, padding: "2px 8px", marginRight: 10, fontWeight: 800 }}>ANTEPRIMA</span>}
          {title}
        </span>
        {progress && (
          <span style={{ color: "#93c5fd", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            {progress.count}/{progress.total}
          </span>
        )}
      </div>

      {/* Barra progresso */}
      {progress && (
        <div style={{ height: 4, background: "#c7d2fe", flexShrink: 0 }}>
          <div style={{ width: `${progress.pct}%`, height: "100%", background: "#1cb0f6", transition: "width 0.3s ease" }} />
        </div>
      )}

      {/* Contenuto */}
      <div style={{ flex: 1, padding: "32px 20px 48px", maxWidth: 780, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        {children}
      </div>
    </div>
  );
}
