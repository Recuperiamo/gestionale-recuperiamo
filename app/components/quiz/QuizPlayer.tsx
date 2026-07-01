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

const s = {
  btn: (color = "#1cb0f6", disabled = false) => ({
    background: disabled ? "#ddd" : color,
    color: disabled ? "#aaa" : "#fff",
    border: "none", borderRadius: 7,
    padding: "9px 20px", fontWeight: 700, fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
  }),
};

// ── Schermata risultati ────────────────────────────────────────────────────────
function RisultatiView({ quiz, tentativo }: { quiz: Quiz; tentativo: Tentativo }) {
  const domande = quiz.domande;
  const risposte = tentativo.risposte as Record<string, string>;
  const corr = tentativo.correzioneManuale as Record<string, { corretto: boolean; nota?: string }> | null;

  const inAttesa = tentativo.punteggio === null;

  return (
    <div>
      <div style={{ textAlign: "center", padding: "20px 0 24px", borderBottom: "1px solid #dbe4f1", marginBottom: 20 }}>
        {inAttesa ? (
          <>
            <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#20489a", marginBottom: 6 }}>Quiz inviato!</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Le risposte aperte sono in attesa di correzione.<br />Il punteggio finale sarà disponibile dopo la revisione.</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 48, marginBottom: 8 }}>
              {tentativo.punteggio >= 60 ? "🎉" : tentativo.punteggio >= 40 ? "👍" : "📚"}
            </div>
            <div style={{ fontWeight: 800, fontSize: 22, color: "#20489a", marginBottom: 6 }}>
              {tentativo.punteggio.toFixed(0)}%
            </div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              {tentativo.punteggio >= 60 ? "Ottimo lavoro!" : tentativo.punteggio >= 40 ? "Quasi! Ripassate gli argomenti indicati." : "Ripassate la lezione e riparlate con il vostro docente."}
            </div>
          </>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {domande.map((d, i) => {
          const risposta = risposte[String(i)];
          const isManu = d.tipo === "testo_libero";
          const corrInfo = corr?.[String(i)];

          let esito: "corretta" | "errata" | "attesa" | null = null;
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

          const color = esito === "corretta" ? "#12753a" : esito === "attesa" ? "#92400e" : "#c62828";
          const bg = esito === "corretta" ? "#c7f7d7" : esito === "attesa" ? "#fef3c7" : "#ffebee";
          const icon = esito === "corretta" ? "✓" : esito === "attesa" ? "⏳" : "✗";

          return (
            <div key={i} style={{ background: "#fff", border: "1px solid #e8edf5", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Domanda {i + 1} · {TIPI_LABEL[d.tipo]}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#20489a", marginBottom: 6 }}>{d.testo}</div>
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: "#6b7280" }}>La tua risposta: </span>
                    <span style={{ fontWeight: 600 }}>{risposta || <em style={{ color: "#aaa" }}>non risposto</em>}</span>
                  </div>
                  {!isManu && esito === "errata" && d.rispostaCorretta && (
                    <div style={{ fontSize: 12, color: "#12753a", marginTop: 4 }}>
                      Risposta corretta: <strong>{d.rispostaCorretta}</strong>
                    </div>
                  )}
                  {isManu && corrInfo?.nota && (
                    <div style={{ fontSize: 12, color: "#20489a", marginTop: 4, fontStyle: "italic" }}>
                      Nota del docente: {corrInfo.nota}
                    </div>
                  )}
                </div>
                <span style={{ background: bg, color, borderRadius: 20, padding: "3px 10px", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                  {icon}
                </span>
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

  useEffect(() => {
    fetch(`/api/quiz?lezioneId=${lezioneId}`, { credentials: "include" })
      .then(r => r.json())
      .then(async data => {
        if (!Array.isArray(data)) { setQuizzes([]); return; }
        // Carica i tentativi di ognuno
        const withTentativi = await Promise.all(
          data.map(async q => {
            const r = await fetch(`/api/quiz/${q.id}/tentativo`, { credentials: "include" });
            const t = await r.json();
            return { ...q, mioTentativo: t };
          })
        );
        setQuizzes(withTentativi);
      })
      .finally(() => setLoading(false));
  }, [lezioneId]);

  if (loading) return <div style={{ padding: 20, color: "#20489a" }}>Caricamento quiz...</div>;

  if (aperto !== null) {
    return (
      <QuizPlayer quizId={aperto} onClose={() => {
        setAperto(null);
        // Aggiorna lo stato dei tentativi ricaricando
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
      }} />
    );
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
        Quiz disponibili ({quizzes.length})
      </div>
      {quizzes.map(q => {
        const fatto = !!q.mioTentativo;
        const punteggio = q.mioTentativo?.punteggio;
        return (
          <div key={q.id} style={{ background: "#fff", border: "1.5px solid #dbe4f1", borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#20489a" }}>{q.titolo}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>
                {(q.domande as Domanda[]).length} domand{(q.domande as Domanda[]).length === 1 ? "a" : "e"}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {fatto && (
                <span style={{
                  background: punteggio === null ? "#fef3c7" : punteggio >= 60 ? "#c7f7d7" : "#ffebee",
                  color: punteggio === null ? "#92400e" : punteggio >= 60 ? "#12753a" : "#c62828",
                  borderRadius: 20, padding: "3px 12px", fontWeight: 700, fontSize: 12,
                }}>
                  {punteggio === null ? "In correzione" : `${punteggio.toFixed(0)}%`}
                </span>
              )}
              <button onClick={() => setAperto(q.id)}
                style={{ background: fatto ? "#e3eefe" : "#1cb0f6", color: fatto ? "#20489a" : "#fff", border: "none", borderRadius: 7, padding: "7px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
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
export default function QuizPlayer({ quizId, onClose }: { quizId: number; onClose?: () => void }) {
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
        if (data.mioTentativo) {
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
      const t = await res.json();
      setTentativo(t);
      setInviato(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div style={{ padding: 24, color: "#20489a" }}>Caricamento quiz...</div>;
  if (!quiz) return <div style={{ padding: 24, color: "#c62828" }}>Quiz non trovato.</div>;

  const domande = quiz.domande;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#20489a" }}>{quiz.titolo}</h2>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            {domande.length} domand{domande.length === 1 ? "a" : "e"}
            {inviato && tentativo && (
              <span style={{ marginLeft: 10, background: "#c7f7d7", color: "#12753a", borderRadius: 20, padding: "1px 10px", fontWeight: 700 }}>
                Completato
              </span>
            )}
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid #dbe4f1", borderRadius: 7, padding: "6px 14px", color: "#6b7280", cursor: "pointer", fontSize: 13 }}>
            ✕ Chiudi
          </button>
        )}
      </div>

      {inviato && tentativo ? (
        <RisultatiView quiz={quiz} tentativo={tentativo} />
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
            {domande.map((d, i) => {
              const risposta = risposte[String(i)] || "";
              const set = (v: string) => setRisposte(prev => ({ ...prev, [String(i)]: v }));

              return (
                <div key={i} style={{ background: "#fff", border: "1.5px solid #dbe4f1", borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>
                    Domanda {i + 1} di {domande.length} · {TIPI_LABEL[d.tipo]}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#20489a", marginBottom: 14, lineHeight: 1.4 }}>{d.testo}</div>

                  {d.tipo === "mcq" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(d.opzioni || []).filter(o => o.trim()).map((op, oi) => (
                        <label key={oi} onClick={() => set(op)}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            cursor: "pointer", padding: "10px 14px", borderRadius: 8,
                            border: "1.5px solid " + (risposta === op ? "#1cb0f6" : "#dbe4f1"),
                            background: risposta === op ? "#e8f7ff" : "#f8faff",
                            transition: "all 0.15s",
                          }}>
                          <input type="radio" name={`q-${i}`} value={op} checked={risposta === op}
                            onChange={() => set(op)} style={{ accentColor: "#1cb0f6" }} />
                          <span style={{ fontSize: 14, color: "#20489a", fontWeight: risposta === op ? 700 : 400 }}>{op}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {d.tipo === "vero_falso" && (
                    <div style={{ display: "flex", gap: 12 }}>
                      {["vero", "falso"].map(v => (
                        <label key={v} onClick={() => set(v)}
                          style={{
                            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                            gap: 8, cursor: "pointer", padding: "12px", borderRadius: 8,
                            border: "1.5px solid " + (risposta === v ? "#1cb0f6" : "#dbe4f1"),
                            background: risposta === v ? "#e8f7ff" : "#f8faff",
                            fontWeight: risposta === v ? 700 : 400, color: "#20489a", fontSize: 15,
                          }}>
                          <input type="radio" name={`q-${i}`} value={v} checked={risposta === v}
                            onChange={() => set(v)} style={{ accentColor: "#1cb0f6" }} />
                          {v.charAt(0).toUpperCase() + v.slice(1)}
                        </label>
                      ))}
                    </div>
                  )}

                  {d.tipo === "completamento" && (
                    <div>
                      <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 8px" }}>Completa con la parola o frase mancante:</p>
                      <input value={risposta} onChange={e => set(e.target.value)}
                        style={{ display: "block", width: "100%", border: "1.5px solid #dbe4f1", borderRadius: 8, padding: "10px 14px", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }}
                        placeholder="Scrivi la tua risposta..." />
                    </div>
                  )}

                  {d.tipo === "testo_libero" && (
                    <div>
                      <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 8px" }}>Scrivi la tua risposta (verrà corretta dal docente):</p>
                      <textarea value={risposta} onChange={e => set(e.target.value)}
                        rows={4} style={{ display: "block", width: "100%", border: "1.5px solid #dbe4f1", borderRadius: 8, padding: "10px 14px", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }}
                        placeholder="Scrivi la tua risposta..." />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={handleSubmit} disabled={submitting}
              style={s.btn("#1cb0f6", submitting)}>
              {submitting ? "Invio in corso..." : "Invia quiz"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
