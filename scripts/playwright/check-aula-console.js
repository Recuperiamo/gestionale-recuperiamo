const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR', err));

  console.log('Navigating to /aula/8');
  await page.goto('http://localhost:3000/aula/8', { waitUntil: 'networkidle' }).catch(e => console.error('NAV ERROR', e));
  await page.waitForTimeout(2000);
  await browser.close();
})();