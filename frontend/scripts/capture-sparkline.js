const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  
  const p = await context.newPage();
  await p.goto('http://localhost:3000/market', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);

  // Hover over the first featured asset's sparkline
  const sparkline = await p.$('.surface .relative.w-28');
  if (sparkline) {
    const box = await sparkline.boundingBox();
    if (box) {
      await p.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
      await p.waitForTimeout(500);
    }
  }

  await p.screenshot({
    path: 'C:/Users/ADMIN/.gemini/antigravity/brain/a97b2009-7964-4d26-a0a7-debda09dd9a0/workplace-sparkline-hover.png',
    fullPage: false
  });
  console.log('Saved workplace-sparkline-hover.png');

  await browser.close();
})();
