const { chromium } = require('playwright');
const path = require('path');

const outDir = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\a97b2009-7964-4d26-a0a7-debda09dd9a0';

async function testCaptures() {
  const browser = await chromium.launch();

  // 1. Standard 1440x900
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
    const page = await ctx.newPage();
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, 'landing-v3-1440.png'), fullPage: false });
    console.log('Saved landing-v3-1440.png');

    // Scrolled view for Section Divider
    await page.evaluate(() => window.scrollTo(0, 950));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, 'landing-v3-dividers.png'), fullPage: false });
    console.log('Saved landing-v3-dividers.png');
    await ctx.close();
  }

  // 2. Ultra-wide 2560x1080 (matching user uploaded screenshot)
  {
    const ctx = await browser.newContext({ viewport: { width: 2560, height: 1080 }, deviceScaleFactor: 1.0 });
    const page = await ctx.newPage();
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, 'landing-v3-ultrawide.png'), fullPage: false });
    console.log('Saved landing-v3-ultrawide.png');
    await ctx.close();
  }

  await browser.close();
}

testCaptures();
