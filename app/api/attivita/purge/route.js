import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma"; // percorso: app/api/attivita/purge/route.js -> su a api -> su a app -> lib/prisma

/**
 * DELETE /api/attivita/purge
 *
 * Elimina tutte le attività + relative richieste modifica.
 * Di default esegue il reset dei pacchetti (oreResidue = oreAcquistate).
 * Se passi ?noReset=1 NON modifica i pacchetti.
 *
 * TODO: proteggere con check ruolo (admin).
 */
export async function DELETE(req) {
  try {
    // 0. Verifica che il client prisma funzioni (rigenera se necessario)
    if (!prisma) {
      return NextResponse.json(
        { error: "Prisma client non disponibile" },
        { status: 500 }
      );
    }

    const url = new URL(req.url);
    const noReset = url.searchParams.get("noReset") === "1";

    // 1. Recupera tutte le attività
    const attivita = await prisma.attivita.findMany({
      select: {
        id: true,
        pacchettoId: true,
        oreConsumate: true,
        durataOre: true
      }
    });

    if (!attivita.length) {
      return NextResponse.json({
        ok: true,
        deletedAttivita: 0,
        pacchettiReset: 0,
        note: "Nessuna attività da eliminare",
        resetEseguito: !noReset
      });
    }

    // 2. Pacchetti coinvolti
    const pacchettoIds = [
      ...new Set(attivita.filter(a => a.pacchettoId).map(a => a.pacchettoId))
    ];

    const pacchetti = pacchettoIds.length
      ? await prisma.pacchettoOre.findMany({
          where: { id: { in: pacchettoIds } },
          select: { id: true, oreAcquistate: true }
        })
      : [];

    // 3. Transazione: elimina richieste, (opzionale) reset pacchetti, elimina attività
    await prisma.$transaction(async tx => {
      // 3.1 Richieste di modifica collegate
      try {
        await tx.richiestaModifica.deleteMany({
          where: { attivitaId: { in: attivita.map(a => a.id) } }
        });
      } catch (e) {
        // Se il modello non esiste semplicemente logga (non bloccare il purge)
        console.warn("richiestaModifica.deleteMany skipped:", e.message);
      }

      // 3.2 Reset pacchetti (se non disabilitato)
      if (!noReset) {
        for (const p of pacchetti) {
          await tx.pacchettoOre.update({
            where: { id: p.id },
            data: { oreResidue: p.oreAcquistate }
          });
        }
      }

      // 3.3 Elimina tutte le attività
      await tx.attivita.deleteMany({});
    });

    return NextResponse.json({
      ok: true,
      deletedAttivita: attivita.length,
      pacchettiReset: noReset ? 0 : pacchetti.length,
      resetEseguito: !noReset
    });
  } catch (e) {
    console.error("PURGE ERROR", e);
    return NextResponse.json(
      { error: e?.message || "Errore generico purge" },
      { status: 500 }
    );
  }
}