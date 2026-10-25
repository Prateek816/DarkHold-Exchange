import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const ARTIFACT_DIR = 'C:/Users/ADMIN/.gemini/antigravity/brain/a97b2009-7964-4d26-a0a7-debda09dd9a0';
const htmlPath = path.resolve('zapline-hero.html');
const fileUrl = `file://${htmlPath.replace(/\\/g, '/')}`;

async function main() {
  const browser = await chromium.launch();
  
  // 1. Desktop Acceptance Check: 1440x960
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();
  console.log('Navigating to:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000); // Wait for entrance animations and video/canvas

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'zapline-1440x960.png'), fullPage: true });
  console.log('Desktop 1440x960 screenshot saved to:', path.join(ARTIFACT_DIR, 'zapline-1440x960.png'));

  // 2. Mobile Viewport Check: 390x844
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(fileUrl, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);

  await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'zapline-mobile.png'), fullPage: true });
  console.log('Mobile screenshot saved to:', path.join(ARTIFACT_DIR, 'zapline-mobile.png'));

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
