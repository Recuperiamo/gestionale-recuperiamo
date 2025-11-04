// Realtime client: Ably Realtime SDK wrapper (compat API)
// Force rebuild to include NEXT_PUBLIC_ABLY_API_KEY in bundle
let _ably = null;
let _connectPromise = null;

async function getAblyApiKey() {
  console.log('[Ably Debug] Checking for API key...');
  
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
          console.log('[Ably Debug] Found in localStorage');
          return key.trim();
        }
      }
    } catch (e) {
      console.error('[Ably Debug] Error reading localStorage:', e);
    }
  }
  
  // Fetch from server-side endpoint
  try {
    console.log('[Ably Debug] Fetching API key from /api/ably-auth...');
    const response = await fetch('/api/ably-auth');
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch API key: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    if (data.apiKey && typeof data.apiKey === 'string') {
      console.log('[Ably Debug] API key received from server');
      return data.apiKey.trim();
    }
  } catch (error) {
    console.error('[Ably Debug] Error fetching API key:', error);
  }
  
  console.error('[Ably Debug] API key not found in any location!');
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
      const Ably = await import('ably');
      console.log('[Ably] SDK imported successfully, keys:', Object.keys(Ably));
      
      const apiKey = await getAblyApiKey();
      if (!apiKey) {
        console.error('[Ably] API key not found!');
        throw new Error('Ably API key not found');
      }
      console.log(`[Ably] API Key found, connecting... (key starts with: ${apiKey.slice(0, 5)})`);
      
      // Try different import patterns
      const RealtimeClient = Ably.Realtime || Ably.default?.Realtime || Ably.default;
      console.log('[Ably] Using Realtime constructor:', typeof RealtimeClient);
      
      const ably = new RealtimeClient({ 
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
  console.log(`[Ably Channel Wrapper] Creating wrapper for channel: ${channel.name}`);
  
  return {
    state: channel.state,
    subscribe: (event, handler) => {
      console.log(`[Ably Channel] Subscribe to event: ${event} on channel: ${channel.name}`);
      const wrap = (msg) => {
        console.log(`[Ably Channel] Message received:`, { event, channel: channel.name, data: msg.data });
        handler({ data: msg.data });
      };
      listeners.set(handler, wrap);
      channel.subscribe(event, wrap);
    },
    unsubscribe: (event, handler) => {
      console.log(`[Ably Channel] Unsubscribe from event: ${event} on channel: ${channel.name}`);
      const wrap = listeners.get(handler);
      try { channel.unsubscribe(event, wrap || handler); } catch (_) {}
      listeners.delete(handler);
    },
    publish: (event, data, cb) => {
      console.log(`[Ably Channel] Publishing event: ${event} on channel: ${channel.name}`, data);
      channel.publish(event, data).then(() => {
        console.log(`[Ably Channel] Publish success: ${event}`);
        cb && cb();
      }).catch((e) => { 
        console.error('[Ably publish error]', event, e); 
        cb && cb(e); 
      });
    },
    detach: () => {
      console.log(`[Ably Channel] Detaching channel: ${channel.name}`);
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