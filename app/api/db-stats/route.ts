// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["admin", "operatore"].includes(session.user?.role)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    // Total DB size + per-table sizes
    const [sizeRows] = await prisma.$queryRaw`
      SELECT
        pg_database_size(current_database())                  AS db_bytes,
        pg_total_relation_size('"LavagnaTratto"')             AS tratti_bytes,
        pg_total_relation_size('"LavagnaShape"')              AS forme_bytes,
        pg_total_relation_size('"Lavagna"')                   AS lavagne_bytes
    `;

    // Row counts
    const [trattiCount, formeCount, lavagneCount] = await Promise.all([
      prisma.lavagnaTratto.count(),
      prisma.lavagnaShape.count(),
      prisma.lavagna.count(),
    ]);
    const [trattiSoftDel, formeSoftDel] = await Promise.all([
      prisma.lavagnaTratto.count({ where: { deletedAt: { not: null } } }),
      prisma.lavagnaShape.count({ where: { deletedAt: { not: null } } }),
    ]);

    return NextResponse.json({
      dbBytes: Number(sizeRows.db_bytes),
      tables: {
        tratti: { bytes: Number(sizeRows.tratti_bytes), rows: trattiCount, softDeleted: trattiSoftDel },
        forme: { bytes: Number(sizeRows.forme_bytes), rows: formeCount, softDeleted: formeSoftDel },
        lavagne: { bytes: Number(sizeRows.lavagne_bytes), rows: lavagneCount },
      },
    });
  } catch (err) {
    console.error("[db-stats] errore:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
