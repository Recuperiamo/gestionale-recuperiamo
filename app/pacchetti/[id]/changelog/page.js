import React from "react";
import ChangelogTable from "../../../components/ChangelogTable";
import Link from "next/link";

async function fetchChangelog(pacchettoId) {
  try {
    // Usa baseUrl assoluto per fetch SSR/server component
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/pacchetti/${pacchettoId}/changelog`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Errore ${res.status}`);
    return await res.json();
  } catch (err) {
    return { error: err.message || "Errore di rete" };
  }
}

export default async function PacchettoChangelogPage({ params }) {
  const pacchettoId = params?.id || "";
  if (!pacchettoId) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <h1 className="text-xl font-bold mb-4">Storico modifiche pacchetto</h1>
        <div className="bg-red-100 text-red-700 p-4 rounded">
          Errore: id pacchetto mancante o non valido.
        </div>
        <div className="mt-4">
          <Link href="/pacchetti" className="text-blue-700 underline">Torna ai pacchetti</Link>
        </div>
      </div>
    );
  }

  const data = await fetchChangelog(pacchettoId);

  return (
    <div className="max-w-4xl mx-auto mt-8 px-2">
      <h1 className="text-2xl font-bold mb-4">
        Storico modifiche pacchetto <span className="font-mono">#{pacchettoId}</span>
      </h1>
      <div className="mb-6">
        <Link href="/pacchetti" className="text-blue-700 underline hover:text-blue-900">&larr; Torna ai pacchetti</Link>
      </div>
      <ChangelogTable
        changelog={Array.isArray(data) ? data : []}
        loading={false}
        error={data && data.error ? data.error : null}
      />
    </div>
  );
}