// Realtime client: Ably Realtime SDK wrapper (compat API)
// Force rebuild to include NEXT_PUBLIC_ABLY_API_KEY in bundle
let _ably = null;
let _connectPromise = null;

function getAblyApiKey() {
  console.log('[Ably Debug] Checking for API key...');
  
  // Try process.env first (should work if build-time injection worked)
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ABLY_API_KEY) {
    console.log('[Ably Debug] Found in process.env');
    return process.env.NEXT_PUBLIC_ABLY_API_KEY;
  }
  
  // Try window injected by Next.js
  if (typeof window !== 'undefined') {
    // Next.js runtime config
    if (window?.__NEXT_DATA__?.env?.NEXT_PUBLIC_ABLY_API_KEY) {
      console.log('[Ably Debug] Found in window.__NEXT_DATA__.env');
      return window.__NEXT_DATA__.env.NEXT_PUBLIC_ABLY_API_KEY;
    }
    
    // Direct window property (fallback)
    if (window?.NEXT_PUBLIC_ABLY_API_KEY) {
      console.log('[Ably Debug] Found in window property');
      return window.NEXT_PUBLIC_ABLY_API_KEY;
    }
    
    // localStorage fallback (manual override for testing)
    try {
      const key = window.localStorage.getItem('NEXT_PUBLIC_ABLY_API_KEY');
      if (key) {
        console.log('[Ably Debug] Found in localStorage');
        return key;
      }
    } catch (_) {}
  }
  
  console.error('[Ably Debug] API key not found in any location!');
  console.log('[Ably Debug] process.env.NEXT_PUBLIC_ABLY_API_KEY:', typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_ABLY_API_KEY : 'process undefined');
  console.log('[Ably Debug] window.__NEXT_DATA__:', typeof window !== 'undefined' && window?.__NEXT_DATA__?.env);
  console.log('[Ably Debug] All process.env keys with ABLY:', typeof process !== 'undefined' ? Object.keys(process.env).filter(k => k.includes('ABLY')) : 'none');
  
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
      console.log('[Ably] Importing Ably SDK...');
      const { default: Ably } = await import('ably');
      console.log('[Ably] SDK imported successfully');
      
      const apiKey = getAblyApiKey();
      if (!apiKey) {
        console.error('[Ably] API key not found!');
        throw new Error('Ably API key not found');
      }
      console.log(`[Ably] API Key found, connecting... (key starts with: ${apiKey.slice(0, 5)})`);
      
      const ably = new Ably.Realtime.Promise({ 
        key: apiKey,
        log: { level: 4 } // Enable verbose logging
      });
      _ably = ably;
      console.log('[Ably] Realtime client created, connection state:', ably.connection.state);
      
      ably.connection.on('connecting', () => {
        console.log('[Ably] Connecting...');
      });
      
      ably.connection.on('connected', () => {
        console.log('[Ably] Connection successful!');
      });
      
      ably.connection.on('disconnected', () => {
        console.warn('[Ably] Disconnected');
      });
      
      ably.connection.on('suspended', () => {
        console.warn('[Ably] Connection suspended');
      });
      
      ably.connection.on('failed', (stateChange) => {
        console.error('[Ably] Connection failed:', stateChange);
      });
      
      ably.connection.on('closed', () => {
        console.warn('[Ably] Connection closed');
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