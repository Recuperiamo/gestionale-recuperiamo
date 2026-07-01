// @ts-nocheck
"use client";
import { useState, useEffect } from "react";

type TipoDomanda = "mcq" | "vero_falso" | "testo_libero" | "completamento";
interface Domanda { tipo: TipoDomanda; testo: string; opzioni?: string[]; rispostaCorretta?: string; }
interface Quiz { id: number; titolo: string; domande: Domanda[]; mioTentativo?: Tentativo | null; }
interface Tentativo {
  id: number; quizId: number; risposte: Record<string, string>;
  punteggio: number | null; totaleAutomatico: number | null;
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

// Fluid type scale — clamp(min, preferred, max)
const F = {
  xs:   "clamp(11px, 0.85vw, 14px)",
  sm:   "clamp(13px, 1vw,   16px)",
  base: "clamp(14px, 1.15vw, 18px)",
  md:   "clamp(16px, 1.4vw,  22px)",
  lg:   "clamp(18px, 1.7vw,  26px)",
  xl:   "clamp(22px, 2.2vw,  32px)",
  score:"clamp(48px, 6vw,    88px)",
};

function scoreColor(p) { return p === null ? "#92400e" : p >= 60 ? "#12753a" : p >= 40 ? "#b45309" : "#c62828"; }
function scoreBg(p)    { return p === null ? "#fef3c7" : p >= 60 ? "#d1fae5" : p >= 40 ? "#fef3c7" : "#fee2e2"; }
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

// ── Risultati ─────────────────────────────────────────────────────────────────
function RisultatiView({ quiz, tentativo, previewMode }) {
  const { domande } = quiz;
  const risposte = tentativo.risposte;
  const corr = tentativo.correzioneManuale;
  const p = tentativo.punteggio;

  return (
    <div>
      {previewMode && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "clamp(8px,1vw,12px) clamp(12px,1.5vw,20px)", fontSize: F.sm, color: "#92400e", fontWeight: 700, marginBottom: "clamp(16px,2vw,28px)", textAlign: "center" }}>
          Modalità anteprima — risultati non salvati
        </div>
      )}

      {/* Score card */}
      <div style={{ background: scoreBg(p), border: `2px solid ${scoreColor(p)}30`, borderRadius: 20, padding: "clamp(28px,4vw,56px) clamp(20px,3vw,40px)", textAlign: "center", marginBottom: "clamp(24px,3vw,40px)" }}>
        <div style={{ fontSize: "clamp(48px,6vw,80px)", marginBottom: "clamp(8px,1vw,14px)" }}>{scoreEmoji(p)}</div>
        {p !== null ? (
          <>
            <div style={{ fontSize: F.score, fontWeight: 900, color: scoreColor(p), lineHeight: 1, marginBottom: "clamp(10px,1.2vw,18px)" }}>{p}%</div>
            <div style={{ width: "100%", maxWidth: 320, margin: "0 auto clamp(12px,1.5vw,20px)", background: "#e5e7eb", borderRadius: 99, height: "clamp(8px,0.7vw,12px)", overflow: "hidden" }}>
              <div style={{ width: `${p}%`, height: "100%", background: scoreColor(p), borderRadius: 99, transition: "width 0.8s ease" }} />
            </div>
          </>
        ) : (
          <div style={{ fontSize: F.xl, fontWeight: 800, color: scoreColor(p), marginBottom: "clamp(10px,1.2vw,18px)" }}>In correzione</div>
        )}
        <div style={{ fontSize: F.base, color: scoreColor(p), fontWeight: 600 }}>{scoreMsg(p)}</div>
      </div>

      {/* Domande */}
      <div style={{ display: "flex", flexDirection: "column", gap: "clamp(10px,1.2vw,16px)" }}>
        {domande.map((d, i) => {
          const risposta = risposte[String(i)];
          const isManu = d.tipo === "testo_libero";
          const corrInfo = corr?.[String(i)];
          let esito = "attesa";
          if (!isManu) {
            if (!risposta) esito = "errata";
            else if (d.tipo === "completamento") esito = risposta.trim().toLowerCase() === (d.rispostaCorretta || "").trim().toLowerCase() ? "corretta" : "errata";
            else esito = risposta.trim() === (d.rispostaCorretta || "").trim() ? "corretta" : "errata";
          } else {
            esito = corrInfo === undefined ? "attesa" : corrInfo.corretto ? "corretta" : "errata";
          }
          const ec = esito === "corretta" ? "#12753a" : esito === "attesa" ? "#92400e" : "#c62828";
          const eb = esito === "corretta" ? "#d1fae5" : esito === "attesa" ? "#fef3c7" : "#fee2e2";
          const borderC = esito === "corretta" ? "#a7f3d0" : esito === "attesa" ? "#fde68a" : "#fca5a5";
          const ei = esito === "corretta" ? "✓" : esito === "attesa" ? "⏳" : "✗";

          return (
            <div key={i} style={{ background: "#fff", border: `1.5px solid ${borderC}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px,1vw,14px)", padding: "clamp(10px,1.1vw,16px) clamp(14px,1.5vw,22px)", background: eb }}>
                <span style={{ width: "clamp(28px,2.2vw,38px)", height: "clamp(28px,2.2vw,38px)", borderRadius: "50%", background: ec, color: "#fff", fontWeight: 900, fontSize: F.base, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{ei}</span>
                <span style={{ fontSize: F.sm, fontWeight: 700, color: ec, flex: 1 }}>Domanda {i + 1}</span>
                <span style={{ fontSize: F.xs, background: `${TIPI_COLOR[d.tipo]}18`, color: TIPI_COLOR[d.tipo], borderRadius: 20, padding: "3px clamp(8px,0.8vw,14px)", fontWeight: 700 }}>{TIPI_LABEL[d.tipo]}</span>
              </div>
              <div style={{ padding: "clamp(12px,1.5vw,20px) clamp(14px,1.8vw,24px)" }}>
                <div style={{ fontSize: F.md, fontWeight: 600, color: "#20489a", marginBottom: "clamp(8px,1vw,14px)", lineHeight: 1.4 }}>{d.testo}</div>
                <div style={{ fontSize: F.base, color: "#374151", marginBottom: esito === "errata" && !isManu ? "clamp(6px,0.7vw,10px)" : 0 }}>
                  <span style={{ color: "#6b7280" }}>La tua risposta: </span>
                  {risposta ? <span style={{ fontWeight: 600 }}>{risposta}</span> : <em style={{ color: "#aaa" }}>non risposto</em>}
                </div>
                {!isManu && esito === "errata" && d.rispostaCorretta && (
                  <div style={{ fontSize: F.sm, color: "#12753a", fontWeight: 700, background: "#d1fae5", borderRadius: 8, padding: "clamp(5px,0.6vw,8px) clamp(10px,1vw,16px)", display: "inline-block", marginTop: "clamp(4px,0.5vw,8px)" }}>
                    Risposta corretta: {d.rispostaCorretta}
                  </div>
                )}
                {isManu && corrInfo?.nota && (
                  <div style={{ fontSize: F.sm, color: "#4f46e5", marginTop: "clamp(6px,0.8vw,12px)", fontStyle: "italic", background: "#ede9fe", borderRadius: 8, padding: "clamp(5px,0.6vw,8px) clamp(10px,1vw,16px)" }}>
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

// ── Lista quiz per lezione (studente) ─────────────────────────────────────────
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
        const withT = await Promise.all(data.map(async q => {
          const r = await fetch(`/api/quiz/${q.id}/tentativo`, { credentials: "include" });
          return { ...q, mioTentativo: await r.json() };
        }));
        setQuizzes(withT);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadQuizzes(); }, [lezioneId]);

  if (loading) return <div style={{ padding: 20, color: "#20489a" }}>Caricamento quiz...</div>;
  if (aperto !== null) return <QuizPlayer quizId={aperto} onClose={() => { setAperto(null); loadQuizzes(); }} fullScreen />;
  if (quizzes.length === 0) return <div style={{ textAlign: "center", padding: "40px 20px", color: "#aaa", fontSize: 13 }}>Nessun quiz disponibile.</div>;

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
              {fatto && <span style={{ background: scoreBg(p), color: scoreColor(p), borderRadius: 20, padding: "3px 12px", fontWeight: 800, fontSize: 12 }}>{p === null ? "In correzione" : `${p}%`}</span>}
              <button onClick={() => setAperto(q.id)} style={{ background: fatto ? "#e3eefe" : "#1cb0f6", color: fatto ? "#20489a" : "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {fatto ? "Rivedi" : "Inizia"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── QuizPlayer principale ──────────────────────────────────────────────────────
export default function QuizPlayer({ quizId, onClose, previewMode = false, fullScreen = false }: {
  quizId: number; onClose?: () => void; previewMode?: boolean; fullScreen?: boolean;
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
        if (!previewMode && data.mioTentativo) { setTentativo(data.mioTentativo); setInviato(true); }
      })
      .finally(() => setLoading(false));
  }, [quizId]);

  async function handleSubmit() {
    if (!quiz) return;
    const nonRisposto = quiz.domande.some((_, i) => !risposte[String(i)]);
    if (nonRisposto && !confirm("Hai lasciato alcune risposte vuote. Inviare comunque?")) return;
    if (previewMode) { setTentativo(buildPreviewTentativo(quiz.domande, risposte)); setInviato(true); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quiz/${quizId}/tentativo`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ risposte }) });
      if (!res.ok) { const err = await res.json(); alert(err.error || "Errore invio"); return; }
      setTentativo(await res.json()); setInviato(true);
    } finally { setSubmitting(false); }
  }

  if (loading || !quiz) {
    const msg = <div style={{ padding: 40, textAlign: "center", color: "#20489a", fontSize: F.base }}>{loading ? "Caricamento..." : "Quiz non trovato."}</div>;
    return fullScreen ? <FullScreenWrap onClose={onClose} title="" previewMode={previewMode}>{msg}</FullScreenWrap> : msg;
  }

  const domande = quiz.domande;
  const risposteCount = Object.values(risposte).filter(Boolean).length;

  const body = inviato && tentativo ? (
    <>
      <RisultatiView quiz={quiz} tentativo={tentativo} previewMode={previewMode} />
      {onClose && (
        <div style={{ marginTop: "clamp(24px,3vw,40px)", textAlign: "center" }}>
          <button onClick={onClose} style={{ background: "#20489a", color: "#fff", border: "none", borderRadius: 12, padding: "clamp(12px,1.3vw,18px) clamp(32px,3.5vw,52px)", fontWeight: 800, fontSize: F.md, cursor: "pointer" }}>
            ← Torna indietro
          </button>
        </div>
      )}
    </>
  ) : (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "clamp(14px,1.5vw,22px)", marginBottom: "clamp(28px,3vw,44px)" }}>
        {domande.map((d, i) => {
          const risposta = risposte[String(i)] || "";
          const set = (v) => setRisposte(prev => ({ ...prev, [String(i)]: v }));
          const answered = !!risposta;
          return (
            <div key={i} style={{ background: "#fff", border: `2px solid ${answered ? "#bfdbfe" : "#e5e7eb"}`, borderRadius: 16, overflow: "hidden", transition: "border-color 0.2s" }}>
              {/* Header card domanda */}
              <div style={{ display: "flex", alignItems: "center", gap: "clamp(10px,1.1vw,16px)", padding: "clamp(10px,1.1vw,16px) clamp(14px,1.5vw,22px)", background: answered ? "#eff6ff" : "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <span style={{ width: "clamp(30px,2.4vw,42px)", height: "clamp(30px,2.4vw,42px)", borderRadius: "50%", background: answered ? "#1cb0f6" : "#d1d5db", color: "#fff", fontWeight: 900, fontSize: F.base, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}>
                  {answered ? "✓" : i + 1}
                </span>
                <span style={{ fontSize: F.sm, color: "#6b7280", flex: 1, fontWeight: 600 }}>Domanda {i + 1} di {domande.length}</span>
                <span style={{ fontSize: F.xs, background: `${TIPI_COLOR[d.tipo]}15`, color: TIPI_COLOR[d.tipo], borderRadius: 20, padding: "clamp(3px,0.3vw,5px) clamp(10px,1vw,16px)", fontWeight: 700 }}>{TIPI_LABEL[d.tipo]}</span>
              </div>

              {/* Body */}
              <div style={{ padding: "clamp(18px,2vw,30px) clamp(18px,2.2vw,32px)" }}>
                <div style={{ fontSize: F.md, fontWeight: 700, color: "#1e1b4b", marginBottom: "clamp(16px,2vw,28px)", lineHeight: 1.5 }}>{d.testo}</div>

                {d.tipo === "mcq" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "clamp(8px,0.9vw,14px)" }}>
                    {(d.opzioni || []).filter(o => o.trim()).map((op, oi) => {
                      const sel = risposta === op;
                      return (
                        <label key={oi} onClick={() => set(op)} style={{ display: "flex", alignItems: "center", gap: "clamp(12px,1.3vw,20px)", cursor: "pointer", padding: "clamp(12px,1.3vw,18px) clamp(14px,1.5vw,22px)", borderRadius: 12, border: `2px solid ${sel ? "#1cb0f6" : "#e5e7eb"}`, background: sel ? "#eff6ff" : "#fff", transition: "all 0.15s", userSelect: "none" }}>
                          <span style={{ width: "clamp(20px,1.6vw,28px)", height: "clamp(20px,1.6vw,28px)", borderRadius: "50%", border: `2px solid ${sel ? "#1cb0f6" : "#d1d5db"}`, background: sel ? "#1cb0f6" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                            {sel && <span style={{ width: "clamp(7px,0.6vw,10px)", height: "clamp(7px,0.6vw,10px)", borderRadius: "50%", background: "#fff" }} />}
                          </span>
                          <span style={{ fontSize: F.base, color: sel ? "#1e40af" : "#374151", fontWeight: sel ? 700 : 400 }}>{op}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {d.tipo === "vero_falso" && (
                  <div style={{ display: "flex", gap: "clamp(12px,1.5vw,22px)" }}>
                    {[{ v: "vero", label: "✓  Vero", color: "#059669" }, { v: "falso", label: "✗  Falso", color: "#dc2626" }].map(({ v, label, color }) => {
                      const sel = risposta === v;
                      return (
                        <label key={v} onClick={() => set(v)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: "clamp(16px,2vw,28px)", borderRadius: 14, border: `2px solid ${sel ? color : "#e5e7eb"}`, background: sel ? `${color}12` : "#fff", color: sel ? color : "#9ca3af", fontWeight: sel ? 800 : 500, fontSize: F.lg, transition: "all 0.15s", userSelect: "none" }}>
                          {label}
                        </label>
                      );
                    })}
                  </div>
                )}

                {d.tipo === "completamento" && (
                  <input value={risposta} onChange={e => set(e.target.value)}
                    style={{ display: "block", width: "100%", border: `2px solid ${risposta ? "#1cb0f6" : "#e5e7eb"}`, borderRadius: 12, padding: "clamp(12px,1.3vw,18px) clamp(14px,1.5vw,22px)", fontSize: F.base, fontFamily: "inherit", boxSizing: "border-box", outline: "none", transition: "border-color 0.2s" }}
                    placeholder="Scrivi la tua risposta..." />
                )}

                {d.tipo === "testo_libero" && (
                  <div>
                    <p style={{ fontSize: F.xs, color: "#7c3aed", margin: "0 0 clamp(8px,0.9vw,14px)", background: "#f3f0ff", borderRadius: 8, padding: "clamp(5px,0.6vw,8px) clamp(10px,1.1vw,16px)", display: "inline-block", fontWeight: 600 }}>✍️ Risposta corretta dal docente</p>
                    <textarea value={risposta} onChange={e => set(e.target.value)} rows={5}
                      style={{ display: "block", width: "100%", border: `2px solid ${risposta ? "#7c3aed" : "#e5e7eb"}`, borderRadius: 12, padding: "clamp(12px,1.3vw,18px) clamp(14px,1.5vw,22px)", fontSize: F.base, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical", outline: "none", transition: "border-color 0.2s" }}
                      placeholder="Scrivi qui la tua risposta..." />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "clamp(12px,1.5vw,24px)" }}>
        <span style={{ fontSize: F.sm, color: risposteCount === domande.length ? "#12753a" : "#6b7280", fontWeight: 600 }}>
          {risposteCount === domande.length ? "✓ Tutto risposto" : `${domande.length - risposteCount} senza risposta`}
        </span>
        <button onClick={handleSubmit} disabled={submitting} style={{ background: submitting ? "#d1d5db" : "#1cb0f6", color: "#fff", border: "none", borderRadius: 12, padding: "clamp(12px,1.4vw,20px) clamp(28px,3.5vw,52px)", fontWeight: 800, fontSize: F.md, cursor: submitting ? "not-allowed" : "pointer", transition: "background 0.2s" }}>
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
        progress={inviato ? null : { pct: Math.round((risposteCount / domande.length) * 100), count: risposteCount, total: domande.length }}
        previewMode={previewMode}
      >
        {body}
      </FullScreenWrap>
    );
  }
  return <div style={{ maxWidth: "min(900px, 92vw)", margin: "0 auto" }}>{body}</div>;
}

// ── Wrapper fullscreen ─────────────────────────────────────────────────────────
function FullScreenWrap({ title, onClose, progress, previewMode, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#f0f4ff", overflowY: "auto", display: "flex", flexDirection: "column" }}>
      {/* Barra top */}
      <div style={{ background: "#20489a", position: "sticky", top: 0, zIndex: 10, padding: "0 clamp(16px,2vw,32px)", display: "flex", alignItems: "center", gap: "clamp(12px,1.5vw,24px)", minHeight: "clamp(52px,5vw,68px)", flexShrink: 0 }}>
        {onClose && (
          <button onClick={onClose} style={{ background: "transparent", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 8, padding: "clamp(6px,0.6vw,10px) clamp(12px,1.3vw,20px)", color: "#fff", cursor: "pointer", fontSize: F.sm, fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" }}>
            ← Esci
          </button>
        )}
        <span style={{ color: "#fff", fontWeight: 700, fontSize: F.md, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {previewMode && <span style={{ fontSize: F.xs, background: "#f59e0b", color: "#fff", borderRadius: 6, padding: "2px clamp(6px,0.7vw,10px)", marginRight: "clamp(8px,1vw,14px)", fontWeight: 800, verticalAlign: "middle" }}>ANTEPRIMA</span>}
          {title}
        </span>
        {progress && (
          <span style={{ color: "#93c5fd", fontSize: F.sm, fontWeight: 700, flexShrink: 0 }}>
            {progress.count}/{progress.total}
          </span>
        )}
      </div>

      {/* Barra progresso */}
      {progress && (
        <div style={{ height: "clamp(4px,0.4vw,6px)", background: "#c7d2fe", flexShrink: 0 }}>
          <div style={{ width: `${progress.pct}%`, height: "100%", background: "#1cb0f6", transition: "width 0.3s ease" }} />
        </div>
      )}

      {/* Contenuto */}
      <div style={{ flex: 1, padding: "clamp(24px,3vw,48px) clamp(16px,4vw,48px) clamp(40px,5vw,72px)", maxWidth: "min(1000px, 92vw)", width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        {children}
      </div>
    </div>
  );
}
