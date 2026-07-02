// @ts-nocheck
"use client";
import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { PageCard, PageAction } from "../components/PageHeader";
import QuizEditor from "../components/quiz/QuizEditor";
import { FullPageSpinner } from "../components/Spinner";

interface Lezione {
  id: number;
  titolo: string;
  materia: string;
}

function QuizPageInner() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [lezioni, setLezioni] = useState<Lezione[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizCount, setQuizCount] = useState(0);

  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "operatore";

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;
    if (!isAdmin) { router.push("/aula"); return; }
    loadLezioni();
  }, [status]);

  async function loadLezioni() {
    setLoading(true);
    try {
      const r = await fetch("/api/lezioni", { credentials: "include" }).then(r => r.json());
      setLezioni(Array.isArray(r) ? r : []);
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading" || loading) return <FullPageSpinner text="Carico i quiz..." />;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <Navbar />
      <div style={{ padding: "clamp(20px,3vw,40px) clamp(12px,3vw,28px)" }}>
        <div style={{ maxWidth: "min(1400px, 96vw)", margin: "0 auto" }}>
          <PageCard
            icon="📝"
            title="Quiz"
            subtitle={`${lezioni.length} lezioni disponibili`}
          >
            <div style={{ padding: "clamp(16px,2vw,28px) clamp(20px,2.5vw,36px)" }}>
              <QuizEditor lezioni={lezioni} onQuizChange={() => {}} />
            </div>
          </PageCard>
        </div>
      </div>
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <QuizPageInner />
    </Suspense>
  );
}
