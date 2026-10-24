import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/ADMIN/.gemini/antigravity/brain/a97b2009-7964-4d26-a0a7-debda09dd9a0';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log('1. Capturing Landing Page...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'landing.png'), fullPage: true });

  console.log('2. Capturing Marketplace...');
  await page.goto('http://localhost:3000/market', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'market.png'), fullPage: true });

  console.log('3. Capturing Trading Terminal...');
  await page.goto('http://localhost:3000/trade/dfest-wkd', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'terminal.png'), fullPage: true });

  console.log('4. Testing Order Desk & Capturing The Stub...');
  // Click Confirm & Escrow Buy button
  const buyBtn = page.locator('button:has-text("CONFIRM & ESCROW BUY")');
  if (await buyBtn.isVisible()) {
    await buyBtn.click();
    await page.waitForTimeout(1500); // Allow stub to animate
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'terminal-stub.png') });
  }

  console.log('5. Capturing Dutch Auctions...');
  await page.goto('http://localhost:3000/auctions', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'auctions.png'), fullPage: true });

  console.log('6. Capturing Portfolio...');
  await page.goto('http://localhost:3000/portfolio', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'portfolio.png'), fullPage: true });

  console.log('7. Capturing Operator Demo Console...');
  await page.goto('http://localhost:3000/admin/demo', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'demo.png'), fullPage: true });

  await browser.close();
  console.log('All verification screenshots captured successfully!');
}

main().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
