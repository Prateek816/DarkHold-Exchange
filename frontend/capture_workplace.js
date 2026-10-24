const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/ADMIN/.gemini/antigravity/brain/a97b2009-7964-4d26-a0a7-debda09dd9a0';

async function capture() {
  const browser = await chromium.launch();

  const pagesToCapture = [
    { name: 'workplace-market-1440', url: 'http://localhost:3000/market', width: 1440, height: 900 },
    { name: 'workplace-market-mobile', url: 'http://localhost:3000/market', width: 390, height: 844 },
    { name: 'workplace-terminal-1440', url: 'http://localhost:3000/trade/dfest-wkd', width: 1440, height: 900 },
    { name: 'workplace-portfolio-1440', url: 'http://localhost:3000/portfolio', width: 1440, height: 900 },
    { name: 'workplace-auctions-1440', url: 'http://localhost:3000/auctions', width: 1440, height: 900 },
    { name: 'workplace-demo-console-1440', url: 'http://localhost:3000/admin/demo', width: 1440, height: 900 },
    { name: 'workplace-profile-1440', url: 'http://localhost:3000/profile', width: 1440, height: 900 },
    { name: 'workplace-login-1440', url: 'http://localhost:3000/login', width: 1440, height: 900 },
  ];

  for (const item of pagesToCapture) {
    const page = await browser.newPage({
      viewport: { width: item.width, height: item.height }
    });
    try {
      await page.goto(item.url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(800);
      const outPath = path.join(ARTIFACT_DIR, `${item.name}.png`);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`Saved: ${item.name}.png`);
    } catch (err) {
      console.error(`Error capturing ${item.name}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

capture();
