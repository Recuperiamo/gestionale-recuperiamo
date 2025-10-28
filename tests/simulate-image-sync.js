const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const puppeteer = require('puppeteer');
    const outDir = path.join(__dirname, 'output');
    try { fs.mkdirSync(outDir, { recursive: true }); } catch (_) {}

    const adminSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='cornflowerblue'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='32' fill='white'>ADMIN</text></svg>`;
    const clientSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='seagreen'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='32' fill='white'>CLIENT</text></svg>`;
    const adminData = 'data:image/svg+xml;utf8,' + encodeURIComponent(adminSvg);
    const clientData = 'data:image/svg+xml;utf8,' + encodeURIComponent(clientSvg);

    const browser = await puppeteer.launch({ headless: true });
    const adminPage = await browser.newPage();
    const clientPage = await browser.newPage();

    const html = (id) => `<!doctype html><html><head><meta charset="utf-8"><title>Sim</title></head><body>
      <canvas id="${id}" width="400" height="300" style="border:1px solid #666"></canvas>
      <script>
        window._loaded = false;
        window.receiveShape = function(shape) {
          try {
            if (!shape || shape.kind !== 'immagine') return;
            const img = new Image();
            img.onload = function() {
              const c = document.getElementById('${id}');
              const ctx = c.getContext('2d');
              ctx.clearRect(0,0,c.width,c.height);
              ctx.drawImage(img, 0, 0, c.width, c.height);
              window._loaded = true;
            };
            img.onerror = function() { window._loaded = false; };
            img.src = shape.src;
          } catch (e) { window._loaded = false; }
        };
      </script>
    </body></html>`;

    await adminPage.setContent(html('cv-admin'));
    await clientPage.setContent(html('cv-client'));

    // Simulate admin receiving a persisted server URL (full-res)
    await adminPage.evaluate((src) => {
      window.receiveShape({ id: 's1', kind: 'immagine', src });
    }, adminData);

    // Simulate client receiving only a realtime preview (srcPreview)
    await clientPage.evaluate((src) => {
      // In the real app the normalized shape would have src set to srcPreview.
      window.receiveShape({ id: 's1', kind: 'immagine', src });
    }, clientData);

    // Wait until both pages report loaded or timeout
    async function waitLoaded(page, timeout = 3000) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const ok = await page.evaluate(() => window._loaded === true);
        if (ok) return true;
        await new Promise((r) => setTimeout(r, 100));
      }
      return false;
    }

    const aOk = await waitLoaded(adminPage);
    const cOk = await waitLoaded(clientPage);

    const adminShot = path.join(outDir, 'admin.png');
    const clientShot = path.join(outDir, 'client.png');
    await adminPage.screenshot({ path: adminShot });
    await clientPage.screenshot({ path: clientShot });

    // Read center pixel RGBA from canvas via evaluate
    const adminPixel = await adminPage.evaluate(() => {
      const c = document.getElementById('cv-admin');
      const ctx = c.getContext('2d');
      try {
        const d = ctx.getImageData(c.width/2|0, c.height/2|0, 1, 1).data;
        return Array.from(d);
      } catch (e) { return null; }
    });
    const clientPixel = await clientPage.evaluate(() => {
      const c = document.getElementById('cv-client');
      const ctx = c.getContext('2d');
      try {
        const d = ctx.getImageData(c.width/2|0, c.height/2|0, 1, 1).data;
        return Array.from(d);
      } catch (e) { return null; }
    });

    console.log('admin loaded:', aOk, 'client loaded:', cOk);
    console.log('admin center rgba:', adminPixel);
    console.log('client center rgba:', clientPixel);
    console.log('Screenshots saved to', adminShot, clientShot);

    await browser.close();
  } catch (err) {
    console.error('Error running simulation script:', err);
    process.exitCode = 2;
  }
})();
