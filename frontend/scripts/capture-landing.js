const { chromium } = require('playwright');
const path = require('path');

const outDir = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\a97b2009-7964-4d26-a0a7-debda09dd9a0';

async function captureLanding() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000/...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1. Hero Viewport
  await page.screenshot({ path: path.join(outDir, 'landing-hero-interactive.png'), fullPage: false });
  console.log('Saved landing-hero-interactive.png');

  // 2. Features & Live Sandbox
  await page.evaluate(() => window.scrollTo(0, 1400));
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, 'landing-features-interactive.png'), fullPage: false });
  console.log('Saved landing-features-interactive.png');

  // 3. Full Page
  await page.screenshot({ path: path.join(outDir, 'landing-full-v2.png'), fullPage: true });
  console.log('Saved landing-full-v2.png');

  await browser.close();
}

captureLanding();
