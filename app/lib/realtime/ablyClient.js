// Lightweight Ably client wrapper for browser usage
// Uses server-issued token authentication via /api/ably/token (no public key exposed)
let _client = null;

export function getAblyClient() {
  if (typeof window === 'undefined') return null;
  if (_client) return _client;
  const { Realtime } = require('ably');
  // Token auth: the route /api/ably/token signs requests with ABLY_API_KEY server-side
  _client = new Realtime({ authUrl: '/api/ably/token', echoMessages: false, tls: true });
  try {
    _client.connection.on((stateChange) => {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log('[Ably connection]', stateChange.current, '->', stateChange.previous || 'start');
      }
      if (['failed','suspended','closed'].includes(stateChange.current) && process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[Ably] connection issue', stateChange.reason);
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
  return c ? c.channels.get(name) : null;
}

export function withAblyChannel(name, fn) {
  const ch = getAblyChannel(name);
  if (!ch) return;
  try { fn(ch); } catch {}
}