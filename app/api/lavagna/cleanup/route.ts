// @ts-nocheck
/**
 * POST /api/lavagna/cleanup
 * Libera spazio DB in tre passaggi:
 *  1. Hard-delete di tutti i tratti/forme soft-deleted (deletedAt IS NOT NULL)
 *  2. Null dei campi src/srcPreview sulle shape di lavagne "vecchie" (default 1 mese)
 *  3. Eliminazione completa delle lavagne (tratti + forme + record) legate a lezioni
 *     svolte più di SOGLIA_MESI fa o lavagne libere più vecchie della stessa soglia
 *
 * Chiamato automaticamente dal cron Vercel (vercel.json) ogni mese, o manualmente
 * da un admin autenticato.
 */
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";

export const runtime = "nodejs";

const SOGLIA_MESI = 6;

export async function POST(req: Request) {
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
    // ── 1. Hard-delete tratti soft-deleted (qualunque lavagna, qualunque età) ──
    const trattSoftDel = await prisma.lavagnaTratto.deleteMany({
      where: { deletedAt: { not: null } },
    });

    // ── 2. Hard-delete forme soft-deleted ─────────────────────────────────────
    const formeSoftDel = await prisma.lavagnaShape.deleteMany({
      where: { deletedAt: { not: null } },
    });

    // ── 3. Null src/srcPreview su forme di lavagne più vecchie della soglia ───
    // Libera spazio dalle immagini base64 (~15-45 KB ognuna) senza perdere il
    // record della forma (posizione, tipo, ecc.)
    const lavagneVecchie = await prisma.lavagna.findMany({
      where: {
        OR: [
          { attivita: { orario: { lt: soglia } } },
          { attivitaId: null, createdAt: { lt: soglia } },
        ],
      },
      select: { id: true },
    });
    const idsVecchie = lavagneVecchie.map((l) => l.id);

    let srcsNullati = { count: 0 };
    if (idsVecchie.length > 0) {
      srcsNullati = await prisma.lavagnaShape.updateMany({
        where: {
          lavagnaId: { in: idsVecchie },
          OR: [{ src: { not: null } }, { srcPreview: { not: null } }],
        },
        data: { src: null, srcPreview: null },
      });
    }

    // ── 4. Elimina completamente le lavagne vecchie (tratti + forme + record) ─
    let trattEliminati = { count: 0 };
    let formeEliminate = { count: 0 };
    let lavagneEliminate = 0;

    if (idsVecchie.length > 0) {
      [trattEliminati, formeEliminate] = await Promise.all([
        prisma.lavagnaTratto.deleteMany({ where: { lavagnaId: { in: idsVecchie } } }),
        prisma.lavagnaShape.deleteMany({ where: { lavagnaId: { in: idsVecchie } } }),
      ]);
      const res = await prisma.lavagna.deleteMany({ where: { id: { in: idsVecchie } } });
      lavagneEliminate = res.count;
    }

    console.log(
      `[cleanup lavagne] ${new Date().toISOString()} — ` +
      `soft-del rimossi: ${trattSoftDel.count} tratti, ${formeSoftDel.count} forme | ` +
      `src nullati: ${srcsNullati.count} | ` +
      `lavagne vecchie eliminate: ${lavagneEliminate} (${trattEliminati.count} tratti, ${formeEliminate.count} forme)`
    );

    return NextResponse.json({
      ok: true,
      softDeletedRemoved: { tratti: trattSoftDel.count, forme: formeSoftDel.count },
      srcNullati: srcsNullati.count,
      lavagneVecchie: {
        count: lavagneEliminate,
        tratti: trattEliminati.count,
        forme: formeEliminate.count,
        soglia: soglia.toISOString(),
      },
    });
  } catch (err) {
    console.error("[cleanup lavagne] errore:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
