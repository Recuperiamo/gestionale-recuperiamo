// @ts-nocheck
/**
 * POST /api/lavagna/repair
 *
 * Endpoint admin: corregge retroattivamente le lavagne con:
 * 1. Titolo con fuso orario sbagliato (rigenera con Europe/Rome da attivita.orario)
 * 2. clienteId mancante (lo recupera dall'attività collegata)
 *
 * Risponde con un conteggio di quante lavagne sono state aggiornate.
 */
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";

function formatDataOra(d: Date): string {
  return new Date(d).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Rome",
  }).replace(/, /, " ");
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || !["admin", "operatore"].includes(session.user?.role)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    // Carica tutte le lavagne con attività collegata
    const lavagne = await prisma.lavagna.findMany({
      where: { attivitaId: { not: null } },
      select: {
        id: true,
        titolo: true,
        clienteId: true,
        attivitaId: true,
        attivita: {
          select: {
            clienteId: true,
            orario: true,
            orarioOriginale: true,
          },
        },
      },
    });

    let fixedTitoli = 0;
    let fixedClienteId = 0;
    let errors = 0;

    for (const lav of lavagne) {
      const att = lav.attivita;
      if (!att) continue;

      const updates: Record<string, unknown> = {};

      // 1. Rigenera titolo con Europe/Rome
      const dataLezione = att.orario
        ? new Date(att.orario)
        : att.orarioOriginale
        ? new Date(att.orarioOriginale)
        : null;

      if (dataLezione) {
        const titoloCorretto = formatDataOra(dataLezione);
        if (lav.titolo !== titoloCorretto) {
          updates.titolo = titoloCorretto;
          fixedTitoli++;
        }
      }

      // 2. Ripara clienteId mancante
      if (!lav.clienteId && att.clienteId) {
        updates.clienteId = att.clienteId;
        fixedClienteId++;
      }

      if (Object.keys(updates).length > 0) {
        try {
          await prisma.lavagna.update({
            where: { id: lav.id },
            data: updates,
          });
        } catch (e) {
          console.error(`[repair-lavagne] Errore aggiornamento lavagna ${lav.id}:`, e?.message);
          errors++;
          // Riduci i contatori incrementati per questa lavagna che ha fallito
          if (updates.titolo) fixedTitoli--;
          if (updates.clienteId) fixedClienteId--;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      totale: lavagne.length,
      fixedTitoli,
      fixedClienteId,
      errors,
    });
  } catch (e) {
    console.error("[repair-lavagne] Errore generale:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
