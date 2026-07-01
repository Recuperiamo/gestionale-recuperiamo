// @ts-nocheck
"use client";
import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import QuizEditor from "../components/quiz/QuizEditor";

interface QuizOverview {
  id: number;
  titolo: string;
  domande: any[];
  lezioneId: number;
  lezione: { id: number; titolo: string; materia: string };
  _count: { tentativi: number };
  createdAt: string;
}

interface Lezione {
  id: number;
  titolo: string;
  materia: string;
}

const MATERIE_ORDER = ["Matematica","Fisica","Chimica","Biologia","Informatica","Italiano","Latino","Storia","Filosofia","Inglese","Scienze","Generale"];

const MATERIE_COLORI: Record<string, string> = {
  Matematica: "#4f46e5", Fisica: "#7c3aed", Chimica: "#059669",
  Biologia: "#0891b2", Informatica: "#0369a1", Italiano: "#b45309",
  Latino: "#78350f", Storia: "#92400e", Filosofia: "#6d28d9",
  Inglese: "#be185d", Scienze: "#065f46", Generale: "#374151",
};

function colore(materia: string) { return MATERIE_COLORI[materia] || "#4f46e5"; }

const s = {
  card: { background: "#fff", border: "1.5px solid #dbe4f1", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  btnPri: { background: "#1cb0f6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  btnSec: { background: "#fff", color: "#20489a", border: "1.5px solid #dbe4f1", borderRadius: 8, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  select: { border: "1.5px solid #dbe4f1", borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", background: "#fff", color: "#20489a", width: "100%", boxSizing: "border-box" as const },
};

function QuizPageInner() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [quizzes, setQuizzes] = useState<QuizOverview[]>([]);
  const [lezioni, setLezioni] = useState<Lezione[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLezioneId, setSelectedLezioneId] = useState<number | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "operatore";

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;
    if (!isAdmin) { router.push("/aula"); return; }
    loadAll();
  }, [status]);

  async function loadAll() {
    setLoading(true);
    const [rQuiz, rLez] = await Promise.all([
      fetch("/api/quiz", { credentials: "include" }).then(r => r.json()),
      fetch("/api/lezioni", { credentials: "include" }).then(r => r.json()),
    ]);
    setQuizzes(Array.isArray(rQuiz) ? rQuiz : []);
    setLezioni(Array.isArray(rLez) ? rLez : []);
    setLoading(false);
  }

  // Raggruppa quiz per materia
  const perMateria = MATERIE_ORDER.reduce((acc, m) => {
    const q = quizzes.filter(qz => qz.lezione?.materia === m);
    if (q.length) acc[m] = q;
    return acc;
  }, {} as Record<string, QuizOverview[]>);

  // Raggruppa lezioni per materia per il dropdown
  const lezioniPerMateria = MATERIE_ORDER.reduce((acc, m) => {
    const l = lezioni.filter(l => l.materia === m);
    if (l.length) acc[m] = l;
    return acc;
  }, {} as Record<string, Lezione[]>);

  if (status === "loading" || loading) return <div style={{ padding: 40, color: "#6b7280" }}>Caricamento...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <Navbar />
      <div style={{ padding: "28px 16px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, color: "#1e1b4b", fontWeight: 800 }}>Quiz</h1>
              <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 13 }}>
                {quizzes.length} quiz totali · {lezioni.length} lezioni disponibili
              </p>
            </div>
            <button
              onClick={() => { setShowEditor(true); setSelectedLezioneId(null); setTimeout(() => document.getElementById("editor-section")?.scrollIntoView({ behavior: "smooth" }), 50); }}
              style={s.btnPri}
            >
              + Nuovo quiz
            </button>
          </div>

          {/* Panoramica tutti i quiz */}
          {Object.keys(perMateria).length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "#94a3b8", background: "#fff", borderRadius: 12, border: "1.5px solid #dbe4f1", marginBottom: 28 }}>
              Nessun quiz ancora. Crea il primo!
            </div>
          ) : (
            <div style={{ marginBottom: 32 }}>
              {Object.entries(perMateria).map(([materia, qList]) => (
                <div key={materia} style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "6px 0 6px 12px", borderLeft: `4px solid ${colore(materia)}` }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: colore(materia) }}>{materia}</span>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>{qList.length} quiz</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {qList.map(q => (
                      <div key={q.id} style={s.card}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#20489a", marginBottom: 2 }}>{q.titolo}</div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>
                            {q.lezione.titolo} · {(q.domande as any[]).length} domande · {q._count.tentativi} tentativi
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedLezioneId(q.lezioneId);
                            setShowEditor(true);
                            setTimeout(() => document.getElementById("editor-section")?.scrollIntoView({ behavior: "smooth" }), 50);
                          }}
                          style={{ ...s.btnSec, fontSize: 12, padding: "6px 14px", flexShrink: 0 }}
                        >
                          Gestisci
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sezione editor */}
          <div id="editor-section" style={{ background: "#fff", border: "1.5px solid #dbe4f1", borderRadius: 14, padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: "#20489a" }}>
                {selectedLezioneId ? "Gestisci quiz per questa lezione" : "Seleziona una lezione per gestire i quiz"}
              </span>
              {showEditor && <button onClick={() => { setShowEditor(false); setSelectedLezioneId(null); }} style={{ ...s.btnSec, fontSize: 12 }}>Chiudi</button>}
            </div>

            <select
              value={selectedLezioneId ?? ""}
              onChange={e => { setSelectedLezioneId(e.target.value ? Number(e.target.value) : null); setShowEditor(true); }}
              style={s.select}
            >
              <option value="">— Scegli una lezione —</option>
              {Object.entries(lezioniPerMateria).map(([materia, lezList]) => (
                <optgroup key={materia} label={materia}>
                  {lezList.map(l => (
                    <option key={l.id} value={l.id}>{l.titolo}</option>
                  ))}
                </optgroup>
              ))}
            </select>

            {selectedLezioneId && (
              <div style={{ marginTop: 20 }}>
                <QuizEditor lezioneId={selectedLezioneId} onQuizChange={loadAll} />
              </div>
            )}

            {!selectedLezioneId && showEditor && (
              <p style={{ marginTop: 16, color: "#9ca3af", fontSize: 13, textAlign: "center" }}>
                Seleziona una lezione dal menu per creare o gestire i quiz.
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Caricamento...</div>}>
      <QuizPageInner />
    </Suspense>
  );
}
