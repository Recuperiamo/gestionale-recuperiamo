// @ts-nocheck
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction"; // IMPORTANTE!
import { useSession } from "next-auth/react";
import { mapAttivita, colorsForStato } from "../../utils/calendario/mapping";
import { useRichiesteModifica } from "../modifiche/useRichiesteModifica";
import dynamic from 'next/dynamic';
import RichiestaModificaModal from "../modifiche/RichiestaModificaModal";
const AttivitaForm = dynamic(() => import('../attivita/AttivitaForm'), { ssr: false });

export default function CalendarioAttivita({
  initialMode = "week",
  allowModeSwitch = false,
  allowNavigation = true,
  forceClienteId,
  clienteId,
  externalMode,
  onModeChange,
  showLegend = true,
  enableStudentRequests = false,
  onEventClick,
  enableAdminRequests = false,
  onAdminOpenRichiesta
}) {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isCliente = role === "cliente";
  const isAdmin = role === "admin" || role === "operatore";

  const controlled = typeof externalMode === "string";
  const [internalMode, setInternalMode] = useState(initialMode);
  const mode = controlled ? externalMode : internalMode;

  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState(null);
  const [attivita, setAttivita] = useState([]);
  const [noteCalendario, setNoteCalendario] = useState([]);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const [hiddenDays, setHiddenDays] = useState([]);
  const [slotMinTime, setSlotMinTime] = useState("14:00:00");
  const [slotMaxTime, setSlotMaxTime] = useState("19:00:00");

  const calendarRef = useRef(null);
  const effectiveClienteId = forceClienteId ?? clienteId ?? null;

  const {
    richieste = [],
    byAttivita: byAttivitaRaw = {},
    refetch: refetchRichieste
  } = useRichiesteModifica({
    auto:
      (enableStudentRequests && isCliente) ||
      (enableAdminRequests && isAdmin)
  });

  const openRequestByAttId = useMemo(() => {
    if (!enableAdminRequests || !isAdmin) return {};
    const map = {};
    for (const r of richieste) {
      if (["pending", "in_review"].includes(r.stato)) {
        map[r.attivitaId] = r;
      }
    }
    return map;
  }, [richieste, enableAdminRequests, isAdmin]);

  const byAttivita = byAttivitaRaw;
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Stato per form creazione attività
  const [showCreate, setShowCreate] = useState(false);
  const [createInitialData, setCreateInitialData] = useState(null);
  const [editData, setEditData] = useState(null);

  // Ref per evitare troppi pre-create consecutivi
  const lastPrecreateRef = useRef(0);

  /* Fetch attività */
  useEffect(() => {
    let abort = false;
    let url = "/api/attivita";
    if (effectiveClienteId)
      url = `/api/clienti/${effectiveClienteId}/attivita`;
    setLoading(true);
    fetch(url, { cache: "no-store", credentials: "include" })
      .then(r => {
        if (!r.ok) throw new Error("Errore API: " + r.status);
        return r.json();
      })
      .then(data => {
        if (abort) return;
        const arr = Array.isArray(data) ? data : data?.attivita || [];
        // Filtra le attività con stato "lavagna" per non mostrarle nel calendario
        const filtered = arr.filter(a => a.stato !== "lavagna");
        setAttivita(filtered);
        setErrore(null);
      })
      .catch(e => !abort && setErrore(e.message))
      .finally(() => !abort && setLoading(false));
    return () => {
      abort = true;
    };
  }, [effectiveClienteId, showCreate, refreshCounter]);

  /* Fetch note (solo admin) — note con data compaiono nel calendario */
  useEffect(() => {
    if (!isAdmin) return;
    const url = effectiveClienteId
      ? `/api/note?clienteId=${effectiveClienteId}`
      : '/api/note';
    fetch(url, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        // Solo note con data impostata
        setNoteCalendario(arr.filter(n => !!n.data));
      })
      .catch(() => {});
  }, [isAdmin, effectiveClienteId, refreshCounter]);

  /* Mapping note → eventi FullCalendar */
  const noteEvents = useMemo(() => noteCalendario.map(n => {
    const start = new Date(n.data);
    // Se l'orario non è specificato (mezzanotte locale) → evento allDay banner
    const isAllDay = start.getHours() === 0 && start.getMinutes() === 0;
    const base = {
      id: `nota-${n.id}`,
      title: `📌 ${n.testo}`,
      backgroundColor: '#EDE9FE',
      borderColor: '#7C3AED',
      textColor: '#4C1D95',
      classNames: ['evt-nota'],
      extendedProps: { type: 'nota', notaId: n.id, clienteNome: n.cliente?.nomeReferente || null },
    };
    if (isAllDay) {
      // end è esclusivo in FullCalendar → aggiungi 1 giorno
      const startStr = n.data.slice(0, 10);
      let endStr = startStr;
      if (n.dataFine) {
        const endDate = new Date(n.dataFine);
        endDate.setDate(endDate.getDate() + 1);
        endStr = endDate.toISOString().slice(0, 10);
      }
      return { ...base, start: startStr, end: endStr, allDay: true };
    }
    const end = n.dataFine ? new Date(n.dataFine) : new Date(start.getTime() + 30 * 60 * 1000);
    return { ...base, start, end };
  }), [noteCalendario]);

  /* Mapping eventi */
  const { events: attivitaEvents } = useMemo(() => mapAttivita(attivita), [attivita]);
  const events = useMemo(() => [...attivitaEvents, ...noteEvents], [attivitaEvents, noteEvents]);

  /* Pre-creazione lavagne 5 minuti prima */
  useEffect(() => {
    if (!events.length) return;
    const now = Date.now();
    if (now - lastPrecreateRef.current < 60000) return;
    lastPrecreateRef.current = now;

    const upcomingIds = [];
    const fiveMinMs = 5 * 60 * 1000;

    for (const ev of events) {
      const start = ev.start?.getTime();
      if (!start) continue;
      const diff = start - now;
      if (diff > 0 && diff <= fiveMinMs) {
        upcomingIds.push(Number(ev.id));
      }
    }

    if (!upcomingIds.length) return;

    fetch("/api/lavagna/precreate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attivitaIds: upcomingIds })
    }).catch(() => {});
  }, [events]);

  const recomputeWeekLayout = useCallback(
    anchor => {
      if (mode !== "week") return;
      const weekStart = mondayOf(anchor);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekEvents = events.filter(
        e => !e.allDay && e.start >= weekStart && e.start < weekEnd
      );

      const hasSat = weekEvents.some(e => e.start.getDay() === 6);
      const hasSun = weekEvents.some(e => e.start.getDay() === 0);
      const nd = [];
      if (!hasSun) nd.push(0);
      if (!hasSat) nd.push(6);
      setHiddenDays(prev => {
        const changed =
          prev.length !== nd.length || prev.some(d => !nd.includes(d));
        return changed ? nd : prev;
      });

      const visible = weekEvents.filter(
        e => !nd.includes(e.start.getDay())
      );
      if (!visible.length) {
        setSlotMinTime("14:00:00");
        setSlotMaxTime("19:00:00");
        return;
      }
      let earliest = 14;
      let latestEndHour = 19;
      visible.forEach(e => {
        const sh = e.start.getHours();
        if (sh < earliest) earliest = sh;
        const eH = e.end ? e.end.getHours() : e.start.getHours() + 1;
        const eM = e.end ? e.end.getMinutes() : 0;
        const candidate = eM > 0 ? eH + 1 : eH;
        if (candidate > latestEndHour) latestEndHour = candidate;
      });
      earliest = Math.max(6, earliest);
      latestEndHour = Math.min(22, latestEndHour);
      if (latestEndHour <= earliest) latestEndHour = earliest + 1;
      setSlotMinTime(`${String(earliest).padStart(2, "0")}:00:00`);
      setSlotMaxTime(`${String(latestEndHour).padStart(2, "0")}:00:00`);
    },
    [events, mode]
  );

  useEffect(() => {
    if (mode === "week") {
      recomputeWeekLayout(currentDate);
    } else if (mode === "month") {
      // Normalizza start a Date (gli eventi allDay hanno start come stringa)
      const toDate = (s) => s instanceof Date ? s : new Date(s);
      const currentMonthEvents = events.filter(event => {
        const eventDate = toDate(event.start);
        return eventDate.getMonth() === currentDate.getMonth() &&
               eventDate.getFullYear() === currentDate.getFullYear();
      });

      const hasSatEvents = currentMonthEvents.some(event => toDate(event.start).getDay() === 6);
      const hasSunEvents = currentMonthEvents.some(event => toDate(event.start).getDay() === 0);

      const newHiddenDays = [];
      if (!hasSunEvents) newHiddenDays.push(0); // Sunday
      if (!hasSatEvents) newHiddenDays.push(6); // Saturday

      setHiddenDays(newHiddenDays);
    } else {
      setHiddenDays([]); // Clear hidden days for other modes
    }
  }, [events, mode, currentDate, recomputeWeekLayout]);

  /* Navigazione */
  const gotoDate = useCallback(d => {
    setCurrentDate(d);
    setTimeout(() => {
      const api = calendarRef.current?.getApi();
      if (api) api.gotoDate(d);
    }, 0);
  }, []);
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (mode === "week") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    gotoDate(d);
  };
  const handleNext = () => {
    const d = new Date(currentDate);
    if (mode === "week") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    gotoDate(d);
  };
  const handleToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    gotoDate(d);
  };

  const switchMode = newMode => {
    if (controlled) onModeChange && onModeChange(newMode);
    else setInternalMode(newMode);
  };

  /* Tooltip & colori */
  const handleEventDidMount = useCallback(info => {
    const { stato, durataOre, createdAt, orario } = info.event.extendedProps || {};
    const parts = [];
    if (info.event.title) parts.push(info.event.title);
    if (info.event.start && info.event.end) {
      const st = info.event.start.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
      const et = info.event.end.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
      parts.push(`Orario: ${st} – ${et}`);
    }
    if (durataOre != null) parts.push(`Durata: ${durataOre}h`);
    if (stato) parts.push(`Stato: ${stato}`);
    if (orario || createdAt) {
      const d = new Date(orario || createdAt);
      parts.push(`Data: ${d.toLocaleDateString("it-IT")}`);
    }
    if (info.event.extendedProps.orarioOriginale && stato === "Ripianificata") {
      const o = new Date(info.event.extendedProps.orarioOriginale);
      if (!isNaN(o.getTime())) {
        parts.push(
          "Originaria: " +
            o.toLocaleString("it-IT", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit"
            })
        );
      }
    }
    if (enableAdminRequests && isAdmin) {
      const rid = Number(info.event.id);
      const openR = openRequestByAttId[rid];
      if (openR) {
        parts.push(`Richiesta: ${openR.stato}`);
        if (openR.tipo) parts.push(`Tipo richiesta: ${openR.tipo}`);
      }
    }
    if (parts.length) info.el.setAttribute("title", parts.join("\n"));
    if (stato) {
      const c = colorsForStato(stato);
      if (c.bg && !info.el.style.background) info.el.style.background = c.bg;
      if (c.border) info.el.style.borderColor = c.border;
      if (c.text) info.el.style.color = c.text;
    }
    info.el.setAttribute("data-event-id", info.event.id);
  }, [enableAdminRequests, isAdmin, openRequestByAttId]);

  const renderEventContent = useCallback(arg => {
    const isNota = arg.event.extendedProps?.type === 'nota';
    if (isNota) {
      const clienteNome = arg.event.extendedProps?.clienteNome;
      return (
        <div className="cal-event-inner" style={{ fontSize: 12, lineHeight: 1.3 }}>
          <span>{arg.event.title}</span>
          {clienteNome && (
            <span style={{ opacity: 0.75, marginLeft: 4 }}>— {clienteNome}</span>
          )}
        </div>
      );
    }
    return <div className="cal-event-inner">{arg.event.title}</div>;
  }, []);

  /* Range label */
  const headerRange = useMemo(() => {
    if (mode === "month") {
      const f = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" });
      return capitalize(f.format(currentDate));
    }
    const ws = mondayOf(currentDate);
    const we = new Date(ws);
    we.setDate(we.getDate() + 6);
    const fmt = new Intl.DateTimeFormat("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
    return `${fmt.format(ws)} – ${fmt.format(we)}`;
  }, [currentDate, mode]);

  // handle slot click solo per admin/operator
  const handleDateClick = info => {
    if (!isAdmin) return;
    setCreateInitialData({
      orario: info.date.toISOString(),
      descrizione: "",
    });
    setShowCreate(true);
  };

  const handleSuccessCreate = () => {
    setShowCreate(false);
    setCreateInitialData(null);
    setRefreshCounter(c => c + 1);
    refetchRichieste && refetchRichieste();
  };

  const handleSuccessEdit = () => {
    setEditData(null);
    setRefreshCounter(c => c + 1);
    refetchRichieste && refetchRichieste();
  };

  if (loading) return <div style={styles.loadingBox}>Caricamento calendario…</div>;
  if (errore) return <div style={styles.errorBox}>Errore calendario: {errore}</div>;

  const weekView = mode === "week";

  return (
    <div style={styles.wrapper}>
      <div style={styles.toolbar}>
        {allowNavigation ? (
          <div style={styles.navGroup}>
            <button onClick={handlePrev} style={styles.navBtn} aria-label="Indietro">‹</button>
            <button onClick={handleToday} style={styles.navBtn}>oggi</button>
            <button onClick={handleNext} style={styles.navBtn} aria-label="Avanti">›</button>
          </div>
        ) : <div />}
        <div style={styles.title}>
          {weekView ? "Agenda settimanale" : "Calendario mensile"}
        </div>
        {allowModeSwitch ? (
          <div style={styles.modeGroup}>
            <button onClick={() => switchMode("week")} style={modeBtn(mode === "week")}>Settimana</button>
            <button onClick={() => switchMode("month")} style={modeBtn(mode === "month")}>Mese</button>
          </div>
        ) : <div />}
      </div>

      <div style={styles.rangeLine}>{headerRange}</div>

      <FullCalendar
        ref={calendarRef}
        key={mode}
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView={weekView ? "timeGridWeek" : "dayGridMonth"}
        initialDate={currentDate}
        allDaySlot={true}
        eventDisplay={weekView ? "auto" : "block"}
        slotMinTime={weekView ? slotMinTime : undefined}
        slotMaxTime={weekView ? slotMaxTime : undefined}
        slotDuration={weekView ? "01:00:00" : undefined}
        hiddenDays={hiddenDays}
        nowIndicator={weekView}
        events={events}
        locale="it"
        firstDay={1}
        height="auto"
        expandRows
        handleWindowResize
        displayEventTime={false}
        eventContent={renderEventContent}
        eventDidMount={handleEventDidMount}
        headerToolbar={false}
        dayHeaderFormat={weekView ? { weekday: "short", day: "numeric" } : { weekday: "short" }}
        eventClassNames={arg => {
          const cls = ["cal-event", "stato-" + (arg.event.extendedProps.stato || "").toLowerCase()];
          const attIdNum = Number(arg.event.id);

          if (!onEventClick && enableStudentRequests && isCliente) {
            const openReq = (byAttivita[attIdNum] || []).find(r =>
              ["pending", "in_review"].includes(r.stato)
            );
            const rejectedReq = (byAttivita[attIdNum] || []).find(r => r.stato === "rejected");
            if (openReq) cls.push("rq-pending");
            else if (rejectedReq) cls.push("rq-rejected");
          }

          if (enableAdminRequests && isAdmin && openRequestByAttId[attIdNum]) {
            cls.push("rq-pending-admin");
          }

          if (onEventClick) cls.push("evt-clickable");
          return cls;
        }}
        eventClick={info => {
          const attIdNum = Number(info.event.id);

          // Scorciatoia ALT+click => apri lavagna
          if (info.jsEvent && info.jsEvent.altKey) {
            // Open the full lavagna page directly in full view
            window.open(`https://recuperiamo.vercel.app/lavagna/full?attivitaId=${attIdNum}` , "_blank");
            return;
          }

          // Custom override
          if (onEventClick) {
            const raw = attivita.find(a => a.id === attIdNum);
            onEventClick(raw || { id: attIdNum, orario: info.event.start, descrizione: info.event.title });
            return;
          }

          // Admin gestione richiesta
          if (enableAdminRequests && isAdmin) {
            const r = openRequestByAttId[attIdNum];
            if (r && onAdminOpenRichiesta) {
              const fullAtt = attivita.find(a => a.id === attIdNum);
              onAdminOpenRichiesta({
                ...r,
                attivita: fullAtt || { id: attIdNum, descrizione: info.event.title }
              });
              return;
            }
          }

          if (isAdmin) {
            const fullAtt = attivita.find(a => a.id === attIdNum);
            if (fullAtt) {
              setEditData(fullAtt);
              return;
            }
          }

          // Se nessun handler speciale è presente, apri la lavagna full
          // Priorità: onEventClick, admin editing, admin requests handled above.
          if (!onEventClick && !(enableAdminRequests && isAdmin) && !(isAdmin)) {
            // Client or basic user: open lavagna full view for this activity
            window.location.href = `/lavagna/full?attivitaId=${attIdNum}`;
            return;
          }
          // Cliente → modale richiesta (legacy behavior)
          if (enableStudentRequests && isCliente) {
            setSelectedEvent({
              id: attIdNum,
              orario: info.event.start,
              createdAt: info.event.extendedProps.createdAt,
              descrizione: info.event.title
            });
          }
        }}
        dateClick={isAdmin ? handleDateClick : undefined}
        selectable={!!isAdmin}
        selectMirror={true}
        unselectAuto={false}
      />

      {showLegend && (
        <div style={styles.legend}>
          <LegendItem stato="Conclusa" />
          <LegendItem stato="Oggi" />
          <LegendItem stato="Prossima" />
          <LegendItem stato="Prenotata" />
          <LegendItem stato="Ripianificata" />
          <LegendItem stato="Cancellata" />
        </div>
      )}

      {!onEventClick && enableStudentRequests && isCliente && (
        <RichiestaModificaModal
          open={!!selectedEvent}
          attivita={selectedEvent}
          existingRichieste={
            selectedEvent ? byAttivita[selectedEvent.id] || [] : []
          }
          onClose={() => setSelectedEvent(null)}
          onSuccess={() => {
            refetchRichieste();
            setSelectedEvent(null);
          }}
        />
      )}

      {/* MODALE CREAZIONE ATTIVITÀ SOLO PER ADMIN */}
      {isAdmin && showCreate && (
        <AttivitaForm
          initialData={createInitialData}
          onSuccess={handleSuccessCreate}
          onClose={() => {
            setShowCreate(false);
            setCreateInitialData(null);
          }}
        />
      )}

      {isAdmin && editData && (
        <AttivitaForm
          initialData={editData}
          onSuccess={handleSuccessEdit}
          onClose={() => setEditData(null)}
        />
      )}

      <style jsx global>{globalStyles}</style>
      <style jsx global>{`
        .evt-clickable { cursor: pointer; }
        .cal-event.rq-pending-admin::after {
          content:"●";
          position:absolute;
          top:2px; right:3px;
          background:#FFF3B0;
          color:#8C7800;
          font-size:10px;
          font-weight:700;
          padding:1px 4px;
          border-radius:10px;
          box-shadow:0 1px 2px rgba(0,0,0,0.15);
        }
      `}</style>
    </div>
  );
}

/* Legend */
function LegendItem({ stato }) {
  const c = colorsForStato(stato);
  return (
    <div style={styles.legendItem}>
      <span
        style={{
          display: "inline-block",
          width: 16,
          height: 16,
          background: c.bg,
          border: `2px solid ${c.border}`,
          borderRadius: 4,
          marginRight: 8
        }}
      />
      <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>
        {stato}
      </span>
    </div>
  );
}

/* Helpers */
function mondayOf(dateObj) {
  const d = new Date(dateObj);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const styles = {
  wrapper: {
    background: "#f5f8ff",
    borderRadius: 14,
    padding: 18,
    boxShadow: "0 2px 8px #1cb0f630",
    fontFamily: "'Inter','Segoe UI',Arial,sans-serif"
  },
  toolbar: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    alignItems: "center",
    marginBottom: 6
  },
  navGroup: { display: "flex", gap: 8 },
  navBtn: {
    background: "#1cb0f6",
    border: "none",
    color: "#fff",
    fontWeight: 600,
    fontSize: 13,
    padding: "6px 14px",
    borderRadius: 8,
    cursor: "pointer",
    boxShadow: "0 1px 4px rgba(32,72,154,0.3)"
  },
  title: {
    textAlign: "center",
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#20489a"
  },
  modeGroup: { display: "flex", gap: 8 },
  rangeLine: {
    fontSize: 14,
    fontWeight: 600,
    color: "#4268b3",
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: ".3px"
  },
  legend: {
    marginTop: 14,
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "center"
  },
  legendItem: { display: "flex", alignItems: "center" },
  loadingBox: {
    background: "#f5f8ff",
    borderRadius: 12,
    padding: 24,
    textAlign: "center",
    fontWeight: 600,
    color: "#20489a"
  },
  errorBox: {
    background: "#ffe6e6",
    border: "1px solid #ffb3b3",
    borderRadius: 10,
    padding: 16,
    color: "#a30000",
    fontWeight: 600
  }
};

const modeBtn = active => ({
  background: active ? "#1cb0f6" : "#e3eefe",
  color: active ? "#fff" : "#20489a",
  border: "none",
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  padding: "6px 14px",
  cursor: "pointer",
  boxShadow: "0 1px 4px rgba(32,72,154,0.25)",
  transition: "background .2s"
});

const globalStyles = `
  .fc { --fc-border-color:#e3eaf5; font-family:'Inter','Segoe UI',Arial,sans-serif; color:#20489a; }
  .fc-timegrid-axis-cushion, .fc-timegrid-slot-label-cushion { font-size:12px; font-weight:600; color:#20489a; }
  .fc .fc-timegrid-slot { height:48px; }
  .fc .fc-timegrid-slot:hover { background:#eef6ff; }
  .fc .fc-timegrid-col.fc-day-today { background:#fffbe6; }

  .cal-event {
    border-radius:6px !important;
    display:flex;
    align-items:center;
    justify-content:center;
    min-height:100% !important;
    padding:0 4px;
    box-shadow:0 2px 8px #20489a22 !important;
    overflow:hidden;
    border:1px solid rgba(32,72,154,0.15);
    text-align:center;
    background:transparent;
    position:relative;
  }
  .cal-event .fc-event-main {
    width:100%; display:flex; align-items:center; justify-content:center;
    padding:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; line-height:1;
  }
  .cal-event-inner { width:100%; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .cal-event:hover { box-shadow:0 3px 10px #20489a30 !important; transform:translateY(-1px); }
  .fc .fc-scrollgrid { border-radius:10px; border:1px solid #dde6f3; background:#fff; }
  .fc-daygrid-event { margin:2px 4px; }
  .fc-daygrid-block-event .fc-event-time { display:none; }

  @media (max-width:900px){
    .fc-timegrid-slot { height:52px; }
    .cal-event { font-size:11.5px; }
  }
`;