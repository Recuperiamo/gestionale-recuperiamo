const { chromium } = require('playwright');

(async () => {
  const results = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    try {
      const type = msg.type();
      const text = msg.text();
      const location = msg.location ? msg.location() : null;
      results.push({ type, text, location });
      // also echo to stdout so the runner captures it
      console.log(`[PAGE ${type}] ${text}` + (location ? ` (${location.url}:${location.line})` : ''));
    } catch (e) {
      console.log('[PAGE console] error parsing message', e && e.message);
    }
  });

  page.on('pageerror', (err) => {
    console.log('[PAGE ERROR]', err && err.message);
    results.push({ type: 'pageerror', text: String(err && err.message) });
  });

  const url = process.env.TEST_URL || 'http://localhost:3000/lavagna';
  console.log('Opening', url);
  try {
    const resp = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    console.log('Navigation status:', resp && resp.status());
  } catch (e) {
    console.error('Navigation failed:', e && e.message);
    await browser.close();
    process.exit(2);
  }

  // Wait for console output or errors for up to 10s
  await page.waitForTimeout(10000);

  // Summarize
  const errors = results.filter(r => r.type === 'error' || r.type === 'pageerror' || (r.type === 'log' && /ReferenceError|cannot access lexical declaration|can't access lexical declaration/i.test(r.text)));
  console.log('\n--- Playwright capture summary ---');
  console.log('Total console messages captured:', results.length);
  if (errors.length) {
    console.log('Detected errors/warnings of interest:', errors.length);
    errors.forEach((e, i) => console.log(i+1, e.type, e.text));
    await browser.close();
    process.exit(3);
  }
  console.log('No obvious ReferenceError observed in captured logs.');
  await browser.close();
  process.exit(0);
})();
