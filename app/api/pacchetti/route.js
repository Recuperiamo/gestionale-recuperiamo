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
    console.log("PACCHETTO CREATO:", pacchetto); // DEBUG
    return Response.json(pacchetto, { status: 201 });
  } catch (error) {
    console.error("ERRORE POST /api/pacchetti:", error);
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
