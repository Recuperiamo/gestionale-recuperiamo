import Ably from 'ably/promises.js';

// End-to-end realtime verification using the same token endpoint as the app.
// Spawns two realtime clients (admin-test, student-test), subscribes the
// student to a unique test channel, publishes from admin, and expects the
// student to receive the message within a timeout.
//
// Usage (PowerShell):
//   $env:BASE_URL='http://localhost:3000'; node .\scripts\verify-ably-realtime.mjs
// Optional env:
//   BASE_URL        (default http://localhost:3000)
//   CHANNEL_SUFFIX  (appended to channel name for repeated runs)
//   TIMEOUT_MS      (default 5000)
//   USE_KEY         ("1" to force using ABLY_API_KEY directly instead of token endpoint)
//   ABLY_API_KEY    (required if USE_KEY=1)

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const SUFFIX = process.env.CHANNEL_SUFFIX ? `-${process.env.CHANNEL_SUFFIX}` : '';
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 5000);
const CHANNEL = `lavagna-test-rt-${Date.now()}${SUFFIX}`;

function waitConnected(rt) {
  return new Promise((resolve, reject) => {
    const onState = (st) => {
      if (st.current === 'connected') {
        rt.connection.off(onState);
        resolve();
      } else if (['failed','suspended','closed'].includes(st.current)) {
        rt.connection.off(onState);
        reject(new Error(`connection state: ${st.current}`));
      }
    };
    rt.connection.on(onState);
  });
}

async function getRealtimeClient(label) {
  const useKey = process.env.USE_KEY === '1';
  let opts;
  if (useKey) {
    const key = process.env.ABLY_API_KEY;
    if (!key) throw new Error('USE_KEY=1 but ABLY_API_KEY not set');
    opts = { key, clientId: `${label}-test`, tls: true, echoMessages: false };
  } else {
    opts = { authUrl: `${BASE}/api/ably/token`, clientId: `${label}-test`, tls: true, echoMessages: false };
  }
  const rt = new Ably.Realtime.Promise(opts);
  await waitConnected(rt);
  return rt;
}

async function main() {
  console.log('Verify Ably realtime (token endpoint)');
  console.log(' BASE_URL =', BASE);
  console.log(' Channel  =', CHANNEL);

  const admin = await getRealtimeClient('admin');
  const student = await getRealtimeClient('student');

  const chStudent = student.channels.get(CHANNEL);
  await chStudent.attach();
  console.log(' student attached');

  const receivedP = new Promise((resolve, reject) => {
    const to = setTimeout(() => {
      try { chStudent.unsubscribe(); } catch(_) {}
      reject(new Error('timeout waiting for probe'));
    }, TIMEOUT_MS);
    chStudent.subscribe('probe', (msg) => {
      clearTimeout(to);
      try { chStudent.unsubscribe('probe'); } catch(_) {}
      resolve(msg);
    });
  });

  const chAdmin = admin.channels.get(CHANNEL);
  await chAdmin.attach();
  console.log(' admin attached, publishing...');
  await chAdmin.publish('probe', { ok: true, ts: Date.now() });

  const msg = await receivedP;
  console.log(' received:', {
    name: msg?.name,
    data: msg?.data,
    clientId: msg?.clientId,
    connectionId: msg?.connectionId
  });

  try { await chAdmin.detach(); } catch(_) {}
  try { await chStudent.detach(); } catch(_) {}
  try { admin.close(); } catch(_) {}
  try { student.close(); } catch(_) {}

  console.log('\nSummary: realtime OK');
}

main().catch((err) => {
  console.error('\nSummary: realtime FAIL:', err?.message || err);
  process.exit(2);
});
