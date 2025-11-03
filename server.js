/**
 * Custom server Next.js + Socket.IO (Lavagne sync)
 * Avvia con: npm run dev:rt
 */
const next = require("next");
const http = require("http");
const { Server } = require("socket.io");
const { parse } = require("cookie");
const { getToken } = require("next-auth/jwt");
const { PrismaClient } = require("@prisma/client");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();

app.prepare().then(() => {
  const server = http.createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      console.error("Errore handler Next:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  io.use(async (socket, nextMw) => {
    // Recupero sessione NextAuth
    const req = socket.request;
    const cookies = parse(req.headers.cookie || "");
    const token = await getToken({
      req: { headers: req.headers, cookies },
      secret: process.env.NEXTAUTH_SECRET
    });
    if (!token) return nextMw(new Error("UNAUTHORIZED"));
    socket.data.user = {
      id: token.id ?? token.sub ?? null,
      role: token.role ?? null,
      clienteId: token.clienteId ?? null
    };
    nextMw();
  });

  io.on("connection", (socket) => {
    // Join stanza lavagne (per lista lavagne realtime)
    socket.on("join:lavagne", ({ clienteId }) => {
      if (!clienteId) return;
      socket.join(`lavagne:${clienteId}`);
    });

    // Join stanza lavagna singola (per sync stroke live)
    socket.on("join:lavagna", ({ attivitaId }) => {
      if (!attivitaId) return;
      socket.join(`lavagna:${attivitaId}`);
    });

    // Lavagna live - eventi stroke
    socket.on("stroke:start", (msg) => {
      if (!msg?.attivitaId) return;
      io.to(`lavagna:${msg.attivitaId}`).emit("stroke:start", msg);
    });
    socket.on("stroke:points", (msg) => {
      if (!msg?.attivitaId) return;
      io.to(`lavagna:${msg.attivitaId}`).emit("stroke:points", msg);
    });
    socket.on("stroke:done", (msg) => {
      if (!msg?.attivitaId) return;
      io.to(`lavagna:${msg.attivitaId}`).emit("stroke:done", msg);
    });
    socket.on("stroke:delete", (msg) => {
      if (!msg?.attivitaId) return;
      io.to(`lavagna:${msg.attivitaId}`).emit("stroke:delete", msg);
    });
    socket.on("cursor", (msg) => {
      if (!msg?.attivitaId) return;
      io.to(`lavagna:${msg.attivitaId}`).emit("cursor", msg);
    });

    // Quando viene creata una nuova lavagna, broadcast su stanza lavagne
    socket.on("new-lavagna", ({ lavagna, clienteId }) => {
      if (!lavagna || !clienteId) return;
      io.to(`lavagne:${clienteId}`).emit("new-lavagna", { lavagna });
    });

    // Materiale: join stanza per cliente e forward eventi
    socket.on("join:materiale", ({ clienteId }) => {
      if (!clienteId) return;
      socket.join(`materiale:${clienteId}`);
    });

    socket.on("new-material", (msg) => {
      const clienteId = msg?.clienteId;
      if (!clienteId) return;
      io.to(`materiale:${clienteId}`).emit("new-material", msg);
    });

    socket.on("delete-material", (msg) => {
      const clienteId = msg?.clienteId;
      if (!clienteId) return;
      io.to(`materiale:${clienteId}`).emit("delete-material", msg);
    });

    socket.on("disconnect", () => {
      // Gestione pulizia se serve
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(
      `[dev:rt] Server con Socket.IO avviato su http://${hostname}:${port}`
    );
  });
});