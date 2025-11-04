// Realtime client: Ably Realtime SDK wrapper (compat API)
let _ably = null;
let _connectPromise = null;

function getAblyApiKey() {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ABLY_API_KEY) {
    return process.env.NEXT_PUBLIC_ABLY_API_KEY;
  }
  if (typeof window !== 'undefined' && window?.__NEXT_DATA__?.env?.NEXT_PUBLIC_ABLY_API_KEY) {
    return window.__NEXT_DATA__.env.NEXT_PUBLIC_ABLY_API_KEY;
  }
  if (typeof window !== 'undefined' && window?.NEXT_PUBLIC_ABLY_API_KEY) {
    return window.NEXT_PUBLIC_ABLY_API_KEY;
  }
  if (typeof window !== 'undefined') {
    try {
      const key = window.localStorage.getItem('NEXT_PUBLIC_ABLY_API_KEY');
      if (key) return key;
    } catch (_) {}
  }
  return null;
}

async function ensureAbly() {
  console.log('[Ably] ensureAbly called');
  if (typeof window === 'undefined') {
    console.log('[Ably] Not in browser, returning null');
    return null;
  }
  if (_ably) {
    console.log('[Ably] Returning existing instance');
    return _ably;
  }
  if (_connectPromise) {
    console.log('[Ably] Returning existing promise');
    return _connectPromise;
  }

  console.log('[Ably] Creating new connection promise');
  _connectPromise = (async () => {
    try {
      const { default: Ably } = await import('ably');
      const apiKey = getAblyApiKey();
      if (!apiKey) {
        console.error('[Ably] API key not found!');
        throw new Error('Ably API key not found');
      }
      console.log(`[Ably] API Key found, connecting... (key starts with: ${apiKey.slice(0, 5)})`);
      const ably = new Ably.Realtime.Promise({ key: apiKey });
      _ably = ably;
      console.log('[Ably] Realtime client created');
      
      ably.connection.on('connected', () => {
        console.log('[Ably] Connection successful!');
      });
      ably.connection.on('failed', (reason) => {
        console.error('[Ably] Connection failed:', reason);
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
      channel.publish(event, data).then(() => cb && cb()).catch((e) => { if (process.env.NODE_ENV !== 'production') console.error('[Ably publish error]', e); cb && cb(e); });
    },
    detach: () => {
      try { channel.detach(); } catch (_) {}
      listeners.clear();
    },
    on: () => {}
  };
}

export async function getAblyChannelAsync(name) {
  const ably = await ensureAbly();
  if (!ably) return null;
  const channel = ably.channels.get(name);
  return createChannelWrapper(channel);
}

export function getAblyChannel(name) {
  if (!_ably) return null;
  const channel = _ably.channels.get(name);
  return createChannelWrapper(channel);
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