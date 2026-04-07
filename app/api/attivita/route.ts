// @ts-nocheck
import { NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { zonedTimeToUtc } from 'date-fns-tz'
import { logPacchettoChange } from '../utils/pacchettoChangelog'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/authOptions'

export const runtime = 'nodejs';

// ------------------ Helpers ------------------

/**
 * Se il pacchetto è saldato e le ore residue sono arrivate a zero, lo archivia automaticamente.
 */
async function autoArchiviaSeNecessario(pacchettoId: number) {
  if (!pacchettoId) return
  const p = await prisma.pacchettoOre.findUnique({ where: { id: pacchettoId } })
  if (p && p.saldato && p.oreResidue <= 0 && p.stato !== 'archiviato') {
    await prisma.pacchettoOre.update({
      where: { id: pacchettoId },
      data: { stato: 'archiviato' }
    })
  }
}

function toPositiveNumber(value) {
  if (value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

// simple zero-pad helper
function pad2(n) {
  return String(n).padStart(2, '0')
}

const DAY_STR_TO_NUM = {
  sun: 0, sunday:0, dom:0,
  mon: 1, monday:1, lun:1, monday:1,
  tue: 2, tuesday:2, mar:2,
  wed: 3, wednesday:3, mer:3,
  thu: 4, thursday:4, gio:4,
  fri: 5, friday:5, ven:5,
  sat: 6, saturday:6, sab:6
};

function normalizeGiorniMixed(giorni) {
  if (!Array.isArray(giorni)) return [];
  return giorni.map(g => {
    if (typeof g === 'number') return g;
    if (typeof g === 'string') {
      const key = g.trim().toLowerCase();
      if (key in DAY_STR_TO_NUM) return DAY_STR_TO_NUM[key];
      // Tentativo: abbreviazione 3 lettere
      if (key.slice(0,3) in DAY_STR_TO_NUM) return DAY_STR_TO_NUM[key.slice(0,3)];
    }
    return null;
  }).filter(v => v !== null && v >=0 && v <=6)
     .filter((v,i,a)=>a.indexOf(v)===i) // unique
     .sort();
}

// ------------------ GET ------------------
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const pacchettoId = searchParams.get('pacchettoId')
    const clienteIdQuery = searchParams.get('clienteId')

    const isCliente = session.user?.role === 'cliente'
    const sessionClienteId = session.user?.clienteId ? Number(session.user.clienteId) : null
    if (isCliente && !sessionClienteId)
      return NextResponse.json({ error: 'Profilo incompleto (clienteId mancante)' }, { status: 403 })

    let effectiveClienteId = null
    if (isCliente) effectiveClienteId = sessionClienteId
    else if (clienteIdQuery) effectiveClienteId = Number(clienteIdQuery)

    if (id) {
      const attivita = await prisma.attivita.findUnique({
        where: { id: Number(id) },
        include: { pacchetto: { include: { cliente: true } } }
      })
      if (!attivita) return NextResponse.json({ error: 'Attività non trovata' }, { status: 404 })
      if (isCliente && attivita.clienteId !== sessionClienteId)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      return NextResponse.json(attivita)
    }

  const where = {}
    if (effectiveClienteId) where.clienteId = effectiveClienteId
    if (pacchettoId) where.pacchettoId = Number(pacchettoId)

    // Exclude ad-hoc lavagna placeholder activities (created to host a lavagna without consuming hours)
    // unless explicitly requested with ?includeAdHocLavagne=1
    const includeAdHoc = searchParams.get('includeAdHocLavagne') === '1';
    if (!includeAdHoc) {
      // Recognize ad-hoc lavagne by zero hours, no pacchetto, and a generated description starting with "Lavagna"
      // Stato is usually 'svolta' but we don't hard-require it.
      where.NOT = {
        AND: [
          { oreConsumate: 0 },
          { durataOre: 0 },
          { pacchettoId: null },
          { descrizione: { startsWith: 'Lavagna' } }
        ]
      }
    }

    const attivitaList = await prisma.attivita.findMany({
      where,
      include: { pacchetto: { include: { cliente: true } } },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(attivitaList)
  } catch (err) {
    console.error('Errore GET /api/attivita:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// ------------------ POST (singola + ricorrente/nidificata) ------------------
export async function POST(request) {
  try {
    const bodyText = await request.text();
      let body;
      try {
        body = JSON.parse(bodyText);
      } catch (e) {
        return NextResponse.json({ error: 'Body JSON non valido' }, { status: 400 });
      }

  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  // Estrazione top-level
  let {
    tipo,
    pacchettoId,
    clienteId,
    descrizione,
    oreConsumate,
    durataOre,
    durata,
    orario,
    timeZone,
    giorni,
    dataInizio,
    dataFine,
    oraInizio,
    extraPacchetto,
    utente = session.user?.email || 'admin'
  } = body

  const isExtraPacchetto = extraPacchetto === true || extraPacchetto === 'true'

  // Caso: payload annidato in body.ricorrenza (il tuo caso attuale)
  if (!tipo && body.ricorrenza) {
    tipo = 'ricorrente'
    const r = body.ricorrenza
    // Copia se mancanti
    if (!giorni && r.giorni) giorni = r.giorni
    if (!dataInizio && r.dataInizio) dataInizio = r.dataInizio
    if (!dataFine && r.dataFine) dataFine = r.dataFine
    if (!durataOre && !oreConsumate && !durata && r.durata) durata = r.durata
    if (!oraInizio && r.orarioInizio) oraInizio = r.orarioInizio
    // timezone from nested ricorrenza preferred
    if (!timeZone && r.timeZone) timeZone = r.timeZone
  }

  // Normalizzazione durata
  const durataNormalizzata =
    toPositiveNumber(oreConsumate) ||
    toPositiveNumber(durataOre) ||
    toPositiveNumber(durata) ||
    null

  // Pacchetti / parametri obbligatori
  if (!pacchettoId || !clienteId || !descrizione) {
    return NextResponse.json({
      error: 'Parametri obbligatori mancanti',
      fields: { pacchettoId, clienteId, descrizione }
    }, { status: 400 })
  }

  if (session.user?.role === 'cliente' &&
      Number(clienteId) !== Number(session.user?.clienteId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const pacchetto = await prisma.pacchettoOre.findUnique({
    where: { id: Number(pacchettoId) }
  })
  if (!pacchetto) return NextResponse.json({ error: 'Pacchetto non trovato' }, { status: 404 })
  if (pacchetto.clienteId !== Number(clienteId))
    return NextResponse.json({ error: 'Pacchetto non appartiene al cliente' }, { status: 400 })
  if (pacchetto.stato !== 'attivo')
    return NextResponse.json({ error: 'Pacchetto non attivo o scaduto' }, { status: 400 })

  // ----- RICORRENTE -----
  if (tipo === 'ricorrente') {
    if (!durataNormalizzata) {
      return NextResponse.json({ error: 'Durata ricorrenza non valida (durata/durataOre/oreConsumate mancante)' }, { status: 400 })
    }
    const giorniNorm = normalizeGiorniMixed(giorni);
    if (!giorniNorm.length) {
      return NextResponse.json({ error: 'Giorni ricorrenza mancanti o non validi', original: giorni }, { status: 400 })
    }
    if (!dataInizio || !dataFine) {
      return NextResponse.json({ error: 'Range date mancante' }, { status: 400 })
    }

    const start = new Date(dataInizio + 'T00:00:00')
    const end = new Date(dataFine + 'T23:59:59')
    if (end < start) return NextResponse.json({ error: 'Range date invertito' }, { status: 400 })

    const occorrenze = []
    const cur = new Date(start)
    const [hh, mm] = (oraInizio || '15:00').split(':')

    // default timezone fallback
    const tz = timeZone || 'Europe/Rome'

    while (cur <= end) {
      if (giorniNorm.includes(cur.getDay())) {
        // Build a local date string for the target day (YYYY-MM-DD) using cur's Y/M/D
        // then convert the desired wall-clock time in Europe/Rome to a UTC instant.
        const y = cur.getFullYear()
        const m = pad2(cur.getMonth() + 1)
        const d = pad2(cur.getDate())
        const hhStr = pad2(Number(hh) || 0)
        const mmStr = pad2(Number(mm) || 0)
        const dateStr = `${y}-${m}-${d}T${hhStr}:${mmStr}:00`
        const utcInstant = zonedTimeToUtc(dateStr, tz)
        occorrenze.push(utcInstant)
      }
      cur.setDate(cur.getDate() + 1)
    }

    const requiredHours = occorrenze.length * durataNormalizzata
    if (occorrenze.length === 0) {
      return NextResponse.json({ error: 'Nessuna occorrenza generata', giorniNorm }, { status: 400 })
    }
    if (!isExtraPacchetto && requiredHours > pacchetto.oreResidue) {
      return NextResponse.json({
        error: 'Ore insufficienti',
        requiredHours,
        oreResidue: pacchetto.oreResidue
      }, { status: 400 })
    }

    try {
      const created = await prisma.$transaction(async (tx) => {
        // Trova il prossimo ricorrenzaId disponibile
        const lastAttivita = await tx.attivita.findFirst({
          where: { ricorrenzaId: { not: null } },
          orderBy: { ricorrenzaId: 'desc' },
          select: { ricorrenzaId: true }
        })
        const ricorrenzaId = (lastAttivita?.ricorrenzaId || 0) + 1
        
        const rows = []
        for (const dt of occorrenze) {
          const att = await tx.attivita.create({
            data: {
              pacchettoId: Number(pacchettoId),
              clienteId: Number(clienteId),
              descrizione,
              oreConsumate: durataNormalizzata,
              durataOre: durataNormalizzata,
              orario: dt,
              stato: isExtraPacchetto ? 'EXTRA' : 'Prenotata',
              extraPacchetto: isExtraPacchetto,
              ricorrenzaId: ricorrenzaId
            }
          })
          rows.push(att)
        }

        if (!isExtraPacchetto) {
          await tx.pacchettoOre.update({
            where: { id: Number(pacchettoId) },
            data: {
              oreResidue: { decrement: requiredHours }
            }
          })
        }
        return rows
      })

      if (!isExtraPacchetto) {
        await logPacchettoChange({
          pacchettoId: Number(pacchettoId),
          tipoOperazione: 'creazione-ricorrenza',
          orePrima: pacchetto.oreResidue,
          oreDopo: pacchetto.oreResidue - requiredHours,
          attivitaId: null,
          utente,
          motivazione: `Ricorrenza: ${descrizione}`,
          pacchettoDescrizione: pacchetto.descrizione
        })
      }

      await autoArchiviaSeNecessario(Number(pacchettoId))
      return NextResponse.json({
        ok: true,
        tipo: 'ricorrente',
        createCount: created.length,
        requiredHours
      }, { status: 201 })
    } catch (e) {
      console.error('[ATTIVITA][RICORRENZA][ERRORE TX]', e)
      return NextResponse.json({ error: 'Errore transazione ricorrenza' }, { status: 500 })
    }
  }

  // ----- SINGOLA -----
  if (!durataNormalizzata) {
    return NextResponse.json({ error: 'Durata/ore mancanti o non valide (singola)' }, { status: 400 })
  }
  if (!isExtraPacchetto && pacchetto.oreResidue < durataNormalizzata) {
    return NextResponse.json({ error: 'Ore residue insufficienti' }, { status: 400 })
  }

  const dataCreate = {
    pacchettoId: Number(pacchettoId),
    clienteId: Number(clienteId),
    oreConsumate: durataNormalizzata,
    descrizione,
    durataOre: durataNormalizzata,
    extraPacchetto: isExtraPacchetto,
    stato: isExtraPacchetto ? 'EXTRA' : undefined
  }
  if (orario) {
    const d = new Date(orario)
    if (!isNaN(d.getTime())) dataCreate.orario = d
  }

  try {
    if (isExtraPacchetto) {
      const attivitaCreata = await prisma.attivita.create({ data: dataCreate })
      return NextResponse.json({ attivita: attivitaCreata, pacchetto }, { status: 201 })
    }

    const [attivitaCreata, pacchettoAggiornato] = await prisma.$transaction([
      prisma.attivita.create({ data: dataCreate }),
      prisma.pacchettoOre.update({
        where: { id: Number(pacchettoId) },
        data: {
          oreResidue: { decrement: durataNormalizzata }
        }
      })
    ])

    await logPacchettoChange({
      pacchettoId: Number(pacchettoId),
      tipoOperazione: 'creazione-attivita',
      orePrima: pacchetto.oreResidue,
      oreDopo: pacchetto.oreResidue - durataNormalizzata,
      attivitaId: attivitaCreata.id,
      utente,
      motivazione: descrizione,
      pacchettoDescrizione: pacchetto.descrizione
    })

    await autoArchiviaSeNecessario(Number(pacchettoId))
    return NextResponse.json({ attivita: attivitaCreata, pacchetto: pacchettoAggiornato }, { status: 201 })
  } catch (err) {
    console.error('[API][POST /api/attivita] Errore:', err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 })
  }
    } catch (err) {
      console.error('[API][POST /api/attivita] Errore:', err);
      return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
    }
}

// ------------------ PATCH ------------------
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const body = await request.json()
    const { id, descrizione, durataOre, oreConsumate, orario, modificaBatch, ricorrenzaId } = body
    if (!id) return NextResponse.json({ error: 'ID obbligatorio' }, { status: 400 })

    const att = await prisma.attivita.findUnique({ where: { id: Number(id) } })
    if (!att) return NextResponse.json({ error: 'Attività non trovata' }, { status: 404 })
    if (session.user.role === 'cliente' && att.clienteId !== Number(session.user.clienteId))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // ===== MODIFICA BATCH DI RICORRENZA =====
    if (modificaBatch && ricorrenzaId) {
      // Verifica che l'attività appartenga davvero a questa ricorrenza
      if (att.ricorrenzaId !== Number(ricorrenzaId)) {
        return NextResponse.json({ error: 'ricorrenzaId non corrisponde' }, { status: 400 })
      }

      // Recupera tutte le attività della stessa ricorrenza
      const attivitaRicorrenza = await prisma.attivita.findMany({
        where: { ricorrenzaId: Number(ricorrenzaId) }
      })

      if (!attivitaRicorrenza.length) {
        return NextResponse.json({ error: 'Nessuna attività trovata per questa ricorrenza' }, { status: 404 })
      }

      // Prepara i dati da aggiornare
      const updateData = {}
      if (typeof descrizione === 'string') {
        updateData.descrizione = descrizione.trim()
      }

      const durataInput = durataOre ?? oreConsumate
      let nuovaDurata = null
      if (durataInput !== undefined && durataInput !== null) {
        const durataVal = Number(durataInput)
        if (!Number.isFinite(durataVal) || durataVal <= 0) {
          return NextResponse.json({ error: 'Durata non valida' }, { status: 400 })
        }
        nuovaDurata = durataVal
        updateData.durataOre = durataVal
        updateData.oreConsumate = durataVal
      }

      // Per le modifiche batch di orario, manteniamo lo stesso offset temporale
      let orarioOffset = null
      if (orario) {
        const nuovoOrario = new Date(orario)
        const vecchioOrario = att.orario ? new Date(att.orario) : new Date(att.createdAt)
        
        if (Number.isNaN(nuovoOrario.getTime())) {
          return NextResponse.json({ error: 'Orario non valido' }, { status: 400 })
        }

        // Calcola l'offset in millisecondi
        orarioOffset = nuovoOrario.getTime() - vecchioOrario.getTime()
      }

      // Calcola il delta ore totale per tutti gli aggiornamenti
      const durataAttuale = att.oreConsumate ?? att.durataOre ?? 0
      const deltaOrePerAttivita = nuovaDurata != null ? nuovaDurata - durataAttuale : 0
      const deltaOreTotale = deltaOrePerAttivita * attivitaRicorrenza.length

      // Transazione per aggiornare tutte le attività della ricorrenza
      try {
        const result = await prisma.$transaction(async tx => {
          let pacchettoBefore = null
          let pacchettoAfter = null

          // Verifica pacchetto se c'è cambio di ore
          if (att.pacchettoId && deltaOreTotale !== 0) {
            pacchettoBefore = await tx.pacchettoOre.findUnique({ where: { id: att.pacchettoId } })
            if (!pacchettoBefore) {
              const err = new Error('PACCHETTO_NON_TROVATO')
              err.code = 'PACCHETTO_NON_TROVATO'
              throw err
            }

            const nuovoResiduo = pacchettoBefore.oreResidue - deltaOreTotale
            if (deltaOreTotale > 0 && nuovoResiduo < 0) {
              const err = new Error('ORE_INSUFFICIENTI')
              err.code = 'ORE_INSUFFICIENTI'
              throw err
            }

            pacchettoAfter = await tx.pacchettoOre.update({
              where: { id: pacchettoBefore.id },
              data: {
                oreResidue: nuovoResiduo
              }
            })
          }

          // Aggiorna tutte le attività della ricorrenza
          const updatedAttivita = []
          for (const attivita of attivitaRicorrenza) {
            const dataPerAttivita = { ...updateData }

            // Applica l'offset temporale se specificato
            if (orarioOffset !== null && attivita.orario) {
              const vecchioOrarioAttivita = new Date(attivita.orario)
              const nuovoOrarioAttivita = new Date(vecchioOrarioAttivita.getTime() + orarioOffset)
              dataPerAttivita.orario = nuovoOrarioAttivita

              // Gestisci orarioOriginale
              if (!attivita.orarioOriginale && vecchioOrarioAttivita.getTime() !== nuovoOrarioAttivita.getTime()) {
                dataPerAttivita.orarioOriginale = vecchioOrarioAttivita
              } else if (attivita.orarioOriginale && nuovoOrarioAttivita.getTime() === new Date(attivita.orarioOriginale).getTime()) {
                dataPerAttivita.orarioOriginale = null
              }
            }

            const updated = await tx.attivita.update({
              where: { id: attivita.id },
              data: dataPerAttivita
            })
            updatedAttivita.push(updated)
          }

          return { updatedAttivita, pacchettoBefore, pacchettoAfter }
        })

        // Log changelog se ci sono state modifiche di ore
        if (
          deltaOreTotale !== 0 &&
          result.pacchettoBefore &&
          result.pacchettoAfter &&
          att.pacchettoId
        ) {
          await logPacchettoChange({
            pacchettoId: att.pacchettoId,
            tipoOperazione: 'modifica-ricorrenza-batch',
            orePrima: result.pacchettoBefore.oreResidue,
            oreDopo: result.pacchettoAfter.oreResidue,
            attivitaId: att.id,
            utente: session.user?.email || 'admin',
            motivazione: `Modifica batch: ${updateData.descrizione ?? att.descrizione ?? ''} (${result.updatedAttivita.length} attività)`,
            pacchettoDescrizione: result.pacchettoBefore.descrizione
          })
        }

        return NextResponse.json({ 
          ok: true,
          tipo: 'batch',
          updatedCount: result.updatedAttivita.length,
          attivita: result.updatedAttivita,
          pacchetto: result.pacchettoAfter ?? null
        })
      } catch (errTx) {
        if (errTx?.code === 'ORE_INSUFFICIENTI') {
          return NextResponse.json({ 
            error: 'Ore residue insufficienti per questa modifica batch',
            required: deltaOreTotale,
            available: att.pacchettoId ? (await prisma.pacchettoOre.findUnique({ where: { id: att.pacchettoId } }))?.oreResidue : 0
          }, { status: 400 })
        }
        if (errTx?.code === 'PACCHETTO_NON_TROVATO') {
          return NextResponse.json({ error: 'Pacchetto collegato non trovato' }, { status: 404 })
        }
        throw errTx
      }
    }

    // ===== MODIFICA SINGOLA (LOGICA ESISTENTE) =====
    const updateData = {}

    if (typeof descrizione === 'string') {
      updateData.descrizione = descrizione.trim()
    }

    const durataInput = durataOre ?? oreConsumate
    let nuovaDurata = null
    if (durataInput !== undefined && durataInput !== null) {
      const durataVal = Number(durataInput)
      if (!Number.isFinite(durataVal) || durataVal <= 0) {
        return NextResponse.json({ error: 'Durata non valida' }, { status: 400 })
      }
      nuovaDurata = durataVal
      updateData.durataOre = durataVal
      updateData.oreConsumate = durataVal
    }

    let nuovoOrarioDate = null
    if (orario) {
      const dt = new Date(orario)
      if (Number.isNaN(dt.getTime())) {
        return NextResponse.json({ error: 'Orario non valido' }, { status: 400 })
      }
      nuovoOrarioDate = dt
      updateData.orario = dt
      if (att.orario && !att.orarioOriginale && att.orario.getTime() !== dt.getTime()) {
        updateData.orarioOriginale = att.orario
      } else if (att.orarioOriginale && dt.getTime() === att.orarioOriginale.getTime()) {
        updateData.orarioOriginale = null
      }
    }

    const durataAttuale = att.oreConsumate ?? att.durataOre ?? 0
    const deltaOre = nuovaDurata != null ? nuovaDurata - durataAttuale : 0

    if (!Object.keys(updateData).length && deltaOre === 0) {
      return NextResponse.json({ attivita: att })
    }

    try {
      const result = await prisma.$transaction(async tx => {
        let pacchettoBefore = null
        let pacchettoAfter = null

        if (att.pacchettoId) {
          pacchettoBefore = await tx.pacchettoOre.findUnique({ where: { id: att.pacchettoId } })
          if (!pacchettoBefore) {
            const err = new Error('PACCHETTO_NON_TROVATO')
            err.code = 'PACCHETTO_NON_TROVATO'
            throw err
          }

          if (deltaOre !== 0) {
            const nuovoResiduo = pacchettoBefore.oreResidue - deltaOre
            if (deltaOre > 0 && nuovoResiduo < 0) {
              const err = new Error('ORE_INSUFFICIENTI')
              err.code = 'ORE_INSUFFICIENTI'
              throw err
            }
            pacchettoAfter = await tx.pacchettoOre.update({
              where: { id: pacchettoBefore.id },
              data: {
                oreResidue: nuovoResiduo
              }
            })
          } else {
            pacchettoAfter = pacchettoBefore
          }
        }

        const updated = await tx.attivita.update({
          where: { id: att.id },
          data: updateData
        })

        return { updated, pacchettoBefore, pacchettoAfter }
      })

      if (
        deltaOre !== 0 &&
        result.pacchettoBefore &&
        result.pacchettoAfter &&
        att.pacchettoId
      ) {
        await logPacchettoChange({
          pacchettoId: att.pacchettoId,
          tipoOperazione: 'modifica-attivita',
          orePrima: result.pacchettoBefore.oreResidue,
          oreDopo: result.pacchettoAfter.oreResidue,
          attivitaId: att.id,
          utente: session.user?.email || 'admin',
          motivazione: updateData.descrizione ?? att.descrizione ?? '',
          pacchettoDescrizione: result.pacchettoBefore.descrizione
        })
      }

      return NextResponse.json({ attivita: result.updated, pacchetto: result.pacchettoAfter ?? null })
    } catch (errTx) {
      if (errTx?.code === 'ORE_INSUFFICIENTI') {
        return NextResponse.json({ error: 'Ore residue insufficienti per questa modifica' }, { status: 400 })
      }
      if (errTx?.code === 'PACCHETTO_NON_TROVATO') {
        return NextResponse.json({ error: 'Pacchetto collegato non trovato' }, { status: 404 })
      }
      throw errTx
    }
  } catch (err) {
    console.error('Errore PATCH /api/attivita:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// ------------------ DELETE ------------------
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    
    const body = await request.json()
    const { id } = body
    if (!id) return NextResponse.json({ error: 'ID obbligatorio' }, { status: 400 })

    const att = await prisma.attivita.findUnique({ where: { id: Number(id) } })
    if (!att) {
      return NextResponse.json({ error: 'Attività non trovata' }, { status: 404 })
    }
    
    if (session.user.role === 'cliente' && att.clienteId !== Number(session.user.clienteId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verifica se pacchettoId esiste
    if (!att.pacchettoId) {
      // Elimina solo la lavagna e l'attività senza aggiornare il pacchetto
      const lavagna = await prisma.lavagna.findUnique({
        where: { attivitaId: att.id },
        select: { id: true }
      })
      
      const result = await prisma.$transaction(async tx => {
        await tx.richiestaModifica.deleteMany({ where: { attivitaId: att.id } })
        
        if (lavagna) {
          await tx.lavagnaTratto.deleteMany({ where: { lavagnaId: lavagna.id } })
          await tx.lavagna.delete({ where: { id: lavagna.id } })
        }
        
        const deleted = await tx.attivita.delete({ where: { id: att.id } })
        return { deleted, pacchettoBefore: null, pacchettoAggiornato: null }
      })
      
      return NextResponse.json({ deleted: result.deleted, pacchetto: null })
    }

    const pacchetto = await prisma.pacchettoOre.findUnique({ where: { id: att.pacchettoId } })
    if (!pacchetto) {
      return NextResponse.json({ error: 'Pacchetto non trovato (collegato)' }, { status: 404 })
    }

    const lavagna = await prisma.lavagna.findUnique({
      where: { attivitaId: att.id },
      select: { id: true }
    })

    // Se l'attività è segnata come extra, non reintegriamo le ore del pacchetto
    if (att.extraPacchetto) {
      const result = await prisma.$transaction(async tx => {
        await tx.richiestaModifica.deleteMany({ where: { attivitaId: att.id } })

        if (lavagna) {
          await tx.lavagnaTratto.deleteMany({ where: { lavagnaId: lavagna.id } })
          await tx.lavagna.delete({ where: { id: lavagna.id } })
        }

        const deleted = await tx.attivita.delete({ where: { id: att.id } })
        return { deleted }
      })

      return NextResponse.json({ deleted: result.deleted, pacchetto })
    }

    const result = await prisma.$transaction(async tx => {
      await tx.richiestaModifica.deleteMany({ where: { attivitaId: att.id } })

      if (lavagna) {
        await tx.lavagnaTratto.deleteMany({ where: { lavagnaId: lavagna.id } })
        await tx.lavagna.delete({ where: { id: lavagna.id } })
      }

      const pacchettoBefore = await tx.pacchettoOre.findUnique({
        where: { id: att.pacchettoId },
        select: { id: true, oreResidue: true, descrizione: true }
      })

      const pacchettoAggiornato = pacchettoBefore
        ? await tx.pacchettoOre.update({
            where: { id: pacchettoBefore.id },
            data: {
              oreResidue: pacchettoBefore.oreResidue + att.oreConsumate
            }
          })
        : null

      const deleted = await tx.attivita.delete({ where: { id: att.id } })

      return { deleted, pacchettoBefore, pacchettoAggiornato }
    })

    if (result.pacchettoBefore && result.pacchettoAggiornato) {
      await logPacchettoChange({
        pacchettoId: result.pacchettoBefore.id,
        tipoOperazione: 'eliminazione-attivita',
        orePrima: result.pacchettoBefore.oreResidue,
        oreDopo: result.pacchettoAggiornato.oreResidue,
        attivitaId: att.id,
        utente: session.user?.email || 'admin',
        motivazione: att.descrizione,
        pacchettoDescrizione: result.pacchettoBefore.descrizione
      })
    }

    return NextResponse.json({ deleted: result.deleted, pacchetto: result.pacchettoAggiornato })
  } catch (err) {
    console.error('[DELETE /api/attivita] ERRORE:', err)
    console.error('[DELETE /api/attivita] Stack:', err.stack)
    return NextResponse.json({ 
      error: 'Errore interno', 
      details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    }, { status: 500 })
  }
}