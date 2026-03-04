// @ts-nocheck
// Semplice hub in-memory per stanze lavagna (non usare in cluster senza adattatore esterno).
// Chiave: attivitaId (string) -> { clients: Set<clientObj> }
const rooms = new Map();

/**
 * clientObj = {
 *   ws,
 *   userId,
 *   role,
 *   attivitaId
 * }
 */

export function getRoom(attivitaId) {
  let r = rooms.get(attivitaId);
  if (!r) {
    r = { clients: new Set() };
    rooms.set(attivitaId, r);
  }
  return r;
}

export function addClient(attivitaId, client) {
  const room = getRoom(attivitaId);
  room.clients.add(client);
  return room;
}

export function removeClient(attivitaId, client) {
  const room = rooms.get(attivitaId);
  if (!room) return;
  room.clients.delete(client);
  if (room.clients.size === 0) {
    rooms.delete(attivitaId);
  }
}

export function broadcast(attivitaId, msgObj, exceptWs) {
  const room = rooms.get(attivitaId);
  if (!room) return;
  const data = JSON.stringify(msgObj);
  for (const c of room.clients) {
    if (c.ws !== exceptWs && c.ws.readyState === 1) {
      try { c.ws.send(data); } catch {}
    }
  }
}