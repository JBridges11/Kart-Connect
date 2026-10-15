"""Kart Connect's own single-image style ("Pill Lane"), replacing the Motorsport-Connector-like look.
Kept from the owner's brief: faded full logo mark, chequered flag motif, dark/light alternation, punchy headlines.
Changed: wide upright Unbounded type (not condensed italic), pill-shaped highlights taken from the logo's
rounded stripes (not a stripe behind the word), logo top-left with a pill tag (not centred), mark bottom-right,
no outline/solid word pairs. Writes queue3.html, one <section class="s"> per post."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))

MARK = ('<svg class="wm" viewBox="140 10 214 128" aria-hidden="true"><g fill="currentColor">'
        '<rect x="-70" y="-22" width="140" height="44" rx="22" transform="translate(199,73) rotate(-57)"/>'
        '<rect x="-70" y="-22" width="140" height="44" rx="22" transform="translate(272,73) rotate(-57)"/>'
        '<circle cx="324" cy="106" r="23"/></g></svg>')

CSS = r'''
@font-face{font-family:'Unbounded';font-style:normal;font-weight:200 900;src:url('fonts/Unbounded-800.woff2') format('woff2');}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #bbb; padding: 20px; display: flex; flex-wrap: wrap; gap: 20px; font-family: 'Inter', Arial, sans-serif; }
.s { width: 360px; height: 450px; position: relative; overflow: hidden; --y: #F5C842; --g: #5CC85A; --p: #8E6CC9; --ink: #1A1033; }
.s.dark  { color: #fff; background: linear-gradient(170deg, #22153F 0%, #150D29 60%, #0F091D 100%); }
.s.light { color: var(--ink); background: #F7F5FB; }
.wm { position: absolute; width: 250px; right: 18px; bottom: 34px; opacity: .07; color: currentColor; }
.s.light .wm { color: #7B5EA7; opacity: .1; }
/* chequered flag: a slim strip down the left edge */
.chk { position: absolute; top: 0; bottom: 0; left: 0; width: 10px;
  background: repeating-conic-gradient(currentColor 0 25%, transparent 0 50%) 0 0 / 10px 10px; }
.s.dark .chk { color: #fff; } .s.light .chk { color: var(--ink); }
.bar { position: absolute; top: 24px; left: 30px; right: 22px; display: flex; justify-content: space-between; align-items: center; }
.bar img { height: 26px; }
.tag { font-size: 8.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; padding: 5px 10px; border-radius: 999px;
       border: 1px solid currentColor; opacity: .85; }
.in { position: absolute; top: 76px; left: 30px; right: 22px; bottom: 46px; display: flex; flex-direction: column; }
.foot { position: absolute; left: 30px; right: 22px; bottom: 18px; display: flex; justify-content: space-between;
        font-size: 9px; font-weight: 700; letter-spacing: .06em; opacity: .7; }
.h { font-family: 'Unbounded', 'Inter', sans-serif; font-weight: 800; line-height: 1.08; letter-spacing: -.02em; }
.cap { background: var(--y); color: #1A1033; border-radius: 999px; padding: 0 .3em; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.cap.g { background: var(--g); } .cap.p { background: var(--p); color: #fff; }
.sub { font-size: 12.5px; font-weight: 500; line-height: 1.5; opacity: .85; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip2 { font-size: 10.5px; font-weight: 700; padding: 6px 11px; border-radius: 999px; background: rgba(255,255,255,.1); }
.s.light .chip2 { background: #fff; box-shadow: 0 1px 6px rgba(26,16,51,.08); }
.shot { border-radius: 14px; overflow: hidden; border: 1px solid rgba(26,16,51,.08); box-shadow: 0 14px 30px rgba(26,16,51,.16); }
.s.dark .shot { border-color: rgba(255,255,255,.12); box-shadow: 0 16px 34px rgba(0,0,0,.45); }
.shot img { display: block; width: 100%; }
.lb { border-radius: 14px; overflow: hidden; box-shadow: 0 12px 28px rgba(26,16,51,.14); }
.lbr { display: flex; align-items: center; gap: 10px; padding: 9px 12px; font-size: 11.5px; font-weight: 600; background: #fff; color: #1A1033; border-bottom: 1px solid #EEE9F6; }
.lbr .p { width: 22px; height: 22px; border-radius: 50%; background: #F1ECF8; display: flex; align-items: center; justify-content: center;
          font-family: 'Unbounded'; font-weight: 800; font-size: 10px; color: #7B5EA7; }
.lbr .t { margin-left: auto; font-variant-numeric: tabular-nums; font-weight: 700; }
.lbr .pdf { font-size: 8.5px; font-weight: 800; letter-spacing: .06em; background: var(--y); padding: 4px 8px; border-radius: 999px; }
.steps { display: flex; flex-direction: column; gap: 7px; }
.steps div { display: flex; align-items: center; gap: 10px; font-family: 'Unbounded'; font-weight: 600; font-size: 15px; }
.steps div::before { content: ""; width: 22px; height: 9px; border-radius: 999px; background: rgba(255,255,255,.22); transform: rotate(-57deg); }
.steps div.f::before { background: var(--y); }
.lang { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; }
.lang div { font-weight: 700; font-size: 16px; padding: 7px 12px; border-radius: 999px; background: rgba(255,255,255,.08); }
.sec { display: flex; gap: 8px; }
.sec div { flex: 1; border-radius: 16px; padding: 12px 6px; text-align: center; background: #fff; box-shadow: 0 2px 10px rgba(26,16,51,.08); }
.sec b { display: block; font-family: 'Unbounded'; font-weight: 800; font-size: 24px; }
.sec div:nth-child(1) b { color: #C99A12; } .sec div:nth-child(2) b { color: #3E9E3C; } .sec div:nth-child(3) b { color: #7B5EA7; }
.sec span { font-size: 8.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; opacity: .7; }
.sticker { display: inline-block; background: var(--g); color: #1A1033; font-weight: 800; font-size: 11px; letter-spacing: .04em;
           text-transform: uppercase; padding: 8px 14px; border-radius: 999px; }
'''


def tile(theme, tag, inner, foot):
    logo = 'logo-white.png' if theme == 'dark' else 'logo.png'
    return (f'<section class="s {theme}">{MARK}<div class="chk"></div>'
            f'<div class="bar"><img src="{logo}" alt="Kart Connect"><span class="tag">{tag}</span></div>'
            f'<div class="in">{inner}</div>'
            f'<div class="foot"><span>kart-connect.com</span><span>{foot}</span></div></section>')


Q = json.load(open(os.path.join(HERE, 'pack', 'queue.json')))
cap = {p['slug']: p for p in Q}

rows = ''.join(f'<div class="lbr"><span class="p">{i}</span><span>{n}</span><span class="t">{t}</span><span class="pdf">SETUP PDF</span></div>'
               for i, n, t in [(1, 'Driver 3', '0:58.41'), (2, 'Driver 1', '0:58.56'), (3, 'Driver 3', '0:58.62'), (4, 'Driver 5', '0:58.90')])

POSTS = [
 ('profile-once', 'light', 'Your profile',
  '<div class="h" style="font-size:40px;">Set it up <span class="cap">once.</span></div>'
  '<p class="sub" style="margin-top:14px;">Add your kit to your profile. Every new session fills it in for you.</p>'
  '<div class="chips" style="margin-top:14px;"><span class="chip2">Karts</span><span class="chip2">Chassis numbers</span>'
  '<span class="chip2">Engine numbers</span><span class="chip2">Carbs</span><span class="chip2">Exhausts</span></div>', 'Saved once, used every session'),
 ('voice-notes', 'dark', 'Voice notes',
  '<div class="h" style="font-size:38px;">Gloves on?</div><div class="h" style="font-size:38px;margin-top:6px;"><span class="cap">Just say it.</span></div>'
  '<p class="sub" style="margin-top:auto;margin-bottom:6px;max-width:250px;">Speak your session notes straight into Kart Connect. Saved with the session, ready for the debrief.</p>', 'Talk. Saved.'),
 ('leaderboard', 'light', 'Leaderboard',
  '<div class="h" style="font-size:26px;">Every lap time has a <span class="cap">setup</span> behind it.</div>'
  f'<div class="lb" style="margin-top:16px;">{rows}</div><p class="sub" style="margin-top:8px;font-size:10px;opacity:.6;">Example data.</p>', 'Team and Pro Team'),
 ('race-weekend', 'dark', 'Race weekend',
  '<div class="h" style="font-size:36px;">Practice to <span class="cap">final.</span></div>'
  '<div class="steps" style="margin-top:20px;"><div>Practice</div><div>Qualifying</div><div>Heat 1</div><div>Heat 2</div><div>Pre-final</div><div class="f">Final</div></div>',
  'The whole weekend, in order'),
 ('units', 'light', 'Settings',
  '<div class="h" style="font-size:36px;">Bar or psi?</div><div class="h" style="font-size:36px;margin-top:6px;"><span class="cap g">Your call.</span></div>'
  '<div class="shot" style="margin-top:20px;"><img src="units.png" alt=""></div>', 'Your units, your way'),
 ('languages', 'dark', '8 languages',
  '<div class="h" style="font-size:27px;">Built for karting. <span class="cap">In your language.</span></div>'
  '<div class="lang" style="margin-top:18px;"><div>English</div><div>Español</div><div>Français</div><div>Italiano</div>'
  '<div>Deutsch</div><div>Português</div><div>日本語</div><div>العربية</div></div>', 'Wherever you race'),
 ('launch-teaser', 'light', 'Coming soon',
  '<div class="h" style="font-size:44px;">Something is <span class="cap p">coming.</span></div>'
  '<p class="sub" style="margin-top:auto;margin-bottom:6px;max-width:240px;">Your logger. Your teammate\'s logger. Different brands. Not for much longer.</p>', 'Data Logger'),
 ('launch-problem', 'dark', 'The problem',
  '<div class="chips"><span class="chip2">AiM</span><span class="chip2">Unipro</span><span class="chip2">Alfano</span><span class="chip2">Starlane</span></div>'
  '<div class="h" style="font-size:38px;margin-top:16px;">Four brands.</div><div class="h" style="font-size:38px;margin-top:6px;"><span class="cap">Four apps.</span></div>'
  '<p class="sub" style="margin-top:auto;margin-bottom:6px;">Each one only reads its own files. Until now.</p>', 'Data Logger'),
 ('launch-reveal', 'light', 'Data Logger',
  '<div class="h" style="font-size:34px;">Every logger.</div><div class="h" style="font-size:34px;margin-top:6px;"><span class="cap p">One screen.</span></div>'
  '<div class="chips" style="margin-top:16px;"><span class="chip2">AiM MyChron 5 / 5S / 6</span><span class="chip2">Alfano Pro 6 / 7 / 8</span>'
  '<span class="chip2">Unipro 6003 / 6004</span><span class="chip2">Starlane Stealth / Davinci</span></div>'
  '<p class="sub" style="margin-top:14px;">Speed traces, racing lines, lap tables and sectors. Brand against brand.</p>', 'Coming soon'),
 ('launch-video', 'dark', 'Video sync',
  '<div class="h" style="font-size:34px;">Watch the lap.</div><div class="h" style="font-size:34px;margin-top:6px;"><span class="cap g">See the delta.</span></div>'
  '<div class="chips" style="margin-top:18px;"><span class="chip2">Live delta</span><span class="chip2">Braking</span>'
  '<span class="chip2">Acceleration</span><span class="chip2">Speed</span><span class="chip2">GoPro + DJI</span></div>', 'Coming soon'),
 ('launch-perfect-lap', 'light', 'Theoretical best',
  '<div class="h" style="font-size:36px;">Your</div><div class="h" style="font-size:36px;margin-top:6px;white-space:nowrap;"><span class="cap">perfect lap.</span></div>'
  '<div class="sec" style="margin-top:20px;"><div><b>S1</b><span>Fastest</span></div><div><b>S2</b><span>Fastest</span></div><div><b>S3</b><span>Fastest</span></div></div>'
  '<p class="sub" style="margin-top:14px;">Your three best sectors, from any lap, even across sessions.</p>', 'Coming soon'),
 ('launch-giveaway', 'dark', 'Giveaway',
  '<div class="h" style="font-size:72px;color:#F5C842;">Win</div>'
  '<div class="h" style="font-size:30px;margin-top:4px;">a year of</div><div class="h" style="font-size:30px;margin-top:6px;white-space:nowrap;"><span class="cap g">Kart Connect.</span></div>'
  '<div style="margin-top:16px;"><span class="sticker">Worth £155.88</span></div>'
  '<p class="sub" style="margin-top:auto;margin-bottom:6px;">Like, share and tag your karting mates.</p>', 'Link in bio'),
]

html = ('<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Queue v3</title>'
        f'<style>{CSS}</style></head><body>' + ''.join(tile(t, tag, inner, foot) for _, t, tag, inner, foot in POSTS) + '</body></html>')
open(os.path.join(HERE, 'queue3.html'), 'w').write(html)
assert [s for s, *_ in POSTS] == [p['slug'] for p in Q]
print(len(POSTS), 'posts')
