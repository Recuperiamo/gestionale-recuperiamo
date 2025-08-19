import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Next.js 13+: bisogna usare { params } come secondo argomento

export async function GET(request, { params }) {
  const { id } = params || {};
  if (!id) {
    return Response.json({ error: "Parametro id mancante" }, { status: 400 });
  }
  try {
    const pacchetto = await prisma.pacchettoOre.findUnique({
      where: { id: Number(id) },
      include: {
        cliente: { select: { id: true, nomeReferente: true } },
        attivita: true,
      },
    });
    if (!pacchetto) {
      return Response.json({ error: "Pacchetto non trovato" }, { status: 404 });
    }
    return Response.json(pacchetto);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}

export async function PATCH(request, { params }) {
  const { id } = params || {};
  if (!id) {
    return Response.json({ error: "Parametro id mancante" }, { status: 400 });
  }
  try {
    const body = await request.json();
    const pacchetto = await prisma.pacchettoOre.update({
      where: { id: Number(id) },
      data: body,
    });
    return Response.json(pacchetto);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = params || {};
  if (!id) {
    return Response.json({ error: "Parametro id mancante" }, { status: 400 });
  }
  try {
    await prisma.pacchettoOre.delete({
      where: { id: Number(id) },
    });
    return Response.json({ result: "Pacchetto eliminato" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}