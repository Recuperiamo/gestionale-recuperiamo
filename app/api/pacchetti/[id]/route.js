// @ts-nocheck
import { prisma } from "../../../../lib/prisma";

// PATCH pacchetto
export async function PATCH(request, context) {
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
  const { id } = await context.params;
  console.log("[PACCHETTI][DELETE] Inizio cancellazione pacchetto id:", id);
  if (!id) return Response.json({ error: "Parametro id mancante" }, { status: 400 });

  try {
    const resAlertLetto = await prisma.pacchettoAlertLetto.deleteMany({
      where: { pacchettoId: Number(id) }
    });
    console.log(`[PACCHETTI][DELETE] AlertLetto eliminati: ${resAlertLetto.count}`);

    const resChangeLog = await prisma.pacchetto_ChangeLog.deleteMany({
      where: { pacchettoId: Number(id) }
    });
    console.log(`[PACCHETTI][DELETE] ChangeLog eliminati: ${resChangeLog.count}`);

    const resPacchetto = await prisma.pacchettoOre.delete({
      where: { id: Number(id) }
    });
    console.log(`[PACCHETTI][DELETE] PacchettoOre eliminato id: ${resPacchetto.id}`);

    return Response.json({ result: "Pacchetto eliminato", id });
  } catch (error) {
    console.error("[PACCHETTI][DELETE] ERRORE:", error);
    return Response.json({ error: error.message }, { status: 400 });
  }
}