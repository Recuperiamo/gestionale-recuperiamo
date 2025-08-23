import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { prisma } from '../../../lib/prisma'

export async function POST(req) {
  let session;
  try {
    session = await getServerSession(authOptions);
    console.log("SESSION DEBUG", JSON.stringify(session));
    if (!session?.user?.id) {
      console.log("ERRORE: user.id mancante nella sessione!", session);
      return Response.json({ error: "Utente non autenticato o id non trovato" }, { status: 401 });
    }
    const { pacchettoId } = await req.json();
    console.log("INPUT pacchettoId:", pacchettoId);
    if (!pacchettoId) {
      console.log("ERRORE: pacchettoId mancante!");
      return Response.json({ error: "pacchettoId obbligatorio" }, { status: 400 });
    }
    console.log("PRISMA UPSERT userId:", session.user.id, "pacchettoId:", pacchettoId);
    const result = await prisma.pacchettoAlertLetto.upsert({
      where: { userId_pacchettoId: { userId: session.user.id, pacchettoId } },
      update: { letto: true },
      create: { userId: session.user.id, pacchettoId, letto: true },
    });
    console.log("PRISMA SUCCESS result:", result);
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
    console.log("SESSION DEBUG", JSON.stringify(session));
    if (!session?.user?.id) {
      console.log("ERRORE: user.id mancante nella sessione!", session);
      return Response.json({ error: "Utente non autenticato o id non trovato" }, { status: 401 });
    }
    const letti = await prisma.pacchettoAlertLetto.findMany({
      where: { userId: session.user.id, letto: true },
      select: { pacchettoId: true },
    });
    console.log("GET letti:", letti);
    return Response.json({ ids: letti.map((l) => l.pacchettoId) });
  } catch (e) {
    console.error("ERRORE GENERALE GET /api/pacchetti/alert-letto:", e);
    return Response.json({ error: "Errore interno", details: String(e) }, { status: 500 });
  }
}
