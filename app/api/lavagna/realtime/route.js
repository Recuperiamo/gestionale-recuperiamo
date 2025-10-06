import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { prisma } from "../../../lib/prisma";
import { addClient, removeClient, broadcast } from "../../../lib/realtime/lavagnaHub";

export const config = {
  runtime: "nodejs" // Assicura runtime Node (no edge)
};

export async function GET(req) {
  // Upgrade handshake
  const { searchParams } = new URL(req.url);
  const attivitaIdParam = searchParams.get("attivitaId");
  if (!attivitaIdParam) {
    return new Response("attivitaId mancante", { status: 400 });
  }
  const attivitaId = Number(attivitaIdParam);
  if (Number.isNaN(attivitaId)) {
    return new Response("attivitaId non valido", { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response("Non autenticato", { status: 401 });
  }

  // Verifica accesso a quella attività
  const att = await prisma.attivita.findUnique({
    where: { id: attivitaId },
    select: { id: true, clienteId: true }
  });
  if (!att) return new Response("Attività inesistente", { status: 404 });
  if (session.user.role === "cliente" && session.user.clienteId !== att.clienteId) {
    return new Response("Forbidden", { status: 403 });
  }

  const { socket, response } = Deno.upgradeWebSocket
    ? upgradeDeno(req)
    : upgradeNode(req);

  if (!socket) return response;

  const userId = session.user.id;
  const role = session.user.role;

  const clientObj = { ws: socket, userId, role, attivitaId };

  addClient(String(attivitaId), clientObj);

  // Notifica join
  broadcast(String(attivitaId), { t: "peer:join", userId }, socket);
  try {
    socket.send(JSON.stringify({
      t: "joined",
      you: { userId, role },
      attivitaId
    }));
  } catch {}

  socket.onmessage = (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }
    if (!msg || typeof msg !== "object") return;

    switch (msg.t) {
      case "cursor":
        broadcast(String(attivitaId), { t: "cursor", userId, x: msg.x, y: msg.y }, socket);
        break;
      case "stroke:start":
      case "stroke:points":
      case "stroke:done":
      case "stroke:delete":
        // Ritrasmetti a tutti gli altri
        broadcast(String(attivitaId), { ...msg, userId }, socket);
        break;
      case "ping":
        try { socket.send(JSON.stringify({ t: "pong", n: msg.n })); } catch {}
        break;
      default:
        break;
    }
  };

  socket.onclose = () => {
    removeClient(String(attivitaId), clientObj);
    broadcast(String(attivitaId), { t: "peer:leave", userId });
  };

  socket.onerror = () => {
    try { socket.close(); } catch {}
  };

  return response;
}

// Helper upgrade per Node / Deno (compat)
function upgradeNode(req) {
  // @ts-ignore
  if (!req.headers.get("upgrade") || req.headers.get("upgrade").toLowerCase() !== "websocket") {
    return { response: new Response("Expected websocket", { status: 426 }) };
  }
  const { Socket } = require("node:net");
  // Next 14 route handlers for WS (Node) richiedono WebSocket pair manuale (polyfill):
  const wsServer = require("ws");
  const wss = new wsServer.WebSocketServer({ noServer: true });
  let res;
  const [client, server] = Object.values(new wsServer.WebSocket.Server({ noServer: true }));
  // In pratica su Next stand-alone è più semplice usare la libreria ws a livello custom server.
  // Qui forniamo fallback generico:
  return {
    socket: null,
    response: new Response("WS non configurato in questo ambiente. Usa server custom o sostituisci con Pusher.", { status: 500 })
  };
}

// Supporto Deno / Edge se disponibile (solo dimostrativo)
function upgradeDeno(req) {
  try {
    // @ts-ignore
    const { socket, response } = Deno.upgradeWebSocket(req);
    return { socket, response };
  } catch {
    return { socket: null, response: new Response("Upgrade fallito", { status: 500 }) };
  }
}