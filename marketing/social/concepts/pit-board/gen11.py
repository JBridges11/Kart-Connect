"""Batch 9: Data Logger channel posts from the owner's channel table and G-force screenshot. Reuses gen10's CSS and page template.
Writes queue11.html and pack8/index.html."""
import os, json, html as H, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('gen10', os.path.join(HERE, 'gen10.py'))
g10 = importlib.util.module_from_spec(spec); spec.loader.exec_module(g10)
g4 = g10.g4

CSS11 = g10.CSS10 + r'''
.ct { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 10.5px; border-radius: 10px; overflow: hidden; }
.ct th { font-size: 7.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; padding: 5px 5px; background: rgba(255,255,255,.1); text-align: center; }
.ct th:first-child { text-align: left; }
.ct td { padding: 4.2px 6px; text-align: center; font-weight: 600; border-top: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.04); }
.ct td:first-child { text-align: left; font-family: 'Anton'; font-weight: 400; font-size: 12.5px; letter-spacing: .02em; text-transform: uppercase; }
.ct .y { color: #5CC85A; font-weight: 800; } .ct .hw { color: #F5C842; font-weight: 800; } .ct .no { opacity: .55; }
.ct small { display: block; font-size: 7.5px; font-weight: 600; opacity: .7; margin-top: 1px; }
.chl2 { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.chl2 div { border-radius: 10px; padding: 6px 11px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14); }
.chl2 b { display: block; font-family: 'Anton'; font-weight: 400; font-size: 18px; text-transform: uppercase; line-height: 1.05; }
.chl2 span { font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; opacity: .7; }
.chl2 div:nth-child(3n+1) b { color: #F5C842; } .chl2 div:nth-child(3n+2) b { color: #5CC85A; } .chl2 div:nth-child(3n) b { color: #A07FE0; }
.chl2 div.hl2 { background: linear-gradient(95deg, #F5C842, #5CC85A); border: 0; color: #1A1033; } .chl2 div.hl2 b { color: #1A1033; }
.cbar { display: flex; flex-wrap: wrap; gap: 6px; }
.cbar span { font-size: 11px; font-weight: 800; padding: 6px 10px; border-radius: 99px; background: #C8930F; color: #fff; }
.gk { display: flex; gap: 10px; font-size: 9.5px; font-weight: 700; }
.gk i { display: inline-block; width: 12px; height: 3px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }
'''

P = []
P.append(('dark', 'seven-channels', '7 channels. Every logger.',
  '<div class="kick">Data Logger</div>'
  '<div class="d" style="font-size:38px;margin-top:6px;">7 channels.</div>'
  '<div class="d o" style="font-size:38px;">Every logger.</div>'
  '<div class="chl2" style="margin-top:14px;">'
  '<div><b>Speed</b><span>GPS</span></div><div><b>RPM</b><span>Engine</span></div>'
  '<div><b>Lateral G</b><span>Cornering</span></div><div><b>Long. G</b><span>Braking &amp; drive</span></div>'
  '<div><b>&Delta; Time</b><span>Live delta</span></div><div><b>Water temp</b><span>Engine</span></div>'
  '<div><b>EGT</b><span>Exhaust temp</span></div><div class="hl2"><b>One screen</b><span>Overlay any two laps</span></div></div>'
  '',
  'Data Logger', [
  "7 channels. Every logger. 📊\n\nKart Connect pulls the lot onto one screen:\n\n💨 Speed (GPS)\n⚙️ RPM\n↔️ Lateral G\n↕️ Longitudinal G\n⏱️ Δ Time\n💧 Water temp\n🔥 EGT\n\nDifferent brands, same screen, lap against lap. Live on the web 1st December. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #AiM #Unipro #Alfano",
  "Unipro. AiM. Alfano. ✅\n\nSeven channels, one screen. The Kart Connect Data Logger.\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting",
  "What logger do you run? 👇\n\nWhatever it is, Kart Connect reads it. Speed, RPM, lateral and longitudinal G, time delta, water temp and EGT, all overlaid so you can compare with a team-mate on a completely different brand. 🤝\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartData"],
  'EGT depends on the logger (not all models have an EGT probe).'))

P.append(('light', 'feel-the-g', 'Feel the G',
  '<div class="kick">Lateral &amp; longitudinal G</div>'
  '<div class="d" style="font-size:56px;margin-top:8px;">Feel the G.</div>'
  '<div class="d o" style="font-size:56px;">See the G.</div>'
  '<div class="shot2" style="margin-top:16px;"><img src="logger-g-zoom.png" alt=""></div>'
  '<div class="gk" style="margin-top:8px;"><span><i style="background:#EF4444"></i>Lap 8</span><span><i style="background:#5B8CFF"></i>Lap 3</span></div>'
  '<p class="sub" style="margin-top:auto;">Cornering load and braking force, lap against lap. See who carries more through the corner and who brakes harder.</p>',
  'Data Logger', [
  "Feel the G. See the G. 🌀\n\nLateral G shows how hard you're loading the kart through every corner. Longitudinal G shows every braking zone and every exit.\n\nOverlay two laps in the Kart Connect Data Logger and see exactly who's committing more in the fast stuff, and who's braking later. 🔥\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartData #GForce",
  "Cornering load. Braking force. Lap against lap. 🌀\n\nG-force traces in the Kart Connect Data Logger.\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting",
  "Think you're braking late? The G trace knows. 👀\n\nLongitudinal G shows every braking point, lateral G shows how much grip you're actually using. Put your lap next to a quicker one and the difference jumps out. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartData"],
  'Real screenshot with the driver and track names cropped out.'))


P.append(('dark', 'braking-points', 'Brake later. Prove it.',
  '<div class="kick">Longitudinal G</div>'
  '<div class="d" style="font-size:54px;margin-top:8px;">Brake later.</div>'
  '<div class="d o" style="font-size:54px;">Prove it.</div>'
  '<div class="shot2" style="margin-top:16px;"><img src="logger-g-only.png" alt=""></div>'
  '<div class="gk" style="margin-top:8px;"><span><i style="background:#EF4444"></i>Lap 8</span><span><i style="background:#5B8CFF"></i>Lap 3</span></div>'
  '<p class="sub" style="margin-top:auto;">Every dip is a braking zone. See exactly who brakes later, and harder.</p>',
  'Data Logger', [
  "Brake later. Prove it. 🛑\n\nEvery dip in the longitudinal G trace is a braking zone. Lay two laps over each other in the Kart Connect Data Logger and you'll see exactly who's braking later, and who's braking harder.\n\nNo more \"I was definitely later than him\". The data settles it. 😏\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartData #LateBraker",
  "Think you brake later than your team-mate? Prove it. 🛑📈\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting",
  "Tag the mate who swears they out-brake you every lap 👇😂\n\nThe Kart Connect Data Logger shows every braking point, lap against lap. Time to find out who's right. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartRacing"],
  'Real screenshot, names replaced.'))

P.append(('light', 'where-time-goes', 'Watch the gap grow',
  '<div class="kick">&Delta; Time</div>'
  '<div class="d" style="font-size:54px;margin-top:8px;">Watch the gap</div>'
  '<div class="d o" style="font-size:54px;">grow.</div>'
  '<div class="shot2" style="margin-top:16px;"><img src="logger-g-channels.png" alt=""></div>'
  '<p class="sub" style="margin-top:auto;">The time delta shows exactly where in the lap you gain, and where you lose.</p>',
  'Data Logger', [
  "Watch the gap grow. ⏱️\n\nThe Δ Time trace in the Kart Connect Data Logger shows the gap between two laps building up metre by metre. Flat line? You're matching them. Climbing? That's where the time's going.\n\nFind the corner. Fix the corner. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartData #KartRacing",
  "Flat = matching. Climbing = losing. 📈\n\nThe Δ Time trace. Kart Connect Data Logger.\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting",
  "Lost 1.3 seconds on a lap but don't know where? 🤷\n\nThe time delta shows you exactly where the gap opens up, then RPM, speed and G-force show you why. 👀\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartData"],
  'Real screenshot, names cropped.'))

P.append(('dark', 'overlay-or-separate', 'Overlay or separate',
  '<div class="kick">Your data, your way</div>'
  '<div class="d" style="font-size:44px;margin-top:8px;">Pick your channels.</div>'
  '<div class="d o" style="font-size:44px;">Your order.</div>'
  '<div class="cbar" style="margin-top:16px;"><span>1 RPM</span><span>2 Speed</span><span>3 Lateral G</span><span>4 Long. G</span><span>5 &Delta; Time</span><span>6 EGT</span><span>7 Water</span></div>'
  '<p class="sub" style="margin-top:12px;">Turn channels on and off, drag them into the order you want, and switch between overlay and separate views.</p>'
  '<div class="chl2" style="margin-top:12px;grid-template-columns:1fr 1fr;"><div><b>Overlay</b><span>Laps on top</span></div><div><b>Separate</b><span>Side by side</span></div></div>',
  'Data Logger', [
  "Pick your channels. Your order. ⚙️\n\nRPM first? Speed first? G-force at the top? Your call.\n\nIn the Kart Connect Data Logger you turn channels on and off, drag them into the order you want, and flip between overlay and separate views in one tap. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartData",
  "Overlay or separate? Your data, your way. ⚙️\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting",
  "Every driver reads data differently. 🧠\n\nThat's why the Kart Connect Data Logger lets you choose which channels you see, put them in your order, and overlay or separate your laps. Set it up once, read it your way every time. 🏎️\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartData"],
  'Based on the channel bar in your screenshot (numbered, reorderable channels; Overlay/Separate).'))

page = ('<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Batch 9</title>'
        f'<style>{CSS11}</style></head><body>'
        + ''.join(g4.tile4(t, g4.shrink(h), f) for t, _, _, h, f, _, _ in P) + '</body></html>')
open(os.path.join(HERE, 'queue11.html'), 'w').write(page)

arts = []
for i, (t, slug, title, _, _, caps, note) in enumerate(P, 1):
    capsh = ''.join(f'<div class="cap"><div class="cap-h"><span>Caption {"ABC"[j]}</span><button type="button" id="b{i}-{j}" data-t="t{i}-{j}">Copy</button></div>'
                    f'<pre id="t{i}-{j}">{H.escape(c)}</pre></div>' for j, c in enumerate(caps))
    noteh = f'<p class="tip"><b>Check before posting:</b> {H.escape(note)}</p>' if note else ''
    arts.append(f'<article class="post"><div class="meta"><span class="n">{i:02d}</span><span class="title">{H.escape(title)}</span></div>'
                f'<figure><img src="{i:02d}-{slug}.png" alt="{H.escape(title)}" width="1080" height="1350" loading="lazy"></figure>'
                f'{noteh}<div class="caps">{capsh}</div></article>')
main = (f'<main><header><h1>Data Logger <span>channels</span></h1><p class="lede">{len(P)} new posts from your channel table and G-force screenshot, '
        'each with three captions underneath.</p></header>' + ''.join(arts) + '</main>')
os.makedirs(os.path.join(HERE, 'pack8'), exist_ok=True)
open(os.path.join(HERE, 'pack8', 'index.html'), 'w').write(g10.HEAD.replace('Kart Connect New Posts', 'Kart Connect Data Logger Channels') + main + g10.TAIL)
json.dump([{'n': i, 'slug': s, 'title': ti, 'captions': c, 'note': no} for i, (_, s, ti, _, _, c, no) in enumerate(P, 1)],
          open(os.path.join(HERE, 'pack8', 'queue.json'), 'w'), indent=2, ensure_ascii=False)
print(len(P), 'posts')
