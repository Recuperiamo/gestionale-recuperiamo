// @ts-nocheck
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { logPacchettoChange } from '../utils/pacchettoChangelog';

export const runtime = 'nodejs';

const HOURS_7 = 168;
const HOURS_3 = 72;

function getStart(att) {
  // Se esiste att.orario usiamo quello, altrimenti fallback createdAt (retro-compat)
  return att.orario ? new Date(att.orario) : new Date(att.createdAt);
}
function onlyDateISO(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    .toISOString()
    .slice(0, 10);
}

/* ===================== GET ===================== */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const stato = searchParams.get('stato');
    const attivitaId = searchParams.get('attivitaId');
    const clienteIdQuery = searchParams.get('clienteId');

    const isCliente = session.user?.role === 'cliente';
    const sessionClienteId = session.user?.clienteId
      ? Number(session.user.clienteId)
      : null;
    if (isCliente && !sessionClienteId) {
      return NextResponse.json(
        { error: 'Profilo incompleto' },
        { status: 403 }
      );
    }

    const where = {};
    if (isCliente) where.clienteId = sessionClienteId;
    else if (clienteIdQuery) where.clienteId = Number(clienteIdQuery);
    if (stato) where.stato = stato;
    if (attivitaId) where.attivitaId = Number(attivitaId);

    const richieste = await prisma.richiestaModifica.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        attivita: true,
        cliente: { select: { id: true, nomeReferente: true, email: true } }
      }
    });

    return NextResponse.json(richieste);
  } catch (err) {
    console.error('GET /api/modifiche error', err);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}

/* ===================== POST (crea richiesta) ===================== */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    const isCliente = session.user?.role === 'cliente';

    const body = await request.json();
    let {
      attivitaId,
      tipo,
      nuovaData,
      nuovoOrario,
      nuovaDurataOre,
      noteStudente
    } = body;

    if (!attivitaId || !tipo) {
      return NextResponse.json(
        { error: 'Parametri obbligatori' },
        { status: 400 }
      );
    }
    if (!['cambio_data', 'cambio_orario', 'cancellazione'].includes(tipo)) {
      return NextResponse.json(
        { error: 'Tipo richiesta non valido' },
        { status: 400 }
      );
    }

    const att = await prisma.attivita.findUnique({
      where: { id: Number(attivitaId) }
    });
    if (!att)
      return NextResponse.json(
        { error: 'Attività non trovata' },
        { status: 404 }
      );

    if (isCliente && Number(session.user.clienteId) !== att.clienteId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const start = getStart(att);
    const now = new Date();
    const diffHours = (start.getTime() - now.getTime()) / 3600000;

    // Cancellazione: solo >=168h
    if (tipo === 'cancellazione' && diffHours < HOURS_7) {
      return NextResponse.json(
        { error: 'Cancellazione non consentita (<168h)', code: 'CANCEL_WINDOW' },
        { status: 400 }
      );
    }

    // Cambio data
    if (tipo === 'cambio_data') {
      if (!nuovaData) {
        return NextResponse.json(
          { error: 'nuovaData obbligatoria', code: 'MISSING_DATE' },
          { status: 400 }
        );
      }
      const nd = new Date(nuovaData);
      if (isNaN(nd.getTime())) {
        return NextResponse.json(
          { error: 'nuovaData non valida', code: 'INVALID_DATE' },
          { status: 400 }
        );
      }
      const todayISO = onlyDateISO(now);
      const ndISO = onlyDateISO(nd);
      if (ndISO < todayISO) {
        return NextResponse.json(
          { error: 'La nuova data è nel passato', code: 'PAST_DATE' },
          { status: 400 }
        );
      }
      const origISO = onlyDateISO(start);
      if (diffHours < HOURS_7 && !(ndISO < origISO)) {
        return NextResponse.json(
          { error: 'Puoi solo anticipare (finestra <7g)', code: 'NOT_ANTICIPATING' },
          { status: 400 }
        );
      }
    }

    // Cambio orario: sempre fascia (nuovoOrario ignorato)
    if (tipo === 'cambio_orario') {
      nuovoOrario = null;
    }

    // Esiste già una richiesta aperta (pending o in_review)?
    const existing = await prisma.richiestaModifica.findFirst({
      where: {
        attivitaId: Number(attivitaId),
        stato: { in: ['pending', 'in_review'] }
      }
    });
    if (existing) {
      return NextResponse.json(
        {
          error: 'Esiste già una richiesta aperta per questa lezione',
          code: 'ALREADY_OPEN'
        },
        { status: 409 }
      );
    }

    const richiesta = await prisma.richiestaModifica.create({
      data: {
        attivitaId: att.id,
        clienteId: att.clienteId,
        tipo,
        nuovaData: nuovaData ? new Date(nuovaData) : null,
        nuovoOrario: null,
        nuovaDurataOre:
          typeof nuovaDurataOre === 'number' ? nuovaDurataOre : null,
        noteStudente: noteStudente || null
      }
    });

    return NextResponse.json(richiesta, { status: 201 });
  } catch (err) {
    console.error('POST /api/modifiche error', err);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}

/* ===================== PATCH (azioni admin) ===================== */
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    const isAdmin = session.user?.role !== 'cliente';
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { id, action, noteAdmin, overrideOrario, overrideDurataOre } = body;
    if (!id || !action) {
      return NextResponse.json(
        { error: 'Parametri mancanti' },
        { status: 400 }
      );
    }

    const richiesta = await prisma.richiestaModifica.findUnique({
      where: { id: Number(id) },
      include: { attivita: true, cliente: true }
    });
    if (!richiesta)
      return NextResponse.json(
        { error: 'Richiesta non trovata' },
        { status: 404 }
      );
    if (
      ['approved', 'rejected', 'archived'].includes(richiesta.stato) &&
      action !== 'in_review'
    ) {
      return NextResponse.json(
        { error: 'Richiesta già conclusa' },
        { status: 400 }
      );
    }

    if (action === 'in_review') {
      const upd = await prisma.richiestaModifica.update({
        where: { id: richiesta.id },
        data: {
          stato: 'in_review',
          noteAdmin: noteAdmin || richiesta.noteAdmin
        }
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
      // overrideOrario obbligatorio per tutti i tipi tranne cancellazione
      if (richiesta.tipo !== 'cancellazione') {
        if (!overrideOrario) {
          return NextResponse.json(
            {
              error: 'overrideOrario richiesto in approvazione',
              code: 'MISSING_OVERRIDE_ORARIO'
            },
            { status: 400 }
          );
        }
        const test = new Date(overrideOrario);
        if (isNaN(test.getTime())) {
          return NextResponse.json(
            {
              error: 'overrideOrario non valido',
              code: 'INVALID_OVERRIDE_ORARIO'
            },
            { status: 400 }
          );
        }
      }

      let overrideDateObj = overrideOrario ? new Date(overrideOrario) : null;
      let overrideDur = null;
      if (overrideDurataOre !== undefined && overrideDurataOre !== null) {
        const n = Number(overrideDurataOre);
        if (isNaN(n) || n <= 0) {
          return NextResponse.json(
            { error: 'overrideDurataOre non valido' },
            { status: 400 }
          );
        }
        overrideDur = n;
      }

      const result = await prisma.$transaction(async (tx) => {
        // 1. Archivia tutte le eventuali approved precedenti
        await tx.richiestaModifica.updateMany({
          where: { attivitaId: richiesta.attivitaId, stato: 'approved' },
          data: { stato: 'archived' }
        });

        let updatedAttivita = richiesta.attivita;
        let orePrimaPacchetto = null;
        let oreDopoPacchetto = null;
        let logTipoOperazione = null;
        let previousOrario = richiesta.attivita.orario;

        if (richiesta.tipo === 'cancellazione') {
          const att = await tx.attivita.findUnique({
            where: { id: richiesta.attivitaId }
          });
          if (!att) throw new Error('Attività non trovata per cancellazione');
          const pac = await tx.pacchettoOre.findUnique({
            where: { id: att.pacchettoId }
          });

          if (att.stato !== 'Cancellata') {
            await tx.pacchettoOre.update({
              where: { id: att.pacchettoId },
              data: {
                oreResidue: { increment: att.oreConsumate },
                stato: 'attivo'
              }
            });
            orePrimaPacchetto = pac.oreResidue;
            oreDopoPacchetto = pac.oreResidue + att.oreConsumate;
          }

          updatedAttivita = await tx.attivita.update({
            where: { id: att.id },
            data: { stato: 'Cancellata' }
          });

          logTipoOperazione = 'cancellazione-lezione-approvata';

          await logPacchettoChange({
            pacchettoId: att.pacchettoId,
            tipoOperazione: logTipoOperazione,
            orePrima: orePrimaPacchetto ?? pac.oreResidue,
            oreDopo: oreDopoPacchetto ?? pac.oreResidue,
            attivitaId: att.id,
            utente: session.user?.email || 'admin',
            motivazione:
              richiesta.noteStudente || 'Richiesta cancellazione approvata',
            pacchettoDescrizione: pac?.descrizione || ''
          });
        } else {
          const att = await tx.attivita.findUnique({
            where: { id: richiesta.attivitaId }
          });
          if (!att) throw new Error('Attività non trovata per modifica');

          // Se prima modifica: salva orarioOriginale se non già valorizzato
          if (!att.orarioOriginale && att.orario) {
            await tx.attivita.update({
              where: { id: att.id },
              data: { orarioOriginale: att.orario }
            });
          }

          const effectiveDate =
            overrideDateObj ||
            (richiesta.tipo === 'cambio_orario'
              ? richiesta.nuovoOrario
              : richiesta.nuovaData);

          if (!effectiveDate) {
            throw new Error('Data/Orario definitivo mancante');
          }

          let deltaOre = 0;
          if (overrideDur !== null) deltaOre = overrideDur - att.oreConsumate;

          if (deltaOre > 0) {
            const pac = await tx.pacchettoOre.findUnique({
              where: { id: att.pacchettoId }
            });
            if (!pac) throw new Error('Pacchetto non trovato');
            if (pac.oreResidue < deltaOre)
              throw new Error('Ore pacchetto insufficienti');
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
                stato:
                  pac.oreResidue - deltaOre === 0 ? 'esaurito' : 'attivo'
              }
            });
            oreDopoPacchetto = pacUpd.oreResidue;
            logTipoOperazione = 'approvazione-modifica-durata-incremento';
          } else if (deltaOre < 0) {
            const pac = await tx.pacchettoOre.findUnique({
              where: { id: att.pacchettoId }
            });
            if (!pac) throw new Error('Pacchetto non trovato');
            orePrimaPacchetto = pac.oreResidue;
            updatedAttivita = await tx.attivita.update({
              where: { id: att.id },
              data: {
                orario: effectiveDate,
                durataOre:
                  overrideDur !== null ? overrideDur : att.durataOre,
                oreConsumate:
                  overrideDur !== null ? overrideDur : att.oreConsumate
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
            logTipoOperazione = 'approvazione-modifica-durata-decremento';
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
            logTipoOperazione = 'approvazione-modifica-orario';
          }

          if (orePrimaPacchetto === null || oreDopoPacchetto === null) {
            const pacNow = await tx.pacchettoOre.findUnique({
              where: { id: att.pacchettoId }
            });
            orePrimaPacchetto = pacNow.oreResidue;
            oreDopoPacchetto = pacNow.oreResidue;
          }

          await logPacchettoChange({
            pacchettoId: att.pacchettoId,
            tipoOperazione: logTipoOperazione,
            orePrima: orePrimaPacchetto,
            oreDopo: oreDopoPacchetto,
            attivitaId: att.id,
            utente: session.user?.email || 'admin',
            motivazione: richiesta.noteStudente || 'Modifica approvata',
            pacchettoDescrizione: ''
          });
        }

        // Aggiorna richiesta → approved
        const updReq = await tx.richiestaModifica.update({
          where: { id: richiesta.id },
          data: {
            stato: 'approved',
            processedAt: new Date(),
            processedBy: session.user?.email || 'admin',
            noteAdmin: noteAdmin || richiesta.noteAdmin
          }
        });

        const firstTimeModified =
          richiesta.tipo !== 'cancellazione' &&
          updatedAttivita.orarioOriginale !== null &&
          previousOrario !== updatedAttivita.orario;

        return {
            richiesta: updReq,
          updatedAttivita,
          previousOrario,
          firstTimeModified
        };
      });

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'Azione non riconosciuta' },
      { status: 400 }
    );
  } catch (err) {
    console.error('PATCH /api/modifiche error', err);
    return NextResponse.json(
      { error: err.message || 'Errore interno' },
      { status: 500 }
    );
  }
}