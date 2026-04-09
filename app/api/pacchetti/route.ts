// @ts-nocheck
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";

const prisma = new PrismaClient();

// Calcola il prossimo progressivo
async function getNextProgressivo(clienteId, dataAttivazione) {
  const count = await prisma.pacchettoOre.count({
    where: {
      clienteId: Number(clienteId),
      dataAttivazione: {
        lte: new Date(dataAttivazione),
      },
    },
  });
  return `${clienteId}-${count + 1}`;
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return Response.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);

  if (request.nextUrl.pathname.endsWith("/progressivo")) {
    const clienteId = searchParams.get("clienteId");
    const dataAttivazione = searchParams.get("dataAttivazione");
    if (!clienteId || !dataAttivazione) {
      return Response.json(
        { error: "clienteId e dataAttivazione obbligatori" },
        { status: 400 }
      );
    }
    const progressivo = await getNextProgressivo(clienteId, dataAttivazione);
    return Response.json({ progressivo });
  }

  const clienteId = searchParams.get("clienteId");
  try {
    const pacchetti = await prisma.pacchettoOre.findMany({
      where: clienteId ? { clienteId: Number(clienteId) } : undefined,
      orderBy: { id: "desc" },
      include: {
        cliente: { select: { id: true, nomeReferente: true } },
        attivita: true,
      },
    });

    return Response.json(pacchetti);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return Response.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  try {
    const body = await request.json();

    // Normalizza clienteId (accetta anche stringa numerica)
    let clienteId = body.clienteId;
    if (typeof clienteId === "string") clienteId = Number(clienteId);

    // Validazione dettagliata
    if (!clienteId || isNaN(clienteId) || clienteId <= 0) {
      return Response.json(
        { error: "Dati obbligatori mancanti: clienteId" },
        { status: 400 }
      );
    }
    if (!body.oreAcquistate || isNaN(Number(body.oreAcquistate)) || Number(body.oreAcquistate) <= 0) {
      return Response.json(
        { error: "Dati obbligatori mancanti: oreAcquistate" },
        { status: 400 }
      );
    }
    if (!body.dataAttivazione) {
      return Response.json(
        { error: "Dati obbligatori mancanti: dataAttivazione" },
        { status: 400 }
      );
    }

    // Default stato a "attivo" se non fornito
    let stato = body.stato || "attivo";

    // Se manca descrizione, genera progressivo
    let finalDescrizione = body.descrizione;
    if (!finalDescrizione || finalDescrizione.trim() === "") {
      finalDescrizione = await getNextProgressivo(
        clienteId,
        body.dataAttivazione || new Date()
      );
    }

    const oreAcquistate = Number(body.oreAcquistate);

    // ── Blocco di sicurezza: ore extra pendenti ────────────────────────────────
    // Le attività con extraPacchetto=true sono ore già erogate ma non ancora
    // scalate da nessun pacchetto (erano legate al vecchio pacchetto esaurito).
    // Vanno computate nel NUOVO pacchetto al momento della sua creazione.
    const attivitaExtra = await prisma.attivita.findMany({
      where: {
        clienteId: clienteId,
        extraPacchetto: true,
      },
      select: { id: true, durataOre: true, oreConsumate: true },
    });

    const totaleOreExtra = attivitaExtra.reduce((sum, a) => {
      const ore = typeof a.durataOre === 'number' ? a.durataOre : a.oreConsumate;
      return sum + (ore || 0);
    }, 0);

    // oreResidue di partenza: se l'admin ha passato un valore esplicito, usalo;
    // altrimenti usa oreAcquistate come base e scala le extra.
    const baseResidue = body.oreResidue !== undefined
      ? Number(body.oreResidue)
      : oreAcquistate;
    const oreResidueFinali = Math.max(0, baseResidue - totaleOreExtra);

    const pacchetto = await prisma.$transaction(async (tx) => {
      // 1. Crea il nuovo pacchetto
      const nuovoPacchetto = await tx.pacchettoOre.create({
        data: {
          clienteId: clienteId,
          descrizione: finalDescrizione,
          oreAcquistate: oreAcquistate,
          oreResidue: oreResidueFinali,
          dataAttivazione: new Date(body.dataAttivazione),
          stato,
          sogliaOreResidue: body.sogliaOreResidue !== undefined ? body.sogliaOreResidue : null,
        },
      });

      // 2. Ricollega le attività extra al nuovo pacchetto e segnale come contabilizzate
      if (attivitaExtra.length > 0) {
        await tx.attivita.updateMany({
          where: { id: { in: attivitaExtra.map(a => a.id) } },
          data: {
            pacchettoId: nuovoPacchetto.id,
            extraPacchetto: false, // ora scalate dal nuovo pacchetto → non più "extra pendenti"
          },
        });

        // 3. Changelog
        await tx.pacchetto_ChangeLog.create({
          data: {
            pacchettoId: nuovoPacchetto.id,
            orePrima: oreAcquistate,
            oreDopo: oreResidueFinali,
            tipoOperazione: 'riporto-ore-extra',
            utente: session.user?.name || session.user?.email || 'sistema',
            motivazione: `Riporto automatico di ${totaleOreExtra} ore extra dal pacchetto precedente (${attivitaExtra.length} attività).`,
            pacchettoDescrizione: finalDescrizione,
          },
        });
      }

      return nuovoPacchetto;
    });

    return Response.json({
      ...pacchetto,
      _oreExtraRiportate: totaleOreExtra,
      _attivitaExtraRiportate: attivitaExtra.length,
    }, { status: 201 });
  } catch (error) {
    console.error("ERRORE POST /api/pacchetti:", error);
    return Response.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return Response.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    if (!id) {
      return Response.json({ error: "ID mancante" }, { status: 400 });
    }
    const pacchetto = await prisma.pacchettoOre.update({
      where: { id: Number(id) },
      data: updateData,
    });
    return Response.json(pacchetto);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return Response.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  try {
    const { id } = await request.json();
    if (!id) {
      return Response.json({ error: "ID mancante" }, { status: 400 });
    }

    // Elimina tutte le righe collegate in PacchettoAlertLetto che fanno riferimento al pacchetto
    await prisma.pacchettoAlertLetto.deleteMany({
      where: { pacchettoId: Number(id) }
    });

    // Elimina il pacchetto
    await prisma.pacchettoOre.delete({
      where: { id: Number(id) }
    });

    return Response.json({ result: "Pacchetto eliminato" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}