// Renders the A5 leaflet: print PDF with 3mm bleed, trimmed preview PDF, and PNGs of each side.
// Usage: NODE_PATH=$(npm root -g) node leaflet.cjs
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 3, viewport: { width: 700, height: 900 } });
  for (const [html, pdf] of [['leaflet.html', 'kart-connect-leaflet-A5-print-3mm-bleed.pdf'], ['leaflet-preview.html', 'kart-connect-leaflet-A5-preview.pdf']]) {
    await page.goto('file://' + path.resolve(__dirname, html));
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: path.resolve(__dirname, pdf), printBackground: true, preferCSSPageSize: true });
    if (html === 'leaflet-preview.html') {
      const sides = await page.$$('section.pg');
      for (let i = 0; i < sides.length; i++) await sides[i].screenshot({ path: path.resolve(__dirname, `leaflet-${i ? 'back' : 'front'}.png`) });
    }
  }
  await browser.close();
  console.log('done');
})();
