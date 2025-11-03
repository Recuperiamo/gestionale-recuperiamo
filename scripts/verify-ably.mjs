import Ably from 'ably/promises.js';

// Simple verification script for local dev.
// - Calls /api/ably/token to verify token endpoint
// - If ABLY_API_KEY is available, publishes a test message to a test channel
//   and reads channel history to confirm the message was accepted by Ably.
// Usage:
//   node --experimental-json-modules scripts/verify-ably.mjs
// Environment:
//   BASE_URL (optional, default http://localhost:3000)
//   ABLY_API_KEY (optional, required for publish/history check)

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const TEST_CHANNEL = 'lavagna-test-check';

async function checkTokenEndpoint() {
  try {
    const res = await fetch(`${BASE}/api/ably/token`);
    const text = await res.text();
    let js = null;
    try { js = JSON.parse(text); } catch (_) { js = null; }
    console.log('\n[1] /api/ably/token -> status', res.status);
    console.log('[1] body:', js || text);
    if (!res.ok) throw new Error('/api/ably/token returned non-OK status');
    return true;
  } catch (err) {
    console.error('[1] token endpoint check failed:', err.message || err);
    return false;
  }
}

async function checkAblyRestPublish() {
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    console.warn('\n[2] ABLY_API_KEY not set in env; skipping REST publish/history check.');
    return null;
  }
  try {
    const rest = new Ably.Rest(apiKey);
    const payload = { probe: true, ts: Date.now(), pid: process.pid };
    console.log('\n[2] Publishing test message to channel', TEST_CHANNEL);
    await rest.channels.get(TEST_CHANNEL).publish('probe', payload);
    console.log('[2] publish ok. Waiting briefly before reading history...');
    // small delay to allow Ably to index message
    await new Promise(r => setTimeout(r, 1000));
    const history = await rest.channels.get(TEST_CHANNEL).history({ limit: 10 });
    const items = (history && history.items) || (history && history.messages) || [];
    console.log('[2] history items count:', items.length);
    const found = items.find(it => {
      try {
        const d = it.data || it.payload || it.body || it;
        if (typeof d === 'string') {
          try { return JSON.parse(d).probe === true; } catch(_) { return false; }
        }
        return d && d.probe === true;
      } catch (_) { return false; }
    });
    if (found) {
      console.log('[2] found probe message in history. Success.');
      return true;
    }
    console.warn('[2] probe message not found in recent history. History sample:');
    console.log(items.slice(0,5));
    return false;
  } catch (err) {
    console.error('[2] Ably REST publish/history check failed:', err.message || err);
    return false;
  }
}

(async function main(){
  console.log('Verify Ably integration — BASE=', BASE);
  const okToken = await checkTokenEndpoint();
  const okRest = await checkAblyRestPublish();
  console.log('\nSummary:');
  console.log(' - token endpoint:', okToken ? 'OK' : 'FAIL');
  if (okRest === null) console.log(' - REST publish/history: SKIPPED (no ABLY_API_KEY)');
  else console.log(' - REST publish/history:', okRest ? 'OK' : 'FAIL');
  process.exit((okToken && (okRest !== false)) ? 0 : 2);
})();
