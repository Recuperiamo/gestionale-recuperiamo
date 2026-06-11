// @ts-nocheck
/**
 * POST /api/lavagna/cleanup
 * Libera spazio DB in quattro passaggi:
 *  1. Hard-delete di tutti i tratti/forme soft-deleted (deletedAt IS NOT NULL)
 *  2. Archiviazione + compressione gzip delle lavagne > 30 giorni ancora attive:
 *     - punti JSON → puntiCompresso (Bytes gzip) e punti = null
 *     - src/srcPreview delle shape → null
 *     - archivedAt = now()
 *  3. Eliminazione completa delle lavagne > SOGLIA_MESI (tratti + forme + record)
 *
 * Chiamato automaticamente dal cron Vercel (vercel.json) ogni mese, o manualmente
 * da un admin autenticato.
 */
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { gzipSync } from "zlib";

export const runtime = "nodejs";

const SOGLIA_MESI = 6;
const SOGLIA_ARCHIVIO_GIORNI = 30;

function boardIsOld(attivitaOrario: Date | null, createdAt: Date, soglia: Date): boolean {
  if (attivitaOrario) return attivitaOrario < soglia;
  return createdAt < soglia;
}

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

  const sogliaEliminazione = new Date();
  sogliaEliminazione.setMonth(sogliaEliminazione.getMonth() - SOGLIA_MESI);

  const sogliaArchivio = new Date();
  sogliaArchivio.setDate(sogliaArchivio.getDate() - SOGLIA_ARCHIVIO_GIORNI);

  try {
    // ── 1. Hard-delete tratti e forme soft-deleted ─────────────────────────────
    const [trattSoftDel, formeSoftDel] = await Promise.all([
      prisma.lavagnaTratto.deleteMany({ where: { deletedAt: { not: null } } }),
      prisma.lavagnaShape.deleteMany({ where: { deletedAt: { not: null } } }),
    ]);

    // ── 2. Archivio + compressione (lavagne attive > 30 giorni, non già archiviate) ─
    const lavagneDaArchiviare = await prisma.lavagna.findMany({
      where: {
        archivedAt: null,
        OR: [
          { attivita: { orario: { lt: sogliaArchivio } } },
          { attivitaId: null, createdAt: { lt: sogliaArchivio } },
        ],
        // Esclude già candidate alla eliminazione (gestite nel passo 3)
        NOT: [
          { attivita: { orario: { lt: sogliaEliminazione } } },
          { attivitaId: null, createdAt: { lt: sogliaEliminazione } },
        ],
      },
      select: { id: true },
    });
    const idsArchiviare = lavagneDaArchiviare.map((l) => l.id);

    let trattiCompressi = 0;
    let srcNullatiArchivio = 0;

    if (idsArchiviare.length > 0) {
      // Comprimi punti JSON → gzip per ogni tratto
      const tratti = await prisma.lavagnaTratto.findMany({
        where: { lavagnaId: { in: idsArchiviare }, punti: { not: null } },
        select: { id: true, punti: true },
      });

      for (const t of tratti) {
        if (!t.punti) continue;
        const compressed = gzipSync(Buffer.from(JSON.stringify(t.punti)));
        await prisma.lavagnaTratto.update({
          where: { id: t.id },
          data: { puntiCompresso: compressed, punti: null },
        });
        trattiCompressi++;
      }

      // Null src/srcPreview sulle forme
      const srcRes = await prisma.lavagnaShape.updateMany({
        where: {
          lavagnaId: { in: idsArchiviare },
          OR: [{ src: { not: null } }, { srcPreview: { not: null } }],
        },
        data: { src: null, srcPreview: null },
      });
      srcNullatiArchivio = srcRes.count;

      // Marca come archiviate
      await prisma.lavagna.updateMany({
        where: { id: { in: idsArchiviare } },
        data: { archivedAt: new Date() },
      });
    }

    // ── 3. Eliminazione completa lavagne > 6 mesi ──────────────────────────────
    const lavagneVecchie = await prisma.lavagna.findMany({
      where: {
        OR: [
          { attivita: { orario: { lt: sogliaEliminazione } } },
          { attivitaId: null, createdAt: { lt: sogliaEliminazione } },
        ],
      },
      select: { id: true },
    });
    const idsVecchie = lavagneVecchie.map((l) => l.id);

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
      `archiviate: ${idsArchiviare.length} lavagne, ${trattiCompressi} tratti compressi, ${srcNullatiArchivio} src nullati | ` +
      `eliminate: ${lavagneEliminate} lavagne (${trattEliminati.count} tratti, ${formeEliminate.count} forme)`
    );

    return NextResponse.json({
      ok: true,
      softDeletedRemoved: { tratti: trattSoftDel.count, forme: formeSoftDel.count },
      archiviate: {
        count: idsArchiviare.length,
        trattiCompressi,
        srcNullati: srcNullatiArchivio,
        soglia: sogliaArchivio.toISOString(),
      },
      lavagneVecchie: {
        count: lavagneEliminate,
        tratti: trattEliminati.count,
        forme: formeEliminate.count,
        soglia: sogliaEliminazione.toISOString(),
      },
    });
  } catch (err) {
    console.error("[cleanup lavagne] errore:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
