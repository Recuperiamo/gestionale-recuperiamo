// @ts-nocheck
/**
 * POST /api/lavagna/cleanup
 * Elimina tratti e forme delle lavagne collegate a lezioni svolte più di 6 mesi fa.
 * Svuota anche il campo snapshot per quelle lavagne.
 * Chiamato automaticamente dal cron Vercel (vercel.json) ogni mese.
 */
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";

export const runtime = "nodejs";

const SOGLIA_MESI = 6;

export async function POST(req: Request) {
  // Accetta sia chiamate admin autenticate sia il cron Vercel (CRON_SECRET)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    const session = await getServerSession(authOptions);
    if (!session || !["admin", "operatore"].includes(session.user?.role)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }
  }

  const soglia = new Date();
  soglia.setMonth(soglia.getMonth() - SOGLIA_MESI);

  try {
    // Trova le lavagne collegate a lezioni svolte prima della soglia
    // (oppure lavagne senza attività create prima della soglia)
    const lavagneDaKulire = await prisma.lavagna.findMany({
      where: {
        OR: [
          {
            attivita: {
              orario: { lt: soglia },
            },
          },
          {
            attivitaId: null,
            createdAt: { lt: soglia },
          },
        ],
      },
      select: { id: true },
    });

    const ids = lavagneDaKulire.map((l) => l.id);

    if (ids.length === 0) {
      return NextResponse.json({ ok: true, message: "Nessuna lavagna da pulire", tratti: 0, forme: 0, lavagne: 0 });
    }

    const [tratti, forme] = await Promise.all([
      prisma.lavagnaTratto.deleteMany({ where: { lavagnaId: { in: ids } } }),
      prisma.lavagnaShape.deleteMany({ where: { lavagnaId: { in: ids } } }),
    ]);

    const { count: lavagneEliminate } = await prisma.lavagna.deleteMany({
      where: { id: { in: ids } },
    });

    console.log(`[cleanup lavagne] ${new Date().toISOString()} — eliminate ${lavagneEliminate} lavagne: ${tratti.count} tratti, ${forme.count} forme`);

    return NextResponse.json({
      ok: true,
      lavagne: lavagneEliminate,
      tratti: tratti.count,
      forme: forme.count,
      soglia: soglia.toISOString(),
    });
  } catch (err) {
    console.error("[cleanup lavagne] errore:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
