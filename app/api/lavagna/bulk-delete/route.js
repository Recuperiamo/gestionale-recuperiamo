import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";

export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }
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