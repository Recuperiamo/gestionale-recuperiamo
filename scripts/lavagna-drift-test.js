/**
 * Lavagna drift test script (Playwright)
 *
 * Usage (install playwright first):
 *   npm i -D playwright
 *   TARGET_URL=http://localhost:3000/lavagna?attivitaId=... LOGIN_EMAIL=you@me LOGIN_PASS=secret node scripts/lavagna-drift-test.js
 *
 * The script will:
 * - open the target URL (must be accessible locally)
 * - try to login if LOGIN_EMAIL/LOGIN_PASS provided by filling inputs named "email"/"password" on /signin
 * - wait for the lavagna canvas and focus it
 * - perform zoom in/out cycles and then simulate a pen stroke while collecting console logs
 * - save screenshots and console logs to ./scripts/output
 *
 * Note: This script requires Playwright and a Chromium download. Run in an environment where npm can install packages.
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async function main(){
  const TARGET = process.env.TARGET_URL || 'http://localhost:3000';
  const EMAIL = process.env.LOGIN_EMAIL;
  const PASS = process.env.LOGIN_PASS;
  const outDir = path.resolve(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleMessages = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleMessages.push(text);
    console.log(text);
  });

  console.log('Opening', TARGET);
  await page.goto(TARGET, { waitUntil: 'networkidle' });

  // Optional login flow (best-effort)
  if (EMAIL && PASS) {
    try {
      console.log('Attempting login...');
      // naive approach: find input[name=email] or input[type=email]
      const emailInput = await page.$('input[name="email"], input[type="email"]');
      const passInput = await page.$('input[name="password"], input[type="pass"]');
      if (emailInput && passInput) {
        await emailInput.fill(EMAIL);
        await passInput.fill(PASS);
        // try to click submit button
        const submit = await page.$('button[type=submit]');
        if (submit) await submit.click();
        await page.waitForLoadState('networkidle');
        console.log('Login attempt done, waiting for lavagna...');
      } else {
        console.log('Login inputs not found, skipping login');
      }
    } catch (err) {
      console.warn('Login attempt failed', err.message);
    }
  }

  // wait for canvas
  await page.waitForSelector('canvas', { timeout: 15000 });
  const canvas = await page.$('canvas');
  if (!canvas) {
    console.error('Canvas not found');
    await browser.close();
    return;
  }

  // Focus and give user 2s to prepare
  await canvas.click({ timeout: 2000 });
  await page.waitForTimeout(1000);

  // Perform a zoom in/out using wheel events at canvas center
  const box = await canvas.boundingBox();
  const cx = box.x + box.width/2;
  const cy = box.y + box.height/2;

  console.log('Zooming in/out cycles...');
  for (let i=0;i<3;i++){
    await page.mouse.move(cx, cy);
    await page.mouse.wheel({ deltaY: -100 }); // zoom in
    await page.waitForTimeout(300);
    await page.mouse.wheel({ deltaY: 100 }); // zoom out
    await page.waitForTimeout(300);
  }

  // Now simulate a pen stroke: pointerdown -> move -> pointerup
  console.log('Simulating pen stroke...');
  // locate a starting point near center
  const start = { x: cx - 80, y: cy };
  const end = { x: cx + 80, y: cy };

  // Use pointer events
  await page.mouse.move(start.x, start.y);
  await page.mouse.down({ button: 'left' });
  // simulate move in steps
  const steps = 20;
  for (let i=1;i<=steps;i++){
    const ix = start.x + (end.x - start.x) * (i/steps);
    const iy = start.y + (end.y - start.y) * (i/steps);
    await page.mouse.move(ix, iy);
    await page.waitForTimeout(20);
  }
  await page.mouse.up({ button: 'left' });

  console.log('Waiting for diagnostics logs and drawing to settle...');
  await page.waitForTimeout(1200);

  // Take screenshot and save console logs
  const ssPath = path.join(outDir, 'lavagna-after-stroke.png');
  await page.screenshot({ path: ssPath, fullPage: false });
  fs.writeFileSync(path.join(outDir, 'console.log.txt'), consoleMessages.join('\n'), 'utf8');

  console.log('Saved screenshot to', ssPath);
  console.log('Saved console logs to', path.join(outDir, 'console.log.txt'));

  console.log('Done. Please inspect the screenshot and console logs in scripts/output');
  // keep browser open for manual inspection
})();
