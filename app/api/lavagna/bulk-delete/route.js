import { prisma } from "../../../lib/prisma";

export async function DELETE(req) {
  const url = new URL(req.url, "http://localhost");
  const clienteId = Number(url.searchParams.get("clienteId"));
  if (!clienteId) return new Response("clienteId mancante", { status: 400 });
  const lavagne = await prisma.lavagna.findMany({
    where: { attivita: { clienteId } },
    select: { id: true }
  });
  const lavagnaIds = lavagne.map(l => l.id);
  await prisma.lavagnaTratto.deleteMany({ where: { lavagnaId: { in: lavagnaIds } } });
  await prisma.lavagna.deleteMany({ where: { id: { in: lavagnaIds } } });
  return Response.json({ ok: true, count: lavagnaIds.length });
}