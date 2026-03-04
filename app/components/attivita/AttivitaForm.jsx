import React, { useState, useEffect } from "react";

const giorniSettimana = [
  { value: "Mon", label: "Lunedì" },
  { value: "Tue", label: "Martedì" },
  { value: "Wed", label: "Mercoledì" },
  { value: "Thu", label: "Giovedì" },
  { value: "Fri", label: "Venerdì" },
  { value: "Sat", label: "Sabato" },
  { value: "Sun", label: "Domenica" },
];

export default function AttivitaForm({ initialData, onSuccess, onClose }) {
  const isEdit = !!initialData?.id;
  const isRicorrente = !!initialData?.ricorrenzaId;
  const [modificaBatch, setModificaBatch] = useState(null); // Rimosso default "singola"
  const [showConfirmModal, setShowConfirmModal] = useState(false); // Nuovo stato per modale conferma
  const [pendingData, setPendingData] = useState(null); // Dati in attesa di conferma

  const initialOrarioDate =
    initialData?.orario
      ? new Date(initialData.orario)
      : initialData?.createdAt
      ? new Date(initialData.createdAt)
      : null;

  const [descrizione, setDescrizione] = useState(initialData?.descrizione || "");
  const [dataSingola, setDataSingola] = useState(
    initialOrarioDate ? initialOrarioDate.toISOString().slice(0, 10) : ""
  );
  const [oraInizioSingola, setOraInizioSingola] = useState(
    initialOrarioDate
      ? `${String(initialOrarioDate.getHours()).padStart(2, "0")}:${String(
          initialOrarioDate.getMinutes()
        ).padStart(2, "0")}`
      : ""
  );
  const [durataOreSingola, setDurataOreSingola] = useState(
    initialData?.durataOre || initialData?.oreConsumate || 1
  );

  const [pacchettoId, setPacchettoId] = useState(initialData?.pacchettoId || "");
  const [clienteId, setClienteId] = useState(initialData?.clienteId || "");
  const [extraPacchetto, setExtraPacchetto] = useState(initialData?.extraPacchetto || false);

  // Ricorrenza
  const [tipoLezione, setTipoLezione] = useState(isEdit && isRicorrente ? "singola" : "singola");
  const [selectedDays, setSelectedDays] = useState([]);
  const [orarioInizio, setOrarioInizio] = useState(""); // per ricorrenza
  const [durata, setDurata] = useState("");
  const [dataInizioRic, setDataInizioRic] = useState("");
  const [dataFineRic, setDataFineRic] = useState("");

  const [clienti, setClienti] = useState([]);
  const [pacchetti, setPacchetti] = useState([]);
  const [clienteData, setClienteData] = useState(null); // Dati completi del cliente per link videolezione
  const [loadingClienti, setLoadingClienti] = useState(false);
  const [loadingPacchetti, setLoadingPacchetti] = useState(false);
  const [errorClienti, setErrorClienti] = useState(null);
  const [errorPacchetti, setErrorPacchetti] = useState(null);
  const [errorForm, setErrorForm] = useState(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // Precompila data/ora se passati da calendario
  useEffect(() => {
    if (!isEdit && initialData?.orario) {
      const dt = new Date(initialData.orario);
      setDataSingola(dt.toISOString().slice(0, 10));
      setOraInizioSingola(
        `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`
      );
    }
    // eslint-disable-next-line
  }, [initialData?.orario]);

  function calcolaOrarioFine(orarioInizio, durata) {
    if (!orarioInizio || !durata) return "";
    const [hh, mm] = orarioInizio.split(":").map(Number);
    const durataMinuti = Math.round(Number(durata) * 60);
    const dataOrario = new Date(2000, 1, 1, hh, mm);
    dataOrario.setMinutes(dataOrario.getMinutes() + durataMinuti);
    return `${String(dataOrario.getHours()).padStart(2, "0")}:${String(dataOrario.getMinutes()).padStart(2, "0")}`;
  }
  const orarioFine = calcolaOrarioFine(orarioInizio, durata);

  useEffect(() => {
    if (!isEdit) {
      setLoadingClienti(true);
      fetch("/api/clienti")
        .then(res => { if (!res.ok) throw new Error(); return res.json(); })
        .then(data => { setClienti(Array.isArray(data) ? data : data.clienti ?? []); setErrorClienti(null); })
        .catch(() => { setClienti([]); setErrorClienti("Impossibile caricare l'elenco clienti"); })
        .finally(() => setLoadingClienti(false));
    }
  }, [isEdit]);

  // Carica dati completi del cliente in modalità edit per avere linkVideolezione
  useEffect(() => {
    if (isEdit && initialData?.clienteId) {
      fetch(`/api/clienti/${initialData.clienteId}`)
        .then(res => { if (!res.ok) throw new Error(); return res.json(); })
        .then(data => setClienteData(data))
        .catch(() => setClienteData(null));
    }
  }, [isEdit, initialData?.clienteId]);

  useEffect(() => {
    if (!isEdit && clienteId) {
      setLoadingPacchetti(true);
      setPacchetti([]);
      fetch(`/api/pacchetti?clienteId=${clienteId}&stato=attivo`)
        .then(res => { if (!res.ok) throw new Error(); return res.json(); })
        .then(data => { setPacchetti(data); setErrorPacchetti(null); })
        .catch(() => { setPacchetti([]); setErrorPacchetti("Impossibile caricare i pacchetti"); })
        .finally(() => setLoadingPacchetti(false));
    } else if (!isEdit) {
      setPacchetti([]);
      setErrorPacchetti(null);
    }
  }, [clienteId, isEdit]);

  // Auto-select if exactly one pacchetto is available
  useEffect(() => {
    if (!isEdit && Array.isArray(pacchetti) && pacchetti.length === 1) {
      setPacchettoId(String(pacchetti[0].id));
    }
  }, [pacchetti, isEdit]);

  useEffect(() => {
    if (!isEdit) setPacchettoId("");
  }, [clienteId, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorForm(null);

    // Validazione base
    if ((tipoLezione === "singola" || isEdit) && (!isRicorrente || modificaBatch !== null)) {
      if (!descrizione || !dataSingola || !oraInizioSingola || !durataOreSingola || (!isEdit && (!pacchettoId || !clienteId))) {
        setErrorForm("Compila tutti i campi obbligatori.");
        return;
      }
      if (Number(durataOreSingola) <= 0) {
        setErrorForm("Durata deve essere > 0.");
        return;
      }
    } else if (!isEdit && tipoLezione === "ricorrente") {
      if (!descrizione || !pacchettoId || !clienteId || !orarioInizio || !durata || !dataInizioRic || !dataFineRic || selectedDays.length === 0) {
        setErrorForm("Compila tutti i campi per la ricorrenza.");
        return;
      }
      if (dataInizioRic > dataFineRic) {
        setErrorForm("Data inizio deve precedere data fine.");
        return;
      }
    }

    // Se è una lezione ricorrente in modifica E non abbiamo ancora una scelta, mostriamo il modale
    if (isEdit && isRicorrente && modificaBatch === null) {
      const orarioISO = new Date(`${dataSingola}T${oraInizioSingola}:00`);
      setPendingData({
        descrizione,
        durataOre: Number(durataOreSingola),
        orario: orarioISO.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        id: initialData.id,
        ricorrenzaId: initialData.ricorrenzaId
      });
      setShowConfirmModal(true);
      return;
    }

    // Esegui il submit effettivo
    executeSubmit();
  };

  const executeSubmit = async () => {
    setLoadingSubmit(true);
    try {
      if ((tipoLezione === "singola" || isEdit) && (!isRicorrente || modificaBatch === "singola")) {
        // Modifica singola
        const orarioISO = new Date(`${dataSingola}T${oraInizioSingola}:00`);
        const payload = {
          descrizione,
          durataOre: Number(durataOreSingola),
          orario: orarioISO.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        if (!isEdit) {
          payload.pacchettoId = Number(pacchettoId);
          payload.clienteId = Number(clienteId);
          payload.extraPacchetto = extraPacchetto;
        } else {
          payload.id = initialData.id;
        }

        const method = isEdit ? "PATCH" : "POST";
        const res = await fetch("/api/attivita", {
          method,
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify(payload)
        });
        let result;
        try {
          result = await res.json();
        } catch (e) {
          console.error('[AttivitaForm] Errore parsing JSON risposta:', e);
          setErrorForm('Errore parsing risposta: ' + e.message);
          setLoadingSubmit(false);
          return;
        }
        if (!res.ok) {
          let msg = result?.error || "Errore salvataggio";
          if (result?.stack) {
            msg += "\n" + result.stack;
          }
          console.error('[AttivitaForm] Errore API:', msg);
          setErrorForm(msg);
          setLoadingSubmit(false);
          return;
        }
        onSuccess && onSuccess(result.attivita || result);
      } else if (isEdit && isRicorrente && modificaBatch === "batch") {
        // Modifica batch - usa pendingData se disponibile
        const payload = pendingData ? {
          ...pendingData,
          modificaBatch: true
        } : {
          id: initialData.id,
          descrizione,
          durataOre: Number(durataOreSingola),
          orario: new Date(`${dataSingola}T${oraInizioSingola}:00`).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          modificaBatch: true,
          ricorrenzaId: initialData.ricorrenzaId
        };

        const res = await fetch("/api/attivita", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        let resultPatch;
        try {
          resultPatch = await res.json();
        } catch (e) {
          console.error('[AttivitaForm] Errore parsing JSON risposta PATCH:', e);
          setErrorForm('Errore parsing risposta PATCH: ' + e.message);
          setLoadingSubmit(false);
          return;
        }
        if (!res.ok) {
          let msg = resultPatch?.error || "Errore modifica ricorrenza";
          if (resultPatch?.stack) {
            msg += "\n" + resultPatch.stack;
          }
          console.error('[AttivitaForm] PATCH batch errore:', msg);
          setErrorForm(msg);
          setLoadingSubmit(false);
          return;
        }
        onSuccess && onSuccess(resultPatch);
      } else if (!isEdit && tipoLezione === "ricorrente") {
        const res = await fetch("/api/attivita", {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({
            descrizione,
            clienteId: Number(clienteId),
            pacchettoId: Number(pacchettoId),
            // send client's timezone so server can interpret wall-clock times correctly
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            ricorrenza: {
              giorni: selectedDays,
              orarioInizio,
              durata: Number(durata),
              dataInizio: dataInizioRic,
              dataFine: dataFineRic,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
          })
        });
        const result = await res.json();
        let resultRic;
        try {
          resultRic = await res.json();
        } catch (e) {
          console.error('[AttivitaForm] Errore parsing JSON risposta ricorrenza:', e);
          setErrorForm('Errore parsing risposta ricorrenza: ' + e.message);
          setLoadingSubmit(false);
          return;
        }
        if (!res.ok) {
          let msg = resultRic?.error || "Errore creazione ricorrenza";
          if (resultRic?.stack) {
            msg += "\n" + resultRic.stack;
          }
          console.error('[AttivitaForm] POST ricorrenza errore:', msg);
          setErrorForm(msg);
          setLoadingSubmit(false);
          return;
        }
        onSuccess && onSuccess(resultRic);
      }
    } catch (err) {
      setErrorForm("Errore di rete.");
    } finally {
      setLoadingSubmit(false);
    }
  };

  function handleDayToggle(day) {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }

  return (
    <div
      style={{
        position:"fixed",
        inset:0,
        background:"#1b253455",
        zIndex:2100,
        display:"flex",
        alignItems:"center",
        justifyContent:"center"
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background:"#fff",
          padding:32,
          borderRadius:10,
          minWidth:370,
          maxWidth:480,
          boxShadow:"0 8px 36px #1976d250"
        }}
      >
        <h3 style={{ color:"#1976d2", fontWeight:700, margin:0, marginBottom:18 }}>
          {isEdit ? "Modifica lezione" : "Nuova lezione"}
        </h3>

        {!isEdit && (
          <div style={{ marginBottom:16 }}>
            <label style={{ fontWeight:500, marginRight:16 }}>
              <input
                type="radio"
                value="singola"
                checked={tipoLezione === "singola"}
                onChange={() => setTipoLezione("singola")}
                style={{ marginRight:6 }}
              />
              Lezione singola
            </label>
            <label style={{ fontWeight:500 }}>
              <input
                type="radio"
                value="ricorrente"
                checked={tipoLezione === "ricorrente"}
                onChange={() => setTipoLezione("ricorrente")}
                style={{ marginRight:6 }}
              />
              Lezione ricorrente
            </label>
          </div>
        )}

        <div style={{ marginBottom:16 }}>
          <label style={{ fontWeight:500 }}>Descrizione *</label><br/>
          <input
            type="text"
            value={descrizione}
            onChange={e => setDescrizione(e.target.value)}
            style={inputStyle}
            autoFocus
          />
        </div>

        { (tipoLezione === "singola" || isEdit) && (
          <>
            <div style={{ display:"flex", gap:14, marginBottom:16 }}>
              <div style={{ flex:1 }}>
                <label style={{ fontWeight:500 }}>Data *</label><br/>
                <input
                  type="date"
                  value={dataSingola}
                  onChange={e => setDataSingola(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex:1 }}>
                <label style={{ fontWeight:500 }}>Ora inizio *</label><br/>
                <input
                  type="time"
                  value={oraInizioSingola}
                  onChange={e => setOraInizioSingola(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex:1 }}>
                <label style={{ fontWeight:500 }}>Durata (h) *</label><br/>
                <input
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={durataOreSingola}
                  onChange={e => setDurataOreSingola(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          </>
        )}

        { tipoLezione === "ricorrente" && !isEdit && (
          <>
            <div style={{ marginBottom:12 }}>
              <span style={{ fontWeight:500 }}>Giorni *</span>
              <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginTop:6 }}>
                {giorniSettimana.map(g => (
                  <label key={g.value} style={{ fontWeight:400 }}>
                    <input
                      type="checkbox"
                      value={g.value}
                      checked={selectedDays.includes(g.value)}
                      onChange={() => handleDayToggle(g.value)}
                      style={{ marginRight:4 }}
                    />
                    {g.label}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:14, marginBottom:16 }}>
              <div style={{ flex:1 }}>
                <label style={{ fontWeight:500 }}>Ora inizio *</label><br/>
                <input
                  type="time"
                  value={orarioInizio}
                  onChange={e => setOrarioInizio(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex:1 }}>
                <label style={{ fontWeight:500 }}>Durata (h) *</label><br/>
                <input
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={durata}
                  onChange={e => setDurata(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex:1 }}>
                <label style={{ fontWeight:500 }}>Fine (auto)</label><br/>
                <input
                  type="text"
                  value={calcolaOrarioFine(orarioInizio, durata)}
                  readOnly
                  style={{ ...inputStyle, background:"#f2f4f8", color:"#777" }}
                />
              </div>
            </div>
            <div style={{ display:"flex", gap:14, marginBottom:16 }}>
              <div style={{ flex:1 }}>
                <label style={{ fontWeight:500 }}>Dal *</label><br/>
                <input
                  type="date"
                  value={dataInizioRic}
                  onChange={e => setDataInizioRic(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex:1 }}>
                <label style={{ fontWeight:500 }}>Al *</label><br/>
                <input
                  type="date"
                  value={dataFineRic}
                  onChange={e => setDataFineRic(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          </>
        )}

        { !isEdit && (
          <>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontWeight:500 }}>Cliente *</label><br/>
              {loadingClienti ? (
                <div style={{ color:"#888" }}>Caricamento…</div>
              ) : errorClienti ? (
                <div style={{ color:"red" }}>{errorClienti}</div>
              ) : (
                <select
                  value={clienteId}
                  onChange={e => setClienteId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Seleziona cliente</option>
                  {clienti.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nomeReferente || c.ragione_sociale || c.nome || c.email}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontWeight:500 }}>Pacchetto *</label><br/>
              {clienteId === "" ? (
                <div style={{ color:"#888" }}>Seleziona prima un cliente</div>
              ) : loadingPacchetti ? (
                <div style={{ color:"#888" }}>Caricamento…</div>
              ) : errorPacchetti ? (
                <div style={{ color:"red" }}>{errorPacchetti}</div>
              ) : pacchetti.length === 0 ? (
                <div style={{ color:"#a00" }}>Nessun pacchetto attivo</div>
              ) : (
                <select
                  value={pacchettoId}
                  onChange={e => setPacchettoId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Seleziona pacchetto</option>
                  {pacchetti.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.descrizione || p.nome}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {tipoLezione === "singola" && (
              <div style={{
                marginBottom: 16,
                padding: "12px 14px",
                borderRadius: 8,
                background: extraPacchetto ? "#e3fff3" : "#f8fafd",
                border: "1px solid #cbe5fc"
              }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={extraPacchetto}
                    onChange={(e) => setExtraPacchetto(e.target.checked)}
                  />
                  Segna come EXTRA pacchetto
                </label>
                <p style={{ margin: "8px 0 0 26px", color: "#4b5563", fontSize: 13, lineHeight: 1.5 }}>
                  Non scala le ore residue del pacchetto selezionato ma mantiene il collegamento per lo storico.
                  Utile per lezioni extra o fuori pacchetto.
                </p>
              </div>
            )}
          </>
        )}

        {errorForm && <div style={{ color:"red", marginBottom:12 }}>{errorForm}</div>}

        {/* Pulsanti rapidi di accesso - solo in modifica quando abbiamo un ID attività */}
        {isEdit && initialData?.id && (
          <div style={{ 
            marginBottom: 20, 
            paddingTop: 16, 
            borderTop: "1px solid #e0e0e0" 
          }}>
            <p style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              color: "#666", 
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              Accesso rapido
            </p>
            <div style={{ 
              display: "flex", 
              gap: 10, 
              flexWrap: "wrap" 
            }}>
              {initialData.clienteId && (
                <button
                  type="button"
                  onClick={() => window.open(`/aula/${initialData.clienteId}`, '_blank')}
                  style={{
                    flex: "1 1 calc(33.333% - 7px)",
                    minWidth: 100,
                    background: "#10b981",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "10px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "all 0.2s",
                    boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)"
                  }}
                  onMouseOver={e => e.currentTarget.style.background = "#059669"}
                  onMouseOut={e => e.currentTarget.style.background = "#10b981"}
                >
                  <span>📚</span>
                  <span>Aula</span>
                </button>
              )}
              {clienteData?.linkVideolezione && (
                <button
                  type="button"
                  onClick={() => window.open(clienteData.linkVideolezione, '_blank')}
                  style={{
                    flex: "1 1 calc(33.333% - 7px)",
                    minWidth: 100,
                    background: "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "10px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "all 0.2s",
                    boxShadow: "0 2px 4px rgba(59, 130, 246, 0.2)"
                  }}
                  onMouseOver={e => e.currentTarget.style.background = "#2563eb"}
                  onMouseOut={e => e.currentTarget.style.background = "#3b82f6"}
                >
                  <span>🎥</span>
                  <span>Videolezione</span>
                </button>
              )}
                <button
                  type="button"
                  onClick={() => window.open(`https://recuperiamo.vercel.app/lavagna/full?attivitaId=${initialData.id}`, '_blank')}
                style={{
                  flex: "1 1 calc(33.333% - 7px)",
                  minWidth: 100,
                  background: "#8b5cf6",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "10px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.2s",
                  boxShadow: "0 2px 4px rgba(139, 92, 246, 0.2)"
                }}
                onMouseOver={e => e.currentTarget.style.background = "#7c3aed"}
                onMouseOut={e => e.currentTarget.style.background = "#8b5cf6"}
              >
                <span>✏️</span>
                <span>Lavagna</span>
              </button>
            </div>
          </div>
        )}

        <div style={{ textAlign:"right" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loadingSubmit}
            style={btnSecondary}
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={loadingSubmit}
            style={btnPrimary(loadingSubmit)}
          >
            {loadingSubmit ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </form>

      {/* Modale conferma modifica ricorrenza */}
      {showConfirmModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 2200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 12,
            padding: "28px 32px",
            maxWidth: 480,
            boxShadow: "0 12px 48px rgba(0,0,0,0.3)"
          }}>
            <h3 style={{ margin: "0 0 16px 0", color: "#1976d2", fontWeight: 600 }}>
              Modifica lezione ricorrente
            </h3>
            <p style={{ margin: "0 0 24px 0", lineHeight: 1.6, color: "#333" }}>
              Questa lezione fa parte di una ricorrenza. Vuoi applicare le modifiche:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              <button
                onClick={() => {
                  setModificaBatch("singola");
                  setShowConfirmModal(false);
                  executeSubmit();
                }}
                style={{
                  background: "#1976d2",
                  color: "#fff",
                  border: "none",
                  borderRadius: 7,
                  padding: "12px 20px",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(25, 118, 210, 0.3)"
                }}
              >
                Solo a questa lezione
              </button>
              <button
                onClick={() => {
                  setModificaBatch("batch");
                  setShowConfirmModal(false);
                  executeSubmit();
                }}
                style={{
                  background: "#f59e0b",
                  color: "#fff",
                  border: "none",
                  borderRadius: 7,
                  padding: "12px 20px",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(245, 158, 11, 0.3)"
                }}
              >
                A tutte le lezioni della ricorrenza
              </button>
            </div>
            <button
              onClick={() => {
                setShowConfirmModal(false);
                setPendingData(null);
                setLoadingSubmit(false);
              }}
              style={{
                background: "transparent",
                color: "#666",
                border: "1px solid #ddd",
                borderRadius: 7,
                padding: "8px 16px",
                fontWeight: 500,
                fontSize: 14,
                cursor: "pointer",
                width: "100%"
              }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width:"100%",
  padding:"7px 10px",
  border:"1px solid #cbe5fc",
  borderRadius:5,
  background:"#f8fafd"
};

const btnSecondary = {
  background:"#e0e3ea",
  color:"#252525",
  border:"none",
  padding:"7px 16px",
  borderRadius:5,
  fontWeight:500,
  fontSize:"0.95rem",
  marginRight:9,
  cursor:"pointer"
};

const btnPrimary = (loading) => ({
  background:"#1976d2",
  color:"#fff",
  border:"none",
  padding:"7px 16px",
  borderRadius:5,
  fontWeight:500,
  fontSize:"0.95rem",
  cursor:"pointer",
  opacity: loading ? 0.7 : 1
});