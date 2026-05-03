// @ts-nocheck
// Logica condivisa per normalizzare le attività in eventi FullCalendar
// Stati visualizzati: Prossima, Oggi, Prenotata, Conclusa, Ripianificata, Cancellata
// (Spostata eliminato: ogni modifica di orario/data diventa "Ripianificata")

export function safeDate(d) {
  try {
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  } catch {
    return null;
  }
}

export function normalizeStart(raw) {
  return raw.orario || raw.dataInizio || raw.start || raw.createdAt;
}

export function computeStatoBase(startISODate, todayISO, isProssima, raw = {}) {
  // Normalizziamo eventuali stati legacy
  const legacy = (raw.stato || "").toLowerCase();
  if (legacy === "cancellata") return "Cancellata";
  if (legacy === "ripianificata" || legacy === "ripianificata/spostata" || legacy === "spostata")
    return "Ripianificata";

  if (isProssima) return "Prossima";
  if (!startISODate) return "Sconosciuta";
  if (startISODate < todayISO) return "Conclusa";
  if (startISODate === todayISO) return "Oggi";
  return "Prenotata";
}

export function colorsForStato(stato) {
  switch (stato) {
    case "Prossima":
      return { bg: "#FFDBA8", border: "#FF9800", text: "#6A3A00" };
    case "Oggi":
      return { bg: "#FFF6C7", border: "#FACC15", text: "#624900" };
    case "Prenotata":
      return { bg: "#D4F0FC", border: "#38BDF8", text: "#20489A" };
    case "Conclusa":
      return { bg: "#C7F7D7", border: "#86EFAC", text: "#12753A" };
    case "Ripianificata":
      return {
        bg: "linear-gradient(135deg,#FFF3B0 45%,#1CB0F6 100%)",
        // fcBg: colore solido passato a FullCalendar (non supporta gradient su backgroundColor)
        // Il gradient viene applicato in handleEventDidMount via info.el.style.background
        fcBg: "#FFF3B0",
        border: "#1CB0F6",
        text: "#20489A"
      };
    case "Cancellata":
      return { bg: "#F8D7DA", border: "#E58B94", text: "#721C24" };
    default:
      return { bg: "#E3EEFE", border: "#A5B4FC", text: "#20489A" };
  }
}

export function mapAttivita(attivitaArray = []) {
  const todayISO = new Date().toISOString().slice(0, 10);

  const enriched = attivitaArray
    .map(a => {
      const startRaw = normalizeStart(a);
      const startDate = safeDate(startRaw);
      if (!startDate) return null;
      const isoDate = startDate.toISOString().slice(0, 10);
      return { raw: a, startDate, isoDate };
    })
    .filter(Boolean);

  // Individua prossima
  const sorted = [...enriched].sort(
    (x, y) => x.startDate.getTime() - y.startDate.getTime()
  );
  const next = sorted.find(ev => ev.isoDate >= todayISO);
  const prossimaId = next?.raw?.id ?? null;

  const events = enriched.map(ev => {
    const rawDur =
      ev.raw.durataOre ??
      ev.raw.oreConsumate ??
      ev.raw.durata ??
      ev.raw.hours ??
      1;
    const durata = typeof rawDur === "number" && rawDur > 0 ? rawDur : 1;
    const endDate = new Date(ev.startDate.getTime() + durata * 3600000);

    let stato = computeStatoBase(
      ev.isoDate,
      todayISO,
      ev.raw.id === prossimaId,
      ev.raw
    );

    // REGOLA UNICA RIPIANIFICATA:
    if (
      ev.raw.orarioOriginale &&
      ev.raw.orarioOriginale !== ev.raw.orario &&
      stato !== "Cancellata"
    ) {
      stato = "Ripianificata";
    }

    const colors = colorsForStato(stato);
    // FullCalendar non supporta gradient su backgroundColor — usa colore solido se disponibile
    const fcBg = (colors as any).fcBg || colors.bg;
    const titolo =
      ev.raw.titolo?.trim() ||
      ev.raw.descrizione?.trim() ||
      ev.raw.nome?.trim() ||
      "Lezione";

    return {
      id: String(ev.raw.id),
      title: titolo,
      start: ev.startDate,
      end: endDate,
      backgroundColor: fcBg,
      borderColor: colors.border,
      textColor: colors.text,
      classNames: ["evt-stato-" + stato.toLowerCase()],
      extendedProps: {
        stato,
        durataOre: durata,
        clienteId: ev.raw.clienteId ?? ev.raw.pacchetto?.clienteId,
        createdAt: ev.raw.createdAt,
        orario: ev.raw.orario,
        orarioOriginale: ev.raw.orarioOriginale
      }
    };
  });

  return { events, prossimaId };
}