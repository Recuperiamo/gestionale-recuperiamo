// @ts-nocheck
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }
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