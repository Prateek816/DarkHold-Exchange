const { chromium } = require('playwright');
const path = require('path');

const outDir = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\a97b2009-7964-4d26-a0a7-debda09dd9a0';

async function capture() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });
  const page = await context.newPage();

  const routes = [
    { name: 'new-landing.png', url: 'http://localhost:3000/' },
    { name: 'new-login.png', url: 'http://localhost:3000/login' },
    { name: 'new-market.png', url: 'http://localhost:3000/market' },
    { name: 'new-terminal.png', url: 'http://localhost:3000/trade/dfest-wkd' },
    { name: 'new-auctions.png', url: 'http://localhost:3000/auctions' },
    { name: 'new-portfolio.png', url: 'http://localhost:3000/portfolio' },
    { name: 'new-demo.png', url: 'http://localhost:3000/admin/demo' },
  ];

  for (const r of routes) {
    try {
      console.log(`Navigating to ${r.url}...`);
      await page.goto(r.url, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(1000);
      const filePath = path.join(outDir, r.name);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`Saved ${r.name}`);
    } catch (err) {
      console.error(`Error on ${r.name}:`, err.message);
    }
  }

  await browser.close();
}

capture();
