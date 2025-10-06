import { prisma } from "../../../lib/prisma";

export async function GET(req) {
  const url = new URL(req.url, "http://localhost");
  const clienteId = Number(url.searchParams.get("clienteId"));
  if (!clienteId) return new Response("clienteId mancante", { status: 400 });
  const attivita = await prisma.attivita.findMany({
    where: { clienteId },
    select: { id: true, descrizione: true, orario: true }
  });
  return Response.json({ attivita });
}