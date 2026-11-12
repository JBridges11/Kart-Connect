"""Batch 8: ten more single-image posts in the v4 style, using real app screenshots. Reuses gen9's CSS.
Writes queue10.html and pack7/index.html (review page with captions)."""
import os, json, html as H, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('gen9', os.path.join(HERE, 'gen9.py'))
g9 = importlib.util.module_from_spec(spec); spec.loader.exec_module(g9)
g4 = g9.g4

CSS10 = g9.CSS9 + r'''
.shot2 { border: 5px solid #0B0B10; border-radius: 10px; background: #0B0B10; overflow: hidden; box-shadow: 0 14px 30px rgba(0,0,0,.45); }
.s.light .shot2 { box-shadow: 0 12px 28px rgba(26,16,51,.25); }
.shot2 img { display: block; width: 100%; border-radius: 5px; }
.date { display: flex; gap: 6px; }
.date div { flex: 1; border-radius: 10px; padding: 10px 4px; text-align: center; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14); }
.date b { display: block; font-family: 'Anton'; font-weight: 400; font-size: 54px; line-height: 1; }
.date span { font-size: 8px; font-weight: 800; letter-spacing: .2em; text-transform: uppercase; opacity: .75; }
.date div:nth-child(1) b { color: #F5C842; } .date div:nth-child(2) b { color: #5CC85A; } .date div:nth-child(3) b { color: #A07FE0; }
.price { display: flex; flex-direction: column; gap: 6px; }
.price div { display: flex; justify-content: space-between; align-items: center; border-radius: 10px; padding: 9px 12px; background: #fff; color: #1A1033;
             box-shadow: 0 3px 12px rgba(26,16,51,.08); }
.price div.hi { background: #1A1033; color: #fff; }
.price b { font-family: 'Anton'; font-weight: 400; font-size: 18px; text-transform: uppercase; }
.price span { text-align: right; font-size: 9px; font-weight: 700; opacity: .75; line-height: 1.3; }
.price span s { opacity: .6; } .price span em { font-style: normal; display: block; font-family: 'Anton'; font-size: 17px; opacity: 1; color: #7B5EA7; }
.price div.hi span em { color: #F5C842; }
.burst { display: inline-block; font-family: 'Anton'; font-size: 20px; padding: 6px 12px; border-radius: 8px; transform: rotate(-4deg);
         background: linear-gradient(95deg, #F5C842, #5CC85A); color: #1A1033; }
.cl { list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; }
.cl li { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; }
.cl li::before { content: ""; flex: none; width: 15px; height: 15px; border-radius: 4px; border: 2px solid #7B5EA7; }
.cl li.ok::before { background: #5CC85A; border-color: #5CC85A; }
.big2 { font-family: 'Anton'; font-size: 64px; line-height: 1; }
'''

P = []  # (theme, slug, title, inner, foot, captions, note)

P.append(('dark', 'mark-the-date', 'Mark the date',
  '<div class="kick">Launch day</div>'
  '<div class="d" style="font-size:56px;margin-top:8px;">Mark the date.</div>'
  '<div class="date" style="margin-top:18px;"><div><b>01</b><span>Day</span></div><div><b>12</b><span>Month</span></div><div><b>26</b><span>Year</span></div></div>'
  '<div class="d o" style="font-size:46px;margin-top:20px;">Live on the web.</div>'
  '<ul class="ul" style="margin-top:14px;list-style:none;display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700;">'
  '<li>&#9656; Setup logging &amp; live weather</li><li>&#9656; Data Logger for every major brand</li><li>&#9656; QR mode for your mechanics</li></ul>'
  '<p class="sub" style="margin-top:auto;font-weight:700;">Stop guessing. Start winning. kart-connect.com</p>',
  'Launch day', [
  "Mark the date. 🗓️🏁\n\n1st December 2026: Kart Connect goes live on the web.\n\nEvery setup, every session, every lap, plus the Data Logger for AiM, Unipro, Alfano and Starlane, all in one place.\n\nSet a reminder. Tell your team. Tag a mate who needs this 👇\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #LaunchDay #Motorsport",
  "01.12.26 🏁\n\nKart Connect. Live on the web.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing",
  "The countdown is on. ⏳\n\nOn 1st December, Kart Connect launches on the web. Built for drivers, mechanics and team managers who are done guessing.\n\nStop guessing. Start winning. 🏆\n\nTurn on post notifications 🔔 so you don't miss it.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #Motorsport"],
  ''))

P.append(('light', 'dash-scanner', 'Snap your dash. Done.',
  '<div class="kick">Dashboard scanner</div>'
  '<div class="d" style="font-size:50px;margin-top:8px;">Snap your dash.</div>'
  '<div class="d o" style="font-size:50px;">Done.</div>'
  '<div class="em" style="margin-top:16px;color:#fff;background:#1A1033;padding:10px;border-radius:12px;">'
  '<div><h6>Engine temp</h6><p>Max <b>58<small>&deg;C</small></b></p><p>Low <b>44<small>&deg;C</small></b></p></div>'
  '<div><h6>RPM</h6><p>Max <b>14,816</b></p><p>Low <b>8,951</b></p></div>'
  '<div><h6>Speed</h6><p>Max <b>97<small>kph</small></b></p><p>Low <b>46<small>kph</small></b></p></div>'
  '<div><h6>Exhaust temp</h6><p>Max <b>628<small>&deg;C</small></b></p><p>Low <b>471<small>&deg;C</small></b></p></div></div>'
  '<p class="sub" style="margin-top:auto;">Photo your logger screen after the session. Your engine data fills itself in. Example data.</p>',
  'Dashboard scanner', [
  "Snap your dash. Done. 📸\n\nCome off track, take a photo of your logger screen, and Kart Connect scans in your post-session engine data for you:\n\n🔥 Engine temp\n⚙️ RPM\n💨 Speed\n🌡️ Exhaust temp\n\nMax and low, saved straight into the session. No typing, no scribbling, no forgetting. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartData #KartEngine",
  "Photo your dash. Engine data done. 📸✅\n\nThe Kart Connect dashboard scanner.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartData",
  "Still writing down your max RPM and engine temps after every session? ✍️\n\nJust snap your logger screen. Kart Connect reads it and fills in your post-session engine data automatically, so you're back in the awning in seconds. ⏱️\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartEngine"],
  'Example values. Check the scanner reads the same fields in the current app.'))

P.append(('dark', 'every-channel', 'Every channel. Overlaid.',
  '<div class="kick">Data Logger</div>'
  '<div class="d" style="font-size:56px;margin-top:8px;">Every channel.</div>'
  '<div class="d o" style="font-size:56px;">Overlaid.</div>'
  '<div class="shot2" style="margin-top:16px;"><img src="logger-channel-bar.png" alt="" style="background:#fff;"><img src="logger-channels.png" alt=""></div>'
  '<p class="sub" style="margin-top:auto;">Speed, RPM, EGT, water temp and a live time delta, lap against lap.</p>',
  'Data Logger', [
  "Every channel. Overlaid. 📈\n\nSpeed. RPM. EGT. Water temp. And a live time delta running underneath it all.\n\nThe Kart Connect Data Logger lays two laps on top of each other, channel by channel, so you can see exactly where the time came from, and exactly where it went. ⏱️\n\nAiM, Unipro, Alfano and Starlane. Live on the web 1st December. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartData #KartRacing",
  "Two laps. Every channel. One screen. 📈\n\nThe Kart Connect Data Logger. Live 1st December.\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting",
  "Where did that 0.37s go? 🤔\n\nOverlay speed, RPM, EGT and water temp for any two laps, and watch the time delta build corner by corner. The answer's in the data. 👀\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartData"],
  'Real screenshot with the track name cropped out.'))

P.append(('light', 'your-line', 'Your line. Their line.',
  '<div class="kick">GPS track map</div>'
  '<div class="d" style="font-size:56px;margin-top:8px;">Your line.</div>'
  '<div class="d o" style="font-size:56px;">Their line.</div>'
  '<div style="display:flex;justify-content:center;margin-top:14px;"><div class="shot2" style="width:58%;"><img src="logger-map.png" alt=""></div></div>'
  '<p class="sub" style="margin-top:auto;">Racing lines drawn from GPS and colour-coded slow to fast.</p>',
  'GPS track map', [
  "Your line. Their line. 🗺️\n\nThe Kart Connect Data Logger draws every lap from GPS and colours it from slow to fast. Drop in two laps and see exactly where the lines split, who's carrying more speed and where. 👀\n\nThe track doesn't lie. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #RacingLine #KartData",
  "Slow. Fast. Faster. 🟠🟡🟢\n\nYour racing line, drawn from GPS.\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting",
  "Think you're using all of the track? 😅\n\nThe GPS map in Kart Connect shows your exact line, lap after lap, so you can see where you're tight, where you're wide and where the speed's hiding. 🏎️\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #RacingLine"],
  'Real screenshot. The layout is a real circuit, so some people may recognise it.'))

P.append(('dark', 'theoretical-best', '0.21s in the tank',
  '<div class="kick">Sector analysis</div>'
  '<div class="d" style="font-size:42px;margin-top:8px;">1:01.81 on the board.</div>'
  '<div class="d o" style="font-size:42px;">1:01.60 in the tank.</div>'
  '<div class="secs3" style="margin-top:18px;"><div><span>SECTOR 1</span><b>19.70</b><em class="dn">Best</em></div>'
  '<div><span>SECTOR 2</span><b>20.50</b><em class="dn">Best</em></div><div><span>SECTOR 3</span><b>21.60</b><em class="dn">Best</em></div></div>'
  '<div style="margin-top:14px;display:flex;align-items:center;gap:12px;"><span class="burst">+0.21s</span>'
  '<span class="sub" style="font-size:12px;font-weight:700;">Gap to your theoretical best</span></div>'
  '<p class="sub" style="margin-top:auto;">Your quickest sectors, stitched into one perfect lap.</p>',
  'Sector analysis', [
  "1:01.81 on the board. 1:01.60 in the tank. ⏱️\n\nKart Connect splits every lap into three sectors and builds your theoretical best from your quickest ones.\n\nThat's 0.21s you've already driven, just never in the same lap. Now you know exactly where to find it. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartData #KartRacing",
  "Your perfect lap already exists. You just haven't put it together yet. 🧩\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartData",
  "How quick could you really be? 🤔\n\nTake your best sector 1, best sector 2 and best sector 3. Put them together. That's your theoretical best, worked out for you after every session in Kart Connect. 🏆\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartRacing"],
  'Times taken from your real session report.'))

P.append(('light', 'session-report', 'Your session. On one page.',
  '<div class="kick">Session reports</div>'
  '<div class="d" style="font-size:50px;margin-top:8px;">Your session.</div>'
  '<div class="d o" style="font-size:50px;">On one page.</div>'
  '<div style="display:flex;justify-content:center;margin-top:12px;"><div class="shot2" style="width:42%;transform:rotate(-2deg);"><img src="report-datalogger.png" alt=""></div></div>'
  '<p class="sub" style="margin-top:auto;">Lap times, traces and sectors, ready to share.</p>',
  'Session reports', [
  "Your session. On one page. 📄\n\nLap times. Speed, RPM, water and EGT traces. Time delta. Sector analysis and your theoretical best.\n\nKart Connect turns every session into a clean PDF report you can send to your mechanic, your team or your sponsors in one tap. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartData #DataLogger",
  "One session. One page. Everything in it. 📄\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartData",
  "Need to show your sponsor, parent or mechanic how the day went? 📲\n\nSend them a Kart Connect session report: lap times, traces and sectors, all on one tidy page. 💼\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartData"],
  'Real report with the driver and track names replaced.'))

P.append(('dark', 'six-differences', '6 differences. Found in seconds.',
  '<div class="kick">Compare sessions</div>'
  '<div class="d" style="font-size:50px;margin-top:8px;">6 differences.</div>'
  '<div class="d o" style="font-size:50px;">Found in seconds.</div>'
  '<div class="shot2" style="margin-top:14px;"><img src="compare-report.png" alt=""></div>'
  '<p class="sub" style="margin-top:auto;">Pick two sessions. Every setup change, highlighted.</p>',
  'Compare sessions', [
  "6 differences. Found in seconds. 🔍\n\nTest 1 vs Test 3. Carb, exhaust, axle, sprocket, sprocket carrier and tyres, all picked out and highlighted automatically.\n\nPick any two sessions in Kart Connect and see exactly what changed, then export it as a PDF for the team. 📄\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartSetup #KartRacing #KartData",
  "Two sessions. Every difference. Highlighted. 🔍\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartSetup",
  "What did we change between Test 1 and Test 3? 🤷\n\nKart Connect knows. Compare any two sessions and every setup change is listed for you, so you can see exactly what made the difference. ⏱️\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartSetup"],
  'Real comparison, with the track and kart names replaced and values as you asked.'))

P.append(('light', 'save-20', 'Save 20% on annual',
  '<div class="kick">Plans</div>'
  '<div class="d" style="font-size:52px;margin-top:8px;">Pay yearly.</div>'
  '<div class="d o" style="font-size:52px;">Save 20%.</div>'
  '<div class="price" style="margin-top:14px;">'
  '<div><b>Privateer</b><span><s>&pound;155.88</s><em>&pound;124.99/yr</em></span></div>'
  '<div class="hi"><b>Team</b><span><s>&pound;359.88</s><em>&pound;287.99/yr</em></span></div>'
  '<div><b>Pro Team</b><span><s>&pound;599.88</s><em>&pound;479.99/yr</em></span></div></div>'
  '<p class="sub" style="margin-top:auto;">Monthly from &pound;12.99. 30-day free trial on Privateer.</p>',
  'Plans', [
  "Pay yearly. Save 20%. 💰\n\n🏎️ PRIVATEER: £124.99/year (instead of £155.88)\n👥 TEAM: £287.99/year (instead of £359.88)\n🏆 PRO TEAM: £479.99/year (instead of £599.88)\n\nOr pay monthly from £12.99, with a 30-day free trial on Privateer.\n\nLive on the web 1st December. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartTeam",
  "Same Kart Connect. 20% less. 💰\n\nGo annual and save on every plan.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing",
  "A full season of Kart Connect for less than £10.50 a month? 👀\n\nPrivateer annual is £124.99, a 20% saving on paying monthly. Team and Pro Team save 20% too.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing"],
  'Prices from the app code (2 Oct). Confirm they are still current.'))

P.append(('dark', 'test-day-checklist', 'Test day checklist',
  '<div class="kick">Save this</div>'
  '<div class="d" style="font-size:54px;margin-top:8px;">Test day</div>'
  '<div class="d o" style="font-size:54px;">checklist.</div>'
  '<ul class="cl" style="margin-top:16px;">'
  '<li class="ok">Baseline setup loaded</li><li class="ok">Cold pressures set</li><li class="ok">Weather saved</li><li class="ok">Engine, carb, exhaust</li>'
  '<li>Hot pressures in</li><li>Dash scanned</li><li>Voice note recorded</li><li>One change at a time</li></ul>'
  '<p class="sub" style="margin-top:auto;font-weight:700;">Tick it off in Kart Connect.</p>',
  'Save this', [
  "Test day checklist ✅ Save this one. 📌\n\n✅ Baseline setup loaded\n✅ Cold pressures set\n✅ Weather saved\n✅ Engine, carb and exhaust picked\n⬜ Hot pressures in\n⬜ Dash scanned\n⬜ Voice note recorded\n⬜ ONE change at a time\n\nEvery box ticks off in Kart Connect, so nothing gets missed and every change is logged. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #TestDay #KartSetup #KartRacing",
  "Save this for your next test day. 📌✅\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #TestDay",
  "The golden rule of test days? One change at a time. 🧠\n\nLog it, run it, compare it. Kart Connect keeps every change and every result, so you know exactly what worked. Share this with your mechanic 👇\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #TestDay #KartSetup"],
  ''))

P.append(('light', 'start-winning', 'Stop guessing. Start winning.',
  '<div class="kick">Kart Connect</div>'
  '<div class="d" style="font-size:78px;margin-top:10px;">Stop</div>'
  '<div class="d" style="font-size:78px;">guessing.</div>'
  '<div class="d o" style="font-size:78px;">Start</div>'
  '<div class="d o" style="font-size:78px;">winning.</div>'
  '<p class="sub" style="margin-top:auto;font-weight:700;">Live on the web 1 December. kart-connect.com</p>',
  'Kart Connect', [
  "Stop guessing. Start winning. 🏆\n\nEvery setup. Every session. Every lap. Every logger. One app for drivers, mechanics and team managers.\n\nLive on the web 1st December. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #Motorsport #KartLife",
  "Stop guessing. Start winning. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting",
  "Guessing gets you midfield. Data gets you on the podium. 🏆\n\nKart Connect: setup logging, Data Logger, tyre pressures, QR mode for mechanics and more. Live 1st December.\n\nStop guessing. Start winning.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #Motorsport"],
  ''))

page = ('<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Batch 8</title>'
        f'<style>{CSS10}</style></head><body>'
        + ''.join(g4.tile4(t, g4.shrink(h), f) for t, _, _, h, f, _, _ in P) + '</body></html>')
open(os.path.join(HERE, 'queue10.html'), 'w').write(page)

HEAD = '''<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Kart Connect New Posts</title>
<style>
:root { --bg:#F4F1FA; --card:#FFFFFF; --ink:#1A1033; --mid:#4A4358; --lt:#7A7388; --rule:#E4DDF0; --accent:#7B5EA7; --on:#fff; --hl:#F5C842; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#0E0A18; --card:#1A1230; --ink:#F3F0FA; --mid:#CFC8DE; --lt:#9A92AE; --rule:#2C2342; --accent:#B79CE6; --on:#160F28; color-scheme:dark; } }
:root[data-theme="dark"] { --bg:#0E0A18; --card:#1A1230; --ink:#F3F0FA; --mid:#CFC8DE; --lt:#9A92AE; --rule:#2C2342; --accent:#B79CE6; --on:#160F28; color-scheme:dark; }
* { box-sizing:border-box; } body { margin:0; background:var(--bg); color:var(--ink); font-family:Inter,Arial,sans-serif; }
.chk { height:10px; background:repeating-conic-gradient(var(--ink) 0 25%, transparent 0 50%) 0 0/10px 10px; }
main { max-width:760px; margin:0 auto; padding:28px 16px 48px; display:flex; flex-direction:column; gap:22px; }
h1 { font-size:clamp(32px,7vw,56px); text-transform:uppercase; margin:0; } h1 span { color:var(--accent); }
.lede { color:var(--mid); line-height:1.6; margin:10px 0 0; }
.post { background:var(--card); border:1px solid var(--rule); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:12px; }
.meta { display:flex; gap:12px; align-items:baseline; } .n { font-weight:900; font-size:26px; color:var(--accent); } .title { font-weight:700; font-size:17px; }
figure { margin:0; max-width:420px; } figure img { width:100%; height:auto; display:block; border-radius:6px; }
.caps { display:flex; flex-direction:column; gap:10px; } .cap { border:1px solid var(--rule); border-radius:8px; padding:10px 12px; }
.cap-h { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
.cap-h span { font-size:11px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--lt); }
pre { margin:0; font-family:inherit; font-size:13.5px; line-height:1.55; color:var(--mid); white-space:pre-wrap; }
button { font:600 12px Inter,Arial,sans-serif; background:var(--accent); color:var(--on); border:0; border-radius:6px; padding:6px 12px; cursor:pointer; }
button:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
.tip { font-size:13px; color:var(--lt); margin:0; }
</style></head><body><div class="chk"></div>'''
TAIL = '''<div class="chk"></div><script>
document.querySelectorAll('button[data-t]').forEach(b => b.addEventListener('click', () => {
  const pre = document.getElementById(b.dataset.t);
  const done = () => { b.textContent = 'Copied'; setTimeout(() => b.textContent = 'Copy', 1500); };
  const pick = () => { const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Selected'; };
  try { navigator.clipboard.writeText(pre.textContent).then(done, pick); } catch (e) { pick(); }
}));
</script></body></html>'''
arts = []
for i, (t, slug, title, _, _, caps, note) in enumerate(P, 1):
    capsh = ''.join(f'<div class="cap"><div class="cap-h"><span>Caption {"ABC"[j]}</span><button type="button" id="b{i}-{j}" data-t="t{i}-{j}">Copy</button></div>'
                    f'<pre id="t{i}-{j}">{H.escape(c)}</pre></div>' for j, c in enumerate(caps))
    noteh = f'<p class="tip"><b>Check before posting:</b> {H.escape(note)}</p>' if note else ''
    arts.append(f'<article class="post"><div class="meta"><span class="n">{i:02d}</span><span class="title">{H.escape(title)}</span></div>'
                f'<figure><img src="{i:02d}-{slug}.png" alt="{H.escape(title)}" width="1080" height="1350" loading="lazy"></figure>'
                f'{noteh}<div class="caps">{capsh}</div></article>')
main = (f'<main><header><h1>Ten <span>more</span></h1><p class="lede">{len(P)} new posts, alternating dark and light, each with three captions underneath. '
        'Press and hold an image to save it, then copy a caption.</p></header>' + ''.join(arts) + '</main>')
os.makedirs(os.path.join(HERE, 'pack7'), exist_ok=True)
open(os.path.join(HERE, 'pack7', 'index.html'), 'w').write(HEAD + main + TAIL)
json.dump([{'n': i, 'slug': s, 'title': ti, 'captions': c, 'note': no} for i, (_, s, ti, _, _, c, no) in enumerate(P, 1)],
          open(os.path.join(HERE, 'pack7', 'queue.json'), 'w'), indent=2, ensure_ascii=False)
print(len(P), 'posts')
