import { Server } from "socket.io";

let io;

export default function handler(req, res) {
  if (!io) {
    io = new Server(res.socket.server, {
      path: "/socket.io",
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    io.on("connection", (socket) => {
      // Join room per cliente
      socket.on("join:lavagne", ({ clienteId }) => {
        if (clienteId) {
          socket.join(`lavagne-client-${clienteId}`);
        }
      });

      // Evento per nuova lavagna
      socket.on("new-lavagna", ({ lavagna, clienteId }) => {
        if (clienteId) {
          io.to(`lavagne-client-${clienteId}`).emit("new-lavagna", { lavagna });
        }
      });

      // Elimina singola lavagna (realtime)
      socket.on("delete-lavagna", ({ lavagnaId, clienteId }) => {
        if (clienteId && lavagnaId) {
          io.to(`lavagne-client-${clienteId}`).emit("delete-lavagna", { lavagnaId });
        }
      });

      // Elimina tutte le lavagne (realtime)
      socket.on("delete-all-lavagne", ({ clienteId }) => {
        if (clienteId) {
          io.to(`lavagne-client-${clienteId}`).emit("delete-all-lavagne");
        }
      });

      // (Facoltativo) altri eventi: update-lavagna, update-tratto, ecc.
    });

  }
  res.end();
}