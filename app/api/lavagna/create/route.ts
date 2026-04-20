// @ts-nocheck
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    let { attivitaId, titolo, clienteId } = body;

    if (!attivitaId) {
      if (!clienteId) {
        return Response.json({ error: "attivitaId o clienteId obbligatorio" }, { status: 400 });
      }
      // Try to find a nearby lesson for this cliente (±15min)
      const now = Date.now();
      const WINDOW_MS = 15 * 60 * 1000;
      const lower = new Date(now - WINDOW_MS);
      const upper = new Date(now + WINDOW_MS);
      const found = await prisma.attivita.findFirst({
        where: { clienteId: Number(clienteId), orario: { gte: lower, lte: upper }, NOT: { stato: "cancellata" } },
        orderBy: { orario: "asc" }
      });
      if (found) attivitaId = found.id;
      else {
        // create ad-hoc attivita
        const created = await prisma.attivita.create({
          data: {
            descrizione: titolo || `Lavagna ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`,
            oreConsumate: 0,
            durataOre: 0,
            clienteId: Number(clienteId),
            stato: "svolta",
            orario: new Date()
          }
        });
        attivitaId = created.id;
      }
    }

    // Crea la lavagna se non esiste
    let lavagna = await prisma.lavagna.findUnique({ where: { attivitaId } });
    if (!lavagna) {
      lavagna = await prisma.lavagna.create({
        data: { attivitaId, titolo: titolo || "Lavagna" }
      });
    }
    return Response.json({ lavagna });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}