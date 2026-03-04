// @ts-nocheck
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";

// PATCH pacchetto
export async function PATCH(request, context) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return Response.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  const { id } = await context.params;
  let data;
  try {
    data = await request.json();
  } catch {
    return Response.json({ error: "JSON non valido" }, { status: 400 });
  }
  if (!id) return Response.json({ error: "Parametro id mancante" }, { status: 400 });

  try {
    const updated = await prisma.pacchettoOre.update({
      where: { id: Number(id) },
      data,
    });
    return Response.json(updated);
  } catch (error) {
    console.error("[PACCHETTI][PATCH] ERRORE:", error);
    return Response.json({ error: error.message }, { status: 400 });
  }
}

// DELETE pacchetto + dipendenze
export async function DELETE(request, context) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'operatore')) {
    return Response.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  const { id } = await context.params;
  if (!id) return Response.json({ error: "Parametro id mancante" }, { status: 400 });

  try {
    const resAlertLetto = await prisma.pacchettoAlertLetto.deleteMany({
      where: { pacchettoId: Number(id) }
    });

    const resChangeLog = await prisma.pacchetto_ChangeLog.deleteMany({
      where: { pacchettoId: Number(id) }
    });

    const resPacchetto = await prisma.pacchettoOre.delete({
      where: { id: Number(id) }
    });

    return Response.json({ result: "Pacchetto eliminato", id });
  } catch (error) {
    console.error("[PACCHETTI][DELETE] ERRORE:", error);
    return Response.json({ error: error.message }, { status: 400 });
  }
}