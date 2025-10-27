const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const results = [];
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    try {
      const type = msg.type();
      const text = msg.text();
      const location = msg.location ? msg.location() : null;
      results.push({ type, text, location });
      console.log(`[PAGE ${type}] ${text}` + (location ? ` (${location.url}:${location.line})` : ''));
    } catch (e) {
      console.log('[PAGE console] error parsing message', e && e.message);
    }
  });

  page.on('pageerror', (err) => {
    console.log('[PAGE ERROR]', err && err.message);
    results.push({ type: 'pageerror', text: String(err && err.message) });
  });

  const url = process.argv[2] || process.env.TEST_URL || 'http://localhost:3000/lavagna';
  const signinUrl = new URL('/signin', url).toString();
  console.log('Signing in at', signinUrl);

  // Attempt credentials login using the signin page (email/password fields)
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    console.error('TEST_EMAIL and TEST_PASSWORD environment variables must be set for automated login.');
    await browser.close();
    process.exit(2);
  }

  try {
    await page.goto(signinUrl, { waitUntil: 'load', timeout: 30000 });
    // Fill email and password using input[type=email] and input[type=password]
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }),
      page.click('button[type="submit"]')
    ]).catch(()=>{});
    console.log('Post-login location:', page.url());
  } catch (e) {
    console.error('Login failed:', e && e.message);
    await browser.close();
    process.exit(2);
  }

  console.log('Opening', url);
  try {
    const resp = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    console.log('Navigation status:', resp && resp.status());
  } catch (e) {
    console.error('Navigation failed:', e && e.message);
    await browser.close();
    process.exit(2);
  }

  console.log('Browser opened in headed mode. You can interact with it now.');
  console.log('The script will keep the browser open for 60 seconds to allow manual reproduction (interact with the window if available).');

  await page.waitForTimeout(60000);

  // Ensure logs directory exists
  const logsDir = path.join(__dirname, 'logs');
  try { fs.mkdirSync(logsDir, { recursive: true }); } catch (e) {}
  const outPath = path.join(logsDir, `lavagna-headed-${Date.now()}.json`);
  try {
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
    console.log('Saved logs to', outPath);
  } catch (e) {
    console.error('Failed to write logs:', e && e.message);
  }

  // Summarize
  const errors = results.filter(r => r.type === 'error' || r.type === 'pageerror' || (r.type === 'log' && /ReferenceError|cannot access lexical declaration|can't access lexical declaration/i.test(r.text)));
  console.log('\n--- Playwright headed capture summary ---');
  console.log('Total console messages captured:', results.length);
  if (errors.length) {
    console.log('Detected errors/warnings of interest:', errors.length);
    errors.forEach((e, i) => console.log(i+1, e.type, e.text));
    await browser.close();
    // mark TODO 3 as completed in the final report step
    process.exit(3);
  }
  console.log('No obvious ReferenceError observed in captured logs.');
  await browser.close();
  process.exit(0);
})();
