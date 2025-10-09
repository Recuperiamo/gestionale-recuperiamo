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
  const [modificaBatch, setModificaBatch] = useState(isRicorrente ? "singola" : null);

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

  // Ricorrenza
  const [tipoLezione, setTipoLezione] = useState(isEdit && isRicorrente ? "singola" : "singola");
  const [selectedDays, setSelectedDays] = useState([]);
  const [orarioInizio, setOrarioInizio] = useState(""); // per ricorrenza
  const [durata, setDurata] = useState("");
  const [dataInizioRic, setDataInizioRic] = useState("");
  const [dataFineRic, setDataFineRic] = useState("");

  const [clienti, setClienti] = useState([]);
  const [pacchetti, setPacchetti] = useState([]);
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

  function renderRicorrenzaAlert() {
    if (!isEdit || !isRicorrente) return null;
    return (
      <div style={{
        background:"#e3eaff",
        color:"#20489a",
        border:"1.5px solid #20489a90",
        borderRadius:7,
        padding:"10px 16px",
        marginBottom:14,
        fontWeight:500
      }}>
        Questa lezione fa parte di una ricorrenza.
        <div style={{ marginTop:10 }}>
          <label style={{ fontWeight:500, marginRight:16 }}>
            <input
              type="radio"
              name="modificaBatch"
              value="singola"
              checked={modificaBatch === "singola"}
              onChange={() => setModificaBatch("singola")}
              style={{ marginRight:6 }}
            />
            Modifica solo questa
          </label>
          <label style={{ fontWeight:500, opacity:0.5, cursor:"not-allowed" }}>
            <input
              type="radio"
              value="batch"
              disabled
              style={{ marginRight:6 }}
            />
            Modifica ricorrenza (prossimamente)
          </label>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorForm(null);

    if (isEdit && isRicorrente && modificaBatch === null) {
      setErrorForm("Seleziona se vuoi modificare solo questa lezione.");
      return;
    }

    if ((tipoLezione === "singola" || isEdit) && (!isRicorrente || modificaBatch === "singola")) {
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

    setLoadingSubmit(true);
    try {
      if ((tipoLezione === "singola" || isEdit) && (!isRicorrente || modificaBatch === "singola")) {
        // Compose orario ISO
        const orarioISO = new Date(`${dataSingola}T${oraInizioSingola}:00`);
        const payload = {
          descrizione,
          durataOre: Number(durataOreSingola),
          orario: orarioISO.toISOString()
        };

        if (!isEdit) {
          payload.pacchettoId = Number(pacchettoId);
          payload.clienteId = Number(clienteId);
        } else {
          payload.id = initialData.id;
        }

        const method = isEdit ? "PATCH" : "POST";
        const res = await fetch("/api/attivita", {
          method,
            headers: { "Content-Type":"application/json" },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!res.ok) {
          setErrorForm(result?.error || "Errore salvataggio");
          setLoadingSubmit(false);
          return;
        }
        onSuccess && onSuccess(result.attivita || result);
      } else if (!isEdit && tipoLezione === "ricorrente") {
        const res = await fetch("/api/attivita", {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({
            descrizione,
            clienteId: Number(clienteId),
            pacchettoId: Number(pacchettoId),
            ricorrenza: {
              giorni: selectedDays,
              orarioInizio,
              durata: Number(durata),
              dataInizio: dataInizioRic,
              dataFine: dataFineRic
            }
          })
        });
        const result = await res.json();
        if (!res.ok) {
          setErrorForm(result?.error || "Errore creazione ricorrenza");
          setLoadingSubmit(false);
          return;
        }
        onSuccess && onSuccess(result);
      } else {
        setErrorForm("Modifica batch ricorrenza non ancora implementata.");
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

        {renderRicorrenzaAlert()}

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
          </>
        )}

        {errorForm && <div style={{ color:"red", marginBottom:12 }}>{errorForm}</div>}

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