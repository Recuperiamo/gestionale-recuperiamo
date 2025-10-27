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

  try {
    console.log('Opening', TARGET);
    await page.goto(TARGET, { waitUntil: 'networkidle' });

    // Optional login flow (best-effort)
    if (EMAIL && PASS) {
      try {
        console.log('Attempting login...');
        // naive approach: find input[name=email] or input[type=email]
        let emailInput = await page.$('input[name="email"], input[type="email"]');
        let passInput = await page.$('input[name="password"], input[type="password"]');
        if (emailInput && passInput) {
          await emailInput.fill(EMAIL);
          await passInput.fill(PASS);
          const submit = await page.$('button[type=submit]');
          if (submit) await submit.click();
          await page.waitForLoadState('networkidle');
          console.log('Login attempt done, waiting for lavagna...');
        } else {
          console.log('Login inputs not found on target page, navigating to /signin');
          await page.goto(new URL('/signin', TARGET).toString(), { waitUntil: 'networkidle' });
          try {
            await page.waitForSelector('input[type="email"]', { timeout: 5000 });
            await page.waitForSelector('input[type="password"]', { timeout: 5000 });
            emailInput = await page.$('input[type="email"]');
            passInput = await page.$('input[type="password"]');
            if (emailInput && passInput) {
              await emailInput.fill(EMAIL);
              await passInput.fill(PASS);
              const submit = await page.$('button[type=submit]');
              if (submit) await submit.click();
              await Promise.race([
                page.waitForNavigation({ waitUntil: 'networkidle', timeout: 12000 }).catch(() => {}),
                page.waitForTimeout(4000)
              ]);
              console.log('Login via /signin done, returning to target');
              await page.goto(TARGET, { waitUntil: 'networkidle' });
            } else {
              console.log('Signin page inputs not found, skipping login');
            }
          } catch (e) {
            console.log('Signin page did not load inputs, skipping login');
          }
        }
      } catch (err) {
        console.warn('Login attempt failed', err.message);
      }
    }

    async function runZoomScenario(label) {
      await page.waitForSelector('canvas', { timeout: 30000 });
      const canvasEl = await page.$('canvas');
      if (!canvasEl) {
        throw new Error(`Canvas not found (${label})`);
      }
      const box = await canvasEl.boundingBox();
      if (!box) {
        throw new Error(`Canvas bounding box unavailable (${label})`);
      }
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;

      await page.mouse.move(cx, cy);
      await canvasEl.click();
      await page.waitForTimeout(600);

      const iterations = label === 'max' ? 18 : 24;
      const delta = label === 'max' ? -160 : 160;
      console.log(`Zooming to ${label}...`);
      for (let i = 0; i < iterations; i++) {
        await page.mouse.wheel(0, delta);
        await page.waitForTimeout(140);
      }

      const span = Math.min(200, box.width * 0.6);
      const start = { x: cx - span / 2, y: cy };
      const end = { x: cx + span / 2, y: cy };

      console.log(`Drawing stroke at zoom ${label}...`);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down({ button: 'left' });
      const steps = 24;
      for (let i = 1; i <= steps; i++) {
        const ix = start.x + (end.x - start.x) * (i / steps);
        await page.mouse.move(ix, end.y);
        await page.waitForTimeout(16);
      }
      await page.mouse.up({ button: 'left' });
      await page.waitForTimeout(900);

      const scenarioShot = path.join(outDir, `lavagna-zoom-${label}.png`);
      await page.screenshot({ path: scenarioShot, fullPage: false });
      console.log(`Saved zoom ${label} screenshot to`, scenarioShot);
    }

    await page.screenshot({ path: path.join(outDir, 'page-after-load.png') });

    await runZoomScenario('max');

    console.log('Reloading page to reset zoom state...');
    await page.reload({ waitUntil: 'networkidle' });

    await runZoomScenario('min');

    console.log('Waiting for diagnostics logs and drawing to settle...');
    await page.waitForTimeout(1200);

    const finalShot = path.join(outDir, 'lavagna-after-stroke.png');
    await page.screenshot({ path: finalShot, fullPage: false });
    fs.writeFileSync(path.join(outDir, 'console.log.txt'), consoleMessages.join('\n'), 'utf8');
    console.log('Saved final screenshot to', finalShot);
    console.log('Saved console logs to', path.join(outDir, 'console.log.txt'));

    console.log('Done. Please inspect the screenshot and console logs in scripts/output');
    // keep browser open for manual inspection
  } catch (err) {
    const errShot = path.join(outDir, `page-error-${Date.now()}.png`);
    try {
      await page.screenshot({ path: errShot, fullPage: true });
      console.error('Saved error screenshot to', errShot);
    } catch (_) {}
    console.error('Lavagna drift test failed:', err.message);
    throw err;
  } finally {
    await browser.close();
  }
})();
