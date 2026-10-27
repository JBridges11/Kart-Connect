"""Batch 5: five more feature posts with app-style mock-ups, in the v4 style. Reuses gen6's CSS.
Writes queue7.html and pack4/index.html."""
import os, json, html as H, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('gen6', os.path.join(HERE, 'gen6.py'))
g6 = importlib.util.module_from_spec(spec); spec.loader.exec_module(g6)
g4 = g6.g4

CSS7 = g6.CSS6 + r'''
/* engine monitoring */
.em { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.em div { border-radius: 10px; padding: 9px 12px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14); }
.em h6 { font-size: 8px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; opacity: .75; margin-bottom: 3px; }
.em p { display: flex; justify-content: space-between; align-items: baseline; font-size: 9px; font-weight: 700; opacity: .9; }
.em p b { font-family: 'Anton'; font-weight: 400; font-size: 20px; line-height: 1.15; }
.em p b small { font-family: 'Inter'; font-size: 9px; font-weight: 700; margin-left: 2px; opacity: .7; }
.em div:nth-child(1) p:first-of-type b { color: #FF8A3D; } .em div:nth-child(2) p:first-of-type b { color: #F5C842; }
.em div:nth-child(3) p:first-of-type b { color: #5CC85A; } .em div:nth-child(4) p:first-of-type b { color: #FF8A3D; }
/* search */
.srch { display: flex; align-items: center; gap: 9px; background: #fff; border-radius: 10px; padding: 11px 13px; box-shadow: 0 4px 16px rgba(26,16,51,.1);
        font-size: 12.5px; font-weight: 700; color: #1A1033; border: 2px solid #7B5EA7; }
.srch svg { flex: none; }
.srch i { width: 2px; height: 15px; background: #7B5EA7; margin-left: -6px; }
.res { background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 16px rgba(26,16,51,.08); color: #1A1033; }
.res div { display: grid; grid-template-columns: 1fr auto; padding: 9px 13px; border-bottom: 1px solid #EEE9F6; align-items: center; }
.res div:last-child { border-bottom: 0; }
.res b { font-size: 12px; font-weight: 700; }
.res span { display: block; font-size: 9.5px; font-weight: 600; color: #7A7388; margin-top: 2px; }
.res em { font-style: normal; font-family: 'Anton'; font-size: 17px; color: #7B5EA7; }
.res mark { background: #FFF1B8; color: inherit; padding: 0 2px; border-radius: 2px; }
.tags { display: flex; gap: 5px; }
.tags span { font-size: 9px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; padding: 5px 8px; border-radius: 999px; background: #E9E2F6; color: #7B5EA7; }
/* branded sheet */
.sheet { background: #fff; border-radius: 6px; color: #1A1033; box-shadow: 0 18px 40px rgba(0,0,0,.45); overflow: hidden; transform: rotate(-2deg); width: 92%; margin-left: 4%; }
.sheet .bar { background: linear-gradient(95deg, #C8102E, #8A0B20); color: #fff; padding: 10px 14px; display: flex; align-items: center; gap: 10px; }
.sheet .lg { width: 34px; height: 34px; border-radius: 6px; border: 2px dashed rgba(255,255,255,.8); display: grid; place-items: center; font-size: 6.5px; font-weight: 800; text-align: center; line-height: 1.1; }
.sheet .bar b { font-family: 'Anton'; font-weight: 400; font-size: 17px; letter-spacing: .04em; text-transform: uppercase; }
.sheet .bar span { display: block; font-size: 8px; font-weight: 700; opacity: .85; letter-spacing: .1em; text-transform: uppercase; }
.sheet .rows { padding: 8px 14px 10px; }
.sheet .rows div { display: flex; justify-content: space-between; font-size: 10px; font-weight: 600; padding: 4px 0; border-bottom: 1px solid #F0EDF5; }
.sheet .rows div b { font-weight: 800; }
.sheet .ft { font-size: 7px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #9A93A8; padding: 0 14px 9px; }
/* session card */
.sc { background: #fff; border-radius: 12px; box-shadow: 0 4px 16px rgba(26,16,51,.08); color: #1A1033; padding: 12px 14px; }
.sc .tp { display: flex; justify-content: space-between; align-items: flex-start; }
.sc .tp b { font-family: 'Anton'; font-weight: 400; font-size: 20px; text-transform: uppercase; line-height: 1.05; }
.sc .tp span { display: block; font-size: 9px; font-weight: 700; color: #7A7388; letter-spacing: .06em; margin-top: 2px; }
.sc .tp em { font-style: normal; font-family: 'Anton'; font-size: 24px; color: #3FAF3D; }
.sc .ln { display: flex; align-items: center; gap: 8px; font-size: 10.5px; font-weight: 600; padding: 7px 0; border-top: 1px solid #EEE9F6; }
.sc .ln:first-of-type { margin-top: 8px; }
.sc .ln i { flex: none; font-style: normal; font-size: 7.5px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #7B5EA7; width: 56px; }
.sc .wave { display: flex; align-items: center; gap: 2px; height: 16px; }
.sc .wave s { display: block; width: 3px; border-radius: 2px; background: #7B5EA7; text-decoration: none; }
.sc .chip { font-size: 9px; font-weight: 700; padding: 3px 6px; border-radius: 4px; background: #F1EDF8; }
/* season numbers */
.nums { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.nums div { border-radius: 12px; padding: 12px 14px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14); }
.nums b { display: block; font-family: 'Anton'; font-weight: 400; font-size: 46px; line-height: 1; }
.nums span { font-size: 9px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; opacity: .8; }
.nums div:nth-child(1) b { color: #F5C842; } .nums div:nth-child(2) b { color: #5CC85A; }
.nums div:nth-child(3) b { color: #A07FE0; } .nums div:nth-child(4) b { color: #fff; }
'''

P = []

P.append(('dark', 'engine-monitoring', 'Know your engine',
  '<div class="kick">Engine monitoring</div>'
  '<div class="d" style="font-size:56px;margin-top:8px;">Know your</div>'
  '<div class="d o" style="font-size:56px;">engine.</div>'
  '<div class="em" style="margin-top:16px;">'
  '<div><h6>Engine temp</h6><p>Max <b>58<small>&deg;C</small></b></p><p>Low <b>44<small>&deg;C</small></b></p></div>'
  '<div><h6>RPM</h6><p>Max <b>15,820</b></p><p>Low <b>9,940</b></p></div>'
  '<div><h6>Speed</h6><p>Max <b>112<small>kph</small></b></p><p>Low <b>46<small>kph</small></b></p></div>'
  '<div><h6>Exhaust temp</h6><p>Max <b>612<small>&deg;C</small></b></p><p>Low <b>488<small>&deg;C</small></b></p></div></div>'
  '<p class="sub" style="margin-top:auto;">Max and low for every session, saved with the setup. Example data.</p>',
  'Engine monitoring', [
  "Know your engine. 🔥\n\nEngine temp, RPM, speed and exhaust temp: max and low for every session, saved right alongside your setup in Kart Connect.\n\nSee exactly how the engine was running when you went quickest, and spot when something's not right before it costs you a race. ⚙️\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartEngine #KartData",
  "Engine temp. RPM. Speed. Exhaust temp. 🔥\n\nMax and low, every session, saved with the setup.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartData",
  "Running hot? Down on revs? 🤔\n\nKart Connect saves your engine numbers from every session, so you can compare them against your setup and lap times and see exactly what the engine was doing when it all clicked. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartEngine"],
  'Based on the Engine Monitoring card in the app code (2 Oct). Example data.'))

ICON = ('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7B5EA7" stroke-width="2.6" stroke-linecap="round">'
        '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>')
P.append(('light', 'search', 'Find any session. In seconds.',
  '<div class="kick">Search</div>'
  '<div class="d" style="font-size:44px;margin-top:8px;">Find any session.</div>'
  '<div class="d o" style="font-size:44px;">In seconds.</div>'
  f'<div class="srch" style="margin-top:16px;">{ICON}<span>Qualifying</span><i></i></div>'
  '<div class="res" style="margin-top:8px;">'
  '<div><span style="margin:0"><b><mark>Qualifying</mark> &middot; Round 6</b><span>Sat 4 Oct &middot; Dry &middot; 16&deg;C</span></span><em>0:58.61</em></div>'
  '<div><span style="margin:0"><b><mark>Qualifying</mark> &middot; Round 5</b><span>Sat 13 Sep &middot; Wet &middot; 12&deg;C</span></span><em>1:04.82</em></div>'
  '<div><span style="margin:0"><b><mark>Qualifying</mark> &middot; Round 4</b><span>Sat 16 Aug &middot; Dry &middot; 24&deg;C</span></span><em>0:58.97</em></div></div>'
  '<p class="sub" style="margin-top:auto;">Search by track, event type or date. Example data.</p>',
  'Search', [
  "Find any session. In seconds. 🔍\n\nThat quick qualifying run from August? The wet session in September? Just search.\n\nKart Connect lets you search every session by track, event type or date, and open the full setup, conditions and lap times in one tap. ⏱️\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartData #KartSetup",
  "Search. Tap. There's your setup. 🔍\n\nEvery session, searchable by track, event type or date.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing",
  "No more scrolling through your camera roll looking for a photo of a setup sheet. 📸❌\n\nType the track, the event or the date into Kart Connect and every matching session is right there, with the setup, the weather and the lap time. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartData"],
  'Based on the session search on the Dashboard in the app code (2 Oct). Example data.'))

P.append(('dark', 'branded-sheets', 'Your team. Your branding.',
  '<div class="kick">Pro Team</div>'
  '<div class="d" style="font-size:46px;margin-top:8px;">Your team.</div>'
  '<div class="d o" style="font-size:46px;">Your branding.</div>'
  '<div class="sheet" style="margin-top:20px;"><div class="bar"><div class="lg">YOUR<br>LOGO</div><div><b>Your Team Racing</b><span>Setup sheet &middot; Heat 2</span></div></div>'
  '<div class="rows"><div><span>Rear width</span><b>1390 mm</b></div><div><span>Axle</span><b>Hard</b></div>'
  '<div><span>Rear sprocket</span><b>81</b></div><div><span>Tyre pressures (FL/FR/RL/RR)</span><b>9.19 / 8.41 / 9.63 / 8.77</b></div></div>'
  '<div class="ft">Generated with Kart Connect</div></div>'
  '<p class="sub" style="margin-top:auto;">Setup sheets with your team&rsquo;s logo and colours.</p>',
  'Pro Team', [
  "Your team. Your branding. 🏆\n\nOn Pro Team, every setup sheet you export from Kart Connect carries your team's logo and colours.\n\nHand it to your drivers, mechanics, sponsors or parents and it looks like it came straight from a factory team. Because it did. 😉\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartTeam #Motorsport",
  "Setup sheets with YOUR logo on. 🏁\n\nTeam-branded setup sheets on Kart Connect Pro Team.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartTeam",
  "Running a professional outfit? Make it look like one. 💼\n\nKart Connect Pro Team adds your team's logo and colours to every setup sheet, so everything that leaves your awning is on-brand, from test day to race day. 🏎️\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartTeam"],
  'Based on "White-label setup sheets with team branding & logo" on Pro Team in the app code (2 Oct). The red team colours and name are placeholders.'))

bars = ''.join(f'<s style="height:{h}px"></s>' for h in [5, 9, 14, 8, 12, 16, 7, 11, 15, 6, 10, 13, 8, 5, 12, 9, 14, 7, 4, 10, 13, 6])
P.append(('light', 'one-session', 'One session. Everything in it.',
  '<div class="kick">Every session</div>'
  '<div class="d" style="font-size:44px;margin-top:8px;">One session.</div>'
  '<div class="d o" style="font-size:44px;">Everything in it.</div>'
  '<div class="sc" style="margin-top:16px;"><div class="tp"><div><b>Heat 2</b><span>RACE WEEKEND &middot; ROUND 6</span></div><em>0:58.61</em></div>'
  '<div class="ln"><i>Setup</i><span class="chip">Rear 1390</span><span class="chip">Axle hard</span><span class="chip">Sprocket 81</span></div>'
  '<div class="ln"><i>Weather</i>16&deg;C &middot; Dry &middot; 64% humidity</div>'
  '<div class="ln"><i>Kit</i>Engine 1 &middot; Carb 3 &middot; Exhaust 2</div>'
  f'<div class="ln"><i>Voice note</i><span class="wave">{bars}</span><span style="font-size:9px;color:#7A7388;">0:14</span></div>'
  '<div class="ln"><i>Pressures</i>9.19 / 8.41 / 9.63 / 8.77 psi</div></div>'
  '<p class="sub" style="margin-top:auto;">Example data.</p>',
  'Every session', [
  "One session. Everything in it. 🏁\n\nLap time. Setup. Weather. Engine, carb and exhaust. Tyre pressures. Your voice note from the dummy grid.\n\nEvery session in Kart Connect keeps the lot together, so when you look back you see the whole picture, not just a lap time. 📋\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartSetup #KartData",
  "Setup. Weather. Kit. Pressures. Voice notes. Lap time. ✅\n\nOne session. Everything in it.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing",
  "A lap time on its own tells you nothing. 🤷\n\nWas it the setup? The weather? The engine? Kart Connect saves all of it with every session, so a quick lap always comes with the reason why. ⏱️\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartData"],
  'Example data, and no track named. Combines features shown in earlier posts (weather, kit, voice notes, pressures).'))

P.append(('dark', 'season-numbers', 'Your season. In numbers.',
  '<div class="kick">End of season</div>'
  '<div class="d" style="font-size:50px;margin-top:8px;">Your season.</div>'
  '<div class="d o" style="font-size:50px;">In numbers.</div>'
  '<div class="nums" style="margin-top:18px;">'
  '<div><b>86</b><span>Sessions logged</span></div><div><b>9</b><span>Race weekends</span></div>'
  '<div><b>214</b><span>Setup changes</span></div><div><b>&minus;0.81s</b><span>Found</span></div></div>'
  '<p class="sub" style="margin-top:auto;">Every one of them saved. Example data.</p>',
  'End of season', [
  "Your season. In numbers. 📊\n\n86 sessions logged.\n9 race weekends.\n214 setup changes.\n0.81s found.\n\nEvery single one saved in Kart Connect, ready to build on next year. What do your numbers look like? 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartData #EndOfSeason",
  "86 sessions. 9 race weekends. 214 changes. 0.81s found. 📊\n\nEvery one saved.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartData",
  "The season's nearly done. Could you tell us how many setup changes you made this year? 🤔\n\nWith Kart Connect, every session, change and lap time is saved, so your whole season is there to learn from when you start again next year. 📈\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #EndOfSeason"],
  'Example numbers. A brand post rather than a specific app screen.'))

page = ('<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Batch 5</title>'
        f'<style>{CSS7}</style></head><body>'
        + ''.join(g4.tile4(t, g4.shrink(h), f) for t, _, _, h, f, _, _ in P) + '</body></html>')
open(os.path.join(HERE, 'queue7.html'), 'w').write(page)

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
main = (f'<main><header><h1>Five <span>more</span></h1><p class="lede">{len(P)} new single-image posts for review, alternating dark and light. '
        'Pick a caption for each, then press and hold an image to save it.</p></header>' + ''.join(arts))
os.makedirs(os.path.join(HERE, 'pack4'), exist_ok=True)
open(os.path.join(HERE, 'pack4', 'index.html'), 'w').write(head + main + tail)
json.dump([{'n': i, 'slug': s, 'title': ti, 'captions': c, 'note': no} for i, (_, s, ti, _, _, c, no) in enumerate(P, 1)],
          open(os.path.join(HERE, 'pack4', 'queue.json'), 'w'), indent=2, ensure_ascii=False)
print(len(P), 'posts')
