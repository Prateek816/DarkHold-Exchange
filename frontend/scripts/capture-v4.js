const { chromium } = require('playwright');
const path = require('path');

const outDir = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\a97b2009-7964-4d26-a0a7-debda09dd9a0';

async function testCapturesV4() {
  const browser = await chromium.launch();

  // 1. Ultra-wide 2560x1080
  {
    const ctx = await browser.newContext({ viewport: { width: 2560, height: 1080 }, deviceScaleFactor: 1.0 });
    const page = await ctx.newPage();
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outDir, 'landing-v4-ultrawide.png'), fullPage: false });
    console.log('Saved landing-v4-ultrawide.png');
    await ctx.close();
  }

  // 2. Standard 1440x900
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
    const page = await ctx.newPage();
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, 'landing-v4-1440.png'), fullPage: false });
    console.log('Saved landing-v4-1440.png');
    await ctx.close();
  }

  await browser.close();
}

testCapturesV4();
