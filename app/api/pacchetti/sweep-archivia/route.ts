// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { autoArchiviaSeNecessario } from "../../utils/autoArchivia";

/**
 * POST /api/pacchetti/sweep-archivia
 * Controlla tutti i pacchetti saldati non ancora archiviati e li archivia
 * se le condizioni sono soddisfatte (ore esaurite o tutte lezioni svolte).
 * Chiamato fire-and-forget al caricamento della pagina pacchetti.
 */
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || !["admin", "operatore"].includes(session.user?.role)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const candidati = await prisma.pacchettoOre.findMany({
    where: {
      saldato: true,
      stato: { not: "archiviato" },
    },
    select: { id: true },
  });

  let archiviati = 0;
  for (const p of candidati) {
    const prima = await prisma.pacchettoOre.findUnique({ where: { id: p.id }, select: { stato: true } });
    await autoArchiviaSeNecessario(p.id);
    const dopo = await prisma.pacchettoOre.findUnique({ where: { id: p.id }, select: { stato: true } });
    if (dopo?.stato === "archiviato" && prima?.stato !== "archiviato") archiviati++;
  }

  return NextResponse.json({ ok: true, controllati: candidati.length, archiviati });
}
