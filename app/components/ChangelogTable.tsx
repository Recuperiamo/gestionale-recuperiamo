// @ts-nocheck
import React from "react";

/**
 * Tabella storico variazioni ore residue pacchetto (Pacchetto_ChangeLog)
 * Props:
 * - changelog: array di oggetti { id, timestamp, tipoOperazione, orePrima, oreDopo, attivitaId, utente, motivazione }
 * - loading: boolean (opzionale)
 * - error: string (opzionale)
 */
export default function ChangelogTable({ changelog, loading = false, error = null }) {
  if (loading) {
    return (
      <div className="flex justify-center items-center my-8">
        <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mr-2"></span>
        <span>Caricamento storico modifiche…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded mb-4 text-center">
        Errore durante il caricamento dello storico modifiche: {error}
      </div>
    );
  }

  if (!changelog || changelog.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        Nessuna modifica registrata per questo pacchetto.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border text-sm text-center">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-2 py-2 border">Data/Ora</th>
            <th className="px-2 py-2 border">Operazione</th>
            <th className="px-2 py-2 border">Ore prima</th>
            <th className="px-2 py-2 border">Ore dopo</th>
            <th className="px-2 py-2 border">Attività</th>
            <th className="px-2 py-2 border">Utente</th>
            <th className="px-2 py-2 border">Motivazione / Note</th>
          </tr>
        </thead>
        <tbody>
          {changelog.map((entry) => (
            <tr key={entry.id || `${entry.timestamp}-${entry.tipoOperazione}`}>
              <td className="border px-2 py-1">
                {entry.timestamp
                  ? new Date(entry.timestamp).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })
                  : "-"}
              </td>
              <td className="border px-2 py-1">{entry.tipoOperazione || "-"}</td>
              <td className="border px-2 py-1">{entry.orePrima ?? "-"}</td>
              <td className="border px-2 py-1">{entry.oreDopo ?? "-"}</td>
              <td className="border px-2 py-1">
                {entry.attivitaId
                  ? <span className="font-mono">{entry.attivitaId}</span>
                  : <span className="text-gray-400">–</span>
                }
              </td>
              <td className="border px-2 py-1">{entry.utente || "-"}</td>
              <td className="border px-2 py-1">
                {entry.motivazione && entry.motivazione.length > 60
                  ? <span title={entry.motivazione}>{entry.motivazione.slice(0, 60) + "…"}</span>
                  : entry.motivazione || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}