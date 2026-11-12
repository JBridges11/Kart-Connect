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
.gk { display: flex; gap: 10px; font-size: 9.5px; font-weight: 700; }
.gk i { display: inline-block; width: 12px; height: 3px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }
'''

P = []
P.append(('dark', 'seven-channels', '7 channels. Every logger.',
  '<div class="kick">Data Logger</div>'
  '<div class="d" style="font-size:40px;margin-top:8px;">7 channels.</div>'
  '<div class="d o" style="font-size:40px;">Every logger.</div>'
  '<table class="ct" style="margin-top:10px;"><tr><th>Channel</th><th>Unipro</th><th>AiM MyChron 5</th><th>Alfano</th></tr>'
  '<tr><td>Speed</td><td class="y">&#10003;<small>GPS</small></td><td class="y">&#10003;<small>GPS</small></td><td class="y">&#10003;<small>GPS</small></td></tr>'
  '<tr><td>RPM</td><td class="y">&#10003;</td><td class="y">&#10003;</td><td class="y">&#10003;</td></tr>'
  '<tr><td>Lateral G</td><td class="y">&#10003;<small>GPS-computed</small></td><td class="hw">&#10003;<small>Hardware sensor</small></td><td class="y">&#10003;<small>GPS-computed</small></td></tr>'
  '<tr><td>Long. G</td><td class="y">&#10003;<small>GPS-computed</small></td><td class="hw">&#10003;<small>Hardware sensor</small></td><td class="y">&#10003;<small>GPS-computed</small></td></tr>'
  '<tr><td>&Delta; Time</td><td class="y">&#10003;</td><td class="y">&#10003;</td><td class="y">&#10003;</td></tr>'
  '<tr><td>Water temp</td><td class="y">&#10003;</td><td class="y">&#10003;</td><td class="y">&#10003;</td></tr>'
  '<tr><td>EGT</td><td class="y">&#10003;</td><td class="no">&mdash;<small>No probe</small></td><td class="y">&#10003;<small>Model dependent</small></td></tr></table>',
  'Data Logger', [
  "7 channels. Every logger. 📊\n\nUnipro, AiM MyChron 5 or Alfano, Kart Connect pulls the lot onto one screen:\n\n💨 Speed (GPS)\n⚙️ RPM\n↔️ Lateral G\n↕️ Longitudinal G\n⏱️ Δ Time\n💧 Water temp\n🔥 EGT\n\nDifferent brands, same screen, lap against lap. Live on the web 1st December. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #AiM #Unipro #Alfano",
  "Unipro. AiM. Alfano. ✅\n\nSeven channels, one screen. The Kart Connect Data Logger.\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting",
  "What logger do you run? 👇\n\nWhatever it is, Kart Connect reads it. Speed, RPM, lateral and longitudinal G, time delta, water temp and EGT, all overlaid so you can compare with a team-mate on a completely different brand. 🤝\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartData"],
  'From your channel table. EGT depends on the Alfano model and AiM MyChron 5 has no EGT probe. Starlane is not in this table, so it is left off this post.'))

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

P.append(('dark', 'whos-quicker', "Who's quicker here?",
  '<div class="kick">Data Logger</div>'
  '<div class="d" style="font-size:52px;margin-top:8px;">Who&rsquo;s quicker</div>'
  '<div class="d o" style="font-size:52px;">here?</div>'
  '<div style="display:flex;justify-content:center;margin-top:12px;"><div class="shot2" style="width:55%;"><img src="logger-map2.png" alt=""></div></div>'
  '<p class="sub" style="margin-top:auto;">Tap the map: both laps&rsquo; speed and time, right there.</p>',
  'Data Logger', [
  "Who's quicker here? 🤔\n\nLap 8: 71 km/h. Lap 3: 68 km/h. Same corner, 3 km/h difference.\n\nTap any point on the Kart Connect track map and see both laps' speed and time at that exact spot. That's where the tenths are hiding. ⏱️\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartData #RacingLine",
  "71 vs 68 km/h. Same corner. 👀\n\nTap the map, see the difference.\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting",
  "3 km/h through one corner doesn't sound like much. Over a lap, it's everything. 🏎️\n\nThe Kart Connect Data Logger shows you exactly where you're losing speed, corner by corner, so you know where to push. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartRacing"],
  'Real screenshot. Names replaced with Lap 8 / Lap 3. The circuit layout is real, so some people may recognise it.'))

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
