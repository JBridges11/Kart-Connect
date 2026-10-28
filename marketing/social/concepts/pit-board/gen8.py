"""Batch 6: Data Logger feature posts (pre-launch) in the v4 style. Reuses gen7's CSS and page template.
Writes queue8.html and pack5/index.html."""
import os, json, math, html as H, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('gen7', os.path.join(HERE, 'gen7.py'))
g7 = importlib.util.module_from_spec(spec); spec.loader.exec_module(g7)
g4 = g7.g4

CSS8 = g7.CSS7 + r'''
.panel { border-radius: 12px; padding: 12px 12px 8px; }
.s.dark .panel { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.14); }
.s.light .panel { background: #fff; box-shadow: 0 4px 16px rgba(26,16,51,.08); color: #1A1033; }
.panel h6 { font-size: 8px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; opacity: .75; display: flex; justify-content: space-between; align-items: center; }
.lgd { display: flex; gap: 10px; font-size: 8.5px; font-weight: 700; letter-spacing: .04em; text-transform: none; }
.lgd i { display: inline-block; width: 12px; height: 3px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }
.secs3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
.secs3 div { border-radius: 12px; padding: 12px 10px; text-align: center; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14); }
.secs3 span { display: block; font-size: 8px; font-weight: 800; letter-spacing: .18em; opacity: .75; }
.secs3 b { display: block; font-family: 'Anton'; font-weight: 400; font-size: 26px; line-height: 1.15; margin-top: 3px; }
.secs3 em { display: inline-block; font-style: normal; font-size: 11px; font-weight: 800; margin-top: 4px; padding: 3px 7px; border-radius: 4px; }
.secs3 em.up { background: rgba(255,90,90,.18); color: #FF7A7A; } .secs3 em.dn { background: rgba(92,200,90,.18); color: #5CC85A; }
.laps { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(26,16,51,.08); color: #1A1033; }
.laps div { display: grid; grid-template-columns: 34px 1fr auto; gap: 8px; padding: 7px 13px; border-bottom: 1px solid #EEE9F6; font-size: 11.5px; font-weight: 600; align-items: center; }
.laps div.h { font-size: 8px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; color: #7A7388; background: #F7F4FC; }
.laps div.b { background: #EAF8E9; } .laps div.b b { color: #3FAF3D; }
.laps div.tb { background: #1A1033; color: #fff; border-bottom: 0; grid-template-columns: 1fr auto auto; } .laps div.tb b { color: #F5C842; }
.laps span:first-child { font-family: 'Anton'; font-weight: 400; font-size: 15px; color: #7B5EA7; }
.laps div.tb span:first-child { color: #F5C842; font-size: 11px; font-family: 'Inter'; font-weight: 800; letter-spacing: .1em; }
.laps b { font-family: 'Anton'; font-weight: 400; font-size: 16px; font-variant-numeric: tabular-nums; }
.laps i { font-style: normal; font-size: 10.5px; font-weight: 700; color: #7A7388; text-align: right; min-width: 44px; }
.vids { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.vids div { aspect-ratio: 16/9; border-radius: 8px; position: relative; overflow: hidden;
            background: linear-gradient(170deg, #4B5E7A 0%, #2B3446 55%, #3D3A33 56%, #24221F 100%); border: 1px solid rgba(255,255,255,.18); }
.vids div::before { content: ""; position: absolute; left: 18%; right: 18%; bottom: 0; height: 46%; background: #565048; clip-path: polygon(38% 0, 62% 0, 100% 100%, 0 100%); }
.vids span { position: absolute; left: 6px; top: 6px; font-size: 7.5px; font-weight: 800; letter-spacing: .14em; background: rgba(0,0,0,.55); padding: 3px 5px; border-radius: 3px; }
.vids em { position: absolute; right: 6px; bottom: 6px; font-style: normal; font-family: 'Anton'; font-size: 15px; padding: 2px 6px; border-radius: 4px; background: rgba(0,0,0,.6); }
.vids div:first-child em { color: #5CC85A; } .vids div:last-child em { color: #FF7A7A; }
.synced { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase;
          background: #5CC85A; color: #0E0919; padding: 6px 10px; border-radius: 999px; }
.srcs { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.srcs div { border-radius: 10px; padding: 9px 12px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14); }
.srcs b { display: block; font-family: 'Anton'; font-weight: 400; font-size: 17px; text-transform: uppercase; color: #F5C842; }
.srcs div + div b { color: #A07FE0; }
.srcs span { font-size: 10px; font-weight: 600; opacity: .85; line-height: 1.35; }
.exp { display: flex; flex-direction: column; gap: 8px; }
.exp div { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 12px; padding: 10px 14px; box-shadow: 0 3px 12px rgba(26,16,51,.08); color: #1A1033; }
.exp .f { flex: none; width: 54px; height: 40px; border-radius: 6px; display: grid; place-items: center; font-family: 'Anton'; font-size: 16px; letter-spacing: .04em; color: #fff; }
.exp div:nth-child(1) .f { background: #D9A514; } .exp div:nth-child(2) .f { background: #3FAF3D; } .exp div:nth-child(3) .f { background: #7B5EA7; }
.exp b { display: block; font-size: 13px; font-weight: 800; }
.exp span { font-size: 10.5px; font-weight: 600; color: #7A7388; }
'''

KICK = 'Data Logger &middot; Coming soon'
KICK_LIVE = 'Data Logger'
FOOT = 'Data Logger'
P = []

# 1 speed trace
W, Hh = 290, 130
def trace(f):
    pts = []
    for i in range(121):
        x = i / 120
        v = 70 + 38 * f(x)
        pts.append((8 + x * (W - 16), Hh - 10 - (v - 55) / 70 * (Hh - 24)))
    return pts
base = lambda x: (0.55 + 0.45 * math.sin(2 * math.pi * (x * 2.2 + .1))) * (1 - .25 * math.sin(6 * x))
a = trace(base)
b = trace(lambda x: base(x) - 0.22 * math.exp(-((x - .33) / .06) ** 2) + 0.18 * math.exp(-((x - .74) / .06) ** 2))
pa = 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in a)
pb = 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in b)
gain = (f'<rect x="{8 + .27 * (W - 16):.0f}" y="4" width="{.12 * (W - 16):.0f}" height="{Hh - 8}" fill="#5CC85A" opacity=".14" rx="4"/>'
        f'<text x="{8 + .33 * (W - 16):.0f}" y="14" font-size="8" font-weight="800" fill="#5CC85A" text-anchor="middle">GAIN</text>'
        f'<rect x="{8 + .68 * (W - 16):.0f}" y="4" width="{.12 * (W - 16):.0f}" height="{Hh - 8}" fill="#FF7A7A" opacity=".14" rx="4"/>'
        f'<text x="{8 + .74 * (W - 16):.0f}" y="14" font-size="8" font-weight="800" fill="#FF7A7A" text-anchor="middle">LOSE</text>')
svg1 = (f'<svg viewBox="0 0 {W} {Hh}" width="100%" style="display:block;margin-top:6px;">{gain}'
        f'<path d="{pb}" fill="none" stroke="#A07FE0" stroke-width="2.4" stroke-dasharray="5 3"/><path d="{pa}" fill="none" stroke="#F5C842" stroke-width="2.6"/>'
        f'<line x1="8" y1="{Hh - 4}" x2="{W - 8}" y2="{Hh - 4}" stroke="rgba(255,255,255,.25)"/></svg>')
P.append(('dark', 'speed-trace', 'See where you gain. See where you lose.',
  f'<div class="kick">{KICK_LIVE}</div>'
  '<div class="d" style="font-size:42px;margin-top:8px;">See where you gain.</div>'
  '<div class="d o" style="font-size:42px;">See where you lose.</div>'
  '<div class="panel" style="margin-top:16px;"><h6><span>Speed vs distance</span><span class="lgd"><span><i style="background:#F5C842"></i>You</span>'
  f'<span><i style="background:#A07FE0"></i>Team-mate</span></span></h6>{svg1}</div>'
  '<p class="sub" style="margin-top:auto;">Every lap on one chart, against any driver. Example data.</p>',
  FOOT, [
  "See where you gain. See where you lose. 📈\n\nThe Kart Connect Data Logger puts speed against distance for every lap on one chart, so you can lay your lap over a team-mate's and see EXACTLY where the time goes.\n\nCarrying more speed through the hairpin? Losing it on the exit of the fast one? It's all in the trace. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartData #KartRacing",
  "Your lap. Their lap. One chart. 📈\n\nSpeed trace overlay, in the Kart Connect Data Logger.\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting",
  "Stop guessing where your team-mate is quicker. 🤔\n\nOverlay your speed traces in the Kart Connect Data Logger and the gaps jump straight out, corner by corner. Then go and find the time. ⏱️\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartData"],
  'Example traces, not real data.'))

# 2 GPS map: a twisty kart circuit (made up) drawn as a closed Catmull-Rom spline, coloured by curvature
CTRL = [(0.10, 0.90), (0.45, 0.91), (0.80, 0.90), (0.88, 0.88), (0.91, 0.81), (0.87, 0.74), (0.62, 0.72),
        (0.53, 0.68), (0.51, 0.60), (0.57, 0.53), (0.72, 0.50), (0.85, 0.46), (0.92, 0.40), (0.93, 0.31),
        (0.88, 0.25), (0.66, 0.26), (0.58, 0.31), (0.51, 0.26), (0.47, 0.17), (0.44, 0.10), (0.38, 0.06),
        (0.32, 0.10), (0.30, 0.22), (0.33, 0.34), (0.38, 0.45), (0.35, 0.53), (0.27, 0.56), (0.21, 0.50),
        (0.19, 0.36), (0.15, 0.24), (0.10, 0.21), (0.05, 0.28), (0.05, 0.60), (0.06, 0.82)]
def chaikin(p, it):
    for _ in range(it):
        q = []
        for a in range(len(p)):
            (x0, y0), (x1, y1) = p[a], p[(a + 1) % len(p)]
            q += [(0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1), (0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1)]
        p = q
    return p
raw = chaikin(CTRL, 4)
# resample to even spacing
L = [0]
for a in range(len(raw)):
    (x0, y0), (x1, y1) = raw[a], raw[(a + 1) % len(raw)]
    L.append(L[-1] + math.hypot(x1 - x0, y1 - y0))
tot = L[-1]; N = 360; pts = []; seg = 0
for k in range(N):
    d = tot * k / N
    while L[seg + 1] < d: seg += 1
    t = (d - L[seg]) / (L[seg + 1] - L[seg] + 1e-12)
    (x0, y0), (x1, y1) = raw[seg], raw[(seg + 1) % len(raw)]
    pts.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t))
M = len(pts)
def ang(i):
    ax, ay = pts[i - 1]; bx, by = pts[i]; cx, cy = pts[(i + 1) % M]
    a1 = math.atan2(by - ay, bx - ax); a2 = math.atan2(cy - by, cx - bx)
    d = (a2 - a1 + math.pi) % (2 * math.pi) - math.pi
    seg = math.hypot(cx - bx, cy - by) + 1e-6
    return abs(d) / seg
curv = [ang(i) for i in range(M)]
sm = [sum(curv[(i + k) % M] for k in range(-5, 6)) / 11 for i in range(M)]
hi = sorted(sm)[int(M * .80)]
speed = [max(0, 1 - min(1, c / hi)) for c in sm]
speed = [sum(speed[(i + k) % M] for k in range(-3, 4)) / 7 for i in range(M)]
def col(v):
    stops = [(0, (224, 102, 47)), (.5, (245, 200, 66)), (1, (63, 175, 61))]
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        if v <= p1:
            k = (v - p0) / (p1 - p0)
            return '#%02x%02x%02x' % tuple(round(c0[q] + (c1[q] - c0[q]) * k) for q in range(3))
    return '#3FAF3D'
MW, MH = 290, 175
X = lambda x: 10 + x * (MW - 20)
Y = lambda y: 6 + y * (MH - 12)
segs = ''.join(f'<line x1="{X(pts[i][0]):.1f}" y1="{Y(pts[i][1]):.1f}" x2="{X(pts[(i + 1) % M][0]):.1f}" y2="{Y(pts[(i + 1) % M][1]):.1f}" '
               f'stroke="{col(speed[i])}" stroke-width="7" stroke-linecap="round"/>' for i in range(M))
# team-mate takes a wider line through the top-right hairpin
c = int(N * 0.30)
alt = []
for i in range(M):
    x, y = pts[i]; nx, ny = pts[(i + 1) % M]
    dx, dy = nx - x, ny - y; L = math.hypot(dx, dy) + 1e-9
    d = min(abs(i - c), M - abs(i - c))
    off = 0.022 * math.exp(-(d / 12) ** 2)
    alt.append((X(x - dy / L * off * -1), Y(y + dx / L * off * -1)))
pal = 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in alt) + ' Z'
sfx, sfy = X(0.45), Y(0.905)
svg2 = (f'<svg viewBox="0 0 {MW} {MH}" width="100%" style="display:block;margin-top:6px;">{segs}'
        f'<path d="{pal}" fill="none" stroke="#7B5EA7" stroke-width="1.8" stroke-dasharray="4 3"/>'
        f'<rect x="{sfx - 1.5:.1f}" y="{sfy - 7:.1f}" width="3" height="14" fill="#1A1033"/></svg>')
P.append(('light', 'gps-map', 'Every line. Colour-coded.',
  f'<div class="kick">{KICK_LIVE}</div>'
  '<div class="d" style="font-size:50px;margin-top:8px;">Every line.</div>'
  '<div class="d o" style="font-size:50px;">Colour-coded.</div>'
  '<div class="panel" style="margin-top:14px;"><h6><span>GPS track map</span><span class="lgd"><span><i style="background:#E0662F"></i>Slow</span>'
  f'<span><i style="background:#3FAF3D"></i>Fast</span><span><i style="background:#7B5EA7"></i>Team-mate</span></span></h6>{svg2}</div>'
  '<p class="sub" style="margin-top:auto;">Racing lines drawn from GPS. Example data.</p>',
  FOOT, [
  "Every line. Colour-coded. 🗺️\n\nThe Kart Connect Data Logger draws your racing line straight from GPS and colours it from slow to fast, so you can see exactly where you're carrying speed and where you're not.\n\nOverlay a team-mate and see precisely where your lines split. 👀\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartData #RacingLine",
  "Your racing line, drawn from GPS. Slow to fast. 🟠🟡🟢\n\nIn the Kart Connect Data Logger.\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting",
  "Think you're using all the track? The GPS says otherwise. 😅\n\nThe Kart Connect Data Logger maps every lap and colour-codes your speed, so the slow bits have nowhere to hide. Put your line next to a quicker driver's and you'll see the difference straight away. 🏎️\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartData"],
  'The track outline is made up, so no real circuit is shown.'))

# 3 sectors
P.append(('dark', 'sectors', 'Three sectors. Nowhere to hide.',
  f'<div class="kick">{KICK_LIVE}</div>'
  '<div class="d" style="font-size:48px;margin-top:8px;">Three sectors.</div>'
  '<div class="d o" style="font-size:48px;">Nowhere to hide.</div>'
  '<div class="secs3" style="margin-top:18px;">'
  '<div><span>SECTOR 1</span><b>19.84</b><em class="dn">&minus;0.08</em></div>'
  '<div><span>SECTOR 2</span><b>21.37</b><em class="up">+0.12</em></div>'
  '<div><span>SECTOR 3</span><b>17.40</b><em class="dn">&minus;0.21</em></div></div>'
  '<p class="sub" style="margin-top:14px;">Sector 2 is costing you a tenth. Sectors 1 and 3? You already own them.</p>'
  '<p class="sub" style="margin-top:auto;">Every track auto-split into three sectors. Example data.</p>',
  FOOT, [
  "Three sectors. Nowhere to hide. ⏱️\n\nThe Kart Connect Data Logger automatically splits every track into three sectors, so you can see which part of the lap is costing you time, and which parts you already own. 💪\n\nGreen = gaining. Red = losing. Simple.\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartData #KartRacing",
  "S1 ✅ S2 ❌ S3 ✅\n\nKnow exactly where to find the time. Sector analysis in the Kart Connect Data Logger. ⏱️\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting",
  "\"I'm losing time somewhere...\" Somewhere isn't good enough. 🤔\n\nThe Kart Connect Data Logger breaks every lap into three sectors and shows you exactly where the time's going. Fix the red, keep the green. 🟢🔴\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartData"],
  'Example data.'))

# 4 lap table + theoretical best
P.append(('light', 'lap-table', 'Every lap. Ranked.',
  f'<div class="kick">{KICK_LIVE}</div>'
  '<div class="d" style="font-size:48px;margin-top:8px;">Every lap.</div>'
  '<div class="d o" style="font-size:48px;">Ranked.</div>'
  '<div class="laps" style="margin-top:14px;">'
  '<div class="h"><span style="font-family:Inter;font-size:8px;color:#7A7388">LAP</span><span>Time</span><i>Delta</i></div>'
  '<div class="b"><span>7</span><b>0:58.61</b><i>Best</i></div>'
  '<div><span>9</span><b>0:58.74</b><i>+0.13</i></div>'
  '<div><span>6</span><b>0:58.80</b><i>+0.19</i></div>'
  '<div class="tb"><span>THEORETICAL BEST</span><b>0:58.29</b><i style="color:#F5C842">&minus;0.32</i></div></div>'
  '<p class="sub" style="margin-top:auto;">Theoretical best built from your quickest sectors. Example data.</p>',
  FOOT, [
  "Every lap. Ranked. 🏆\n\nThe Kart Connect Data Logger puts every lap in one table: best lap highlighted, delta to your fastest on every other lap, and your THEORETICAL BEST built from your quickest sectors. 🔥\n\n0:58.61 on the board. 0:58.29 in the tank. Now go and find it. ⏱️\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartData #KartRacing",
  "Best lap: 0:58.61. Theoretical best: 0:58.29. 👀\n\nThere's 0.32s waiting for you. In the Kart Connect Data Logger.\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting",
  "Your perfect lap is already in your data. You just haven't strung it together yet. 🧩\n\nThe Kart Connect Data Logger ranks every lap and builds your theoretical best from your quickest sectors, even across sessions, so you know exactly what's possible. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartData"],
  'Example data. Builds on the earlier "perfect lap" launch post, so space them apart.'))

# 5 GoPro / DJI sync
P.append(('dark', 'video-sync', 'Press record. We\'ll sync it.',
  f'<div class="kick">{KICK}</div>'
  '<div class="d" style="font-size:46px;margin-top:8px;">Press record.</div>'
  '<div class="d o" style="font-size:46px;">We&rsquo;ll sync it.</div>'
  '<div class="vids" style="margin-top:14px;"><div><span>YOU</span><em>&minus;0.14</em></div><div><span>TEAM-MATE</span><em>+0.14</em></div></div>'
  '<div style="margin-top:8px;"><span class="synced">&#10003; Synced to logger data</span></div>'
  '<div class="srcs" style="margin-top:10px;"><div><b>GoPro Hero 7+</b><span>Syncs from its GPS timestamps</span></div>'
  '<div><b>DJI Osmo Action</b><span>Syncs from its .srt file</span></div></div>',
  FOOT, [
  "Press record. We'll sync it. 🎥\n\nFilm your session on a GoPro Hero 7 or newer, or a DJI Osmo Action, and the Kart Connect Data Logger lines your footage up with your logger data automatically.\n\nGoPro: synced from the GPS timestamp on every frame.\nDJI: just drop in the .srt file.\n\nThen watch two laps side by side with a live delta showing who's ahead, frame by frame. 🔥\n\nComing soon. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #GoPro #DJI",
  "GoPro or DJI? Both sync automatically. 🎥✅\n\nSide-by-side video with live delta, coming soon to the Kart Connect Data Logger.\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #GoPro",
  "No more lining up videos by hand. 🙅\n\nThe Kart Connect Data Logger reads the timestamps from your GoPro or DJI footage and syncs it to your data for you. Two laps, side by side, with a live delta counting who's ahead. ⏱️\n\nComing soon.\n\n🔗 kart-connect.com\n\n#KartConnect #DataLogger #Karting #KartVideo"],
  'Overlaps with the earlier video launch post, so space them apart.'))

page = ('<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Batch 6</title>'
        f'<style>{CSS8}</style></head><body>'
        + ''.join(g4.tile4(t, g4.shrink(h), f) for t, _, _, h, f, _, _ in P) + '</body></html>')
open(os.path.join(HERE, 'queue8.html'), 'w').write(page)

src = open(os.path.join(HERE, 'pack', 'index.html')).read()
head = src[:src.index('<main>')].replace('Kart Connect Post Queue', 'Kart Connect Data Logger Posts').replace('</style>', '.row { grid-template-columns: 1fr !important; } figure { max-width: 420px; }\n</style>', 1)
tail = src[src.index('</main>'):]
arts = []
for i, (t, slug, title, _, _, caps, note) in enumerate(P, 1):
    capsh = ''.join(f'<div class="cap"><div class="cap-h"><span>Caption {"ABC"[j]}</span><button type="button" id="b{i}-{j}" data-t="t{i}-{j}">Copy</button></div>'
                    f'<pre id="t{i}-{j}">{H.escape(c)}</pre></div>' for j, c in enumerate(caps))
    noteh = f'<p class="tip"><b>Check before posting:</b> {H.escape(note)}</p>' if note else ''
    arts.append(f'<article class="post" id="p{i}"><div class="meta"><span class="n">{i:02d}</span><span class="title">{H.escape(title)}</span></div>'
                f'<div class="row"><figure><img src="{i:02d}-{slug}.png" alt="{H.escape(title)}" width="1080" height="1350" loading="lazy"></figure>'
                f'<div class="caps">{noteh}{capsh}</div></div></article>')
main = (f'<main><header><h1>Data <span>Logger</span></h1><p class="lede">{len(P)} Data Logger posts, each with its three captions underneath. '
        'Press and hold an image to save it, then copy a caption.</p></header>' + ''.join(arts))
os.makedirs(os.path.join(HERE, 'pack5'), exist_ok=True)
open(os.path.join(HERE, 'pack5', 'index.html'), 'w').write(head + main + tail)
json.dump([{'n': i, 'slug': s, 'title': ti, 'captions': c, 'note': no} for i, (_, s, ti, _, _, c, no) in enumerate(P, 1)],
          open(os.path.join(HERE, 'pack5', 'queue.json'), 'w'), indent=2, ensure_ascii=False)
print(len(P), 'posts')
