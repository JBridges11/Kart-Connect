"""Kart Connect A5 double-sided leaflet, built from the brochure pages.
Writes leaflet.html (print: 154x216mm = A5 + 3mm bleed each side) and leaflet-preview.html (trimmed A5).
leaflet.cjs turns them into PDFs and PNG previews."""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'build.py')).read()
exec(src[:src.index('CSS = r')])  # MARK, QR, svg1 (speed trace), svg2 (track map)
SH = '../assets/shots/'

BLEED = 3  # mm

CSS = r'''
@font-face{font-family:'Anton';font-weight:400;src:url('../concepts/pit-board/fonts/Anton-400n.woff2') format('woff2');}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #888; }
body { font-family: 'Inter', Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #1A1033; }
.pg { width: var(--w); height: var(--h); position: relative; overflow: hidden; break-after: page; }
.pg:last-child { break-after: auto; }
.dark { color: #fff; background: radial-gradient(120% 70% at 100% 0%, #3A2468 0%, #1C1236 45%, #0E0919 100%); }
.light { background: radial-gradient(120% 70% at 100% 0%, #FFFFFF 0%, #F3EFFA 60%, #E9E2F6 100%); }
.lines { position: absolute; inset: 0; background: repeating-linear-gradient(-57deg, transparent 0 24mm, rgba(255,255,255,.03) 24mm 24.5mm); }
.light .lines { background: repeating-linear-gradient(-57deg, transparent 0 24mm, rgba(123,94,167,.05) 24mm 24.5mm); }
.wm { position: absolute; width: 110mm; right: calc(var(--b) - 16mm); bottom: calc(var(--b) + 12mm); opacity: .06; color: #fff; }
.light .wm { color: #7B5EA7; opacity: .07; }
.chk { position: absolute; left: 0; right: 0; bottom: 0; height: calc(var(--b) + 3.5mm);
  background: repeating-conic-gradient(currentColor 0 25%, transparent 0 50%) 0 100% / 3.5mm 3.5mm; }
.dark .chk { color: #fff; } .light .chk { color: #1A1033; }
/* safe area: 7mm inside the trim */
.in { position: absolute; top: calc(var(--b) + 8mm); left: calc(var(--b) + 8mm); right: calc(var(--b) + 8mm); bottom: calc(var(--b) + 10mm); display: flex; flex-direction: column; }
.top { display: flex; justify-content: space-between; align-items: center; }
.top img { height: 8.5mm; }
.top span { font-size: 6pt; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; opacity: .7; }
.kick { display: inline-flex; align-items: center; gap: 2mm; font-size: 6.5pt; font-weight: 800; letter-spacing: .28em; text-transform: uppercase; color: #F5C842; }
.light .kick { color: #7B5EA7; }
.kick::before { content: ""; width: 4.5mm; height: 1.8mm; border-radius: 99px; background: currentColor; transform: rotate(-57deg); }
.d { font-family: 'Anton', sans-serif; text-transform: uppercase; line-height: .96; letter-spacing: .01em; }
.o { color: transparent; background: linear-gradient(95deg, #F5C842 0%, #5CC85A 50%, #A07FE0 100%); -webkit-background-clip: text; background-clip: text; }
.light .o { background: linear-gradient(95deg, #D9A514 0%, #3FAF3D 50%, #7B5EA7 100%); -webkit-background-clip: text; background-clip: text; }
.hl { color: #F5C842; }
p.lead { font-size: 8pt; line-height: 1.5; font-weight: 500; opacity: .9; }
.shot { border: 1.1mm solid #0B0B10; border-radius: 2.2mm; background: #0B0B10; overflow: hidden; box-shadow: 0 3mm 7mm rgba(0,0,0,.35); }
.shot img { display: block; width: 100%; border-radius: .8mm; }
.hero { position: relative; height: 66mm; margin-top: 4mm; }
.hero .s1 { position: absolute; left: 0; top: 4mm; width: 88mm; transform: rotate(-4deg); }
.hero .s2 { position: absolute; right: 0; top: 0; width: 40mm; transform: rotate(5deg); }
.hero .s3 { position: absolute; left: 14mm; bottom: 0; width: 64mm; transform: rotate(2deg); }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
.stats .n { font-family: 'Anton'; font-size: 22pt; line-height: 1; }
.stats span { display: block; font-size: 5.5pt; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; opacity: .75; margin-top: .8mm; }
.launch { display: flex; align-items: center; justify-content: space-between; gap: 3mm; border-radius: 3mm; padding: 4mm 5mm; background: linear-gradient(95deg, #F5C842, #5CC85A); color: #1A1033; }
.launch b { font-family: 'Anton'; font-weight: 400; font-size: 14pt; text-transform: uppercase; line-height: 1.02; }
.launch span { font-family: 'Anton'; font-size: 11pt; letter-spacing: .02em; }
/* back */
.sec { font-family: 'Anton'; font-size: 13pt; text-transform: uppercase; line-height: 1; }
.g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5mm; }
.g3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.5mm; }
.t { border-radius: 2.5mm; padding: 3mm; background: #fff; box-shadow: 0 1mm 4mm rgba(26,16,51,.08); }
.t b { display: block; font-family: 'Anton'; font-weight: 400; font-size: 9.5pt; text-transform: uppercase; line-height: 1.05; margin-bottom: 1mm; }
.t p { font-size: 6.4pt; line-height: 1.42; font-weight: 500; opacity: .85; }
.t .tag { display: inline-block; font-size: 5pt; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; padding: .7mm 1.6mm; border-radius: 99px;
          background: #EFE9F8; color: #7B5EA7; margin-bottom: 1.4mm; }
.band { border-radius: 3mm; padding: 3.5mm; color: #fff; background: radial-gradient(120% 90% at 100% 0%, #3A2468 0%, #1C1236 50%, #0E0919 100%); }
.band .t { background: rgba(255,255,255,.07); box-shadow: none; border: 1px solid rgba(255,255,255,.14); color: #fff; }
.band .t .tag { background: rgba(245,200,66,.16); color: #F5C842; }
.band .t .tag.soon { background: rgba(255,138,61,.18); color: #FF8A3D; }
.brands { display: flex; gap: 1.5mm; flex-wrap: wrap; }
.brands span { font-size: 5.8pt; font-weight: 700; padding: .9mm 2mm; border-radius: 1.4mm; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.16); }
.role { border-left: .9mm solid #F5C842; padding-left: 2.2mm; }
.role:nth-child(2) { border-color: #5CC85A; } .role:nth-child(3) { border-color: #A07FE0; }
.role b { display: block; font-family: 'Anton'; font-weight: 400; font-size: 9.5pt; text-transform: uppercase; }
.role span { display: block; font-size: 6.2pt; line-height: 1.4; font-weight: 500; opacity: .85; }
.cta { border-radius: 3mm; padding: 4mm 5mm; background: #1A1033; color: #fff; display: flex; align-items: center; justify-content: space-between; gap: 3mm; }
.cta b { font-family: 'Anton'; font-weight: 400; font-size: 13pt; text-transform: uppercase; line-height: 1.02; display: block; }
.cta .url { font-family: 'Anton'; font-size: 12pt; color: #F5C842; letter-spacing: .02em; }
.qrw { background: #fff; padding: 1.2mm; border-radius: 1.5mm; line-height: 0; }
.qrw svg { width: 15mm; height: 15mm; }
'''

def side(theme, inner):
    logo = '../assets/logo-white.png' if theme == 'dark' else '../assets/logo.png'
    return (f'<section class="pg {theme}"><div class="lines"></div>{MARK}<div class="in">'
            f'<div class="top"><img src="{logo}" alt="Kart Connect"><span>kart-connect.com</span></div>{inner}</div>'
            f'<div class="chk"></div></section>')

front = side('dark',
  '<div style="margin-top:9mm;"><span class="kick">Setup management for karting</span></div>'
  '<div class="d" style="font-size:38pt;margin-top:3mm;">Every setup.</div>'
  '<div class="d" style="font-size:38pt;">Every session.</div>'
  '<div class="d o" style="font-size:38pt;">Every lap.</div>'
  '<p class="lead" style="margin-top:4mm;">Every setup change, every session, every lap time and the conditions it was set in, '
  'in one app built for drivers, mechanics and team managers.</p>'
  '<div class="hero">'
  f'<div class="shot s1"><img src="{SH}app-setup.png" alt=""></div>'
  f'<div class="shot s2"><img src="{SH}report.png" alt=""></div>'
  f'<div class="shot s3"><img src="{SH}live-weather.png" alt=""></div></div>'
  '<div class="stats" style="margin-top:auto;margin-bottom:4mm;">'
  '<div><div class="n hl">8</div><span>Languages</span></div>'
  '<div><div class="n" style="color:#5CC85A">4</div><span>Logger brands, one screen</span></div>'
  '<div><div class="n" style="color:#A07FE0">1</div><span>App for the whole team</span></div></div>'
  '<div class="launch"><b>Live on the web<br>1 December 2026</b><span>kart-connect.com</span></div>')

back = side('light',
  '<div class="sec" style="margin-top:5mm;">Log it once. <span class="o">Learn from it forever.</span></div>'
  '<div class="g3" style="margin-top:3mm;">'
  '<div class="t"><span class="tag">Setup</span><b>Every part of the kart</b><p>Rear, engine, front end, tyres and chassis in a few taps.</p></div>'
  '<div class="t"><span class="tag">Weather</span><b>Live weather &amp; radar</b><p>Conditions saved with every session, plus live rain radar.</p></div>'
  '<div class="t"><span class="tag">Profile</span><b>Set it up once</b><p>Engines, carbs and exhausts ranked 1 to 5. Sessions fill themselves in.</p></div>'
  '<div class="t"><span class="tag">Tyres</span><b>Cold. Hot. Sorted.</b><p>Hot pressures in, next cold pressures and stagger out.</p></div>'
  '<div class="t"><span class="tag">Race weekends</span><b>Practice to final</b><p>Every session of the weekend kept together, in order.</p></div>'
  '<div class="t"><span class="tag">Reports</span><b>Voice notes &amp; PDFs</b><p>Speak your feedback. Share a clean PDF of every session.</p></div></div>'
  '<div class="band" style="margin-top:3.5mm;">'
  '<div style="display:flex;justify-content:space-between;align-items:center;"><div class="sec">Every logger. <span class="o">One screen.</span></div>'
  '<div class="brands"><span>AiM</span><span>Unipro</span><span>Alfano</span><span>Starlane</span></div></div>'
  '<div class="g2" style="margin-top:2.5mm;">'
  f'<div class="t" style="padding:2.5mm;"><span class="tag">Speed trace</span><b>See where you gain</b>{svg1}</div>'
  f'<div class="t" style="padding:2.5mm;"><span class="tag">GPS track map</span><b>Every line, colour-coded</b>'
  f'<div style="background:#fff;border-radius:1.5mm;margin-top:1mm;padding:.5mm 6mm;">{svg2}</div></div></div>'
  '<p style="font-size:6.2pt;line-height:1.4;margin-top:2mm;opacity:.85;">Sector analysis, every lap ranked and your theoretical best. '
  '<span style="color:#FF8A3D;font-weight:800;">Coming soon:</span> GoPro and DJI video side by side with a live delta.</p></div>'
  '<div class="sec" style="margin-top:4mm;">One app. <span class="o">Whole team.</span></div>'
  '<div class="g3" style="margin-top:2.5mm;">'
  '<div class="role"><b>Driver</b><span>Gives the feedback on what the kart needs.</span></div>'
  '<div class="role"><b>Mechanic</b><span>Scans the Live Setup QR code and logs each session.</span></div>'
  '<div class="role"><b>Team manager</b><span>Sees every setup and finds the quickest.</span></div></div>'
  '<div class="cta" style="margin-top:auto;padding-top:4mm;"><div><b>Live on the web</b><b class="o">1 December 2026</b></div>'
  '<div class="url">kart-connect.com</div></div>')

def doc(bleed):
    w, h = 148 + 2 * bleed, 210 + 2 * bleed
    return ('<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Kart Connect leaflet</title>'
            f'<style>@page {{ size: {w}mm {h}mm; margin: 0; }} :root {{ --w: {w}mm; --h: {h}mm; --b: {bleed}mm; }}{CSS}</style></head><body>'
            + front + back + '</body></html>')

open(os.path.join(HERE, 'leaflet.html'), 'w').write(doc(BLEED))
open(os.path.join(HERE, 'leaflet-preview.html'), 'w').write(doc(0))
print('ok')
