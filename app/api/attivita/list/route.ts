// @ts-nocheck
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }
  const url = new URL(req.url, "http://localhost");
  const clienteId = Number(url.searchParams.get("clienteId"));
  if (!clienteId) return new Response("clienteId mancante", { status: 400 });
  const attivita = await prisma.attivita.findMany({
    where: { clienteId },
    select: { id: true, descrizione: true, orario: true }
  });
  return Response.json({ attivita });
}