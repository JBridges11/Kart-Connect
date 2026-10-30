"""Live Setup (mechanic QR mode) post in the v4 style. Reuses gen8's CSS. Writes queue9.html and pack6/index.html."""
import os, json, random, html as H, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('gen8', os.path.join(HERE, 'gen8.py'))
g8 = importlib.util.module_from_spec(spec); spec.loader.exec_module(g8)
g4 = g8.g4

CSS9 = g8.CSS8 + r'''
.qrrow { display: flex; align-items: center; gap: 10px; }
.qr { flex: none; background: #fff; border-radius: 10px; padding: 8px; box-shadow: 0 10px 26px rgba(0,0,0,.4); }
.qr svg { display: block; }
.qrl { font-size: 8px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; text-align: center; margin-top: 6px; color: #F5C842; }
.arr { font-family: 'Anton'; font-size: 26px; color: #F5C842; }
.lv { flex: 1; background: #fff; border-radius: 12px; color: #1A1033; overflow: hidden; box-shadow: 0 10px 26px rgba(0,0,0,.4); }
.lv .hd { padding: 9px 11px 8px; border-bottom: 1px solid #EEE9F6; }
.lv .t1 { display: flex; justify-content: space-between; font-size: 6.5px; font-weight: 800; letter-spacing: .14em; color: #8A8398; }
.lv .t1 em { font-style: normal; color: #2EAD3B; display: flex; align-items: center; gap: 3px; }
.lv .t1 em::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: #2EAD3B; }
.lv b { display: block; font-size: 12px; font-weight: 800; margin-top: 3px; }
.lv .sub2 { font-size: 7.5px; font-weight: 600; color: #8A8398; margin-top: 1px; }
.lv .st { display: flex; gap: 8px; font-size: 7px; font-weight: 700; margin-top: 5px; }
.lv .st span:first-child { color: #2EAD3B; } .lv .st span:last-child { color: #C08A00; }
.lv .row2 { display: flex; justify-content: space-between; align-items: center; padding: 6px 11px; font-size: 8.5px; font-weight: 700; border-bottom: 1px solid #F1EEF6; }
.lv .row2:last-child { border-bottom: 0; }
.lv .row2 i { font-style: normal; font-size: 7px; font-weight: 700; color: #9A93A8; }
.lv .row2.ok { background: #F1FBF2; } .lv .row2.ok i { color: #2EAD3B; }
.lv .row2.ip { background: #FFFBE6; } .lv .row2.ip i { color: #C08A00; }
.steps3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.steps3 div { border-radius: 10px; padding: 8px 9px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14); }
.steps3 b { display: block; font-family: 'Anton'; font-weight: 400; font-size: 16px; text-transform: uppercase; color: #F5C842; }
.steps3 div:nth-child(2) b { color: #5CC85A; } .steps3 div:nth-child(3) b { color: #A07FE0; }
.steps3 span { font-size: 9px; font-weight: 600; opacity: .85; line-height: 1.35; }
'''

# decorative, non-scannable QR-style pattern
random.seed(7)
Q = 25; cell = 3.6
mods = ''
def finder(x, y):
    return (f'<rect x="{x*cell}" y="{y*cell}" width="{7*cell}" height="{7*cell}" fill="#1A1033"/>'
            f'<rect x="{(x+1)*cell}" y="{(y+1)*cell}" width="{5*cell}" height="{5*cell}" fill="#fff"/>'
            f'<rect x="{(x+2)*cell}" y="{(y+2)*cell}" width="{3*cell}" height="{3*cell}" fill="#1A1033"/>')
for yy in range(Q):
    for xx in range(Q):
        if (xx < 8 and yy < 8) or (xx > Q - 9 and yy < 8) or (xx < 8 and yy > Q - 9):
            continue
        if random.random() < .48:
            mods += f'<rect x="{xx*cell}" y="{yy*cell}" width="{cell}" height="{cell}" fill="#1A1033"/>'
qr = (f'<svg width="{Q*cell}" height="{Q*cell}" viewBox="0 0 {Q*cell} {Q*cell}">{mods}{finder(0,0)}{finder(Q-7,0)}{finder(0,Q-7)}'
      f'<rect x="{Q*cell/2-9}" y="{Q*cell/2-9}" width="18" height="18" rx="4" fill="#fff"/>'
      f'<rect x="{Q*cell/2-6}" y="{Q*cell/2-6}" width="12" height="12" rx="3" fill="#7B5EA7"/></svg>')

rows = [('Practice 1', 'ok', '&#10003; Submitted'), ('Qualifying 1', 'ip', '&#9679; In progress'),
        ('Heat 1', '', '+ Start'), ('Heat 2', '', '+ Start'), ('Final', '', '+ Start')]
lv = ('<div class="lv"><div class="hd"><div class="t1"><span>ROUND 4</span><em>LIVE SETUP</em></div>'
      '<b>Welcome, Alex</b><div class="sub2">Your track &middot; Race weekend</div>'
      '<div class="st"><span>1 submitted</span><span>1 in progress</span></div></div>'
      + ''.join(f'<div class="row2 {c}"><span>{n}</span><i>{s}</i></div>' for n, c, s in rows) + '</div>')

P = [('dark', 'live-setup', 'Scan it. Set it. Sent.',
  '<div class="kick">Live Setup</div>'
  '<div class="d" style="font-size:52px;margin-top:8px;">Scan it. Set it.</div>'
  '<div class="d o" style="font-size:52px;">Sent.</div>'
  f'<div class="qrrow" style="margin-top:14px;"><div><div class="qr">{qr}</div><div class="qrl">Mechanic scans</div></div>'
  f'<div class="arr">&rarr;</div>{lv}</div>'
  '<p class="sub" style="margin-top:auto;">Your mechanic scans, logs the setup for each session, and it lands straight in your app.</p>',
  'Live Setup', [
  "Scan it. Set it. Sent. 📲\n\nWith Live Setup, your mechanic scans a QR code and gets a setup page for the whole race weekend: Practice, Qualifying, Heats and the Final.\n\nThey log the setup for each session as they go, and it lands straight in your Kart Connect app. You can see what's submitted and what's still in progress at a glance. ✅\n\nNo shouting across the awning. No scraps of paper. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartMechanic #KartTeam",
  "Mechanic scans. Setup logged. Straight into your app. 📲✅\n\nLive Setup on Kart Connect.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartMechanic",
  "Your mechanic's hands are full. Make it easy for them. 🔧\n\nOne QR code gives them a simple page for every session of the weekend. They tap a session, log the setup and submit it. You see it instantly, session by session, from first practice to the final. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartMechanic"],
  'Driver name, round and track are made up, and no kart brand is shown. The QR code is decorative and does not scan. Check the steps match how Live Setup works for mechanics (for example, whether they need an account).')]

page = ('<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Live Setup</title>'
        f'<style>{CSS9}</style></head><body>'
        + ''.join(g4.tile4(t, g4.shrink(h), f) for t, _, _, h, f, _, _ in P) + '</body></html>')
open(os.path.join(HERE, 'queue9.html'), 'w').write(page)

src = open(os.path.join(HERE, 'pack', 'index.html')).read()
head = src[:src.index('<main>')].replace('Kart Connect Post Queue', 'Kart Connect Live Setup Post').replace(
    '</style>', '.row { grid-template-columns: 1fr !important; } figure { max-width: 420px; }\n</style>', 1)
tail = src[src.index('</main>'):]
arts = []
for i, (t, slug, title, _, _, caps, note) in enumerate(P, 1):
    capsh = ''.join(f'<div class="cap"><div class="cap-h"><span>Caption {"ABC"[j]}</span><button type="button" id="b{i}-{j}" data-t="t{i}-{j}">Copy</button></div>'
                    f'<pre id="t{i}-{j}">{H.escape(c)}</pre></div>' for j, c in enumerate(caps))
    noteh = f'<p class="tip"><b>Check before posting:</b> {H.escape(note)}</p>' if note else ''
    arts.append(f'<article class="post" id="p{i}"><div class="meta"><span class="n">{i:02d}</span><span class="title">{H.escape(title)}</span></div>'
                f'<div class="row"><figure><img src="{i:02d}-{slug}.png" alt="{H.escape(title)}" width="1080" height="1350" loading="lazy"></figure>'
                f'<div class="caps">{noteh}{capsh}</div></div></article>')
main = ('<main><header><h1>Live <span>Setup</span></h1><p class="lede">The mechanic QR post, with its three captions underneath. '
        'Press and hold the image to save it, then copy a caption.</p></header>' + ''.join(arts))
os.makedirs(os.path.join(HERE, 'pack6'), exist_ok=True)
open(os.path.join(HERE, 'pack6', 'index.html'), 'w').write(head + main + tail)
print(len(P), 'posts')
