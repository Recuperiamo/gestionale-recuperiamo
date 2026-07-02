// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import QuizPlayer from "./QuizPlayer";
import Spinner from "../Spinner";

interface QuizItem {
  id: number;
  titolo: string;
  numeroDomande: number;
  tentativo: {
    id: number;
    punteggio: number | null;
    completatoAt: string;
    correzioneManuale: any;
  } | null;
}

interface GruppoLezione {
  lezione: { id: number; titolo: string; materia: string };
  quizzes: QuizItem[];
}

export default function QuizPanelAula({ clienteId, coloreTema = "#1cb0f6" }: {
  clienteId: number;
  coloreTema?: string;
}) {
  const [gruppi, setGruppi] = useState<GruppoLezione[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizAperto, setQuizAperto] = useState<number | null>(null);

  function load() {
    setLoading(true);
    fetch(`/api/quiz/overview?clienteId=${clienteId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setGruppi(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [clienteId]);

  if (loading) return <Spinner text="Carico i test..." />;

  if (quizAperto !== null) {
    return (
      <div style={{ padding: "16px 0" }}>
        <QuizPlayer quizId={quizAperto} onClose={() => { setQuizAperto(null); load(); }} fullScreen />
      </div>
    );
  }

  if (gruppi.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 20px", color: "#94a3b8", fontSize: 14 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
        Nessun test disponibile al momento.
      </div>
    );
  }

  const totalQuiz = gruppi.reduce((s, g) => s + g.quizzes.length, 0);
  const completati = gruppi.reduce((s, g) => s + g.quizzes.filter(q => q.tentativo).length, 0);

  return (
    <div style={{ padding: "4px 0" }}>
      {/* Riepilogo */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Test totali", val: totalQuiz, bg: `${coloreTema}15`, color: coloreTema },
          { label: "Completati", val: completati, bg: "#c7f7d7", color: "#12753a" },
          { label: "Da fare", val: totalQuiz - completati, bg: "#fef3c7", color: "#92400e" },
        ].map(({ label, val, bg, color }) => (
          <div key={label} style={{ background: bg, borderRadius: 10, padding: "10px 18px", textAlign: "center", minWidth: 80 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
            <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Lista per lezione */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {gruppi.map(g => (
          <div key={g.lezione.id}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: `${coloreTema}18`, color: coloreTema, borderRadius: 12, padding: "2px 10px", fontWeight: 700, fontSize: 11 }}>{g.lezione.materia}</span>
              {g.lezione.titolo}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {g.quizzes.map(q => {
                const fatto = !!q.tentativo;
                const punteggio = q.tentativo?.punteggio;
                const inCorrezione = fatto && punteggio === null;

                return (
                  <div key={q.id} style={{
                    background: "#fff",
                    border: `1.5px solid ${fatto ? "#e2e8f0" : coloreTema + "40"}`,
                    borderRadius: 12,
                    padding: "14px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#20489a", marginBottom: 3 }}>{q.titolo}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>
                        {q.numeroDomande} domand{q.numeroDomande === 1 ? "a" : "e"}
                        {fatto && q.tentativo?.completatoAt && (
                          <span style={{ marginLeft: 8 }}>
                            · {new Date(q.tentativo.completatoAt).toLocaleDateString("it-IT")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      {fatto && (
                        <span style={{
                          background: inCorrezione ? "#fef3c7" : punteggio >= 60 ? "#c7f7d7" : "#ffebee",
                          color: inCorrezione ? "#92400e" : punteggio >= 60 ? "#12753a" : "#c62828",
                          borderRadius: 20, padding: "3px 12px",
                          fontWeight: 800, fontSize: 13,
                        }}>
                          {inCorrezione ? "In correzione" : `${punteggio.toFixed(0)}%`}
                        </span>
                      )}
                      <button
                        onClick={() => setQuizAperto(q.id)}
                        style={{
                          background: fatto ? "#e3eefe" : coloreTema,
                          color: fatto ? "#20489a" : "#fff",
                          border: "none", borderRadius: 8,
                          padding: "8px 18px",
                          fontWeight: 700, fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        {fatto ? "Rivedi" : "Inizia"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
