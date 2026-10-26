"""Batch 4: ten more single-image posts in the v4 style. Reuses gen5's CSS and page template.
Writes queue6.html and pack3/index.html."""
import os, json, html as H, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('gen5', os.path.join(HERE, 'gen5.py'))
g5 = importlib.util.module_from_spec(spec); spec.loader.exec_module(g5)
g4 = g5.g4

CSS6 = g5.CSS5 + r'''
/* setup tip cards */
.dirs { display: flex; flex-direction: column; gap: 8px; }
.dirs div { border-radius: 10px; padding: 11px 14px; background: #fff; color: #1A1033; box-shadow: 0 3px 12px rgba(26,16,51,.08); }
.s.dark .dirs div { background: rgba(255,255,255,.07); color: #fff; box-shadow: none; border: 1px solid rgba(255,255,255,.14); }
.dirs b { display: block; font-family: 'Anton'; font-weight: 400; font-size: 21px; text-transform: uppercase; line-height: 1.1; color: #7B5EA7; }
.s.dark .dirs b { color: #F5C842; }
.dirs div + div b { color: #3FAF3D; } .s.dark .dirs div + div b { color: #5CC85A; }
.dirs span { font-size: 12px; font-weight: 600; line-height: 1.45; }
.tipno { font-family: 'Anton'; font-size: 13px; letter-spacing: .1em; }
/* reference chips */
.refl { display: flex; flex-wrap: wrap; gap: 5px; }
.refl span { font-size: 10.5px; font-weight: 700; padding: 6px 9px; border-radius: 6px; background: #fff; color: #1A1033; box-shadow: 0 2px 8px rgba(26,16,51,.07); }
.refl span.more { background: #1A1033; color: #F5C842; }
.secs { display: flex; gap: 4px; flex-wrap: wrap; }
.secs i { font-style: normal; font-size: 8px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #7B5EA7; border: 1.5px solid #CDBFE8; border-radius: 999px; padding: 4px 8px; }
/* compare table */
.cmp { background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 16px rgba(26,16,51,.08); color: #1A1033; }
.cmp div { display: grid; grid-template-columns: 1.4fr 1fr 1fr; padding: 8px 12px; font-size: 11.5px; font-weight: 600; border-bottom: 1px solid #EEE9F6; align-items: center; }
.cmp div:last-child { border-bottom: 0; }
.cmp div.h { font-size: 8px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; color: #7A7388; background: #F7F4FC; }
.cmp div.c { background: #FFF8DD; } .cmp div.c span:last-child { color: #3FAF3D; font-weight: 800; }
.cmp span:not(:first-child) { text-align: center; font-variant-numeric: tabular-nums; }
.pdfb { display: inline-flex; gap: 6px; align-items: center; font-size: 9px; font-weight: 800; letter-spacing: .08em; background: #F5C842; color: #1A1033; padding: 5px 8px; border-radius: 4px; }
/* garage list */
.gar { display: flex; flex-direction: column; gap: 7px; }
.gar div { display: flex; align-items: center; gap: 12px; padding: 9px 12px; border-radius: 10px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14); }
.gar b { font-family: 'Anton'; font-weight: 400; font-size: 20px; text-transform: uppercase; width: 96px; flex: none; }
.gar span { font-size: 11px; font-weight: 600; opacity: .8; line-height: 1.35; }
.gar div:nth-child(1) b { color: #F5C842; } .gar div:nth-child(2) b { color: #5CC85A; } .gar div:nth-child(3) b { color: #A07FE0; } .gar div:nth-child(4) b { color: #fff; }
/* track card */
.trk { border-radius: 12px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14); padding: 12px 14px; }
.trk h6 { font-family: 'Anton'; font-weight: 400; font-size: 20px; text-transform: uppercase; }
.trk .st { display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; margin-top: 10px; }
.trk .st div { background: rgba(255,255,255,.06); border-radius: 8px; padding: 8px 10px; }
.trk .st span { display: block; font-size: 7.5px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; opacity: .7; }
.trk .st b { font-family: 'Anton'; font-weight: 400; font-size: 22px; line-height: 1.15; }
.trk .st div:nth-child(1) b { color: #F5C842; } .trk .st div:nth-child(3) b { color: #5CC85A; } .trk .st div:nth-child(4) b { color: #A07FE0; }
/* chart */
.chart { background: #fff; border-radius: 12px; padding: 12px 12px 8px; box-shadow: 0 4px 16px rgba(26,16,51,.08); color: #1A1033; }
.chart h6 { font-size: 8px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; color: #7A7388; display: flex; justify-content: space-between; }
.chart h6 em { font-style: normal; color: #3FAF3D; }
/* halloween */
.s.dark.hw { background: radial-gradient(120% 80% at 100% 0%, #4A2468 0%, #1C1236 45%, #0E0919 100%); }
.hw .hl { color: #FF8A3D; }
.hw .o { background: linear-gradient(95deg, #FF8A3D 0%, #F5C842 55%, #A07FE0 100%); -webkit-background-clip: text; background-clip: text; }
/* numbered reasons */
.why { list-style: none; display: flex; flex-direction: column; gap: 8px; counter-reset: w; }
.why li { display: flex; align-items: center; gap: 12px; font-size: 13px; font-weight: 700; counter-increment: w; }
.why li::before { content: counter(w); flex: none; width: 28px; font-family: 'Anton'; font-size: 30px; line-height: 1; color: #7B5EA7; }
.why li:nth-child(2)::before { color: #3FAF3D; } .why li:nth-child(3)::before { color: #D9A514; }
.why li:nth-child(4)::before { color: #7B5EA7; } .why li:nth-child(5)::before { color: #3FAF3D; }
'''

P = []  # (theme, slug, title, inner, foot, captions, note)


def tip(n, name, a, b, foot_line):
    return (f'<div class="kick">Setup tip #{n}</div>'
            f'<div class="d" style="font-size:80px;margin-top:6px;">{name}</div>'
            f'<div class="dirs" style="margin-top:16px;"><div><b>{a[0]}</b><span>{a[1]}</span></div>'
            f'<div><b>{b[0]}</b><span>{b[1]}</span></div></div>'
            f'<p class="sub" style="margin-top:auto;">{foot_line}</p>')


REF_LINE = 'Every change explained in the Kart Connect Setup Reference.'

P.append(('dark', 'halloween', 'The scariest thing in karting',
  '<div class="kick">Happy Halloween</div>'
  '<div class="d" style="font-size:46px;margin-top:8px;">The scariest thing</div>'
  '<div class="d" style="font-size:46px;">in karting?</div>'
  '<div class="d o" style="font-size:74px;margin-top:14px;">A setup you</div>'
  '<div class="d o" style="font-size:74px;">can&rsquo;t remember.</div>'
  '<p class="sub" style="margin-top:auto;font-weight:700;">Don&rsquo;t let it haunt you. <span class="hl">Log it.</span></p>',
  'Happy Halloween', [
  "The scariest thing in karting? 👻\n\nNot the rain. Not the first corner. Not the weighbridge.\n\nIt's that setup that was FLYING last month... and nobody can remember what it was. 😱\n\nDon't let it haunt you. Log every setup in Kart Connect and you'll never lose a quick one again. 🎃🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #Halloween #KartLife",
  "Happy Halloween from Kart Connect. 🎃\n\nThe scariest thing in karting? A setup you can't remember. 👻\n\nLog it. Never lose it.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #Halloween",
  "Things that go bump in the paddock: 👻\n\n🎃 A missing torque wrench\n🎃 \"I think it was 80 teeth?\"\n🎃 The setup you swore you'd write down\n\nKart Connect saves every setup with the session it belongs to, so nothing comes back to haunt you. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #Halloween"],
  'Post on or just before Fri 31 Oct.'))

P.append(('light', 'setup-reference', 'Every setup change. Explained.',
  '<div class="kick">Setup Reference</div>'
  '<div class="d" style="font-size:40px;margin-top:8px;">Every setup change.</div>'
  '<div class="d o" style="font-size:72px;">Explained.</div>'
  '<p class="sub" style="margin-top:12px;">What each change does to the kart, both ways, right inside the app.</p>'
  '<div class="refl" style="margin-top:14px;"><span>Wheelbase</span><span>Rear width</span><span>Third bearing</span><span>Axle stiffness</span>'
  '<span>Caster</span><span>Camber</span><span>Toe</span><span>Front width</span><span>Brake bias</span><span>Rim type</span>'
  '<span>Sprocket size</span><span>Seat stiffness</span><span class="more">+ more</span></div>'
  '',
  'Setup Reference', [
  "Every setup change. Explained. 📖\n\nNot sure what going wider on the rear actually does? Wondering whether more caster will fix your turn-in?\n\nThe Kart Connect Setup Reference explains every change, both ways: rear, front end, wheels and tyres, engine and gearing, chassis and seat.\n\nSearchable. In your pocket. Right next to your setup. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartSetup #KartTips",
  "What does that change actually do? 🤔\n\nNow you know. The Setup Reference in Kart Connect explains every setup change, both ways.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartSetup",
  "New to karting or just want to understand your kart better? 🏎️\n\nEvery setup change, from wheelbase to seat stiffness, explained in plain English inside Kart Connect. Look it up in the awning, make the change, log it.\n\nLearn it. Try it. Log it. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartTips"],
  'Based on the Setup Reference page in the app code (2 Oct). Check it is still in the app.'))

P.append(('dark', 'tip-wheelbase', 'Setup tip #1: Wheelbase',
  tip(1, 'Wheelbase.', ('Shorter', 'More rotation. The kart pivots more easily through corners.'),
      ('Longer', 'Less rotation. More stable, but harder to rotate.'), REF_LINE),
  'Setup tip', [
  "SETUP TIP #1: WHEELBASE 🔧\n\n⬅️ SHORTER: more rotation. The kart pivots more easily through corners.\n➡️ LONGER: less rotation. More stable, but harder to rotate.\n\nEvery setup change is explained like this in the Kart Connect Setup Reference, and every change you make is logged against the session, so you can see what it did to your lap time. 🏁\n\nSave this for your next test day. 📌\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartSetup #KartTips #KartRacing",
  "Wheelbase in 10 seconds: ⏱️\n\nShorter = more rotation.\nLonger = more stability.\n\nSave it for test day. 📌\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartSetup #KartTips",
  "Kart won't turn? Or turning too much? 🤔\n\nWheelbase is one of the first places to look. Shorter gives you more rotation; longer calms it down.\n\nTry it, log it in Kart Connect, and see exactly what it did to your lap time. 🏎️\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartSetup #KartTips"],
  ''))

P.append(('light', 'compare', 'Side by side',
  '<div class="kick">Compare setups</div>'
  '<div class="d" style="font-size:64px;margin-top:8px;">Side by side.</div>'
  '<div class="cmp" style="margin-top:14px;">'
  '<div class="h"><span>Setup</span><span>Session A</span><span>Session B</span></div>'
  '<div class="c"><span>Rear width</span><span>1395 mm</span><span>1390 mm</span></div>'
  '<div><span>Axle</span><span>Hard</span><span>Hard</span></div>'
  '<div class="c"><span>Rear sprocket</span><span>80</span><span>81</span></div>'
  '<div><span>Caster</span><span>Medium</span><span>Medium</span></div>'
  '<div><span>Best lap</span><span>0:58.92</span><span>0:58.61</span></div></div>'
  '<div style="margin-top:12px;display:flex;align-items:center;gap:10px;"><span class="pdfb">EXPORT PDF</span>'
  '<span class="sub" style="font-size:11px;">Changes highlighted. Example data.</span></div>'
  '<p class="sub" style="margin-top:auto;">Pick any two sessions and see exactly what changed.</p>',
  'Compare setups', [
  "Side by side. 🔍\n\nPick any two sessions in Kart Connect and see both setups next to each other, with every change highlighted.\n\nRear width down 5mm. One tooth up on the sprocket. 0.31s quicker. It's all right there. ⏱️\n\nThen export it as a PDF and share it with your mechanic or team. 📄\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartSetup #KartData",
  "Session A vs Session B. Every change, highlighted. 🔍\n\nCompare setups in Kart Connect.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartSetup",
  "Stop flicking between notes to work out what changed. 📋\n\nKart Connect puts any two setups side by side and highlights the differences, so you can spot what made the kart quicker in seconds, and export it as a PDF for the team. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartData"],
  'Based on the Compare Setups page in the app code (2 Oct). Example data.'))

P.append(('dark', 'garage', 'Your whole garage',
  '<div class="kick">Garage</div>'
  '<div class="d" style="font-size:44px;margin-top:8px;">Your whole garage.</div>'
  '<div class="d o" style="font-size:44px;">In your pocket.</div>'
  '<div class="gar" style="margin-top:16px;">'
  '<div><b>Drivers</b><span>Every driver on the team, with their own sessions</span></div>'
  '<div><b>Karts</b><span>Make, model and class</span></div>'
  '<div><b>Chassis</b><span>Chassis numbers and stiffness</span></div>'
  '<div><b>Engines</b><span>Every engine, nicknamed and ranked</span></div></div>',
  'Garage', [
  "Your whole garage. In your pocket. 🏎️\n\nDrivers, karts, chassis and engines, all saved in the Kart Connect Garage.\n\n👤 Every driver with their own sessions\n🏎️ Every kart: make, model and class\n🔩 Chassis numbers and stiffness\n⚙️ Every engine, nicknamed and ranked\n\nSet it up once and every session knows exactly what was on track. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartTeam #KartLife",
  "Drivers. Karts. Chassis. Engines. 🔧\n\nYour whole garage, in one app.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing",
  "How many karts, engines and chassis are you running this season? 🤯\n\nKeep track of all of it in the Kart Connect Garage, and every session is saved against the exact kit you ran. No more \"which engine was in for that?\" 👀\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartTeam"],
  'Based on the Garage page in the app code (2 Oct). Check the labels match the current app.'))

P.append(('light', 'tip-caster', 'Setup tip #2: Caster',
  tip(2, 'Caster.', ('More', 'Quicker rotation and more inside rear lift on turn-in. The first fix for understeer or poor turn-in.'),
      ('Less', 'The kart sits flatter with less rotation. More stable, but harder to turn in.'), REF_LINE),
  'Setup tip', [
  "SETUP TIP #2: CASTER 🔧\n\n⬆️ MORE: quicker rotation and more inside rear lift on turn-in. The first fix for understeer or poor turn-in.\n⬇️ LESS: the kart sits flatter with less rotation. More stable, but harder to turn in.\n\nFind every setup change explained in the Kart Connect Setup Reference, and log every change you make so you know what worked. 🏁\n\nSave this one. 📌\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartSetup #KartTips #KartRacing",
  "Understeer on turn-in? Try more caster. 🔧\n\nSave it for test day. 📌\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartSetup #KartTips",
  "Caster: small change, big difference. 🏎️\n\nMore gives you quicker rotation on turn-in. Less settles the kart down. Try it, log it in Kart Connect, and see exactly what it did. ⏱️\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartSetup #KartTips"],
  ''))

P.append(('dark', 'tracks', 'Every track. Every lap.',
  '<div class="kick">Tracks</div>'
  '<div class="d" style="font-size:46px;margin-top:8px;">Every track.</div>'
  '<div class="d" style="font-size:46px;">Every lap.</div>'
  '<div class="d o" style="font-size:46px;">Every condition.</div>'
  '<div class="trk" style="margin-top:16px;"><h6>Your home track</h6><div class="st">'
  '<div><span>Best lap</span><b>0:58.61</b></div><div><span>Sessions</span><b>24</b></div>'
  '<div><span>Live weather</span><b>14&deg;C</b></div><div><span>Humidity</span><b>72%</b></div></div></div>'
  '<p class="sub" style="margin-top:auto;">Example data.</p>',
  'Tracks', [
  "Every track. Every lap. Every condition. 🏁\n\nEvery track you race at gets its own page in Kart Connect: your best lap, every session you've run there and the live weather when you arrive.\n\nTurn up knowing exactly what worked last time, and what the conditions were when it did. 🌦️\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartData #KartLife",
  "Your best lap, every session and the live weather. One page per track. 📍\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing",
  "Going back to a track you haven't raced at in months? 🤔\n\nOpen it in Kart Connect and everything's there: your best lap, every session and setup you ran, and the conditions on the day. Start where you left off, not from scratch. 🏎️\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartData"],
  'Based on the Track page in the app code (2 Oct). Example data, and no track named.'))

pts = [(0, 59.42), (1, 59.30), (2, 59.33), (3, 59.11), (4, 59.02), (5, 58.95), (6, 58.79), (7, 58.61)]
W, Hh = 282, 120
ys = [p[1] for p in pts]; lo, hi = min(ys) - .05, max(ys) + .05
xy = [(8 + x * (W - 16) / 7, 10 + (y - lo) / (hi - lo) * (Hh - 24)) for x, y in pts]
path = 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in xy)
area = path + f' L{xy[-1][0]:.1f},{Hh} L{xy[0][0]:.1f},{Hh} Z'
dots = ''.join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3" fill="#7B5EA7"/>' for x, y in xy[:-1]) + \
       f'<circle cx="{xy[-1][0]:.1f}" cy="{xy[-1][1]:.1f}" r="5" fill="#3FAF3D"/>'
svg = (f'<svg viewBox="0 0 {W} {Hh}" width="100%" style="display:block;margin-top:6px;">'
       f'<defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7B5EA7" stop-opacity=".22"/>'
       f'<stop offset="1" stop-color="#7B5EA7" stop-opacity="0"/></linearGradient></defs>'
       f'<path d="{area}" fill="url(#ga)"/><path d="{path}" fill="none" stroke="#7B5EA7" stroke-width="2.5" stroke-linejoin="round"/>{dots}'
       f'<text x="{xy[0][0]:.1f}" y="{xy[0][1]+16:.1f}" font-size="9" font-weight="700" fill="#7A7388">0:59.42</text>'
       f'<text x="{xy[-1][0]-10:.1f}" y="{xy[-1][1]+3:.1f}" font-size="10" font-weight="800" fill="#3FAF3D" text-anchor="end">0:58.61</text></svg>')
P.append(('light', 'progression', 'Watch yourself get quicker',
  '<div class="kick">Analytics</div>'
  '<div class="d" style="font-size:50px;margin-top:8px;">Watch yourself</div>'
  '<div class="d o" style="font-size:50px;">get quicker.</div>'
  f'<div class="chart" style="margin-top:16px;"><h6><span>Best lap progression</span><em>&minus;0.81s</em></h6>{svg}</div>'
  '<p class="sub" style="margin-top:auto;">Your best lap at every session, on one chart. Example data.</p>',
  'Analytics', [
  "Watch yourself get quicker. 📈\n\nKart Connect plots your best lap from every session on one chart, so you can see your progress over the season, and the setups that got you there.\n\n0:59.42 ➡️ 0:58.61. That's 0.81s found, and every step of it logged. ⏱️\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartData #Progress",
  "0.81s quicker. Every step logged. 📈\n\nBest lap progression in Kart Connect.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartData",
  "Ever feel like you're not improving? Look at the data. 👀\n\nKart Connect tracks your best lap at every session and puts it on one chart. The line only tells the truth, and it's usually better than you think. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartData"],
  'Based on Best Lap Progression in Analytics in the app code (2 Oct). Example data.'))

P.append(('dark', 'tip-rims', 'Setup tip #3: Rim type',
  tip(3, 'Rim type.', ('Summer / hard', 'Controls tyre pressures and keeps the tyre cooler. Better in warm conditions.'),
      ('Winter / soft', 'Warms the tyre quicker but drops off sooner. Better in cold conditions.'), REF_LINE),
  'Setup tip', [
  "SETUP TIP #3: RIM TYPE 🔧❄️\n\nThe temperature's dropping, so this one matters.\n\n☀️ SUMMER / HARD: controls tyre pressures and keeps the tyre cooler. Better in warm conditions.\n❄️ WINTER / SOFT: warms the tyre quicker but drops off sooner. Better in cold conditions.\n\nLog which rims you ran in Kart Connect, alongside the live weather, and you'll know exactly what works when it's cold. 🏁\n\nSave this for winter testing. 📌\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartSetup #KartTips #WinterTesting",
  "Cold out? Think about your rims. ❄️\n\nWinter / soft warms the tyre quicker. Summer / hard keeps it cooler.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartSetup #KartTips",
  "Winter testing tip: don't forget your rims. ❄️🔧\n\nSoft rims get heat into the tyre quicker on cold days, but drop off sooner. Log what you ran and the conditions in Kart Connect, and next winter you'll know exactly what to bolt on. 🏎️\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartSetup #WinterTesting"],
  ''))

P.append(('light', 'five-reasons', '5 reasons to log every session',
  '<div class="kick">Why log it?</div>'
  '<div class="d" style="font-size:46px;margin-top:8px;">5 reasons to log</div>'
  '<div class="d o" style="font-size:46px;">every session.</div>'
  '<ul class="why" style="margin-top:16px;"><li>Know exactly why you went quicker</li><li>Never lose a quick setup again</li>'
  '<li>Start every track where you left off</li><li>Give your mechanic clear instructions</li><li>See your progress over the season</li></ul>',
  '5 reasons', [
  "5 reasons to log every session. 🏁\n\n1️⃣ Know exactly why you went quicker\n2️⃣ Never lose a quick setup again\n3️⃣ Start every track where you left off\n4️⃣ Give your mechanic clear instructions\n5️⃣ See your progress over the season\n\nKart Connect makes logging a session quick, so you can spend more time on track and less time on paperwork. ⏱️\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartSetup #KartData",
  "Log every session. Here's why. 👇\n\nQuicker laps. No lost setups. Clear instructions. Real progress.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing",
  "Still not logging every session? Here are 5 reasons to start this weekend. 📋\n\nThe quickest drivers aren't guessing. They know what worked, why it worked and how to get back to it. Kart Connect gives you all of that, session after session. 🏎️\n\nSave this and share it with your team. 📌\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartData"],
  ''))

page = ('<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Batch 4</title>'
        f'<style>{CSS6}</style></head><body>'
        + ''.join(g4.tile4(t, g4.shrink(h), f).replace(f'<section class="s {t}">', f'<section class="s {t}{" hw" if s == "halloween" else ""}">', 1)
                  for t, s, _, h, f, _, _ in P) + '</body></html>')
open(os.path.join(HERE, 'queue6.html'), 'w').write(page)

src = open(os.path.join(HERE, 'pack', 'index.html')).read()
head = src[:src.index('<main>')].replace('Kart Connect Post Queue', 'Kart Connect New Posts')
tail = src[src.index('</main>'):]
arts = []
for i, (t, slug, title, _, _, caps, note) in enumerate(P, 1):
    capsh = ''.join(f'<div class="cap"><div class="cap-h"><span>Caption {"ABC"[j]}</span><button type="button" id="b{i}-{j}" data-t="t{i}-{j}">Copy</button></div>'
                    f'<pre id="t{i}-{j}">{H.escape(c)}</pre></div>' for j, c in enumerate(caps))
    noteh = f'<p class="tip"><b>Check before posting:</b> {H.escape(note)}</p>' if note else ''
    arts.append(f'<article class="post" id="p{i}"><div class="meta"><span class="n">{i:02d}</span><span class="title">{H.escape(title)}</span></div>'
                f'<div class="row"><figure><img src="{i:02d}-{slug}.png" alt="{H.escape(title)}" width="1080" height="1350" loading="lazy"></figure>'
                f'<div class="caps">{noteh}{capsh}</div></div></article>')
main = (f'<main><header><h1>New <span>posts</span></h1><p class="lede">{len(P)} new single-image posts for review, alternating dark and light. '
        'Pick a caption for each, then press and hold an image to save it.</p></header>' + ''.join(arts))
os.makedirs(os.path.join(HERE, 'pack3'), exist_ok=True)
open(os.path.join(HERE, 'pack3', 'index.html'), 'w').write(head + main + tail)
json.dump([{'n': i, 'slug': s, 'title': ti, 'captions': c, 'note': no} for i, (_, s, ti, _, _, c, no) in enumerate(P, 1)],
          open(os.path.join(HERE, 'pack3', 'queue.json'), 'w'), indent=2, ensure_ascii=False)
print(len(P), 'posts')
