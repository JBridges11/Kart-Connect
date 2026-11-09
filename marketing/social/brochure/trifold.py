"""Kart Connect tri-fold leaflet: A4 landscape, printed both sides, roll-folded into three.
Outside: [fold-in flap 97mm][back cover 100mm][front cover 100mm]. Inside: [100mm][100mm][97mm].
Writes trifold.html (297x210 + 3mm bleed) and trifold-guides.html (trimmed, with fold lines for checking)."""
import io, os
import segno
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'build.py')).read()
exec(src[:src.index('CSS = r')])  # MARK, svg1 (speed trace), svg2 (track map)
SH = '../assets/shots/'

buf = io.BytesIO()
segno.make('https://kart-connect.com', error='m').save(buf, kind='svg', dark='#1A1033', light=None, scale=4, border=0, xmldecl=False, svgns=True)
QR = buf.getvalue().decode()
import re as _re
_m = _re.search(r'width="(\d+)" height="(\d+)"', QR)
QR = QR.replace(_m.group(0), f'{_m.group(0)} viewBox="0 0 {_m.group(1)} {_m.group(2)}"', 1)

CSS = r'''
@font-face{font-family:'Anton';font-weight:400;src:url('../concepts/pit-board/fonts/Anton-400n.woff2') format('woff2');}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #888; }
body { font-family: 'Inter', Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #1A1033; }
.sheet { width: var(--w); height: var(--h); position: relative; overflow: hidden; break-after: page; background: #fff; }
.sheet:last-child { break-after: auto; }
.p { position: absolute; top: 0; bottom: 0; overflow: hidden; }
.dark { color: #fff; background: radial-gradient(140% 70% at 100% 0%, #3A2468 0%, #1C1236 45%, #0E0919 100%); }
.light { background: radial-gradient(140% 70% at 100% 0%, #FFFFFF 0%, #F3EFFA 60%, #E9E2F6 100%); }
.lines { position: absolute; inset: 0; background: repeating-linear-gradient(-57deg, transparent 0 22mm, rgba(255,255,255,.03) 22mm 22.5mm); }
.light .lines { background: repeating-linear-gradient(-57deg, transparent 0 22mm, rgba(123,94,167,.05) 22mm 22.5mm); }
.wm { position: absolute; width: 90mm; right: -18mm; bottom: 14mm; opacity: .06; color: #fff; }
.light .wm { color: #7B5EA7; opacity: .07; }
.chk { position: absolute; left: 0; right: 0; bottom: 0; height: calc(var(--b) + 3.5mm);
  background: repeating-conic-gradient(currentColor 0 25%, transparent 0 50%) 0 100% / 3.5mm 3.5mm; }
.dark .chk { color: #fff; } .light .chk { color: #1A1033; }
.in { position: absolute; top: calc(var(--b) + 7mm); bottom: calc(var(--b) + 9mm); display: flex; flex-direction: column; }
.logo { height: 7.5mm; align-self: flex-start; }
.kick { display: inline-flex; align-items: center; gap: 2mm; font-size: 6pt; font-weight: 800; letter-spacing: .26em; text-transform: uppercase; color: #F5C842; }
.light .kick { color: #7B5EA7; }
.kick::before { content: ""; width: 4mm; height: 1.6mm; border-radius: 99px; background: currentColor; transform: rotate(-57deg); }
.d { font-family: 'Anton', sans-serif; text-transform: uppercase; line-height: .96; letter-spacing: .01em; }
.o { color: transparent; background: linear-gradient(95deg, #F5C842 0%, #5CC85A 50%, #A07FE0 100%); -webkit-background-clip: text; background-clip: text; }
.light .o { background: linear-gradient(95deg, #D9A514 0%, #3FAF3D 50%, #7B5EA7 100%); -webkit-background-clip: text; background-clip: text; }
.hl { color: #F5C842; }
p.lead { font-size: 7.4pt; line-height: 1.5; font-weight: 500; opacity: .9; }
.shot { border: 1mm solid #0B0B10; border-radius: 2mm; background: #0B0B10; overflow: hidden; box-shadow: 0 2.5mm 6mm rgba(0,0,0,.3); }
.shot img { display: block; width: 100%; border-radius: .7mm; }
.t { border-radius: 2.2mm; padding: 2.6mm 3mm; background: #fff; box-shadow: 0 1mm 3.5mm rgba(26,16,51,.08); }
.dark .t { background: rgba(255,255,255,.07); box-shadow: none; border: 1px solid rgba(255,255,255,.14); }
.t b { display: block; font-family: 'Anton'; font-weight: 400; font-size: 9.5pt; text-transform: uppercase; line-height: 1.05; margin-bottom: .8mm; }
.t p { font-size: 6.3pt; line-height: 1.42; font-weight: 500; opacity: .85; }
.tag { display: inline-block; font-size: 4.8pt; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; padding: .6mm 1.5mm; border-radius: 99px;
       background: #EFE9F8; color: #7B5EA7; margin-bottom: 1.2mm; }
.dark .tag { background: rgba(245,200,66,.16); color: #F5C842; }
.tag.soon { background: rgba(255,138,61,.18); color: #FF8A3D; }
.stack { display: flex; flex-direction: column; gap: 2.4mm; }
.stats { display: flex; flex-direction: column; gap: 3mm; }
.stats .n { font-family: 'Anton'; font-size: 26pt; line-height: 1; }
.stats span { display: block; font-size: 5.6pt; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; opacity: .75; margin-top: .6mm; }
.role { border-left: .9mm solid #F5C842; padding-left: 2.2mm; }
.role:nth-child(2) { border-color: #5CC85A; } .role:nth-child(3) { border-color: #A07FE0; }
.role b { display: block; font-family: 'Anton'; font-weight: 400; font-size: 9.5pt; text-transform: uppercase; }
.role span { display: block; font-size: 6.2pt; line-height: 1.4; font-weight: 500; opacity: .85; }
.brands { display: flex; gap: 1.2mm; flex-wrap: wrap; }
.brands span { font-size: 5.8pt; font-weight: 700; padding: .8mm 1.8mm; border-radius: 1.2mm; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.16); }
.sx { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5mm; margin-top: 1.5mm; }
.sx div { border-radius: 1.6mm; padding: 1.6mm .5mm; text-align: center; background: rgba(255,255,255,.06); }
.sx span { display: block; font-size: 4.8pt; font-weight: 800; letter-spacing: .14em; opacity: .7; }
.sx b { font-family: 'Anton'; font-weight: 400; font-size: 11pt; display: inline; }
.sx em { display: block; font-style: normal; font-size: 6pt; font-weight: 800; }
.up { color: #FF7A7A; } .dn { color: #5CC85A; }
.pt { width: 100%; border-collapse: collapse; font-size: 6.6pt; font-weight: 700; margin-top: 1.5mm; }
.pt td, .pt th { padding: .9mm .5mm; text-align: center; border-bottom: 1px solid #EEE9F6; }
.pt th { font-size: 5pt; letter-spacing: .12em; color: #7A7388; }
.pt td:first-child { text-align: left; font-size: 5.6pt; color: #7A7388; }
.pt .h td:not(:first-child) { color: #E0662F; } .pt .c td:not(:first-child), .pt .n td:not(:first-child) { color: #3B7DD8; }
.pt .n small { display: block; font-size: 4.8pt; color: #3FAF3D; }
.wk { display: flex; justify-content: space-between; position: relative; margin-top: 2mm; }
.wk::before { content: ""; position: absolute; left: 1.5mm; right: 1.5mm; top: 1.2mm; height: .5mm; background: #CDBFE8; }
.wk div { position: relative; text-align: center; font-size: 5pt; font-weight: 800; }
.wk div::before { content: ""; display: block; width: 2.8mm; height: 2.8mm; border-radius: 50%; background: #7B5EA7; margin: 0 auto 1mm; }
.wk div:last-child::before { background: #F5C842; }
.plan { border-radius: 2mm; padding: 2.4mm 3mm; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14); display: flex; justify-content: space-between; align-items: baseline; }
.plan b { font-family: 'Anton'; font-weight: 400; font-size: 11pt; text-transform: uppercase; }
.plan span { font-size: 6pt; font-weight: 700; opacity: .85; }
.plan.hi { background: linear-gradient(95deg, rgba(245,200,66,.22), rgba(92,200,90,.22)); }
.launch { border-radius: 2.5mm; padding: 3.5mm 4mm; background: linear-gradient(95deg, #F5C842, #5CC85A); color: #1A1033; }
.launch b { font-family: 'Anton'; font-weight: 400; font-size: 13pt; text-transform: uppercase; line-height: 1.02; display: block; }
.qr { background: #fff; padding: 2mm; border-radius: 2mm; line-height: 0; align-self: center; }
.qr svg { width: 38mm; height: 38mm; display: block; }
.url { font-family: 'Anton'; font-size: 15pt; color: #F5C842; letter-spacing: .02em; text-align: center; }
.fold { position: absolute; top: 0; bottom: 0; width: 0; border-left: .3mm dashed #FF00AA; z-index: 9; }
.foldl { position: absolute; top: 2mm; transform: translateX(-50%); font-size: 5pt; font-weight: 800; color: #FF00AA; background: #fff; padding: .5mm 1mm; z-index: 9; }
.col { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: space-between; }
.light .url { color: #7B5EA7; }
.light .plan { background: #fff; border: 1px solid #E2DBF0; box-shadow: 0 1mm 3mm rgba(26,16,51,.06); }
.light .plan.hi { background: #1A1033; color: #fff; border-color: #1A1033; }
.light .qr { box-shadow: 0 1.5mm 5mm rgba(26,16,51,.12); }
.qr { width: 48mm; height: 48mm; display: grid; place-items: center; padding: 0 !important; }
.qr svg { width: 40mm !important; height: 40mm !important; }
.ul { list-style: none; display: flex; flex-direction: column; gap: 1.6mm; }
.ul li { display: flex; gap: 2mm; font-size: 6.8pt; font-weight: 600; line-height: 1.35; }
.ul li::before { content: ""; flex: none; width: 1.3mm; height: 3.2mm; margin-top: .3mm; border-radius: 99px; transform: rotate(33deg);
                 background: linear-gradient(180deg, #F5C842, #5CC85A); }
'''

# ---------------- outside: flap | back | front ----------------
flap = (
  '<div class="col">'
  '<div><span class="kick">Why Kart Connect</span>'
  '<div class="d" style="font-size:27pt;margin-top:2.5mm;">Stop guessing.</div>'
  '<div class="d o" style="font-size:27pt;">Start winning.</div>'
  '<p class="lead" style="margin-top:3mm;">Every setup change, every session, every lap time and the conditions it was set in, all in one place. '
  'When a lap goes quick, you know exactly why, and you can get straight back to it.</p></div>'
  '<div class="stats" style="flex-direction:row;justify-content:space-between;">'
  '<div><div class="n" style="color:#F5C842">8</div><span>Languages</span></div>'
  '<div><div class="n" style="color:#5CC85A">4</div><span>Logger brands,<br>one screen</span></div>'
  '<div><div class="n" style="color:#A07FE0">1</div><span>App for the<br>whole team</span></div></div>'
  f'<div class="shot"><img src="{SH}report.png" alt="" style="height:66mm;object-fit:cover;object-position:top;"></div>'
  '<div><div class="d" style="font-size:14pt;">One app. <span class="o">Whole team.</span></div>'
  '<div class="stack" style="margin-top:2.5mm;">'
  '<div class="role"><b>Driver</b><span>Gives the feedback on what the kart needs.</span></div>'
  '<div class="role"><b>Mechanic</b><span>Scans the Live Setup QR code and logs each session.</span></div>'
  '<div class="role"><b>Team manager</b><span>Sees every setup and finds the quickest.</span></div></div></div>'
  '</div>'
)
back = (
  '<div class="col">'
  '<div><span class="kick">Get started</span>'
  '<div class="d" style="font-size:24pt;margin-top:2.5mm;">Live on the web</div>'
  '<div class="d o" style="font-size:24pt;">1 December 2026</div></div>'
  f'<div style="display:flex;flex-direction:column;align-items:center;"><div class="qr">{QR}</div>'
  '<p class="lead" style="text-align:center;margin-top:2mm;">Scan to visit</p>'
  '<div class="url" style="margin-top:.5mm;">kart-connect.com</div></div>'
  '<div><div class="d" style="font-size:12pt;margin-bottom:2mm;">What you get</div><ul class="ul">'
  '<li>Setup logging with live weather and rain radar</li>'
  '<li>Tyre pressures and stagger, worked out for you</li>'
  '<li>Data Logger for AiM, Unipro, Alfano and Starlane</li>'
  '<li>Live Setup QR codes for your mechanics</li>'
  '<li>Team leaderboard and setup comparison</li>'
  '<li>8 languages, any units, phone, tablet or laptop</li></ul></div>'
  '<div class="stack">'
  '<div class="plan"><b>Privateer</b><span>For the solo racer</span></div>'
  '<div class="plan hi"><b>Team</b><span>Up to 5 drivers</span></div>'
  '<div class="plan"><b>Pro Team</b><span>Up to 30 drivers</span></div></div>'
  '</div>'
)
front = (
  '<div class="col">'
  '<div><span class="kick">Setup management for karting</span>'
  '<div class="d" style="font-size:31pt;margin-top:2.5mm;">Every setup.</div>'
  '<div class="d" style="font-size:31pt;">Every session.</div>'
  '<div class="d o" style="font-size:31pt;">Every lap.</div></div>'
  '<div style="position:relative;height:86mm;">'
  f'<div class="shot" style="position:absolute;left:0;top:8mm;width:72mm;transform:rotate(-5deg);"><img src="{SH}app-setup.png" alt=""></div>'
  f'<div class="shot" style="position:absolute;right:0;top:0;width:36mm;transform:rotate(5deg);"><img src="{SH}report.png" alt=""></div>'
  f'<div class="shot" style="position:absolute;left:4mm;bottom:0;width:60mm;transform:rotate(2deg);"><img src="{SH}live-weather.png" alt=""></div></div>'
  '<div><div class="d" style="font-size:17pt;margin-bottom:3mm;">Stop guessing. <span class="o">Start winning.</span></div>'
  '<div class="launch"><b>Live on the web<br>1 December 2026</b></div></div>'
  '</div>'
)

svg1s = svg1.replace('width="100%"', 'width="100%" height="100%" preserveAspectRatio="none"')
# ---------------- inside: 1 | 2 | 3 ----------------
in1 = (
  '<div class="col">'
  '<div><span class="kick">Setup &amp; sessions</span>'
  '<div class="d" style="font-size:20pt;margin-top:2mm;">Log it once.</div>'
  '<div class="d o" style="font-size:20pt;">Learn from it forever.</div></div>'
  f'<div class="shot"><img src="{SH}app-setup.png" alt=""></div>'
  '<div class="t"><span class="tag">Setup logging</span><b>Every part of the kart</b><p>Rear, engine, front end, wheels and tyres, chassis. Tap-to-select, so a session takes seconds.</p></div>'
  '<div class="t"><span class="tag">Your profile</span><b>Set it up once</b><p>Add your karts, chassis, engines, carbs and exhausts. Rank them 1 to 5 and every new session fills itself in.</p></div>'
  '<div class="t"><span class="tag">Engine monitoring</span><b>Know your engine</b><p>Engine temp, RPM, speed and exhaust temp, max and low, saved with every session.</p></div>'
  '<div class="t"><span class="tag">Race weekends</span><b>Practice to final</b><p>Every session of the weekend kept together, in order.</p>'
  '<div class="wk"><div>P</div><div>Q</div><div>H1</div><div>H2</div><div>PF</div><div>F</div></div></div>'
  '<div class="t"><span class="tag">Voice notes &amp; reports</span><b>Say it. Share it.</b><p>Speak your feedback between heats and share a clean PDF of every session.</p></div>'
  '</div>'
)
in2 = (
  '<span class="kick">Conditions &amp; tyres</span>'
  '<div class="d" style="font-size:20pt;margin-top:2mm;">Know the track.</div>'
  '<div class="d o" style="font-size:20pt;">Nail the pressures.</div>'
  '<div class="t" style="margin-top:4mm;"><span class="tag">Live weather &amp; rain radar</span><b>Conditions, saved automatically</b>'
  '<p>One tap saves live temperature, humidity and conditions with the session. The rain radar shows what&rsquo;s heading your way.</p>'
  f'<div class="shot" style="margin-top:2mm;border-width:.8mm;"><img src="{SH}rain-radar-wide.png" alt=""></div>'
  f'<div class="shot" style="margin-top:2mm;border-width:.8mm;"><img src="{SH}live-weather.png" alt=""></div></div>'
  '<div class="t" style="margin-top:2.4mm;"><span class="tag">Tyre pressures</span><b>Cold. Hot. Sorted.</b>'
  '<p>Record hot pressures after the run and get your next cold pressures, with the stagger worked out per corner.</p>'
  '<table class="pt"><tr><th></th><th>FL</th><th>FR</th><th>RL</th><th>RR</th></tr>'
  '<tr class="c"><td>COLD</td><td>9.00</td><td>9.00</td><td>9.00</td><td>9.00</td></tr>'
  '<tr class="h"><td>HOT</td><td>12.62</td><td>13.40</td><td>12.18</td><td>13.04</td></tr>'
  '<tr class="n"><td>NEXT</td><td>9.19<small>+0.19</small></td><td>8.41<small>&minus;0.59</small></td><td>9.63<small>+0.63</small></td><td>8.77<small>&minus;0.23</small></td></tr></table></div>'
  '<div class="t" style="margin-top:2.4mm;"><span class="tag">Compare &amp; leaderboard</span><b>Every lap has a setup behind it</b>'
  '<p>Compare any two sessions side by side, and rank the team&rsquo;s lap times with the setup PDF behind each one.</p></div>'
)
in3 = (
  '<span class="kick">Data Logger</span>'
  '<div class="d" style="font-size:20pt;margin-top:2mm;">Every logger.</div>'
  '<div class="d o" style="font-size:20pt;">One screen.</div>'
  '<p class="lead" style="margin-top:2mm;">Drop in a CSV from any major logger brand and compare two drivers side by side.</p>'
  '<div class="brands" style="margin-top:2mm;"><span>AiM</span><span>Unipro</span><span>Alfano</span><span>Starlane</span></div>'
  f'<div class="t" style="margin-top:3mm;"><span class="tag">Speed trace</span><b>See where you gain</b><div style="height:17mm;overflow:hidden;">{svg1s}</div></div>'
  f'<div class="t" style="margin-top:2.4mm;"><span class="tag">GPS track map</span><b>Every line, colour-coded</b>'
  f'<div style="background:#fff;border-radius:1.4mm;margin-top:1mm;padding:.5mm 16mm;">{svg2}</div></div>'
  '<div class="t" style="margin-top:2.4mm;"><span class="tag">Sectors &amp; laps</span><b>Nowhere to hide</b>'
  '<div class="sx"><div><span>S1</span><b>19.84</b><em class="dn">&minus;0.08</em></div><div><span>S2</span><b>21.37</b><em class="up">+0.12</em></div>'
  '<div><span>S3</span><b>17.40</b><em class="dn">&minus;0.21</em></div></div>'
  '<p style="margin-top:1.2mm;">Every lap ranked, plus your theoretical best.</p></div>'
  '<div class="t" style="margin-top:2.4mm;"><span class="tag soon">Coming soon</span><b>Video vs video</b><p>GoPro and DJI footage synced to your data, side by side with a live delta.</p></div>'
)

def sheet(b, panels, guides):
    """panels: list of (width_mm, theme, html, logo_on_top)"""
    W = 297 + 2 * b
    out, x = [], 0.0
    for i, (w, theme, html, logo) in enumerate(panels):
        left_edge = i == 0
        right_edge = i == len(panels) - 1
        pw = w + (b if left_edge else 0) + (b if right_edge else 0)
        pad_l = (b if left_edge else 0) + 7
        pad_r = (b if right_edge else 0) + 7
        lg = '../assets/logo-white.png' if theme == 'dark' else '../assets/logo.png'
        head = f'<img class="logo" src="{lg}" alt="Kart Connect" style="margin-bottom:4mm;">' if logo else ''
        out.append(f'<div class="p {theme}" style="left:{x}mm;width:{pw}mm;"><div class="lines"></div>{MARK}'
                   f'<div class="in" style="left:{pad_l}mm;right:{pad_r}mm;">{head}{html}</div><div class="chk"></div></div>')
        x += pw
    if guides:
        acc = b
        for w, *_ in panels[:-1]:
            acc += w
            out.append(f'<div class="fold" style="left:{acc}mm;"></div><div class="foldl" style="left:{acc}mm;">FOLD</div>')
    return f'<section class="sheet" style="width:{W}mm;">' + ''.join(out) + '</section>'

def doc(b, guides):
    W, H = 297 + 2 * b, 210 + 2 * b
    outside = sheet(b, [(97, 'dark', flap, True), (100, 'light', back, True), (100, 'dark', front, True)], guides)
    inside = sheet(b, [(100, 'light', in1, False), (100, 'dark', in3, False), (97, 'light', in2, False)], guides)
    return ('<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Kart Connect tri-fold</title>'
            f'<style>@page {{ size: {W}mm {H}mm; margin: 0; }} :root {{ --w: {W}mm; --h: {H}mm; --b: {b}mm; }}{CSS}</style></head><body>'
            + outside + inside + '</body></html>')

open(os.path.join(HERE, 'trifold.html'), 'w').write(doc(3, False))
open(os.path.join(HERE, 'trifold-guides.html'), 'w').write(doc(0, True))
print('ok')
