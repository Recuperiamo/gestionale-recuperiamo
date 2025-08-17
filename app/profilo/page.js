"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "../components/Navbar";

export default function ProfiloPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/signin");
    }
  }, [session, status, router]);

  if (status === "loading" || !session) return null;

  // Tutti gli utenti autenticati possono vedere questa pagina
  return (
    <div style={{ minHeight: "100vh", background: "#20489a" }}>
      <Navbar />
      <main
        style={{
          maxWidth: 540,
          margin: "40px auto 0 auto",
          background: "#20489a",
          color: "#fff",
          padding: "0 0 32px 0",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            fontSize: 32,
            fontWeight: 700,
            marginTop: 24,
            marginBottom: 10,
            letterSpacing: "-0.8px"
          }}>
            Profilo Utente
          </div>
          <div style={{
            fontSize: 18,
            marginBottom: 24,
            fontWeight: 400
          }}>
            Qui vedrai i tuoi dati utente e i pacchetti assegnati.
          </div>
        </div>
        <section
          style={{
            background: "#fff",
            borderRadius: 18,
            padding: "32px 32px 28px 32px",
            margin: "0 0 36px 0",
            boxShadow: "0 4px 20px 0 rgba(32,72,154,0.05)",
            color: "#20489a",
            textAlign: "center"
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 14 }}>
            (Sezione in costruzione)
          </div>
          <div style={{ fontWeight: 400, fontSize: 16 }}>
            In futuro qui troverai i dati del tuo profilo, i pacchetti ore, e lo storico delle attività.
          </div>
        </section>
      </main>
    </div>
  );
}