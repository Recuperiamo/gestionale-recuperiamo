import { prisma } from "../../../lib/prisma";

export async function POST(req) {
  try {
    const body = await req.json();
    const { attivitaId, titolo, clienteId } = body;
    if (!attivitaId || !clienteId) {
      return Response.json({ error: "attivitaId e clienteId obbligatori" }, { status: 400 });
    }
    // Crea la lavagna se non esiste
    let lavagna = await prisma.lavagna.findUnique({ where: { attivitaId } });
    if (!lavagna) {
      lavagna = await prisma.lavagna.create({
        data: { attivitaId, titolo: titolo || "Lavagna" }
      });
    }
    // Emetti evento realtime tramite Socket.IO (se server.js avviato)
    // NOTA: qui puoi fare una fetch POST verso localhost:3000/socketio-api (o altro endpoint custom) per triggerare l'evento
    // Oppure, se preferisci, la creazione può essere fatta direttamente da frontend via socket dopo la risposta
    return Response.json({ lavagna });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}