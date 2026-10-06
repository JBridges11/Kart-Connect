// Renders every <section class="s"> in an HTML file to slide-NN.png at 1080x1350.
// Usage: NODE_PATH=$(npm root -g) node render.cjs <slides.html> <outDir>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const [html, outDir] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 3, viewport: { width: 1200, height: 1400 } });
  await page.goto('file://' + path.resolve(html));
  await page.evaluate(() => document.fonts.ready);
  const slides = await page.$$('section.s');
  for (let i = 0; i < slides.length; i++) {
    await slides[i].screenshot({ path: path.join(outDir, `slide-${String(i + 1).padStart(2, '0')}.png`) });
  }
  await browser.close();
  console.log(`${slides.length} slides -> ${outDir}`);
})();
