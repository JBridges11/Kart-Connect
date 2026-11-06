// Renders brochure.html to kart-connect-brochure.pdf (A4) and page-N.png previews.
// Usage: NODE_PATH=$(npm root -g) node pdf.cjs
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 900, height: 1200 } });
  await page.goto('file://' + path.resolve(__dirname, 'brochure.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.resolve(__dirname, 'kart-connect-brochure.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  const pages = await page.$$('section.pg');
  for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: path.resolve(__dirname, `page-${i + 1}.png`) });
  await browser.close();
  console.log(`${pages.length} pages`);
})();
