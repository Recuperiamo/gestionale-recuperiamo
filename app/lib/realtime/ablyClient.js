// Lightweight Ably client wrapper for browser usage
// Uses server-issued token authentication via /api/ably/token (no public key exposed)
let _client = null;
const _channelReady = new Map(); // name -> Promise<void>

export function getAblyClient() {
  if (typeof window === 'undefined') return null;
  if (_client) return _client;
  const { Realtime } = require('ably');
  _client = new Realtime({ authUrl: '/api/ably/token', echoMessages: false, tls: true });
  try {
    _client.connection.on((stateChange) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Ably connection]', stateChange.current, '->', stateChange.previous || 'start');
      }
      if (['suspended','failed'].includes(stateChange.current)) {
        if (process.env.NODE_ENV !== 'production') console.warn('[Ably] attempting reconnect');
        // The SDK auto-retries; we just log.
      }
    });
    _client.auth.on('failed', (err) => {
      if (process.env.NODE_ENV !== 'production') console.error('[Ably auth failed]', err);
    });
  } catch {}
  return _client;
}

export function getAblyChannel(name) {
  const c = getAblyClient();
  if (!c) return null;
  const ch = c.channels.get(name);
  // Kick off attach eagerly
  if (ch && ch.state === 'initialized') {
    try { ch.attach(); } catch {}
  }
  return ch;
}

export function whenChannelAttached(name, timeoutMs = 5000) {
  let p = _channelReady.get(name);
  if (p) return p;
  const ch = getAblyChannel(name);
  if (!ch) return Promise.reject(new Error('Channel not available (no client)'));
  if (ch.state === 'attached') return Promise.resolve();
  p = new Promise((resolve, reject) => {
    const to = setTimeout(() => {
      if (process.env.NODE_ENV !== 'production') console.warn('[Ably] attach timeout', name, ch.state);
      reject(new Error('Attach timeout: '+name));
    }, timeoutMs);
    const off = () => {
      try { ch.off(listener); } catch {}
      clearTimeout(to);
    };
    const listener = (stateChange) => {
      if (stateChange.current === 'attached') {
        off();
        resolve();
      } else if (['failed','suspended','detached'].includes(stateChange.current)) {
        // allow re-attach attempts transparently; keep waiting unless timeout
        if (stateChange.current === 'detached') {
          try { ch.attach(); } catch {}
        }
      }
    };
    try { ch.on(listener); } catch {}
    try { ch.attach(); } catch {}
  });
  _channelReady.set(name, p);
  // Clean map after settle to allow future re-waits if needed (e.g. after detach)
  p.finally(() => setTimeout(() => { _channelReady.delete(name); }, 1000));
  return p;
}

export function withAblyChannel(name, fn) {
  const ch = getAblyChannel(name);
  if (!ch) return;
  try { fn(ch); } catch {}
}