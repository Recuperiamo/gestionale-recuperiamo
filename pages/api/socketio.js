import { Server } from "socket.io";

export const config = {
  api: { bodyParser: false },
};

let io;

export default function handler(req, res) {
  if (!res.socket.server.io) {
    const ioServer = new Server(res.socket.server, {
      path: "/api/socketio",
      addTrailingSlash: false,
      cors: { origin: true, credentials: true },
      transports: ["websocket", "polling"],
    });

    // Connessioni
    ioServer.on("connection", (socket) => {
      // Stanza lista lavagne per cliente (notifiche creazione/eliminazione)
      socket.on("join:lavagne", ({ clienteId }) => {
        if (clienteId) socket.join(`lavagne:${clienteId}`);
      });

      socket.on("new-lavagna", ({ lavagna, clienteId }) => {
        if (lavagna && clienteId) ioServer.to(`lavagne:${clienteId}`).emit("new-lavagna", { lavagna });
      });

      socket.on("delete-lavagna", ({ lavagnaId, clienteId }) => {
        if (clienteId && lavagnaId) ioServer.to(`lavagne:${clienteId}`).emit("delete-lavagna", { lavagnaId });
      });

      socket.on("delete-all-lavagne", ({ clienteId }) => {
        if (clienteId) ioServer.to(`lavagne:${clienteId}`).emit("delete-all-lavagne");
      });

      // Stanza della singola lavagna (sincronizzazione disegno live)
      socket.on("join:lavagna", ({ attivitaId }) => {
        if (attivitaId) socket.join(`lavagna:${attivitaId}`);
      });

      // Broadcast live stroke agli ALTRI client nella stanza
      socket.on("stroke:start", (msg) => {
        if (msg?.attivitaId) socket.to(`lavagna:${msg.attivitaId}`).emit("stroke:start", msg);
      });
      socket.on("stroke:points", (msg) => {
        if (msg?.attivitaId) socket.to(`lavagna:${msg.attivitaId}`).emit("stroke:points", msg);
      });
      socket.on("stroke:done", (msg) => {
        if (msg?.attivitaId) socket.to(`lavagna:${msg.attivitaId}`).emit("stroke:done", msg);
      });
      socket.on("stroke:delete", (msg) => {
        if (msg?.attivitaId) socket.to(`lavagna:${msg.attivitaId}`).emit("stroke:delete", msg);
      });
      socket.on("cursor", (msg) => {
        if (msg?.attivitaId) socket.to(`lavagna:${msg.attivitaId}`).emit("cursor", msg);
      });

      socket.on("clear-lavagna", ({ attivitaId }) => {
        if (attivitaId) ioServer.to(`lavagna:${attivitaId}`).emit("clear-lavagna");
      });
    });

    res.socket.server.io = ioServer;
    io = ioServer;
    console.log("Socket.IO server (pages/api/socketio) started");
  }
  res.end();
}