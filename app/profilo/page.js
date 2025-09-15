"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import dayjs from "dayjs";

// DATA DI OGGI PER IL TEST
const oggi = new Date().toISOString().slice(0, 10);

// MOCK DATI lezioni: OGNI BADGE RAPPRESENTATO ALMENO UNA VOLTA
const lezioniMock = [
  {
    id: 1,
    data: "2025-09-12 09:00",
    titolo: "Lezione di Matematica",
    stato: "Prenotata",
    note: [{ testo: "Porta il libro di testo.", condivisa: true }],
    materiali: [{ nome: "Esercizi.pdf", url: "#" }],
    linkLive: "#",
  },
  {
    id: 2,
    data: `${oggi} 10:00`, // OGGI = PROSSIMA
    titolo: "Lezione di Filosofia",
    stato: "Prossima",
    note: [{ testo: "Prepara Kant.", condivisa: true }],
    materiali: [],
    linkLive: "#",
  },
  {
    id: 3,
    data: "2025-09-20 11:00",
    titolo: "Lezione di Fisica",
    stato: "Spostata",
    note: [{ testo: "Lezione spostata al 21 settembre.", condivisa: true }],
    materiali: [],
    linkLive: null,
  },
  {
    id: 4,
    data: "2025-09-21 14:00",
    titolo: "Lezione di Storia",
    stato: "Ripianificata",
    note: [{ testo: "Questa lezione è stata riprogrammata dal 20 settembre.", condivisa: true }],
    materiali: [{ nome: "Appunti.docx", url: "#" }],
    linkLive: "#",
  },
  {
    id: 5,
    data: "2025-09-27 09:00",
    titolo: "Lezione di Chimica",
    stato: "Cancellata",
    note: [{ testo: "Lezione annullata per indisponibilità docente.", condivisa: true }],
    materiali: [],
    linkLive: null,
  },
  {
    id: 6,
    data: "2025-09-30 11:00",
    titolo: "Lezione di Geografia",
    stato: "Prenotata",
    note: [{ testo: "Porta l'atlante.", condivisa: true }],
    materiali: [],
    linkLive: "#",
  },
  {
    id: 7,
    data: "2025-09-16 16:00",
    titolo: "Lezione di Inglese",
    stato: "Conclusa",
    note: [{ testo: "Recupera la registrazione se assente.", condivisa: true }],
    materiali: [{ nome: "Vocabulary.pdf", url: "#" }],
    linkLive: null,
  },
];

export default function ProfiloPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const mainFont = `'Segoe UI', 'Arial', 'Helvetica', sans-serif`;

  // Stati
  const [materialiExtra, setMaterialiExtra] = useState({});
  const [modificaId, setModificaId] = useState(null);
  const [modificaText, setModificaText] = useState("");
  const [msg, setMsg] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [calView, setCalView] = useState("month"); // 'month' o 'week'
  const tableRef = useRef(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/signin");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (selectedDate && tableRef.current) {
      const row = tableRef.current.querySelector(`[data-date="${selectedDate}"]`);
      if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedDate]);

  function handleCaricaMateriale(id) {
    const nome = prompt("Nome materiale da caricare:");
    if (nome && nome.trim().length > 0) {
      setMaterialiExtra(prev => ({
        ...prev,
        [id]: [...(prev[id] || []), { nome, url: "#" }]
      }));
      setMsg("Materiale caricato con successo!");
      setTimeout(() => setMsg(""), 3000);
    }
  }

  if (status === "loading" || !session) return null;

  // Mappa stati per giorno
  const lessonStateMap = {};
  lezioniMock.forEach(lez => {
    const d = lez.data.split(" ")[0];
    lessonStateMap[d] = lez.stato;
  });

  // Determina la lezione "Prossima"
  function getProssimaId() {
    const now = new Date();
    const futureOrToday = lezioniMock
      .filter(l => (l.stato === "Prossima" || l.stato === "Prenotata" || l.stato === "Ripianificata"))
      .filter(l => {
        const d = l.data.split(" ")[0];
        return new Date(d) >= new Date(now.toISOString().slice(0,10));
      })
      .sort((a, b) => new Date(a.data) - new Date(b.data));
    return futureOrToday.length > 0 ? futureOrToday[0].id : null;
  }
  const prossimaId = getProssimaId();

  // Badge per stato
  function getBadge(lez) {
    if (lez.id === prossimaId) {
      return <span className="badge badge-prossima">Prossima</span>;
    }
    if (lez.stato === "Prenotata") return <span className="badge badge-prenotata">Prenotata</span>;
    if (lez.stato === "Ripianificata") return <span className="badge badge-ripianificata">Ripianificata</span>;
    if (lez.stato === "Conclusa") return <span className="badge badge-conclusa">Conclusa</span>;
    if (lez.stato === "Spostata") return <span className="badge badge-spostata">Spostata</span>;
    if (lez.stato === "Cancellata") return <span className="badge badge-cancellata">Cancellata</span>;
    return <span className="badge">{lez.stato}</span>;
  }

  // Tooltip per spostamenti
  function getSpostamentoTooltip(data) {
    const lezione = lezioniMock.find(l => l.data.split(" ")[0] === data);
    if (!lezione) return null;

    if (lezione.stato === "Spostata") {
      const riferimento = lezioniMock.find(
        l => l.stato === "Ripianificata" && l.note.some(n => n.testo.includes("20 settembre"))
      );
      if (riferimento) {
        return `Lezione spostata al ${riferimento.data.split(" ")[0]}`;
      }
      return "Questa lezione è stata spostata";
    }
    if (lezione.stato === "Ripianificata") {
      return "Questa lezione è stata riprogrammata da un altro giorno";
    }
    return null;
  }

  // Classi per il calendario mensile
  const calendarTileClass = ({ date, view }) => {
    if (view !== "month") return null;
    const d = date.toISOString().slice(0, 10);
    const stato = lessonStateMap[d];
    const lezione = lezioniMock.find(l => l.data.split(" ")[0] === d);
    let classes = [];
    
    if (d === oggi) classes.push("tile-oggi");
    
    if (lezione?.id === prossimaId && d !== oggi) classes.push("highlight-prossima");
    else if (stato === "Prenotata" && d !== oggi) classes.push("highlight-prenotata");
    else if (stato === "Ripianificata" && d !== oggi) classes.push("highlight-ripianificata");
    else if (stato === "Conclusa" && d !== oggi) classes.push("highlight-conclusa");
    else if (stato === "Spostata" && d !== oggi) classes.push("highlight-spostata");
    else if (stato === "Cancellata" && d !== oggi) classes.push("highlight-cancellata");
    
    return classes.join(" ");
  };

  // Contenuto tile calendario
  const calendarTileContent = ({ date, view }) => {
    if (view !== "month") return null;
    const d = date.toISOString().slice(0, 10);
    const isOggi = d === oggi;
    const isNeighboring = date.getMonth() !== new Date().getMonth();
    const lezione = lezioniMock.find(l => l.data.split(" ")[0] === d);
    const stato = lezione?.stato;
    const tooltipShow = stato === "Spostata" || stato === "Ripianificata";
    const spostamentoTooltip = tooltipShow ? getSpostamentoTooltip(d) : null;

    return (
      <div className="tile-content-center">
        <span style={isOggi ? { textDecoration: "underline", fontWeight: 800 } : {}}>
          {date.getDate()}
        </span>
        {lezione && tooltipShow && !isNeighboring && (
          <span className="cal-tooltip-wrap">
            <span className="cal-tooltip">
              <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 17 }}>
                {lezione.titolo}
              </div>
              <div style={{ fontSize: 15, marginBottom: 2 }}>
                {lezione.data}
              </div>
              {spostamentoTooltip && (
                <div style={{ fontSize: 15, marginTop: 2, color: "#b8860b", fontWeight: 600 }}>
                  {spostamentoTooltip}
                </div>
              )}
              {lezione.note.length > 0 && (
                <div style={{ fontSize: 15, marginTop: 4 }}>
                  Note: {lezione.note.map(n => n.testo).join(", ")}
                </div>
              )}
            </span>
          </span>
        )}
      </div>
    );
  };

  // Eventi FullCalendar - VISTA SETTIMANALE SOLO CON ORARI
  const eventsFC = lezioniMock.map(lez => {
    const startTime = lez.data.split(" ")[1];
    const endTime = dayjs(`2000-01-01 ${startTime}`).add(1, 'hour').format('HH:mm');
    
    return {
      id: lez.id,
      title: `${startTime} - ${endTime}`, // SOLO ORARIO COME RICHIESTO
      start: lez.data.replace(" ", "T"),
      end: dayjs(lez.data.replace(" ", "T")).add(1, 'hour').toISOString(),
      backgroundColor: getFCBg(lez.stato, lez.id === prossimaId),
      borderColor: getFCBorder(lez.stato, lez.id === prossimaId),
      textColor: getFCTextColor(lez.stato, lez.id === prossimaId),
      extendedProps: {
        stato: lez.stato,
        titolo: lez.titolo,
        tooltip: (lez.stato === "Spostata" || lez.stato === "Ripianificata") ? getSpostamentoTooltip(lez.data.split(" ")[0]) : "",
        note: lez.note.map(n => n.testo).join(", "),
      }
    };
  });

  function getFCBg(stato, isProssima) {
    if (isProssima) return "#1cb0f6";
    if (stato === "Prenotata") return "#b2e4fc";
    if (stato === "Ripianificata") return "#d4f0fc";
    if (stato === "Spostata") return "#fff3b0";
    if (stato === "Conclusa") return "#c7f7d7";
    if (stato === "Cancellata") return "#f8d7da";
    return "#e3eefe";
  }

  function getFCBorder(stato, isProssima) {
    if (isProssima) return "#1592d7";
    if (stato === "Prenotata") return "#7dd3fc";
    if (stato === "Ripianificata") return "#38bdf8";
    if (stato === "Spostata") return "#facc15";
    if (stato === "Conclusa") return "#86efac";
    if (stato === "Cancellata") return "#fca5a5";
    return "#a5b4fc";
  }

  function getFCTextColor(stato, isProssima) {
    if (isProssima) return "#fff";
    if (stato === "Prenotata") return "#20489a";
    if (stato === "Ripianificata") return "#20489a";
    if (stato === "Spostata") return "#8c7800";
    if (stato === "Conclusa") return "#12753a";
    if (stato === "Cancellata") return "#721c24";
    return "#20489a";
  }

  // Ordina lezioni per data
  const lezioniOrdinate = [...lezioniMock].sort((a, b) => new Date(a.data) - new Date(b.data));

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f5f8ff",
      fontFamily: mainFont,
      padding: "0 10px"
    }}>
      <Navbar />
      <main style={{
        maxWidth: 700,
        margin: "60px auto 0 auto",
        background: "#fff",
        borderRadius: 22,
        padding: "38px 36px 32px 36px",
        boxShadow: "0 4px 28px 0 rgba(32,72,154,0.12)",
        color: "#20489a"
      }}>
        <h2 style={{
          fontWeight: 800,
          fontSize: 32,
          marginBottom: 20,
          textAlign: "center",
          color: "#20489a",
          letterSpacing: "0.5px"
        }}>
          Calendario lezioni
        </h2>

        {/* Dati personali */}
        <section style={{ fontSize: 18, textAlign: "center", marginBottom: 28 }}>
          <span style={{ fontWeight: 700 }}>Nome:</span> {session.user?.name || "Non disponibile"}
          <br />
          <span style={{ fontWeight: 700 }}>Email:</span> {session.user?.email || "Non disponibile"}
        </section>

        {/* Switch vista */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <button
            onClick={() => setCalView(calView === "month" ? "week" : "month")}
            style={{
              background: "#e3eefe",
              color: "#20489a",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 16,
              padding: "8px 16px",
              boxShadow: "0 1px 4px rgba(32,72,154,0.18)",
              cursor: "pointer",
              transition: "background 0.2s"
            }}
            onMouseOver={e => e.currentTarget.style.background = "#b2e4fc"}
            onMouseOut={e => e.currentTarget.style.background = "#e3eefe"}
          >
            {calView === "month" ? "Vista Settimanale" : "Vista Mensile"}
          </button>
        </div>

        {/* Calendario */}
        <section style={{ marginBottom: 36 }}>
          <div style={{
            maxWidth: calView === "month" ? 420 : 600,
            margin: "0 auto",
            background: "#e3eefe",
            borderRadius: "18px",
            padding: "24px 16px 18px 16px"
          }}>
            {calView === "month" ? (
              <Calendar
                tileClassName={calendarTileClass}
                tileContent={calendarTileContent}
                onClickDay={date => setSelectedDate(date.toISOString().slice(0, 10))}
                locale="it-IT"
                minDetail="month"
                next2Label={null}
                prev2Label={null}
              />
            ) : (
              <FullCalendar
                plugins={[timeGridPlugin, dayGridPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: ''
                }}
                events={eventsFC}
                slotMinTime="07:00:00"
                slotMaxTime="21:00:00"
                height={400}
                locale="it"
                dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
                eventMouseEnter={(info) => {
                  const tooltip = info.event.extendedProps.tooltip;
                  const titolo = info.event.extendedProps.titolo;
                  const note = info.event.extendedProps.note;
                  
                  if (tooltip || titolo) {
                    let tooltipText = titolo || '';
                    if (tooltip) tooltipText += `\n${tooltip}`;
                    if (note) tooltipText += `\nNote: ${note}`;
                    info.el.title = tooltipText;
                  }
                }}
              />
            )}

            <style>{`
              .react-calendar {
                border: none !important;
                background: transparent !important;
                font-family: 'Segoe UI', Arial, sans-serif !important;
              }
              .react-calendar__tile {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                border-radius: 12px !important;
                background: #fff;
                color: #20489a;
                font-weight: 600;
                font-size: 15px;
                height: 38px;
                width: 38px;
                padding: 0 !important;
                margin: 2px 1px;
                position: relative;
                overflow: visible;
                transition: background 0.18s, color 0.18s;
                border: none !important;
                box-shadow: none !important;
              }
              .tile-oggi {
                border: 2.5px solid #1cb0f6 !important;
                box-sizing: border-box !important;
                background: #fff !important;
                color: #20489a !important;
              }
              .react-calendar__tile > abbr { display: none; }
              .tile-content-center { 
                width: 100%; 
                height: 100%; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                font-size: 15px; 
                font-weight: 600; 
                color: inherit; 
                position: relative;
              }
              .highlight-prossima { background: #1cb0f6 !important; color: #fff !important; }
              .highlight-prenotata { background: #b2e4fc !important; color: #20489a !important; }
              .highlight-conclusa { background: #c7f7d7 !important; color: #12753a !important; }
              .highlight-spostata { background: #fff3b0 !important; color: #8c7800 !important; }
              .highlight-cancellata { background: #f8d7da !important; color: #721c24 !important; }
              .highlight-ripianificata { background: linear-gradient(135deg, #fff3b0, #b2e4fc) !important; color: #20489a !important; }
              .react-calendar__month-view__days__day--neighboringMonth { 
                color: #c6d4e4 !important; 
                opacity: 0.7 !important; 
                background: none !important; 
              }
              .cal-tooltip-wrap { 
                position: absolute; 
                left: 50%; 
                top: 48px; 
                transform: translateX(-50%); 
                width: 320px; 
                height: auto; 
                pointer-events: none; 
                z-index: 50; 
              }
              .cal-tooltip {
                display: none;
                background: #f5f8ff;
                color: #20489a;
                border-radius: 18px;
                box-shadow: 0 6px 32px rgba(32,72,154,0.2);
                font-size: 16px;
                padding: 20px 18px 14px 18px;
                min-width: 220px;
                max-width: 320px;
                z-index: 50;
                text-align: left;
                border: 1.5px solid #b2e4fc;
              }
              .react-calendar__tile:hover .cal-tooltip { display: block; }
              .react-calendar__navigation { 
                margin-bottom: 12px !important; 
                background: #f5f8ff !important; 
                border-radius: 12px !important; 
                padding: 8px 0 6px 0 !important; 
              }
              .react-calendar__navigation button {
                color: #20489a !important;
                font-weight: 700 !important;
                background: #e3eefe !important;
                border-radius: 8px !important;
                border: none !important;
                margin: 0 2px !important;
                padding: 6px 8px !important;
                font-size: 16px !important;
              }
              .react-calendar__navigation__label {
                background: #e3eefe !important;
                color: #20489a !important;
                font-weight: 700 !important;
                font-size: 21px !important;
                border-radius: 9px !important;
                padding: 4px 26px !important;
                border: none !important;
              }
              .react-calendar__month-view__weekdays {
                text-align: center;
                font-weight: 700;
                color: #4268b3;
                text-transform: capitalize;
                font-size: 15px;
                margin-bottom: 1px;
              }
              .badge {
                display: inline-block;
                padding: 2px 12px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 700;
                margin-right: 5px;
                margin-bottom: 2px;
                vertical-align: middle;
                letter-spacing: 0.2px;
                box-shadow: 0 1px 3px rgba(32,72,154,0.13);
              }
              .badge-prossima { background: #1cb0f6; color: #fff; }
              .badge-prenotata { background: #b2e4fc; color: #20489a; }
              .badge-conclusa { background: #c7f7d7; color: #12753a; }
              .badge-spostata { background: #fff3b0; color: #8c7800; }
              .badge-cancellata { background: #f8d7da; color: #721c24; }
              .badge-ripianificata { background: linear-gradient(135deg, #fff3b0, #b2e4fc); color: #20489a; }
              .fc-event { cursor: pointer; }
              .fc-toolbar { margin-bottom: 10px !important; }
              .fc-toolbar-title { color: #20489a !important; font-weight: 700 !important; }
              .fc-button-primary { 
                background: #e3eefe !important; 
                border-color: #b2e4fc !important; 
                color: #20489a !important;
                font-weight: 600 !important;
              }
              .fc-button-primary:hover { background: #b2e4fc !important; }
              .fc-col-header-cell { background: #f5f8ff !important; }
              .fc-timegrid-slot-label { color: #4268b3 !important; font-size: 13px !important; }
            `}</style>

            {/* Legenda */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '10px 15px',
              marginTop: 22,
              padding: '8px',
              fontSize: 15,
              color: '#4268b3'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="badge badge-prossima">Prossima</span> Lezione Prossima
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="badge badge-prenotata">Prenotata</span> Lezione Prenotata
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="badge badge-spostata">Spostata</span> Lezione Spostata
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="badge badge-ripianificata">Ripianificata</span> Lezione Ripianificata
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="badge badge-conclusa">Conclusa</span> Lezione Conclusa
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="badge badge-cancellata">Cancellata</span> Lezione Cancellata
              </div>
            </div>
          </div>
        </section>

        {/* Messaggio */}
        {msg && (
          <div style={{
            margin: "18px 0",
            padding: 12,
            background: "#e7fbf1",
            color: "#12753a",
            borderRadius: 8,
            textAlign: "center",
            fontWeight: 600
          }}>
            {msg}
          </div>
        )}

        {/* Tabella lezioni */}
        <section>
          <h3 style={{
            fontSize: 21,
            fontWeight: 700,
            marginBottom: 14,
            color: "#20489a"
          }}>
            Lezioni e Prenotazioni
          </h3>
          <div style={{
            overflowX: "auto",
            borderRadius: 10,
            background: "#f5f8ff",
            border: "1px solid #e4ecf7",
            marginBottom: 18
          }}>
            <table ref={tableRef} style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0
            }}>
              <thead>
                <tr>
                  <th style={thStyle}>Data</th>
                  <th style={thStyle}>Stato</th>
                  <th style={thStyle}>Materiali</th>
                  <th style={thStyle}>Note</th>
                  <th style={thStyle}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {lezioniOrdinate.map((lez, idx) => {
                  const dataLezione = lez.data.split(" ")[0];
                  const isProssima = lez.id === prossimaId;
                  const isOggi = dataLezione === oggi;
                  
                  return (
                    <tr
                      key={lez.id}
                      data-date={dataLezione}
                      style={{
                        background: idx % 2 === 0 ? "#fff" : "#f7fafd",
                        borderBottom: "1px solid #e4ecf7"
                      }}
                    >
                      <td style={tdStyle}>{lez.data}</td>
                      <td style={tdStyle}>{getBadge(lez)}</td>
                      <td style={tdStyle}>
                        {[...(lez.materiali || []), ...(materialiExtra[lez.id] || [])].length === 0 ? (
                          <span style={{ color: "#aaa" }}>—</span>
                        ) : (
                          [...(lez.materiali || []), ...(materialiExtra[lez.id] || [])].map((mat, midx) => (
                            <div key={midx}>
                              <a href={mat.url} target="_blank" rel="noopener noreferrer"
                                style={{ color: "#19a1e6", fontWeight: 600, textDecoration: "underline" }}>
                                {mat.nome}
                              </a>
                            </div>
                          ))
                        )}
                      </td>
                      <td style={tdStyle}>
                        {lez.note.filter(n => n.condivisa).length === 0
                          ? <span style={{ color: "#aaa" }}>—</span>
                          : lez.note.filter(n => n.condivisa).map((n, nidx) => (
                            <div key={nidx}>{n.testo}</div>
                          ))}
                      </td>
                      <td style={{ ...tdStyle, minWidth: 120, textAlign: "center", verticalAlign: "middle" }}>
                        {isProssima && isOggi && lez.linkLive && (
                          <a
                            href={lez.linkLive}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "block",
                              marginBottom: 7,
                              background: "#1cb0f6",
                              color: "#fff",
                              borderRadius: 7,
                              padding: "7px 12px",
                              fontWeight: 700,
                              fontSize: 15,
                              textDecoration: "none",
                              boxShadow: "0 2px 8px rgba(28,176,246,0.25)",
                              transition: "background 0.2s"
                            }}
                            onMouseOver={e => e.currentTarget.style.background = "#1592d7"}
                            onMouseOut={e => e.currentTarget.style.background = "#1cb0f6"}
                          >
                            Accedi alla lezione
                          </a>
                        )}
                        {isProssima && (
                          <button
                            onClick={() => handleCaricaMateriale(lez.id)}
                            style={{
                              background: "#e3eefe",
                              color: "#20489a",
                              border: "none",
                              borderRadius: 7,
                              padding: "7px 12px",
                              fontWeight: 700,
                              fontSize: 15,
                              cursor: "pointer",
                              minWidth: 110,
                              marginBottom: 7,
                              boxShadow: "0 1px 4px rgba(32,72,154,0.13)",
                              transition: "background 0.2s"
                            }}
                            onMouseOver={e => e.currentTarget.style.background = "#b2e4fc"}
                            onMouseOut={e => e.currentTarget.style.background = "#e3eefe"}
                          >
                            Carica materiale
                          </button>
                        )}
                        <button
                          onClick={() => setModificaId(lez.id)}
                          style={{
                            background: "#4268b3",
                            color: "#fff",
                            border: "none",
                            borderRadius: 7,
                            padding: "7px 12px",
                            fontWeight: 700,
                            fontSize: 15,
                            cursor: "pointer",
                            minWidth: 110,
                            marginBottom: 2,
                            marginTop: 4,
                            boxShadow: "0 1px 4px rgba(66,104,179,0.31)",
                            transition: "background 0.2s"
                          }}
                          onMouseOver={e => e.currentTarget.style.background = "#2d4f8e"}
                          onMouseOut={e => e.currentTarget.style.background = "#4268b3"}
                        >
                          Richiedi modifica
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Modal modifica */}
        {modificaId && (
          <div
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(32,72,154,0.27)",
              zIndex: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onClick={() => setModificaId(null)}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 34,
                minWidth: 340,
                boxShadow: "0 4px 20px 0 rgba(32,72,154,0.13)"
              }}
              onClick={e => e.stopPropagation()}
            >
              <h4 style={{ marginBottom: 12, fontWeight: 700, fontSize: 18, color: "#20489a" }}>
                Richiedi modifica prenotazione
              </h4>
              <textarea
                placeholder="Descrivi la modifica richiesta..."
                value={modificaText}
                onChange={e => setModificaText(e.target.value)}
                rows={4}
                style={{
                  width: "100%",
                  marginBottom: 14,
                  borderRadius: 7,
                  border: "1.3px solid #4268b3",
                  padding: 10,
                  fontSize: 16,
                  color: "#20489a"
                }}
              />
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button
                  onClick={() => setModificaId(null)}
                  style={{
                    background: "#eee",
                    color: "#4268b3",
                    border: "none",
                    borderRadius: 7,
                    padding: "7px 18px",
                    fontWeight: 700,
                    fontSize: 15
                  }}
                >
                  Annulla
                </button>
                <button
                  onClick={() => {
                    setMsg("Richiesta inviata! Riceverai una risposta dall'amministratore.");
                    setModificaId(null);
                    setModificaText("");
                    setTimeout(() => setMsg(""), 4000);
                  }}
                  style={{
                    background: "#1cb0f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: 7,
                    padding: "7px 18px",
                    fontWeight: 700,
                    fontSize: 15
                  }}
                  disabled={modificaText.trim().length < 5}
                >
                  Invia richiesta
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const thStyle = {
  padding: "13px 8px",
  color: "#20489a",
  background: "#f5f8ff",
  fontWeight: 700,
  fontSize: 16,
  borderBottom: "2px solid #e4ecf7",
  textAlign: "left",
  letterSpacing: "0.2px"
};

const tdStyle = {
  padding: "12px 8px",
  color: "#20489a",
  fontSize: 16,
  verticalAlign: "top",
  borderBottom: "1px solid #e4ecf7"
};