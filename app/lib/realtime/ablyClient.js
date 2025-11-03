// Realtime client: Socket.IO only, preserving the existing Ably-like API
let _socket = null;
let _connectPromise = null;

async function ensureSocket() {
  if (typeof window === 'undefined') return null;
  if (_socket) return _socket;
  if (_connectPromise) return _connectPromise;

  _connectPromise = (async () => {
    const mod = await import('socket.io-client');
    const io = mod.io || mod.default?.io || mod;
    const configuredUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SOCKET_URL) || '';
    const baseUrl = configuredUrl || window.location.origin;
    // If using local origin (no external realtime URL), hit the bootstrap API to start the lightweight Socket.IO server
    if (!configuredUrl) {
      try { await fetch('/api/socketio'); } catch (_) {}
    }
    // Use the same Socket.IO path used by the server (`/api/socketio`)
    const socket = io(baseUrl, { path: '/api/socketio', transports: ['websocket', 'polling'] });
    await new Promise((resolve, reject) => {
      const to = setTimeout(() => reject(new Error('socket.io connect timeout')), 8000);
      socket.once('connect', () => { clearTimeout(to); resolve(); });
      socket.once('connect_error', (e) => { clearTimeout(to); reject(e); });
    });
    _socket = socket;
    if (process.env.NODE_ENV !== 'production') console.log('[Realtime] Socket.IO connected');
    return _socket;
  })();

  return _connectPromise;
}

export function getAblyClient() {
  // Back-compat: return socket if connected
  return _socket;
}

function createChannelWrapper(socket, name) {
  try {
    if (typeof name === 'string') {
      if (name.startsWith('lavagna:')) {
        const id = name.split(':')[1];
        socket.emit('join:lavagna', { attivitaId: id });
      } else if (name.startsWith('lavagne:')) {
        const id = name.split(':')[1];
        socket.emit('join:lavagne', { clienteId: id });
      } else if (name.startsWith('materiale:')) {
        const id = name.split(':')[1];
        socket.emit('join:materiale', { clienteId: id });
      }
    }
  } catch (_) {}

  const listeners = new Map();
  return {
    state: 'attached',
    subscribe: (event, handler) => {
      const wrap = (msg) => handler({ data: msg });
      listeners.set(handler, wrap);
      socket.on(event, wrap);
    },
    unsubscribe: (event, handler) => {
      const wrap = listeners.get(handler);
      try { socket.off(event, wrap || handler); } catch (_) {}
      listeners.delete(handler);
    },
    publish: (event, data, cb) => {
      try { socket.emit(event, data); cb && cb(); } catch (e) { if (process.env.NODE_ENV !== 'production') console.error('[Realtime publish error]', e); cb && cb(e); }
    },
    detach: () => {
      for (const [orig, wrap] of listeners.entries()) {
        try { socket.off(orig, wrap); } catch (_) {}
      }
      listeners.clear();
    },
    on: () => {}
  };
}

export async function getAblyChannelAsync(name) {
  const socket = await ensureSocket();
  if (!socket) return null;
  return createChannelWrapper(socket, name);
}

export function getAblyChannel(name) {
  if (!_socket) return null;
  return createChannelWrapper(_socket, name);
}

export async function whenChannelAttachedAsync() {
  const socket = await ensureSocket();
  if (!socket) throw new Error('Socket not available');
  return Promise.resolve();
}

export async function withAblyChannelAsync(name, fn) {
  const ch = await getAblyChannelAsync(name);
  if (!ch) return;
  return fn(ch);
}