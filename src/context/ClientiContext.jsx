import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const ClientiContext = createContext();

export function ClientiProvider({ children }) {
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const fetchClienti = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/clienti");
      if (!res.ok) throw new Error("Errore fetch clienti");
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Dati clienti non validi");
      setClienti(data.filter(c => c && c.id && c.nomeReferente));
    } catch (e) {
      setClienti([]);
      setError(e.message || "Errore fetch clienti");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClienti();
  }, [lastRefresh, fetchClienti]);

  const refetchClienti = useCallback(() => {
    setLastRefresh(Date.now());
  }, []);

  return (
    <ClientiContext.Provider value={{ clienti, loading, error, refetchClienti }}>
      {children}
    </ClientiContext.Provider>
  );
}

export function useClienti() {
  return useContext(ClientiContext);
}