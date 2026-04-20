// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/authOptions";
import { logPacchettoChange } from "../../../utils/pacchettoChangelog";

export async function PATCH(request, context) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "operatore")) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { id } = await context.params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
  }

  const { delta, motivazione, ancheAcquistate } = body;

  if (typeof delta !== "number" || delta === 0) {
    return NextResponse.json({ error: "delta deve essere un numero diverso da zero" }, { status: 400 });
  }
  if (!motivazione || !motivazione.trim()) {
    return NextResponse.json({ error: "La motivazione è obbligatoria" }, { status: 400 });
  }

  const pacchetto = await prisma.pacchettoOre.findUnique({ where: { id: Number(id) } });
  if (!pacchetto) {
    return NextResponse.json({ error: "Pacchetto non trovato" }, { status: 404 });
  }

  const nuoveOreResidue = pacchetto.oreResidue + delta;
  const updateData: any = { oreResidue: nuoveOreResidue };
  if (ancheAcquistate) {
    updateData.oreAcquistate = pacchetto.oreAcquistate + delta;
  }

  const updated = await prisma.pacchettoOre.update({
    where: { id: Number(id) },
    data: updateData,
  });

  await logPacchettoChange({
    pacchettoId: pacchetto.id,
    tipoOperazione: "rettifica-manuale",
    orePrima: pacchetto.oreResidue,
    oreDopo: nuoveOreResidue,
    utente: session.user?.email || "admin",
    motivazione: motivazione.trim(),
    pacchettoDescrizione: pacchetto.descrizione,
  });

  return NextResponse.json({ ok: true, pacchetto: updated });
}
