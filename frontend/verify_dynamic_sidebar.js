const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/ADMIN/.gemini/antigravity/brain/a97b2009-7964-4d26-a0a7-debda09dd9a0';

async function testDynamic() {
  const browser = await chromium.launch();

  // 1. Desktop Expanded View
  const page1 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page1.goto('http://localhost:3000/market', { waitUntil: 'networkidle' });
  await page1.waitForTimeout(600);
  await page1.screenshot({ path: path.join(ARTIFACT_DIR, 'workplace-market-expanded.png') });
  console.log('Saved: workplace-market-expanded.png');

  // Click the collapse button in topbar or bottom of sidebar
  const toggleBtn = page1.locator('button[title*="Toggle sidebar"]');
  if (await toggleBtn.count() > 0) {
    await toggleBtn.click();
    await page1.waitForTimeout(400);
    await page1.screenshot({ path: path.join(ARTIFACT_DIR, 'workplace-market-collapsed.png') });
    console.log('Saved: workplace-market-collapsed.png');
  }
  await page1.close();

  // 2. Desktop Portfolio View
  const page2 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page2.goto('http://localhost:3000/portfolio', { waitUntil: 'networkidle' });
  await page2.waitForTimeout(600);
  await page2.screenshot({ path: path.join(ARTIFACT_DIR, 'workplace-portfolio-dynamic.png') });
  console.log('Saved: workplace-portfolio-dynamic.png');
  await page2.close();

  // 3. Desktop Terminal View
  const page3 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page3.goto('http://localhost:3000/trade/dfest-wkd', { waitUntil: 'networkidle' });
  await page3.waitForTimeout(600);
  await page3.screenshot({ path: path.join(ARTIFACT_DIR, 'workplace-terminal-dynamic.png') });
  console.log('Saved: workplace-terminal-dynamic.png');
  await page3.close();

  // 4. Mobile View (390px)
  const page4 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page4.goto('http://localhost:3000/market', { waitUntil: 'networkidle' });
  await page4.waitForTimeout(600);
  await page4.screenshot({ path: path.join(ARTIFACT_DIR, 'workplace-mobile-dynamic.png') });
  console.log('Saved: workplace-mobile-dynamic.png');
  await page4.close();

  await browser.close();
}

testDynamic();
