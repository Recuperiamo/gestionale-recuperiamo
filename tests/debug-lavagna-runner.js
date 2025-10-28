const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text && (text.startsWith('[LAVAGNA-DBG]') || text.startsWith('[LAVAGNA-DBG-SHAPE]') || msg.type() === 'error')) {
      console.log('[BROWSER]', text);
    }
  });

  try {
    console.log('Opening http://localhost:3000/lavagna-sandbox');
    await page.goto('http://localhost:3000/lavagna-sandbox', { waitUntil: 'networkidle' });

    await page.waitForSelector('canvas', { timeout: 5000 });
    await page.waitForSelector('button[title="Gomma"]', { timeout: 5000 });

    await page.evaluate(() => {
      function dbg(msg, data) {
        try { console.log('[LAVAGNA-DBG] ' + msg, data || ''); } catch(_){}
      }
      const canvas = document.querySelector('canvas');
      const overlays = Array.from(document.querySelectorAll('div')).filter(d => d && d.style && d.style.zIndex === '9999');
      const overlay = overlays.length ? overlays[0] : null;
      ['pointerdown','pointermove','pointerup','pointercancel'].forEach(ev => {
        canvas?.addEventListener(ev, e => dbg(ev + ' on canvas ' + e.button + ' ' + e.pointerType + ' ' + e.clientX + ',' + e.clientY));
      });
      if (overlay) {
        window.__lavagna_overlay_poll = setInterval(() => {
          dbg('overlay', { display: overlay.style.display, border: overlay.style.border, bg: overlay.style.background });
        }, 200);
      } else dbg('overlay-not-found');
      document.addEventListener('pointerdown', e => dbg('doc.pointerdown ' + e.button + ' ' + e.pointerType));
      document.addEventListener('pointermove', e => dbg('doc.pointermove ' + e.clientX + ',' + e.clientY));
      document.addEventListener('pointerup', e => dbg('doc.pointerup ' + e.button));
      const gommaBtn = Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('title') === 'Gomma');
      if (gommaBtn) gommaBtn.addEventListener('click', () => dbg('gomma-button-clicked'));
      window.__stopLavagnaDbg = () => { try { if (window.__lavagna_overlay_poll) clearInterval(window.__lavagna_overlay_poll); } catch(_){} dbg('stopped-debug-poll'); };
      dbg('injected-debug-listeners');
    });

    // Activate eraser
    await page.click('button[title="Gomma"]');
    await page.waitForTimeout(300);

  // screenshot before erase
  try { await page.screenshot({ path: 'tests/output/before-erase.png', fullPage: false }); } catch(_){}

    const canvasEl = await page.$('canvas');
    const box = await canvasEl.boundingBox();
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down({ button: 'left' });
    await page.mouse.move(startX + 80, startY + 2, { steps: 8 });
    await page.waitForTimeout(300);
    await page.mouse.up({ button: 'left' });

  await page.waitForTimeout(800);
  // screenshot after erase
  try { await page.screenshot({ path: 'tests/output/after-erase.png', fullPage: false }); } catch(_){}

    // Right drag
    await page.mouse.move(startX, startY + 60);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(startX + 120, startY + 60, { steps: 10 });
    await page.waitForTimeout(300);
    await page.mouse.up({ button: 'right' });

  await page.waitForTimeout(600);
  try { await page.screenshot({ path: 'tests/output/after-right-drag.png', fullPage: false }); } catch(_){}

    // Try creating an Assi (2) shape to verify final rendering (arrowheads)
    try {
      // Open the Shapes popover first so the Assi (2) button is present in the DOM
      const shapesToggle = await page.$('button[title="Forme"]');
      if (shapesToggle) {
        await shapesToggle.click();
        await page.waitForTimeout(220);
      }
      const assiBtn = await page.$('button[title="Assi (2)"]');
      if (assiBtn) {
        await assiBtn.click();
        await page.waitForTimeout(200);

        // draw a diagonal axis across the center
        const canvasEl2 = await page.$('canvas');
        const box2 = await canvasEl2.boundingBox();
        const sx = box2.x + box2.width * 0.3;
        const sy = box2.y + box2.height * 0.3;
        const ex = box2.x + box2.width * 0.7;
        const ey = box2.y + box2.height * 0.7;

        await page.mouse.move(sx, sy);
        await page.mouse.down({ button: 'left' });
        await page.mouse.move(ex, ey, { steps: 12 });
        await page.waitForTimeout(200);
        await page.mouse.up({ button: 'left' });

        await page.waitForTimeout(400);
        try { await page.screenshot({ path: 'tests/output/after-create-assi2.png', fullPage: false }); } catch(_){ }
      } else {
        console.log('Assi (2) button not found');
      }
    } catch (e) {
      console.log('Error while creating Assi (2)', e);
    }

    // Switch to selection tool and attempt to select and drag the recently
    // created shape (center) to validate dragging behavior.
    try {
      const selBtn = await page.$('button[title="Selezione / Lazo"]');
      if (selBtn) {
        await selBtn.click();
        await page.waitForTimeout(200);
        // click+drag from center of canvas
        const cbox = await canvasEl.boundingBox();
        const cx = cbox.x + cbox.width / 2;
        const cy = cbox.y + cbox.height / 2;
        await page.mouse.move(cx, cy);
        await page.mouse.down({ button: 'left' });
        await page.mouse.move(cx + 80, cy + 40, { steps: 12 });
        await page.waitForTimeout(200);
        await page.mouse.up({ button: 'left' });
        await page.waitForTimeout(300);
        try { await page.screenshot({ path: 'tests/output/after-select-drag.png' }); } catch(_){}
      } else {
        console.log('Selection button not found');
      }
    } catch (err) {
      console.log('Selection/drag test error', err);
    }

    await page.evaluate(() => { try { window.__stopLavagnaDbg?.(); } catch(_){} });

    console.log('Done. Closing in 1s');
    await page.waitForTimeout(1000);
  } catch (err) {
    console.error('Error running debug script', err);
  } finally {
    try { await browser.close(); } catch(_){}
  }
})();
