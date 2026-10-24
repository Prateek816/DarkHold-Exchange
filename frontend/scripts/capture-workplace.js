const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  
  // 1. Capture Market Dashboard with hovering over balance chart
  const p1 = await context.newPage();
  await p1.goto('http://localhost:3000/market', { waitUntil: 'networkidle' });
  await p1.waitForTimeout(1500);
  
  // Hover over the balance chart to show the interactive vertical guide & tooltip
  const chartArea = await p1.$('.cursor-crosshair');
  if (chartArea) {
    const box = await chartArea.boundingBox();
    if (box) {
      await p1.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.45);
      await p1.waitForTimeout(600);
    }
  }
  await p1.screenshot({
    path: 'C:/Users/ADMIN/.gemini/antigravity/brain/a97b2009-7964-4d26-a0a7-debda09dd9a0/workplace-market-interactive.png',
    fullPage: false
  });
  console.log('Saved workplace-market-interactive.png');

  // 2. Capture Trading Terminal with crosshair on PriceChart
  const p2 = await context.newPage();
  await p2.goto('http://localhost:3000/trade/dfest-wkd', { waitUntil: 'networkidle' });
  await p2.waitForTimeout(1500);

  const canvas = await p2.$('canvas');
  if (canvas) {
    const cbox = await canvas.boundingBox();
    if (cbox) {
      await p2.mouse.move(cbox.x + cbox.width * 0.58, cbox.y + cbox.height * 0.42);
      await p2.waitForTimeout(600);
    }
  }
  await p2.screenshot({
    path: 'C:/Users/ADMIN/.gemini/antigravity/brain/a97b2009-7964-4d26-a0a7-debda09dd9a0/workplace-terminal-interactive.png',
    fullPage: false
  });
  console.log('Saved workplace-terminal-interactive.png');

  await browser.close();
})();
