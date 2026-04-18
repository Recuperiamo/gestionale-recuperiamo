// @ts-nocheck
/**
 * POST /api/attivita/move
 * Sposta un'attività da un pacchetto a un altro, aggiornando le ore residue di entrambi.
 *
 * Body: { attivitaId: number, targetPacchettoId: number }
 */
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { logPacchettoChange } from "../../utils/pacchettoChangelog";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  if (!["admin", "operatore"].includes(session.user?.role)) {
    return NextResponse.json({ error: "Solo admin/operatori" }, { status: 403 });
  }

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const { attivitaId, targetPacchettoId } = body;
  if (!attivitaId || !targetPacchettoId) {
    return NextResponse.json({ error: "attivitaId e targetPacchettoId obbligatori" }, { status: 400 });
  }

  // Carica attività con pacchetto sorgente
  const att = await prisma.attivita.findUnique({
    where: { id: Number(attivitaId) },
    include: { pacchetto: true },
  });
  if (!att) return NextResponse.json({ error: "Attività non trovata" }, { status: 404 });

  const sourcePacchettoId = att.pacchettoId;
  if (sourcePacchettoId === Number(targetPacchettoId)) {
    return NextResponse.json({ error: "L'attività è già in questo pacchetto" }, { status: 400 });
  }

  // Carica pacchetto destinazione
  const target = await prisma.pacchettoOre.findUnique({
    where: { id: Number(targetPacchettoId) },
  });
  if (!target) return NextResponse.json({ error: "Pacchetto destinazione non trovato" }, { status: 404 });
  if (target.clienteId !== att.clienteId) {
    return NextResponse.json({ error: "Il pacchetto destinazione appartiene a un cliente diverso" }, { status: 400 });
  }
  if (target.stato !== "attivo") {
    return NextResponse.json({ error: "Il pacchetto destinazione non è attivo" }, { status: 400 });
  }

  const ore = att.oreConsumate ?? att.durataOre ?? 0;
  const isExtra = att.extraPacchetto === true;

  // Verifica ore disponibili nel pacchetto destinazione (solo per lezioni non-extra)
  if (!isExtra && target.oreResidue < ore) {
    return NextResponse.json({
      error: `Ore insufficienti nel pacchetto destinazione (disponibili: ${target.oreResidue}, necessarie: ${ore})`,
    }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Reintegra ore nel pacchetto sorgente (se esiste e l'attività non è extra)
      let sourceBefore = null;
      let sourceAfter = null;
      if (sourcePacchettoId && !isExtra) {
        sourceBefore = await tx.pacchettoOre.findUnique({ where: { id: sourcePacchettoId } });
        sourceAfter = await tx.pacchettoOre.update({
          where: { id: sourcePacchettoId },
          data: { oreResidue: { increment: ore } },
        });
      }

      // 2. Scala ore dal pacchetto destinazione (solo per lezioni non-extra)
      let targetBefore = await tx.pacchettoOre.findUnique({ where: { id: Number(targetPacchettoId) } });
      let targetAfter = null;
      if (!isExtra) {
        targetAfter = await tx.pacchettoOre.update({
          where: { id: Number(targetPacchettoId) },
          data: { oreResidue: { decrement: ore } },
        });
      }

      // 3. Aggiorna attività
      const updated = await tx.attivita.update({
        where: { id: Number(attivitaId) },
        data: { pacchettoId: Number(targetPacchettoId) },
        include: { pacchetto: { include: { cliente: true } } },
      });

      return { updated, sourceBefore, sourceAfter, targetBefore, targetAfter };
    });

    const utente = session.user?.email || "admin";

    // Changelog pacchetto sorgente
    if (result.sourceBefore && result.sourceAfter) {
      await logPacchettoChange({
        pacchettoId: sourcePacchettoId,
        tipoOperazione: "spostamento-out",
        orePrima: result.sourceBefore.oreResidue,
        oreDopo: result.sourceAfter.oreResidue,
        attivitaId: Number(attivitaId),
        utente,
        motivazione: `Lezione spostata verso pacchetto #${targetPacchettoId} (${target.descrizione})`,
        pacchettoDescrizione: result.sourceBefore.descrizione,
      });
    }

    // Changelog pacchetto destinazione
    if (result.targetBefore && result.targetAfter) {
      await logPacchettoChange({
        pacchettoId: Number(targetPacchettoId),
        tipoOperazione: "spostamento-in",
        orePrima: result.targetBefore.oreResidue,
        oreDopo: result.targetAfter.oreResidue,
        attivitaId: Number(attivitaId),
        utente,
        motivazione: `Lezione ricevuta da pacchetto #${sourcePacchettoId ?? "nessuno"} (${att.pacchetto?.descrizione ?? "—"})`,
        pacchettoDescrizione: result.targetBefore.descrizione,
      });
    }

    return NextResponse.json({ ok: true, attivita: result.updated });
  } catch (e) {
    console.error("[move attivita] errore:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
