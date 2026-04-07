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

    // Auto-archivia pacchetti saldati con tutte le lezioni svolte (lazy check al caricamento lista)
    const now = new Date();
    const daArchiviare = pacchetti.filter(p => {
      if (!p.saldato || p.stato === 'archiviato') return false;
      const attivitaAttive = (p.attivita || []).filter(
        a => !['cancellata', 'Cancellata', 'CANCELLATA'].includes(a.stato || '')
      );
      if (attivitaAttive.length === 0) return false;
      return attivitaAttive.every(a => new Date(a.orario ?? a.createdAt) < now);
    });
    if (daArchiviare.length > 0) {
      await prisma.pacchettoOre.updateMany({
        where: { id: { in: daArchiviare.map(p => p.id) } },
        data: { stato: 'archiviato' }
      });
      daArchiviare.forEach(p => { p.stato = 'archiviato'; });
    }

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

    const pacchetto = await prisma.pacchettoOre.create({
      data: {
        clienteId: clienteId,
        descrizione: finalDescrizione,
        oreAcquistate: Number(body.oreAcquistate),
        oreResidue: body.oreResidue !== undefined
          ? Number(body.oreResidue)
          : Number(body.oreAcquistate),
        dataAttivazione: new Date(body.dataAttivazione),
        stato,
        sogliaOreResidue: body.sogliaOreResidue !== undefined ? body.sogliaOreResidue : null,
      },
    });
    return Response.json(pacchetto, { status: 201 });
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