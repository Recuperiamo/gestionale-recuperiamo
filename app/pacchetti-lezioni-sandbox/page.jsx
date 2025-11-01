"use client";
import React, { useEffect, useState, useMemo } from "react";
import PacchettiLezioniPage from "../pacchetti-lezioni/page";

// A small sandbox page that patches window.fetch to return fake session and
// minimal API responses so the real `PacchettiLezioniPage` can run without
// authentication or backend.
export default function PacchettiLezioniSandboxPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__pacchettiSandboxFetchPatched) {
      setMounted(true);
      return;
    }

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init = {}) => {
      const url = typeof input === "string" ? input : input?.url || "";

      // Provide a fake authenticated session so useSession() in the page
      // doesn't redirect to /signin.
      if (url.startsWith("/api/auth/session")) {
        const sess = {
          user: { name: "Sandbox User", email: "sandbox@example.com", role: "admin" },
          expires: new Date(Date.now() + 3600 * 1000).toISOString()
        };
        return new Response(JSON.stringify(sess), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Minimal stub for activities
      if (url.startsWith("/api/attivita")) {
        // allow deletes/other methods to succeed
        if (init?.method === "DELETE") {
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        const now = new Date();
        const demo = [
          {
            id: 101,
            orario: now.toISOString(),
            durataOre: 1,
            pacchettoId: 11,
            clienteId: 21,
            stato: "prenotata",
            oreConsumate: null,
            descrizione: "Lezione demo",
            pacchetto: { id: 11, titolo: "Pacchetto Demo" },
            cliente: { id: 21, nomeReferente: "Mario Rossi", email: "mario@example.com" }
          },
          {
            id: 102,
            orario: new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
            durataOre: 1,
            pacchettoId: 11,
            clienteId: 21,
            stato: "svolta",
            oreConsumate: 1,
            descrizione: "Lezione demo svolta",
            pacchetto: { id: 11, titolo: "Pacchetto Demo" },
            cliente: { id: 21, nomeReferente: "Mario Rossi", email: "mario@example.com" }
          }
        ];

        return new Response(JSON.stringify(demo), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (url.startsWith("/api/clienti")) {
        const clients = { clienti: [ { id: 21, nomeReferente: "Mario Rossi", email: "mario@example.com" } ] };
        return new Response(JSON.stringify(clients), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (url.startsWith("/api/pacchetti")) {
        const packs = [ { id: 11, titolo: "Pacchetto Demo", oreAcquistate: 10 } ];
        return new Response(JSON.stringify(packs), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Allow other calls to go through to the real network/backend.
      return originalFetch(input, init);
    };

    window.__pacchettiSandboxFetchPatched = true;
    setMounted(true);

    return () => {
      window.fetch = originalFetch;
      delete window.__pacchettiSandboxFetchPatched;
    };
  }, []);

  const info = useMemo(() => ({ title: "Pacchetti & Lezioni — Sandbox", subtitle: "Esegui i test in modalità sandbox (no auth, dati demo)" }), []);

  if (!mounted) {
    return (
      <main style={{ minHeight: "60vh", padding: 40, fontFamily: "'Inter',sans-serif" }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>{info.title}</h1>
        <p>Inizializzazione sandbox…</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>{info.title}</h1>
      <p style={{ marginBottom: 18 }}>{info.subtitle}</p>
      {/* Render the real page component which will now receive stubbed APIs and a fake session */}
      <PacchettiLezioniPage />
    </main>
  );
}
