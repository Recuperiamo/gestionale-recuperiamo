// Lightweight Ably client wrapper for browser usage
// Uses server-issued token authentication via /api/ably/token (no public key exposed)
let _client = null;
let _loadingPromise = null;
const _channelReady = new Map(); // name -> Promise<void>

// Try to lazy-load the Ably client via dynamic import. We intentionally avoid
// using static require/import so bundlers don't eagerly inline Ably into the
// main client bundle, which can cause initialization/circular issues.
async function loadAbly() {
  if (typeof window === 'undefined') return null;
  if (_client) return _client;
  if (_loadingPromise) return _loadingPromise;
  _loadingPromise = (async () => {
    try {
      const mod = await import('ably/promises.js');
      const ably = mod?.default || mod;
      const Realtime = ably?.RealtimePromise || ably?.Realtime || ably?.default;
      if (!Realtime) {
        console.warn('[Ably] runtime import succeeded but RealtimePromise not found');
        return null;
      }
      try {
        _client = new Realtime({ authUrl: '/api/ably/token', echoMessages: false, tls: true });
      } catch (err) {
        console.warn('[Ably] init failed, realtime features disabled', err?.message || err);
        _client = null;
        return null;
      }
      try {
        _client.connection.on((stateChange) => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[Ably connection]', stateChange.current, '->', stateChange.previous || 'start');
          }
        });
        _client.auth.on('failed', (err) => {
          if (process.env.NODE_ENV !== 'production') console.error('[Ably auth failed]', err);
        });
      } catch (_) {}
      return _client;
    } catch (err) {
      console.warn('[Ably] dynamic import failed, realtime features disabled', err?.message || err);
      _client = null;
      return null;
    }
  })();
  return _loadingPromise;
}

export function getAblyClient() {
  // Backwards-compatible synchronous accessor: returns client if already loaded,
  // otherwise null. Callers that need a client should use getAblyChannelAsync/
  // whenChannelAttachedAsync which will await loadAbly().
  if (typeof window === 'undefined') return null;
  return _client;
}

export async function getAblyChannelAsync(name) {
  const client = await loadAbly();
  if (!client) return null;
  const ch = client.channels.get(name);
  if (ch && ch.state === 'initialized') {
    try { ch.attach(); } catch {}
  }
  return ch;
}

export async function whenChannelAttachedAsync(name, timeoutMs = 5000) {
  let p = _channelReady.get(name);
  if (p) return p;
  const ch = await getAblyChannelAsync(name);
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
        if (stateChange.current === 'detached') {
          try { ch.attach(); } catch {}
        }
      }
    };
    try { ch.on(listener); } catch {}
    try { ch.attach(); } catch {}
  });
  _channelReady.set(name, p);
  p.finally(() => setTimeout(() => { _channelReady.delete(name); }, 1000));
  return p;
}

export async function withAblyChannelAsync(name, fn) {
  const ch = await getAblyChannelAsync(name);
  if (!ch) return;
  try { fn(ch); } catch {}
}

// Keep legacy synchronous functions for minimal compatibility
export function getAblyChannel(name) {
  return getAblyClient() ? getAblyClient().channels.get(name) : null;
}

export function whenChannelAttached(name, timeoutMs = 5000) {
  // Prefer async version, but keep a fallback that rejects if client not ready
  return whenChannelAttachedAsync(name, timeoutMs);
}

export function withAblyChannel(name, fn) {
  withAblyChannelAsync(name, fn);
}