const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const puppeteer = require('puppeteer');
    const outDir = path.join(__dirname, 'output');
    try { fs.mkdirSync(outDir, { recursive: true }); } catch (_) {}

  // We'll create PNG data URLs inside each page using an in-page canvas to
  // avoid SVG/data-URL handling differences between environments.

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

    // Simulate admin receiving a persisted server URL (full-res) by drawing a
    // PNG in-page and sending its data URL.
    await adminPage.evaluate(() => {
      const cvs = document.createElement('canvas'); cvs.width = 400; cvs.height = 300;
      const ctx = cvs.getContext('2d');
      ctx.fillStyle = 'cornflowerblue'; ctx.fillRect(0,0,400,300);
      ctx.fillStyle = 'white'; ctx.font = '32px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('ADMIN', 200, 150);
      const data = cvs.toDataURL('image/png');
      window.receiveShape({ id: 's1', kind: 'immagine', src: data });
    });

    // Simulate client receiving only a realtime preview (srcPreview) as a
    // separate PNG data URL drawn in-page.
    await clientPage.evaluate(() => {
      const cvs = document.createElement('canvas'); cvs.width = 400; cvs.height = 300;
      const ctx = cvs.getContext('2d');
      ctx.fillStyle = 'seagreen'; ctx.fillRect(0,0,400,300);
      ctx.fillStyle = 'white'; ctx.font = '32px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('CLIENT', 200, 150);
      const data = cvs.toDataURL('image/png');
      // In the real app the normalized shape would have src set to srcPreview.
      window.receiveShape({ id: 's1', kind: 'immagine', src: data });
    });

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
