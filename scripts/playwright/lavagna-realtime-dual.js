const { chromium } = require('playwright');

(async () => {
  const BASE = process.env.TEST_URL_BASE || 'http://localhost:3000';
  const url = `${BASE}/lavagna-sandbox`;

  const browser = await chromium.launch({ headless: true });
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  const logsA = [];
  const logsB = [];
  const hook = (collector) => (msg) => {
    try { collector.push({ type: msg.type(), text: msg.text() }); } catch {}
  };
  pageA.on('console', hook(logsA));
  pageB.on('console', hook(logsB));

  console.log('Opening A:', url);
  await pageA.goto(url, { waitUntil: 'load', timeout: 30000 });
  console.log('Opening B:', url);
  await pageB.goto(url, { waitUntil: 'load', timeout: 30000 });

  // Wait a moment for socket connections/join to complete
  await pageA.waitForTimeout(1500);
  await pageB.waitForTimeout(1500);

  // Draw a short stroke on page A (center of first canvas)
  await pageA.waitForSelector('canvas');
  const canvas = await pageA.$('canvas');
  const box = await canvas.boundingBox();
  if (!box) {
    console.error('No canvas bounding box on page A');
    await browser.close();
    process.exit(2);
  }
  const startX = box.x + box.width * 0.4;
  const startY = box.y + box.height * 0.5;
  const endX = box.x + box.width * 0.6;
  const endY = box.y + box.height * 0.5;

  await pageA.mouse.move(startX, startY);
  await pageA.mouse.down();
  await pageA.mouse.move(endX, endY, { steps: 6 });
  await pageA.mouse.up();

  // Wait for student page (B) to log receive events
  const expectRecv = new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timeout waiting for LAVAGNA-RECV')), 8000);
    const check = async () => {
      const found = logsB.find(l => /\[LAVAGNA-RECV\]\s+stroke:(start|points|done)/.test(l.text));
      if (found) {
        clearTimeout(timeout);
        resolve(found.text);
        return true;
      }
      return false;
    };
    const interval = setInterval(async () => { if (await check()) clearInterval(interval); }, 300);
  });

  try {
    const msg = await expectRecv;
    console.log('Realtime OK — student received:', msg);
    await browser.close();
    process.exit(0);
  } catch (e) {
    console.error('Realtime FAIL:', e && e.message);
    console.log('\nLogs A:', logsA.map(l => l.text));
    console.log('Logs B:', logsB.map(l => l.text));
    await browser.close();
    process.exit(3);
  }
})();
