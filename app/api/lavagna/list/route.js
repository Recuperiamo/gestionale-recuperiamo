import { prisma } from "../../../lib/prisma";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const clienteId = Number(searchParams.get("clienteId"));
  if (!clienteId) return new Response("Cliente mancante", { status: 400 });
  // Recupera tutte le lavagne che hanno attivita del cliente
  const lavagne = await prisma.lavagna.findMany({
    where: { attivita: { clienteId } },
    select: { id: true, titolo: true, attivitaId: true, createdAt: true }
  });
  return Response.json({ lavagne });
}