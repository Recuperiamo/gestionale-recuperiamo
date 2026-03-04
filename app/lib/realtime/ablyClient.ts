// @ts-nocheck
// Realtime client: Ably Realtime SDK wrapper (compat API)
let _ably = null;
let _connectPromise = null;
const _channelCache = new Map(); // Cache for channel wrappers

async function getAblyApiKey() {
  // Try localStorage first (for admin/testing)
  if (typeof window !== 'undefined') {
    try {
      let key = window.localStorage.getItem('NEXT_PUBLIC_ABLY_API_KEY');
      if (key) {
        // Parse if it's JSON, otherwise use as-is
        try {
          const parsed = JSON.parse(key);
          key = parsed.apiKey || parsed;
        } catch (_) {
          // It's already a string, use it
        }
        if (typeof key === 'string' && key.trim()) {
          return key.trim();
        }
      }
    } catch (e) {
      console.error('[Ably] Error reading localStorage:', e);
    }
  }

  // Fetch from server-side endpoint
  try {
    const response = await fetch('/api/ably-auth');
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch API key: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    if (data.apiKey && typeof data.apiKey === 'string') {
      return data.apiKey.trim();
    }
  } catch (error) {
    console.error('[Ably] Error fetching API key:', error);
  }

  console.error('[Ably] API key not found!');
  return null;
}

async function ensureAbly() {
  if (typeof window === 'undefined') return null;
  if (_ably) return _ably;
  if (_connectPromise) return _connectPromise;

  _connectPromise = (async () => {
    try {
      const Ably = await import('ably');
      const apiKey = await getAblyApiKey();
      if (!apiKey) {
        console.error('[Ably] API key not found!');
        throw new Error('Ably API key not found');
      }

      // Try different import patterns
      const RealtimeClient = Ably.Realtime || Ably.default?.Realtime || Ably.default;

      const ably = new RealtimeClient({
        key: apiKey,
        echoMessages: true // Enable receiving own published messages (important for local state sync)
      });
      _ably = ably;

      ably.connection.on('connected', () => {});

      ably.connection.on('failed', (stateChange) => {
        console.error('[Ably] Connection failed:', stateChange);
      });

      return _ably;
    } catch (error) {
      console.error('[Ably] Error in ensureAbly promise:', error);
      _connectPromise = null; // Reset promise on failure
      throw error;
    }
  })();

  return _connectPromise;
}

export function getAblyClient() {
  return _ably;
}

function createChannelWrapper(channel) {
  const listeners = new Map();

  return {
    state: channel.state,
    subscribe: (event, handler) => {
      // Wrap Ably message to maintain Socket.IO-compatible structure
      const wrap = (msg) => handler({ data: msg.data });
      listeners.set(handler, wrap);
      channel.subscribe(event, wrap);
    },
    unsubscribe: (event, handler) => {
      const wrap = listeners.get(handler);
      try { channel.unsubscribe(event, wrap || handler); } catch (_) {}
      listeners.delete(handler);
    },
    publish: (event, data, cb) => {
      channel.publish(event, data).then(() => {
        cb && cb();
      }).catch((e) => {
        if (process.env.NODE_ENV !== 'production') console.error('[Ably publish error]', event, e);
        cb && cb(e);
      });
    },
    detach: () => {
      try { channel.detach(); } catch (_) {}
      listeners.clear();
    },
    on: () => {}
  };
}

export async function getAblyChannelAsync(name) {
  if (_channelCache.has(name)) return _channelCache.get(name);
  const ably = await ensureAbly();
  if (!ably) return null;
  const channel = ably.channels.get(name);
  const wrapper = createChannelWrapper(channel);
  _channelCache.set(name, wrapper);
  return wrapper;
}

export function getAblyChannel(name) {
  if (_channelCache.has(name)) return _channelCache.get(name);
  if (!_ably) return null;
  const channel = _ably.channels.get(name);
  const wrapper = createChannelWrapper(channel);
  _channelCache.set(name, wrapper);
  return wrapper;
}

export async function whenChannelAttachedAsync(name) {
  const ably = await ensureAbly();
  if (!ably) throw new Error('Ably not available');
  const channel = ably.channels.get(name);
  await channel.attach();
  return Promise.resolve();
}

export async function withAblyChannelAsync(name, fn) {
  const ch = await getAblyChannelAsync(name);
  if (!ch) return;
  return fn(ch);
}
