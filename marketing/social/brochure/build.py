"""Kart Connect feature brochure: four A4 pages in the Pit Board v4 style.
Writes brochure.html; pdf.cjs turns it into kart-connect-brochure.pdf and page PNGs."""
import math, os, random
HERE = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(HERE, '_svg_src.py')).read())  # svg1 (speed trace) and svg2 (track map) from the Data Logger posts

MARK = ('<svg class="wm" viewBox="140 10 214 128" aria-hidden="true"><g fill="currentColor">'
        '<rect x="-70" y="-22" width="140" height="44" rx="22" transform="translate(199,73) rotate(-57)"/>'
        '<rect x="-70" y="-22" width="140" height="44" rx="22" transform="translate(272,73) rotate(-57)"/>'
        '<circle cx="324" cy="106" r="23"/></g></svg>')

# decorative QR-style block (does not scan)
random.seed(7)
Q, cell = 21, 3.4
def finder(x, y):
    return (f'<rect x="{x*cell}" y="{y*cell}" width="{7*cell}" height="{7*cell}" fill="#1A1033"/>'
            f'<rect x="{(x+1)*cell}" y="{(y+1)*cell}" width="{5*cell}" height="{5*cell}" fill="#fff"/>'
            f'<rect x="{(x+2)*cell}" y="{(y+2)*cell}" width="{3*cell}" height="{3*cell}" fill="#1A1033"/>')
mods = ''.join(f'<rect x="{x*cell}" y="{y*cell}" width="{cell}" height="{cell}" fill="#1A1033"/>'
               for y in range(Q) for x in range(Q)
               if not ((x < 8 and y < 8) or (x > Q - 9 and y < 8) or (x < 8 and y > Q - 9)) and random.random() < .47)
QR = f'<svg width="{Q*cell}" height="{Q*cell}" viewBox="0 0 {Q*cell} {Q*cell}">{mods}{finder(0,0)}{finder(Q-7,0)}{finder(0,Q-7)}</svg>'

CSS = r'''
@font-face{font-family:'Anton';font-weight:400;src:url('../concepts/pit-board/fonts/Anton-400n.woff2') format('woff2');}
@page { size: A4; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #888; }
body { font-family: 'Inter', Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #1A1033; }
.pg { width: 210mm; height: 297mm; position: relative; overflow: hidden; page-break-after: always; break-after: page; }
.pg:last-child { page-break-after: auto; break-after: auto; }
.dark { color: #fff; background: radial-gradient(120% 70% at 100% 0%, #3A2468 0%, #1C1236 45%, #0E0919 100%); }
.light { background: radial-gradient(120% 70% at 100% 0%, #FFFFFF 0%, #F3EFFA 60%, #E9E2F6 100%); }
.lines { position: absolute; inset: 0; background: repeating-linear-gradient(-57deg, transparent 0 34mm, rgba(255,255,255,.03) 34mm 34.6mm); }
.light .lines { background: repeating-linear-gradient(-57deg, transparent 0 34mm, rgba(123,94,167,.05) 34mm 34.6mm); }
.wm { position: absolute; width: 150mm; right: -22mm; bottom: 14mm; opacity: .06; color: #fff; }
.light .wm { color: #7B5EA7; opacity: .07; }
.chk { position: absolute; left: 0; right: 0; bottom: 0; height: 5mm;
  background: repeating-conic-gradient(currentColor 0 25%, transparent 0 50%) 0 0 / 5mm 5mm; }
.dark .chk { color: #fff; } .light .chk { color: #1A1033; }
.in { position: absolute; inset: 14mm 15mm 16mm; display: flex; flex-direction: column; }
.top { display: flex; justify-content: space-between; align-items: center; }
.top img { height: 11mm; }
.top span { font-size: 7.5pt; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; opacity: .7; }
.foot { position: absolute; left: 15mm; right: 15mm; bottom: 8.5mm; display: flex; align-items: center; gap: 4mm;
  font-size: 6.5pt; font-weight: 700; letter-spacing: .26em; text-transform: uppercase; opacity: .8; }
.foot i { flex: 1; height: 1px; background: currentColor; opacity: .3; }
.kick { display: inline-flex; align-items: center; gap: 3mm; font-size: 8.5pt; font-weight: 800; letter-spacing: .3em; text-transform: uppercase; color: #F5C842; }
.light .kick { color: #7B5EA7; }
.kick::before { content: ""; width: 6mm; height: 2.4mm; border-radius: 99px; background: currentColor; transform: rotate(-57deg); }
.d { font-family: 'Anton', sans-serif; text-transform: uppercase; line-height: .96; letter-spacing: .01em; }
.o { color: transparent; background: linear-gradient(95deg, #F5C842 0%, #5CC85A 50%, #A07FE0 100%); -webkit-background-clip: text; background-clip: text; }
.light .o { background: linear-gradient(95deg, #D9A514 0%, #3FAF3D 50%, #7B5EA7 100%); -webkit-background-clip: text; background-clip: text; }
.hl { color: #F5C842; } .light .hl { color: #7B5EA7; }
p.lead { font-size: 10.5pt; line-height: 1.55; font-weight: 500; opacity: .9; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
.card { border-radius: 4mm; padding: 5mm; background: #fff; box-shadow: 0 2mm 6mm rgba(26,16,51,.08); }
.dark .card { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.14); box-shadow: none; }
.card h3 { font-family: 'Anton'; font-weight: 400; font-size: 15pt; text-transform: uppercase; line-height: 1.05; margin-bottom: 2mm; }
.card p { font-size: 8.6pt; line-height: 1.5; font-weight: 500; opacity: .85; }
.tag { display: inline-block; font-size: 6.5pt; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; padding: 1mm 2.2mm; border-radius: 99px;
       background: #EFE9F8; color: #7B5EA7; margin-bottom: 2.5mm; }
.dark .tag { background: rgba(245,200,66,.16); color: #F5C842; }
.tag.soon { background: rgba(255,138,61,.18); color: #FF8A3D; }
.shot { border: 1.6mm solid #0B0B10; border-radius: 3mm; background: #0B0B10; overflow: hidden; box-shadow: 0 4mm 10mm rgba(26,16,51,.25); }
.shot img { display: block; width: 100%; border-radius: 1.2mm; }
.num { font-family: 'Anton'; font-size: 34pt; line-height: 1; }
.stat span { display: block; font-size: 7pt; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; opacity: .75; margin-top: 1mm; }
.ul { list-style: none; display: flex; flex-direction: column; gap: 2mm; }
.ul li { display: flex; gap: 2.5mm; font-size: 8.8pt; font-weight: 600; line-height: 1.4; }
.ul li::before { content: ""; flex: none; width: 1.6mm; height: 4mm; margin-top: .4mm; border-radius: 99px; transform: rotate(33deg);
                 background: linear-gradient(180deg, #F5C842, #5CC85A); }
.chip { display: inline-block; font-size: 7.5pt; font-weight: 700; padding: 1.6mm 3mm; border-radius: 2mm; background: #fff; box-shadow: 0 1mm 3mm rgba(26,16,51,.08); }
.dark .chip { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.16); box-shadow: none; }
/* cover */
.hero { position: relative; height: 112mm; margin-top: 6mm; }
.hero .s1 { position: absolute; left: 0; top: 8mm; width: 128mm; transform: rotate(-4deg); }
.hero .s2 { position: absolute; right: 2mm; top: 0; width: 58mm; transform: rotate(5deg); }
.hero .s3 { position: absolute; left: 22mm; bottom: 0; width: 92mm; transform: rotate(2deg); }
.launch { display: flex; align-items: center; gap: 5mm; border-radius: 4mm; padding: 5mm 6mm; background: linear-gradient(95deg, #F5C842, #5CC85A); color: #1A1033; }
.launch b { font-family: 'Anton'; font-weight: 400; font-size: 20pt; text-transform: uppercase; line-height: 1; }
.launch span { font-size: 8.5pt; font-weight: 700; }
/* pressures */
.pt { width: 100%; border-collapse: collapse; font-size: 8pt; font-weight: 700; margin-top: 2mm; }
.pt td, .pt th { padding: 1.4mm 1mm; text-align: center; border-bottom: 1px solid #EEE9F6; }
.pt th { font-size: 6.5pt; letter-spacing: .14em; color: #7A7388; }
.pt td:first-child { text-align: left; font-size: 7pt; color: #7A7388; letter-spacing: .06em; }
.pt .h td:not(:first-child) { color: #E0662F; } .pt .c td:not(:first-child) { color: #3B7DD8; }
.pt .n td:not(:first-child) { color: #3B7DD8; } .pt .n small { display: block; font-size: 6pt; color: #3FAF3D; }
/* weekend */
.wk { display: flex; justify-content: space-between; position: relative; margin-top: 3mm; }
.wk::before { content: ""; position: absolute; left: 2mm; right: 2mm; top: 1.6mm; height: .6mm; background: #CDBFE8; }
.wk div { position: relative; text-align: center; font-size: 6.5pt; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
.wk div::before { content: ""; display: block; width: 3.6mm; height: 3.6mm; border-radius: 50%; background: #7B5EA7; margin: 0 auto 1.6mm; }
.wk div:last-child::before { background: #F5C842; }
/* sectors / laps */
.sx { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm; margin-top: 2mm; }
.sx div { border-radius: 2.5mm; padding: 2.5mm 1mm; text-align: center; background: rgba(255,255,255,.06); }
.sx span { display: block; font-size: 6pt; font-weight: 800; letter-spacing: .16em; opacity: .7; }
.sx b { font-family: 'Anton'; font-weight: 400; font-size: 14pt; }
.sx em { display: block; font-style: normal; font-size: 7.5pt; font-weight: 800; }
.up { color: #FF7A7A; } .dn { color: #5CC85A; }
.lt { width: 100%; border-collapse: collapse; margin-top: 2mm; font-size: 8pt; }
.lt td { padding: 1.4mm 1.5mm; border-bottom: 1px solid rgba(255,255,255,.1); }
.lt td:nth-child(2) { font-family: 'Anton'; font-size: 11pt; } .lt td:last-child { text-align: right; font-weight: 700; opacity: .8; }
.lt tr.b td { color: #5CC85A; } .lt tr.tb td { color: #F5C842; border-bottom: 0; }
.vids { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; margin-top: 2mm; }
.vids div { aspect-ratio: 16/9; border-radius: 2mm; position: relative; overflow: hidden;
            background: linear-gradient(170deg, #4B5E7A 0%, #2B3446 55%, #3D3A33 56%, #24221F 100%); }
.vids div::before { content: ""; position: absolute; left: 18%; right: 18%; bottom: 0; height: 46%; background: #565048; clip-path: polygon(38% 0, 62% 0, 100% 100%, 0 100%); }
.vids em { position: absolute; right: 1.5mm; bottom: 1.5mm; font-style: normal; font-family: 'Anton'; font-size: 10pt; padding: .4mm 1.5mm; border-radius: 1mm; background: rgba(0,0,0,.6); }
.brands { display: flex; gap: 2mm; flex-wrap: wrap; }
/* team page */
.role b { display: block; font-family: 'Anton'; font-weight: 400; font-size: 14pt; text-transform: uppercase; }
.role { border-left: 1.2mm solid #F5C842; padding-left: 3.5mm; }
.role:nth-child(2) { border-color: #5CC85A; } .role:nth-child(3) { border-color: #A07FE0; }
.role span { font-size: 8.5pt; font-weight: 500; line-height: 1.45; opacity: .85; }
.plan { border-radius: 4mm; padding: 5mm; background: #fff; box-shadow: 0 2mm 6mm rgba(26,16,51,.08); }
.plan.hi { background: #1A1033; color: #fff; }
.plan b { font-family: 'Anton'; font-weight: 400; font-size: 17pt; text-transform: uppercase; display: block; }
.plan i { font-style: normal; font-size: 7.5pt; font-weight: 700; color: #7B5EA7; display: block; margin-bottom: 2.5mm; }
.plan.hi i { color: #F5C842; }
.lb { font-size: 8pt; width: 100%; border-collapse: collapse; margin-top: 2mm; }
.lb td { padding: 1.5mm 1mm; border-bottom: 1px solid #EEE9F6; font-weight: 600; }
.lb td:first-child { font-family: 'Anton'; color: #7B5EA7; width: 6mm; font-size: 10pt; }
.lb .pdf { font-size: 6pt; font-weight: 800; background: #F5C842; padding: .8mm 1.6mm; border-radius: 1mm; }
.cta { border-radius: 5mm; padding: 7mm 8mm; background: #1A1033; color: #fff; display: flex; align-items: center; justify-content: space-between; gap: 6mm; position: relative; overflow: hidden; }
.cta b { font-family: 'Anton'; font-weight: 400; font-size: 24pt; text-transform: uppercase; line-height: 1; display: block; }
.cta span { font-size: 9pt; font-weight: 600; opacity: .85; }
.cta .url { font-family: 'Anton'; font-size: 16pt; color: #F5C842; letter-spacing: .03em; }
'''

def page(theme, inner, foot_l, n):
    logo = '../assets/logo-white.png' if theme == 'dark' else '../assets/logo.png'
    return (f'<section class="pg {theme}"><div class="lines"></div>{MARK}<div class="in">'
            f'<div class="top"><img src="{logo}" alt="Kart Connect"><span>kart-connect.com</span></div>{inner}</div>'
            f'<div class="foot"><span>{foot_l}</span><i></i><span>{n} / 4</span></div><div class="chk"></div></section>')

SHOTS = '../assets/shots/'

# ---------- page 1: cover ----------
p1 = (
  '<div style="margin-top:16mm;"><span class="kick">Setup management for karting</span></div>'
  '<div class="d" style="font-size:60pt;margin-top:5mm;">Every setup.</div>'
  '<div class="d" style="font-size:60pt;">Every session.</div>'
  '<div class="d o" style="font-size:60pt;">Every lap.</div>'
  '<p class="lead" style="margin-top:6mm;max-width:150mm;">Kart Connect is the one place for everything that happens to your kart: '
  'every setup change, every session, every lap time and the conditions it was set in. Built for drivers, mechanics and team managers '
  'who want to stop guessing and start winning.</p>'
  '<div class="hero">'
  f'<div class="shot s1"><img src="{SHOTS}app-setup.png" alt=""></div>'
  f'<div class="shot s2"><img src="{SHOTS}report.png" alt=""></div>'
  f'<div class="shot s3"><img src="{SHOTS}live-weather.png" alt=""></div></div>'
  '<div class="grid3" style="margin-top:auto;margin-bottom:6mm;">'
  '<div class="stat"><div class="num hl">8</div><span>Languages</span></div>'
  '<div class="stat"><div class="num" style="color:#5CC85A">4</div><span>Logger brands, one screen</span></div>'
  '<div class="stat"><div class="num" style="color:#A07FE0">1</div><span>App for the whole team</span></div></div>'
  '<div class="launch"><b>Live on the web<br>1 December 2026</b><span>Log your first session on launch day at kart-connect.com</span></div>'
)

# ---------- page 2: setup & sessions ----------
p2 = (
  '<div style="margin-top:7mm;"><span class="kick">Setup &amp; sessions</span></div>'
  '<div class="d" style="font-size:33pt;margin-top:3mm;">Log it once. <span class="o">Learn from it forever.</span></div>'
  '<p class="lead" style="margin-top:4mm;">Every part of the kart, saved against the session it ran in, with the weather, the kit and your notes alongside it. '
  'When a lap goes quick, you know exactly why, and you can get straight back to it.</p>'
  '<div class="grid2" style="margin-top:4mm;">'
  '<div class="card"><span class="tag">Setup logging</span><h3>Every part of the kart</h3>'
  '<p>Rear, engine, front end, wheels and tyres, chassis. Tap-to-select options, so logging a session takes seconds, not minutes.</p>'
  f'<div class="shot" style="margin-top:3mm;border-width:1mm;"><img src="{SHOTS}app-setup.png" alt=""></div></div>'
  '<div class="card"><span class="tag">Live weather &amp; rain radar</span><h3>Conditions, saved automatically</h3>'
  '<p>One tap adds live temperature, humidity and conditions to the session, and the live rain radar shows what&rsquo;s heading your way.</p>'
  f'<div class="shot" style="margin-top:3mm;border-width:1mm;position:relative;"><img src="{SHOTS}rain-radar-wide.png" alt="">'
  '<span style="position:absolute;left:2mm;top:2mm;font-size:6pt;font-weight:800;letter-spacing:.14em;background:#1A1033;color:#F5C842;padding:.8mm 1.8mm;border-radius:1mm;">RAIN RADAR</span></div></div>'
  '<div class="card"><span class="tag">Your profile</span><h3>Set it up once</h3>'
  '<p>Add your karts, chassis, engines, carbs and exhausts. Nickname them, rank them 1 to 5, and every new session fills itself in.</p>'
  '<ul class="ul" style="margin-top:3mm;"><li>Engines, carbs and exhausts ranked 1 to 5</li><li>Engine 1, Carb 3, Exhaust 2: logged in three taps</li></ul></div>'
  '<div class="card"><span class="tag">Tyre pressures</span><h3>Cold. Hot. Sorted.</h3>'
  '<p>Record hot pressures after the run and get your next cold pressures, with stagger worked out per corner.</p>'
  '<table class="pt"><tr><th></th><th>FL</th><th>FR</th><th>RL</th><th>RR</th></tr>'
  '<tr class="c"><td>COLD</td><td>9.00</td><td>9.00</td><td>9.00</td><td>9.00</td></tr>'
  '<tr class="h"><td>HOT</td><td>12.62</td><td>13.40</td><td>12.18</td><td>13.04</td></tr>'
  '<tr class="n"><td>NEXT</td><td>9.19<small>+0.19</small></td><td>8.41<small>&minus;0.59</small></td><td>9.63<small>+0.63</small></td><td>8.77<small>&minus;0.23</small></td></tr></table></div>'
  '</div>'
  '<div class="grid3" style="margin-top:4mm;">'
  '<div class="card"><span class="tag">Race weekends</span><h3>Practice to final</h3><p>Every session of the weekend kept together, in order.</p>'
  '<div class="wk"><div>P</div><div>Q</div><div>H1</div><div>H2</div><div>PF</div><div>F</div></div></div>'
  '<div class="card"><span class="tag">Voice notes</span><h3>Gloves on? Just say it</h3><p>Speak your feedback straight into the session instead of typing between heats.</p></div>'
  '<div class="card"><span class="tag">Session reports</span><h3>One page per session</h3><p>A clean PDF for every session: setup, conditions and lap times, ready to share.</p></div>'
  '</div>'
)

# ---------- page 3: data logger ----------
p3 = (
  '<div style="margin-top:7mm;"><span class="kick">Data Logger</span></div>'
  '<div class="d" style="font-size:36pt;margin-top:3mm;">Every logger. <span class="o">One screen.</span></div>'
  '<p class="lead" style="margin-top:4mm;">Drop in a CSV from any major logger brand and see two drivers&rsquo; sessions side by side, even when they run different loggers. '
  'No more four brands and four apps that never talk to each other. (Times and traces shown are example data.)</p>'
  '<div class="brands" style="margin-top:4mm;"><span class="chip">AiM</span><span class="chip">Unipro</span><span class="chip">Alfano</span><span class="chip">Starlane</span></div>'
  '<div class="grid2" style="margin-top:4mm;">'
  f'<div class="card"><span class="tag">Speed trace</span><h3>See where you gain. See where you lose.</h3><p>Speed against distance for every lap on one chart, against any driver.</p>{svg1}'
  '<div style="display:flex;gap:4mm;font-size:7pt;font-weight:700;margin-top:1.5mm;"><span style="color:#F5C842">&#9644; You</span><span style="color:#A07FE0">&#9644; Team-mate</span></div></div>'
  f'<div class="card" style="padding-bottom:3mm;"><span class="tag">GPS track map</span><h3>Every line. Colour-coded.</h3><p>Racing lines drawn from GPS, slow to fast, so the slow corners have nowhere to hide.</p>'
  f'<div style="background:#fff;border-radius:3mm;margin-top:2.5mm;padding:1.5mm 12mm;">{svg2}</div></div>'
  '<div class="card"><span class="tag">Sector analysis</span><h3>Three sectors. Nowhere to hide.</h3><p>Every track auto-split into three sectors. Fix the red, keep the green.</p>'
  '<div class="sx"><div><span>S1</span><b>19.84</b><em class="dn">&minus;0.08</em></div><div><span>S2</span><b>21.37</b><em class="up">+0.12</em></div>'
  '<div><span>S3</span><b>17.40</b><em class="dn">&minus;0.21</em></div></div></div>'
  '<div class="card"><span class="tag">Lap ranking</span><h3>Every lap. Ranked.</h3><p>Best lap highlighted, delta on every lap, and your theoretical best from your quickest sectors.</p>'
  '<table class="lt"><tr class="b"><td>7</td><td>0:58.61</td><td>Best</td></tr><tr><td>9</td><td>0:58.74</td><td>+0.13</td></tr>'
  '<tr class="tb"><td>&#9733;</td><td>0:58.29</td><td>Theoretical best</td></tr></table></div>'
  '</div>'
  '<div class="card" style="margin-top:4mm;display:grid;grid-template-columns:1fr 1.1fr;gap:5mm;align-items:center;">'
  '<div><span class="tag soon">Coming soon</span><h3>Video vs video, with live delta</h3>'
  '<p>Film on a GoPro Hero 7+ or DJI Osmo Action and your footage syncs to your logger data automatically. Two laps play side by side, with a live delta showing who&rsquo;s ahead, frame by frame.</p></div>'
  '<div class="vids"><div><em class="dn">&minus;0.14</em></div><div><em class="up">+0.14</em></div></div></div>'
)

# ---------- page 4: team, plans, CTA ----------
p4 = (
  '<div style="margin-top:7mm;"><span class="kick">Built for the whole team</span></div>'
  '<div class="d" style="font-size:36pt;margin-top:3mm;">One app. <span class="o">Whole team.</span></div>'
  '<div class="grid3" style="margin-top:5mm;">'
  '<div class="role"><b>Driver</b><span>Gives the feedback: what the kart&rsquo;s doing and what it needs.</span></div>'
  '<div class="role"><b>Mechanic</b><span>Logs the changes under instruction, saved against the session.</span></div>'
  '<div class="role"><b>Team manager</b><span>Sees everyone&rsquo;s changes across every driver and kart, and builds on what works.</span></div></div>'
  '<div class="grid2" style="margin-top:5mm;">'
  f'<div class="card" style="display:grid;grid-template-columns:auto 1fr;gap:4mm;align-items:center;"><div style="background:#fff;padding:2mm;border-radius:2mm;box-shadow:0 1mm 4mm rgba(26,16,51,.15);">{QR}</div>'
  '<div><span class="tag">Live Setup</span><h3>Scan it. Set it. Sent.</h3><p>Your mechanic scans the QR code, logs the setup for each session and submits it straight to the team manager, who can compare every setup to find the quickest.</p></div></div>'
  '<div class="card"><span class="tag">Team leaderboard</span><h3>Every lap time has a setup behind it</h3>'
  '<table class="lb"><tr><td>1</td><td>Driver 3</td><td>0:58.41</td><td><span class="pdf">SETUP PDF</span></td></tr>'
  '<tr><td>2</td><td>Driver 1</td><td>0:58.56</td><td><span class="pdf">SETUP PDF</span></td></tr>'
  '<tr><td>3</td><td>Driver 3</td><td>0:58.62</td><td><span class="pdf">SETUP PDF</span></td></tr></table></div>'
  '<div class="card"><span class="tag">Compare setups</span><h3>Side by side</h3><p>Pick any two sessions and see every change highlighted. Export it as a PDF for the team.</p></div>'
  '<div class="card"><span class="tag">Your way</span><h3>Any language. Any units. Any device.</h3>'
  '<p>8 languages. Bar or psi, &deg;C or &deg;F, kph or mph. Log it in the awning on your phone, review it on the sofa on your laptop.</p></div>'
  '</div>'
  '<div class="grid3" style="margin-top:5mm;">'
  '<div class="plan"><b>Privateer</b><i>For the solo racer</i><ul class="ul"><li>Single driver, single kart</li><li>All analysis features</li></ul></div>'
  '<div class="plan hi"><b>Team</b><i>For small racing teams</i><ul class="ul"><li>Up to 5 drivers</li><li>Team manager view</li></ul></div>'
  '<div class="plan"><b>Pro Team</b><i>For professional operations</i><ul class="ul"><li>Up to 30 drivers</li><li>Team-branded setup sheets</li></ul></div></div>'
  '<div class="cta" style="margin-top:auto;margin-bottom:5mm;"><div><b>Live on the web</b><b class="o">1 December 2026</b>'
  '<span style="display:block;margin-top:2mm;">Start logging smarter from launch day.</span></div><div class="url">kart-connect.com</div></div>'
)

html = ('<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Kart Connect brochure</title>'
        f'<style>{CSS}</style></head><body>'
        + page('dark', p1, 'Kart Connect', 1) + page('light', p2, 'Setup &amp; sessions', 2)
        + page('dark', p3, 'Data Logger', 3) + page('light', p4, 'Teams &amp; plans', 4) + '</body></html>')
open(os.path.join(HERE, 'brochure.html'), 'w').write(html)
print('ok')
