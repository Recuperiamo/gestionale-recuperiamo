// @ts-nocheck
/**
 * Utility per gestire gli stati dei pacchetti
 */

/**
 * Calcola il sottostato di un pacchetto in base alle ore
 * @param {object} stats - { oreAcquistate, orePrenotate, oreSvolte }
 * @returns {string|null} - "tutto_prenotato" | "esaurito" | null
 */
export function calcolaSottostato(stats) {
  // ESAURITO: ore svolte >= ore acquistate
  if (stats.oreSvolte >= stats.oreAcquistate) {
    return "esaurito";
  }
  // TUTTO PRENOTATO: ore prenotate >= ore acquistate (ma non ancora tutte svolte)
  if (stats.orePrenotate >= stats.oreAcquistate) {
    return "tutto_prenotato";
  }
  return null;
}

/**
 * Restituisce il testo completo dello stato con sottostato
 * @param {string} stato - "attivo" | "sospeso" | "archiviato"
 * @param {string|null} sottostato - "tutto_prenotato" | "esaurito" | null
 * @returns {string}
 */
export function getStatoCompleto(stato, sottostato) {
  if (!sottostato) return stato || "attivo";
  const label = sottostato === "esaurito" ? "Esaurito" : "Tutto prenotato";
  return `${stato || "attivo"} (${label})`;
}

/**
 * Calcola statistiche ore per un pacchetto
 * @param {object} pacchetto - Il pacchetto
 * @param {array} attivita - Array di attività del pacchetto
 * @param {number} graceMs - Tempo di grazia in ms (default 5 min)
 * @returns {object} - { oreAcquistate, orePrenotate, oreSvolte, oreProgrammate, oreResidue }
 */
export function calcolaStatsPacchetto(pacchetto, attivita = [], graceMs = 5 * 60 * 1000) {
  const now = Date.now();
  const stats = {
    oreAcquistate: pacchetto.oreAcquistate || 0,
    orePrenotate: 0,
    oreSvolte: 0,
    oreProgrammate: 0,
    oreResidue: pacchetto.oreResidue || 0,
  };

  attivita.forEach(att => {
    const ore = att.oreConsumate || att.durataOre || 0;
    const orario = att.orario ? new Date(att.orario) : new Date(att.createdAt);
    const isPast = orario.getTime() < (now - graceMs);
    const isCancelled = (att.stato || '').toLowerCase() === 'cancellata';
    
    if (isCancelled) return;
    
    if (isPast) {
      stats.oreSvolte += ore;
    } else {
      stats.oreProgrammate += ore;
    }
    
    stats.orePrenotate += ore;
  });

  return stats;
}
