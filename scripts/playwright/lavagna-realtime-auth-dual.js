const { chromium } = require('playwright');

async function login(page, baseUrl, email, password) {
  const signinUrl = new URL('/signin', baseUrl).toString();
  // Retry navigation a few times to tolerate server warm-up
  let navOk = false;
  for (let i = 0; i < 6; i++) {
    try {
      await page.goto(signinUrl, { waitUntil: 'load', timeout: 20000 });
      navOk = true;
      break;
    } catch (e) {
      await page.waitForTimeout(1500);
    }
  }
  if (!navOk) throw new Error('signin not reachable');
  await page.waitForSelector('input[type="email"]', { timeout: 20000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await Promise.all([
    page.waitForLoadState('networkidle'),
    page.getByRole('button', { name: /login/i }).click()
  ]);
  // Wait for session to be ready (works for both admin and client redirects)
  await page.waitForTimeout(800);
  await page.waitForFunction(async () => {
    try {
      const r = await fetch('/api/auth/session');
      if (!r.ok) return false;
      const js = await r.json();
      return !!(js && js.user && js.user.email);
    } catch { return false; }
  }, { timeout: 25000 });
}

async function ensureLavagnaForSession(page, baseUrl) {
  // Returns attivitaId to use
  const result = await page.evaluate(async () => {
    const sessRes = await fetch('/api/auth/session');
    if (!sessRes.ok) throw new Error('no session');
    const session = await sessRes.json();
    const role = String(session?.user?.role || '').toLowerCase();
    let clienteId = session?.user?.clienteId || null;

    // If admin/operator, pick the first student if no clienteId on user
    if ((!clienteId || role === 'admin' || role === 'operatore')) {
      try {
        const r = await fetch('/api/clienti?tipo=STUDENTE');
        const js = await r.json();
        const list = Array.isArray(js?.clienti) ? js.clienti : (Array.isArray(js) ? js : []);
        if (!clienteId && list.length) {
          clienteId = list[0].id;
        }
      } catch {
        // ignore
      }
    }
    if (!clienteId) throw new Error('no clienteId available');

    // Create or reuse a lavagna linked to this clienteId (API auto-links to a near-time attivita or creates one)
    const create = await fetch('/api/lavagna', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clienteId })
    });
    if (!create.ok) throw new Error('lavagna create failed: ' + create.status);
    const js = await create.json();
    const attivitaId = js?.lavagna?.attivitaId;
    if (!attivitaId) throw new Error('no attivitaId from lavagna');
    return { attivitaId, clienteId };
  });
  return result.attivitaId;
}

(async () => {
  let browser;
  let logsA = [];
  let logsB = [];
  try {
    const BASE = process.env.TEST_URL_BASE || 'http://localhost:3000';
    const EMAIL = process.env.LOGIN_EMAIL || '';
    const PASS = process.env.LOGIN_PASS || '';
    if (!EMAIL || !PASS) {
      console.error('Missing LOGIN_EMAIL or LOGIN_PASS env vars');
      process.exit(2);
    }

  browser = await chromium.launch({ headless: true });
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

  logsA = [];
  logsB = [];
    pageA.on('console', (msg) => { try { logsA.push({ type: msg.type(), text: msg.text() }); } catch {} });
    pageB.on('console', (msg) => { try { logsB.push({ type: msg.type(), text: msg.text() }); } catch {} });
    const netA = [];
    const netB = [];
    const track = (arr) => async (res) => {
      try {
        const url = res.url();
        if (/\/api\/(lavagna|auth|clienti)/.test(url)) {
          arr.push({ url, status: res.status() });
        }
      } catch {}
    };
    pageA.on('response', track(netA));
    pageB.on('response', track(netB));

    // Login both pages
    console.log('Logging in A...');
    await login(pageA, BASE, EMAIL, PASS);
    console.log('Logging in B...');
    await login(pageB, BASE, EMAIL, PASS);

    // Ensure a lavagna exists and get its attivitaId
    console.log('Ensuring lavagna exists...');
    const attivitaId = await ensureLavagnaForSession(pageA, BASE);
    console.log('Using attivitaId:', attivitaId);

    const targetUrl = new URL(`/lavagna?attivitaId=${attivitaId}`, BASE).toString();
    console.log('Opening A:', targetUrl);
    await pageA.goto(targetUrl, { waitUntil: 'load', timeout: 45000 });
    console.log('Opening B:', targetUrl);
    await pageB.goto(targetUrl, { waitUntil: 'load', timeout: 45000 });

    // Wait for canvas
    await pageA.waitForSelector('canvas', { timeout: 30000 });
    await pageB.waitForSelector('canvas', { timeout: 30000 });

    // Give sockets time to join
    await pageA.waitForTimeout(1200);
    await pageB.waitForTimeout(1200);

    // Draw a short stroke on page A (center area)
  const canvas = await pageA.$('canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('No canvas bounds');
    const startX = box.x + box.width * 0.4;
    const startY = box.y + box.height * 0.5;
    const endX = box.x + box.width * 0.65;
    const endY = box.y + box.height * 0.5;

    await pageA.mouse.move(startX, startY);
    await pageA.mouse.down();
    await pageA.mouse.move(endX, endY, { steps: 8 });
    await pageA.mouse.up();

    // Expect B to receive realtime logs
    const msg = await new Promise((resolve, reject) => {
      const started = Date.now();
      const to = setInterval(() => {
        const found = logsB.find(l => /\[LAVAGNA-RECV\]\s+stroke:(start|points|done)/.test(l.text));
        if (found) { clearInterval(to); resolve(found.text); }
        if (Date.now() - started > 15000) { clearInterval(to); reject(new Error('timeout waiting for LAVAGNA-RECV')); }
      }, 300);
    });

    console.log('Realtime OK — student received:', msg);
    await browser.close();
    process.exit(0);
  } catch (e) {
    console.error('Realtime FAIL:', e?.message || e);
    try {
      if (logsA?.length) {
        console.log('\nLogs A:', logsA.map(l => l.text));
      }
      if (logsB?.length) {
        console.log('\nLogs B:', logsB.map(l => l.text));
      }
      if (netA?.length) {
        console.log('\nNetwork A:', netA);
      }
      if (netB?.length) {
        console.log('\nNetwork B:', netB);
      }
    } catch {}
    try {
      await browser?.close();
    } catch {}
    process.exit(3);
  }
})();
