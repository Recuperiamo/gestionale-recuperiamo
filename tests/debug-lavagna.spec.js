const { test } = require('@playwright/test');

// Debug test for lavagna eraser freeze behavior
// Usage:
// 1) Ensure the dev server is running (npm run dev)
// 2) Run: npx playwright test tests/debug-lavagna.spec.js --headed

test('lavagna eraser debug trace', async ({ page }) => {
  // Print page console messages to Node output so we can see browser logs
  page.on('console', (msg) => {
    // Only display our debug logs (prefixed) or errors
    const text = msg.text();
    if (text && (text.startsWith('[LAVAGNA-DBG]') || msg.type() === 'error')) {
      // prefix with PLAYWRIGHT
      // eslint-disable-next-line no-console
      console.log('[PLAYWRIGHT PAGE]', text);
    }
  });

  // Open the lavagna page
  await page.goto('http://localhost:3000/lavagna-sandbox', { waitUntil: 'networkidle' });

  // Wait for canvas and toolbar to appear
  await page.waitForSelector('canvas');
  await page.waitForSelector('button[title="Gomma"]');

  // Inject debug listeners in page context
  await page.evaluate(() => {
    // small helper logger that prints to console so Playwright captures it
    function dbg(msg, data) {
      try {
        console.log('[LAVAGNA-DBG] ' + msg, data || '');
      } catch (_) {}
    }

    // find canvas and overlay (overlay has zIndex: 9999 in this component)
    const canvas = document.querySelector('canvas');
    const overlays = Array.from(document.querySelectorAll('div')).filter(d => d && d.style && d.style.zIndex === '9999');
    const overlay = overlays.length ? overlays[0] : null;

    if (!canvas) {
      dbg('no-canvas-found');
      return;
    }

    // attach pointer event listeners to observe what happens
    ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach((ev) => {
      canvas.addEventListener(ev, (e) => {
        dbg(ev + ' on canvas', { button: e.button, pointerType: e.pointerType, clientX: e.clientX, clientY: e.clientY });
      }, { passive: true });
    });

    // observe overlay visibility periodically
    if (overlay) {
      window.__lavagna_overlay_poll = setInterval(() => {
        dbg('overlay', { display: overlay.style.display, border: overlay.style.border, bg: overlay.style.background });
      }, 200);
    } else {
      dbg('overlay-not-found');
    }

    // also attach document-level pointer listeners to detect panning start (right-button)
    document.addEventListener('pointerdown', (e) => {
      dbg('doc.pointerdown', { button: e.button, pointerType: e.pointerType });
    }, { passive: true });
    document.addEventListener('pointermove', (e) => {
      dbg('doc.pointermove', { clientX: e.clientX, clientY: e.clientY });
    }, { passive: true });
    document.addEventListener('pointerup', (e) => {
      dbg('doc.pointerup', { button: e.button });
    }, { passive: true });

    // hook the gomma (eraser) button to log clicks
    const gommaBtn = Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('title') === 'Gomma');
    if (gommaBtn) {
      gommaBtn.addEventListener('click', () => dbg('gomma-button-clicked'));
    } else {
      dbg('gomma-button-not-found');
    }

    // expose a helper to stop polling from the page console if needed
    window.__stopLavagnaDbg = () => {
      try { if (window.__lavagna_overlay_poll) clearInterval(window.__lavagna_overlay_poll); } catch(_){}
      dbg('stopped-debug-poll');
    };

    dbg('injected-debug-listeners');
  });

  // Click the eraser button to activate gomma
  await page.click('button[title="Gomma"]');

  // Short pause to let UI react
  await page.waitForTimeout(300);

  // Perform a left-button drag on the canvas: this should erase, not pan
  const canvasEl = await page.$('canvas');
  const box = await canvasEl.boundingBox();
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down({ button: 'left' });
  // small drag
  await page.mouse.move(startX + 80, startY + 2, { steps: 8 });
  await page.waitForTimeout(250);
  await page.mouse.up({ button: 'left' });

  // Wait a bit to collect logs
  await page.waitForTimeout(800);

  // Now perform a right-button drag to show context panning behavior (for comparison)
  await page.mouse.move(startX, startY + 60);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(startX + 120, startY + 60, { steps: 10 });
  await page.waitForTimeout(300);
  await page.mouse.up({ button: 'right' });

  // Wait to flush logs
  await page.waitForTimeout(600);

  // stop the in-page polling to keep page tidy
  await page.evaluate(() => { try { window.__stopLavagnaDbg?.(); } catch(_){} });

});
