const { chromium } = require('playwright');
(async()=>{
  const TARGET = process.env.TARGET_URL || 'https://recuperiamo.vercel.app/lavagna';
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  console.log('Opening', TARGET);
  await page.goto(TARGET, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'scripts/output/debug-page.png', fullPage: true });
  console.log('Saved scripts/output/debug-page.png');
  await browser.close();
})();