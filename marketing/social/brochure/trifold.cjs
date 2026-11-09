// Renders the tri-fold: print PDF (A4 landscape + 3mm bleed), a guides PDF with fold lines, and PNGs of both sides.
// Usage: NODE_PATH=$(npm root -g) node trifold.cjs
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 3, viewport: { width: 1300, height: 900 } });
  const jobs = [['trifold.html', 'kart-connect-trifold-A4-print-3mm-bleed.pdf', null],
                ['trifold-guides.html', 'kart-connect-trifold-A4-fold-guides.pdf', ['trifold-outside.png', 'trifold-inside.png']]];
  for (const [html, pdf, pngs] of jobs) {
    await page.goto('file://' + path.resolve(__dirname, html));
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: path.resolve(__dirname, pdf), printBackground: true, preferCSSPageSize: true });
    if (pngs) {
      const sheets = await page.$$('section.sheet');
      for (let i = 0; i < sheets.length; i++) await sheets[i].screenshot({ path: path.resolve(__dirname, pngs[i]) });
    }
  }
  await browser.close();
  console.log('done');
})();
