import { PrismaClient } from "@prisma/client";

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
    console.log("GET /api/pacchetti, pacchetti:", pacchetti); // DEBUG
    return Response.json(pacchetti);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("BACKEND RICEVE BODY:", body); // DEBUG
    const { clienteId, descrizione, oreAcquistate, dataAttivazione, stato } = body;
    if (!clienteId || !oreAcquistate || !dataAttivazione || !stato) {
      return Response.json(
        { error: "Dati obbligatori mancanti" },
        { status: 400 }
      );
    }

    let finalDescrizione = descrizione;
    if (!finalDescrizione || finalDescrizione.trim() === "") {
      finalDescrizione = await getNextProgressivo(
        clienteId,
        dataAttivazione || new Date()
      );
    }

    const pacchetto = await prisma.pacchettoOre.create({
      data: {
        clienteId: Number(clienteId),
        descrizione: finalDescrizione,
        oreAcquistate: Number(oreAcquistate),
        oreResidue: Number(oreAcquistate),
        dataAttivazione: new Date(dataAttivazione),
        stato,
        sogliaOreResidue: body.sogliaOreResidue !== undefined ? body.sogliaOreResidue : null,
      },
    });
    console.log("PACCHETTO CREATO:", pacchetto); // DEBUG
    return Response.json(pacchetto, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(request) {
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
  try {
    const { id } = await request.json();
    if (!id) {
      return Response.json({ error: "ID mancante" }, { status: 400 });
    }
    await prisma.pacchettoOre.delete({ where: { id: Number(id) } });
    return Response.json({ result: "Pacchetto eliminato" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}