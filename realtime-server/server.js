import http from 'http';
import { Server } from 'socket.io';

const port = process.env.PORT ? Number(process.env.PORT) : 4001;
const corsOrigin = process.env.CORS_ORIGIN || '*';
const originSetting = corsOrigin.includes(',')
  ? corsOrigin.split(',').map((s) => s.trim()).filter(Boolean)
  : corsOrigin;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Recuperiamo Realtime OK');
});

const io = new Server(server, {
  path: '/socket.io',
  cors: { origin: originSetting, credentials: true },
  transports: ['websocket', 'polling']
});

io.on('connection', (socket) => {
  // Liste lavagne per cliente
  socket.on('join:lavagne', ({ clienteId }) => {
    if (clienteId) socket.join(`lavagne:${clienteId}`);
  });

  socket.on('new-lavagna', ({ lavagna, clienteId }) => {
    if (lavagna && clienteId) io.to(`lavagne:${clienteId}`).emit('new-lavagna', { lavagna });
  });

  socket.on('delete-lavagna', ({ lavagnaId, clienteId }) => {
    if (clienteId && lavagnaId) io.to(`lavagne:${clienteId}`).emit('delete-lavagna', { lavagnaId });
  });

  socket.on('delete-all-lavagne', ({ clienteId }) => {
    if (clienteId) io.to(`lavagne:${clienteId}`).emit('delete-all-lavagne');
  });

  // Stanza singola lavagna per disegno live
  socket.on('join:lavagna', ({ attivitaId }) => {
    if (attivitaId) socket.join(`lavagna:${attivitaId}`);
  });

  socket.on('stroke:start', (msg) => {
    if (!msg?.attivitaId) return;
    socket.to(`lavagna:${msg.attivitaId}`).emit('stroke:start', msg);
  });

  socket.on('stroke:points', (msg) => {
    if (!msg?.attivitaId) return;
    socket.to(`lavagna:${msg.attivitaId}`).emit('stroke:points', msg);
  });

  socket.on('stroke:done', (msg) => {
    if (!msg?.attivitaId) return;
    socket.to(`lavagna:${msg.attivitaId}`).emit('stroke:done', msg);
  });

  socket.on('stroke:delete', (msg) => {
    if (!msg?.attivitaId) return;
    socket.to(`lavagna:${msg.attivitaId}`).emit('stroke:delete', msg);
  });

  socket.on('clear-lavagna', ({ attivitaId }) => {
    if (attivitaId) io.to(`lavagna:${attivitaId}`).emit('clear-lavagna');
  });
});

server.listen(port, () => {
  console.log(`[realtime] Listening on :${port} (CORS ${Array.isArray(originSetting) ? originSetting.join(',') : originSetting})`);
});
