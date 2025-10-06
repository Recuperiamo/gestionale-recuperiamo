/**
 * Utility centralizzata per il logging delle variazioni sulle ore residue dei pacchetti.
 * Ogni creazione, modifica o eliminazione di attività che impatta le ore residue
 * DEVE chiamare questa funzione per registrare un record in Pacchetto_ChangeLog.
 */

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

/**
 * Logga una variazione sulle ore residue di un pacchetto.
 * 
 * @param {Object} params
 * @param {number|null} params.pacchettoId - ID del pacchetto coinvolto (può essere null)
 * @param {string} params.tipoOperazione - Tipo operazione: 'creazione-attivita', 'modifica-attivita', 'eliminazione-attivita', 'rettifica-manuale', 'errore'
 * @param {number} params.orePrima - Ore residue prima dell'operazione
 * @param {number} params.oreDopo - Ore residue dopo l'operazione
 * @param {number|null} [params.attivitaId] - ID attività associata (se rilevante)
 * @param {string} params.utente - Utente che ha eseguito l'operazione
 * @param {string} [params.motivazione] - Motivazione o descrizione dell'operazione
 * @param {string} [params.pacchettoDescrizione] - Descrizione pacchetto, utile per storico
 * @returns {Promise<Object>} Il record creato su Pacchetto_ChangeLog
 */
export async function logPacchettoChange({
  pacchettoId = null,
  tipoOperazione,
  orePrima,
  oreDopo,
  attivitaId = null,
  utente,
  motivazione = '',
  pacchettoDescrizione = null
}) {
  if (
    typeof orePrima !== 'number' ||
    typeof oreDopo !== 'number' ||
    !tipoOperazione ||
    !utente
  ) {
    throw new Error('Parametri obbligatori mancanti per il logging Pacchetto_ChangeLog')
  }

  return await prisma.pacchetto_ChangeLog.create({
    data: {
      pacchettoId,
      pacchettoDescrizione,
      tipoOperazione,
      orePrima,
      oreDopo,
      attivitaId,
      utente,
      motivazione,
      timestamp: new Date()
    }
  })
}