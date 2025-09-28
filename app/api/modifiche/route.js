// @ts-nocheck
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { logPacchettoChange } from '../utils/pacchettoChangelog';

export const runtime = 'nodejs';

const MS_1_DAY = 24 * 60 * 60 * 1000;
const LIMIT_CANCEL_DAYS = 7;
const LIMIT_WARN_DAYS = 3;

function getStart(att) {
  return att.orario ? new Date(att.orario) : new Date(att.createdAt);
}

/* ===================== GET ===================== */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const stato = searchParams.get('stato');
    const attivitaId = searchParams.get('attivitaId');
    const clienteIdQuery = searchParams.get('clienteId');

    const isCliente = session.user?.role === 'cliente';
    const sessionClienteId = session.user?.clienteId ? Number(session.user.clienteId) : null;
    if (isCliente && !sessionClienteId) {
      return NextResponse.json({ error: 'Profilo incompleto' }, { status: 403 });
    }

    const where = {};
    if (isCliente) {
      where.clienteId = sessionClienteId;
    } else if (clienteIdQuery) {
      where.clienteId = Number(clienteIdQuery);
    }
    if (stato) where.stato = stato;
    if (attivitaId) where.attivitaId = Number(attivitaId);

    const richieste = await prisma.richiestaModifica.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { attivita: true }
    });

    return NextResponse.json(richieste);
  } catch (err) {
    console.error('GET /api/modifiche error', err);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}

/* ===================== POST (crea) ===================== */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    const isCliente = session.user?.role === 'cliente';

    const body = await request.json();
    const { attivitaId, tipo, nuovaData, nuovoOrario, nuovaDurataOre, noteStudente } = body;

    if (!attivitaId || !tipo) {
      return NextResponse.json({ error: 'Parametri obbligatori' }, { status: 400 });
    }

    if (!['cambio_data', 'cambio_orario', 'cancellazione'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo richiesta non valido' }, { status: 400 });
    }

    const att = await prisma.attivita.findUnique({ where: { id: Number(attivitaId) } });
    if (!att) return NextResponse.json({ error: 'Attività non trovata' }, { status: 404 });

    if (isCliente && Number(session.user.clienteId) !== att.clienteId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const start = getStart(att);
    const now = new Date();
    const diffDays = (start.getTime() - now.getTime()) / MS_1_DAY;

    if (tipo === 'cancellazione' && diffDays < LIMIT_CANCEL_DAYS) {
      return NextResponse.json({ error: 'Cancellazione non consentita (<7 giorni)', code: 'CANCEL_WINDOW' }, { status: 400 });
    }

    if (tipo === 'cambio_data') {
      if (!nuovaData) {
        return NextResponse.json({ error: 'nuovaData obbligatoria per cambio_data' }, { status: 400 });
      }
      const nd = new Date(nuovaData);
      if (isNaN(nd.getTime())) {
        return NextResponse.json({ error: 'nuovaData non valida' }, { status: 400 });
      }
      if (diffDays < LIMIT_WARN_DAYS) {
        if (nd.toISOString().slice(0, 10) !== start.toISOString().slice(0, 10)) {
          return NextResponse.json({
            error: 'Cambio giorno non consentito (<3 giorni). Puoi modificare solo orario stesso giorno.',
            code: 'WINDOW_LOCKED'
          }, { status: 400 });
        }
      }
    }

    if (tipo === 'cambio_orario') {
      if (!nuovoOrario) {
        return NextResponse.json({ error: 'nuovoOrario obbligatorio per cambio_orario' }, { status: 400 });
      }
      const no = new Date(nuovoOrario);
      if (isNaN(no.getTime())) {
        return NextResponse.json({ error: 'nuovoOrario non valido' }, { status: 400 });
      }
    }

    const existing = await prisma.richiestaModifica.findFirst({
      where: {
        attivitaId: Number(attivitaId),
        stato: { in: ['pending', 'in_review'] }
      }
    });
    if (existing) {
      return NextResponse.json({ error: 'Esiste già una richiesta aperta per questa lezione', code: 'ALREADY_OPEN' }, { status: 409 });
    }

    const richiesta = await prisma.richiestaModifica.create({
      data: {
        attivitaId: att.id,
        clienteId: att.clienteId,
        tipo,
        nuovaData: nuovaData ? new Date(nuovaData) : null,
        nuovoOrario: nuovoOrario ? new Date(nuovoOrario) : null,
        nuovaDurataOre: typeof nuovaDurataOre === 'number' ? nuovaDurataOre : null,
        noteStudente: noteStudente || null
      }
    });

    return NextResponse.json(richiesta, { status: 201 });
  } catch (err) {
    console.error('POST /api/modifiche error', err);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}

/* ===================== PATCH (admin azioni) ===================== */
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    const isAdmin = session.user?.role !== 'cliente';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, action, noteAdmin, overrideOrario, overrideDurataOre } = body;
    if (!id || !action) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });
    }

    const richiesta = await prisma.richiestaModifica.findUnique({
      where: { id: Number(id) },
      include: { attivita: true }
    });
    if (!richiesta) return NextResponse.json({ error: 'Richiesta non trovata' }, { status: 404 });
    if (['approved', 'rejected'].includes(richiesta.stato) && action !== 'in_review') {
      return NextResponse.json({ error: 'Richiesta già conclusa' }, { status: 400 });
    }

    if (action === 'in_review') {
      const upd = await prisma.richiestaModifica.update({
        where: { id: richiesta.id },
        data: { stato: 'in_review', noteAdmin: noteAdmin || richiesta.noteAdmin }
      });
      return NextResponse.json(upd);
    }

    if (action === 'reject') {
      const upd = await prisma.richiestaModifica.update({
        where: { id: richiesta.id },
        data: {
          stato: 'rejected',
          noteAdmin: noteAdmin || null,
          processedAt: new Date(),
          processedBy: session.user?.email || 'admin'
        }
      });
      return NextResponse.json(upd);
    }

    if (action === 'approve') {
      let overrideDateObj = null;
      if (overrideOrario) {
        const o = new Date(overrideOrario);
        if (isNaN(o.getTime())) {
          return NextResponse.json({ error: 'overrideOrario non valido' }, { status: 400 });
        }
        overrideDateObj = o;
      }

      let overrideDur = null;
      if (overrideDurataOre !== undefined && overrideDurataOre !== null) {
        const n = Number(overrideDurataOre);
        if (isNaN(n) || n <= 0) {
          return NextResponse.json({ error: 'overrideDurataOre non valido' }, { status: 400 });
        }
        overrideDur = n;
      }

      const result = await prisma.$transaction(async (tx) => {
        let updatedAttivita = richiesta.attivita;
        let orePrimaPacchetto = null;
        let oreDopoPacchetto = null;

        if (richiesta.tipo === 'cancellazione') {
          const att = await tx.attivita.findUnique({ where: { id: richiesta.attivitaId } });
            if (!att) throw new Error('Attività non trovata in cancellazione');
          const pac = await tx.pacchettoOre.findUnique({ where: { id: att.pacchettoId } });
          updatedAttivita = await tx.attivita.delete({ where: { id: att.id } });
          await tx.pacchettoOre.update({
            where: { id: att.pacchettoId },
            data: {
              oreResidue: { increment: att.oreConsumate },
              stato: 'attivo'
            }
          });
          orePrimaPacchetto = pac.oreResidue;
          oreDopoPacchetto = pac.oreResidue + att.oreConsumate;
          await logPacchettoChange({
            pacchettoId: att.pacchettoId,
            tipoOperazione: 'cancellazione-lezione-approvata',
            orePrima: orePrimaPacchetto,
            oreDopo: oreDopoPacchetto,
            attivitaId: att.id,
            utente: session.user?.email || 'admin',
            motivazione: 'Richiesta cancellazione approvata',
            pacchettoDescrizione: pac?.descrizione || ''
          });
        } else {
          const att = await tx.attivita.findUnique({ where: { id: richiesta.attivitaId } });
          if (!att) throw new Error('Attività non trovata per modifica');

          let effectiveDate =
            overrideDateObj ||
            (richiesta.tipo === 'cambio_orario'
              ? richiesta.nuovoOrario
              : richiesta.nuovaData);

          if (!effectiveDate) {
            throw new Error('Data/Orario da applicare non disponibile');
          }

          let deltaOre = 0;
          if (overrideDur !== null) {
            deltaOre = overrideDur - att.oreConsumate;
          }

          if (deltaOre > 0) {
            const pac = await tx.pacchettoOre.findUnique({ where: { id: att.pacchettoId } });
            if (!pac) throw new Error('Pacchetto non trovato');
            if (pac.oreResidue < deltaOre) {
              throw new Error('Ore pacchetto insufficienti per nuovo valore durata');
            }
            orePrimaPacchetto = pac.oreResidue;
            updatedAttivita = await tx.attivita.update({
              where: { id: att.id },
              data: {
                orario: effectiveDate,
                ...(overrideDur !== null
                  ? { durataOre: overrideDur, oreConsumate: overrideDur }
                  : {})
              }
            });
            const pacUpd = await tx.pacchettoOre.update({
              where: { id: att.pacchettoId },
              data: {
                oreResidue: { decrement: deltaOre },
                stato: pac.oreResidue - deltaOre === 0 ? 'esaurito' : 'attivo'
              }
            });
            oreDopoPacchetto = pacUpd.oreResidue;
          } else if (deltaOre < 0) {
            const pac = await tx.pacchettoOre.findUnique({ where: { id: att.pacchettoId } });
            if (!pac) throw new Error('Pacchetto non trovato');
            orePrimaPacchetto = pac.oreResidue;
            updatedAttivita = await tx.attivita.update({
              where: { id: att.id },
              data: {
                orario: effectiveDate,
                durataOre: overrideDur !== null ? overrideDur : att.durataOre,
                oreConsumate: overrideDur !== null ? overrideDur : att.oreConsumate
              }
            });
            const pacUpd = await tx.pacchettoOre.update({
              where: { id: att.pacchettoId },
              data: {
                oreResidue: { increment: Math.abs(deltaOre) },
                stato: 'attivo'
              }
            });
            oreDopoPacchetto = pacUpd.oreResidue;
          } else {
            updatedAttivita = await tx.attivita.update({
              where: { id: att.id },
              data: {
                orario: effectiveDate,
                ...(overrideDur !== null
                  ? { durataOre: overrideDur, oreConsumate: overrideDur }
                  : {})
              }
            });
          }

          if (orePrimaPacchetto !== null && oreDopoPacchetto !== null && orePrimaPacchetto !== oreDopoPacchetto) {
            try {
              await logPacchettoChange({
                pacchettoId: att.pacchettoId,
                tipoOperazione: 'approvazione-modifica',
                orePrima: orePrimaPacchetto,
                oreDopo: oreDopoPacchetto,
                attivitaId: att.id,
                utente: session.user?.email || 'admin',
                motivazione: richiesta.noteStudente || 'Modifica approvata',
                pacchettoDescrizione: ''
              });
            } catch (eLog) {
              console.warn('[MODIFICHE][LOG PACCHETTO] warning', eLog);
            }
          }
        }

        const updReq = await tx.richiestaModifica.update({
          where: { id: richiesta.id },
          data: {
            stato: 'approved',
            processedAt: new Date(),
            processedBy: session.user?.email || 'admin',
            noteAdmin: noteAdmin || richiesta.noteAdmin
          }
        });
        return { updReq, updatedAttivita };
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Azione non riconosciuta' }, { status: 400 });
  } catch (err) {
    console.error('PATCH /api/modifiche error', err);
    return NextResponse.json({ error: err.message || 'Errore interno' }, { status: 500 });
  }
}