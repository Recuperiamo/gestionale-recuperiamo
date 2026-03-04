// @ts-nocheck
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { prisma } from '../../../lib/prisma'

export async function POST(req) {
  let session;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Utente non autenticato o id non trovato" }, { status: 401 });
    }
    const { pacchettoId } = await req.json();
    if (!pacchettoId) {
      return Response.json({ error: "pacchettoId obbligatorio" }, { status: 400 });
    }

    // FIX: Converte userId da string a number
    const userId = parseInt(session.user.id, 10);

    await prisma.pacchettoAlertLetto.upsert({
      where: { userId_pacchettoId: { userId, pacchettoId } },
      update: { letto: true },
      create: { userId, pacchettoId, letto: true },
    });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("ERRORE GENERALE POST /api/pacchetti/alert-letto:", e);
    return Response.json({ error: "Errore interno", details: String(e) }, { status: 500 });
  }
}

export async function GET(req) {
  let session;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Utente non autenticato o id non trovato" }, { status: 401 });
    }

    // FIX: Converte userId da string a number
    const userId = parseInt(session.user.id, 10);

    const letti = await prisma.pacchettoAlertLetto.findMany({
      where: { userId, letto: true },
      select: { pacchettoId: true },
    });
    return Response.json({ ids: letti.map((l) => l.pacchettoId) });
  } catch (e) {
    console.error("ERRORE GENERALE GET /api/pacchetti/alert-letto:", e);
    return Response.json({ error: "Errore interno", details: String(e) }, { status: 500 });
  }
}
