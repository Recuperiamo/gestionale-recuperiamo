// @ts-nocheck
"use client";
import { useEffect, useState, useCallback } from "react";

/**
 * Hook richieste modifiche.
 * Restituisce sempre array per evitare errori di spread/length.
 */
export function useRichiesteModifica({ auto = false } = {}) {
  const [richieste, setRichieste] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch("/api/modifiche");
      if (!r.ok) throw new Error("Err " + r.status);
      const js = await r.json();
      setRichieste(Array.isArray(js) ? js : []);
      setErrore(null);
    } catch (e) {
      setErrore(e.message);
      setRichieste([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auto) refetch();
  }, [auto, refetch]);

  const byAttivita = richieste.reduce((acc, r) => {
    (acc[r.attivitaId] = acc[r.attivitaId] || []).push(r);
    return acc;
  }, {});

  return {
    richieste,
    byAttivita,
    loading,
    errore,
    refetch
  };
}