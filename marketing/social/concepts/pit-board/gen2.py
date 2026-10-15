"""The queued posts (series 1 posts 4-9 + launch posts) as single Pit Board images, alternating light/dark."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.argv = [sys.argv[0]]
import importlib.util
spec = importlib.util.spec_from_file_location('gen', os.path.join(HERE, 'gen.py'))
gen = importlib.util.module_from_spec(spec); spec.loader.exec_module(gen)
tile, CSS = gen.tile, gen.CSS

EXTRA = r'''
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip2 { font-size: 11px; font-weight: 700; padding: 7px 10px; border-radius: 6px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); }
.s.light .chip2 { background: #fff; border-color: #E2DBF0; color: var(--ink); box-shadow: 0 2px 10px rgba(26,16,51,.06); }
.lb { border-radius: 10px; overflow: hidden; }
.lbr { display: flex; align-items: center; gap: 10px; padding: 9px 12px; font-size: 12px; font-weight: 600; background: #fff; color: #1A1033; border-bottom: 1px solid #EEE9F6; }
.lbr .p { width: 18px; font-family: 'Barlow Condensed'; font-style: italic; font-weight: 900; font-size: 18px; color: #7B5EA7; }
.lbr .t { margin-left: auto; font-variant-numeric: tabular-nums; font-weight: 700; }
.lbr .pdf { font-size: 9px; font-weight: 800; letter-spacing: .08em; background: #F5C842; color: #1A1033; padding: 4px 6px; border-radius: 4px; }
.tlv { position: relative; padding-left: 18px; }
.tlv::before { content: ""; position: absolute; left: 4px; top: 6px; bottom: 6px; width: 2px; background: rgba(255,255,255,.25); }
.tlv div { position: relative; font-family: 'Barlow Condensed'; font-style: italic; font-weight: 800; font-size: 25px; text-transform: uppercase; line-height: 1.12; }
.tlv div::before { content: ""; position: absolute; left: -18px; top: 9px; width: 10px; height: 10px; border-radius: 50%; background: #7B5EA7; }
.tlv div.f::before { background: #F5C842; }
.sec { display: flex; gap: 6px; }
.sec div { flex: 1; border-radius: 8px; padding: 10px 8px; text-align: center; background: #fff; box-shadow: 0 2px 10px rgba(26,16,51,.08); }
.sec b { display: block; font-family: 'Barlow Condensed'; font-style: italic; font-weight: 900; font-size: 30px; color: #7B5EA7; }
.sec span { font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
.lang { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 14px; }
.lang div { font-family: 'Barlow Condensed', 'Inter', sans-serif; font-style: italic; font-weight: 800; font-size: 23px; line-height: 1.2; }
'''

EXTRA += r'''
.blist { list-style: none; display: flex; flex-direction: column; gap: 0; }
.blist li { display: flex; align-items: center; gap: 12px; font-size: 12.5px; font-weight: 700; padding: 4.5px 0;
            border-bottom: 1px solid rgba(123,94,167,.18); }
.blist li:last-child { border-bottom: 0; }
.blist li::before { content: ""; flex: none; width: 5px; height: 14px; border-radius: 999px; transform: rotate(33deg);
            background: linear-gradient(180deg, #F5C842, #5CC85A); }
.blist li em { font-style: normal; font-weight: 600; font-size: 10.5px; opacity: .6; margin-left: auto; }
.s.dark .blist li { border-bottom-color: rgba(255,255,255,.12); }
'''

P = []  # (date, theme, slug, title, html, foot_l, captions)

P.append(('Thu 16 Oct', 'light', 'profile-once', 'Set it up once',
  '<div class="kick">Your profile</div>'
  '<div class="d o" style="font-size:74px;margin-top:10px;">Set it</div>'
  '<div class="d" style="font-size:74px;"><span class="hl">up once.</span></div>'
  '<p class="sub" style="margin-top:12px;">Add your kit to your profile. Every new session fills it in for you.</p>'
  '<ul class="blist" style="margin-top:8px;"><li>Karts</li><li>Chassis numbers</li><li>Engine numbers</li>'
  '<li>Carbs <em>nicknamed &amp; ranked 1&ndash;5</em></li><li>Exhausts <em>nicknamed &amp; ranked 1&ndash;5</em></li></ul>',
  'Your profile', [
  "Set it up once.\n\nAdd your karts, chassis numbers, engine numbers, carbs and exhausts to your Kart Connect profile. Start a session and it all fills in automatically. No typing the same numbers every weekend.\n\nkart-connect.com\n\n#karting #kartsetup #kartracing",
  "How many times have you typed the same engine number this season?\n\nAdd it once to your Kart Connect profile and every new session fills it in for you, along with your karts, chassis, carbs and exhausts.\n\nkart-connect.com\n\n#karting #kartsetup #motorsport",
  "Enter it once. Never again.\n\nKarts, chassis, engines, carbs, exhausts. Saved to your profile, filled into every session.\n\nkart-connect.com\n\n#karting #kartracing #motorsport"]))

P.append(('Sun 19 Oct', 'dark', 'voice-notes', 'Gloves on? Just say it',
  '<div class="kick">Voice notes</div>'
  '<div class="d o" style="font-size:66px;margin-top:10px;">Gloves on?</div>'
  '<div class="d" style="font-size:60px;margin-top:6px;"><span class="hl">Just say it.</span></div>'
  '<p class="sub" style="margin-top:auto;">Speak your session notes straight into Kart Connect. They are saved with the session, ready for the debrief.</p>',
  'Voice notes', [
  "Gloves on? Just say it.\n\nSpeak your session notes straight into Kart Connect instead of typing them between heats. Every note is saved with the session it belongs to.\n\nkart-connect.com\n\n#karting #kartsetup #raceweekend",
  "What did the kart do in that last session? Say it before you forget it.\n\nVoice notes in Kart Connect: talk, and it's saved with the session.\n\nkart-connect.com\n\n#karting #kartracing #motorsport",
  "Talk. Saved.\n\nVoice notes for every session in Kart Connect.\n\nkart-connect.com\n\n#karting #kartsetup #motorsport"]))

rows = ''.join(f'<div class="lbr"><span class="p">{i}</span><span>{n}</span><span class="t">{t}</span><span class="pdf">SETUP PDF</span></div>'
               for i, n, t in [(1, 'Driver 3', '0:58.41'), (2, 'Driver 1', '0:58.56'), (3, 'Driver 3', '0:58.62'),
                               (4, 'Driver 5', '0:58.90')])
P.append(('Wed 22 Oct', 'light', 'leaderboard', 'Every lap time has a setup',
  '<div class="kick">Team leaderboard</div>'
  '<div class="d" style="font-size:42px;margin-top:8px;">Every lap time has a <span class="hl">setup</span> behind it.</div>'
  f'<div class="lb" style="margin-top:14px;box-shadow:0 14px 30px rgba(26,16,51,.18);">{rows}</div>'
  '<p class="sub" style="margin-top:10px;font-size:10.5px;opacity:.7;">Example data.</p>',
  'Team and Pro Team', [
  "Every lap time has a setup behind it.\n\nThe Kart Connect leaderboard ranks your team's lap times, and every time comes with a preview of the setup PDF that set it. If one driver is on the board three times, you can open all three setups.\n\nkart-connect.com\n\n#karting #kartracing #teammanager",
  "Your fastest driver's best lap. What setup were they running?\n\nOn the Kart Connect leaderboard, just open the setup PDF next to the time.\n\nkart-connect.com\n\n#karting #kartsetup #motorsport",
  "Fastest lap. Fastest setup. One tap.\n\nThe Kart Connect team leaderboard.\n\nkart-connect.com\n\n#karting #kartracing #motorsport"]))

P.append(('Sat 25 Oct', 'dark', 'race-weekend', 'Practice to final',
  '<div class="kick">Race weekend</div>'
  '<div class="d" style="font-size:62px;margin-top:8px;">Practice<br>to <span class="hl">final.</span></div>'
  '<div class="tlv" style="margin-top:16px;"><div>Practice</div><div>Qualifying</div><div>Heat 1</div><div>Heat 2</div><div>Pre-final</div><div class="f">Final</div></div>'
  '<p class="sub" style="margin-top:auto;">Every session of the weekend kept together, in order.</p>',
  'Race weekend', [
  "Practice to final. One place.\n\nKart Connect keeps every session of a race weekend together, in order, so you can see exactly how the setup moved from first practice to the final.\n\nkart-connect.com\n\n#karting #raceweekend #kartsetup",
  "Can you remember what you changed between Heat 2 and the final?\n\nKart Connect can. Every session of the weekend, kept together and in order.\n\nkart-connect.com\n\n#karting #kartracing #motorsport",
  "The whole weekend. In order.\n\nPractice, qualifying, heats, final. All in Kart Connect.\n\nkart-connect.com\n\n#karting #raceweekend #motorsport"]))

P.append(('Tue 28 Oct', 'light', 'units', 'Bar or psi? Your call',
  '<div class="kick">Settings</div>'
  '<div class="d" style="font-size:62px;margin-top:8px;">Bar or psi?</div>'
  '<div class="d o" style="font-size:62px;">Your call.</div>'
  '<div class="dev" style="margin-top:16px;"><img src="units.png" alt=""></div>',
  'Units', json.load(open('/home/user/Kart-Connect/marketing/social/posts/post-s1-08-units.json'))['captions']))

P.append(('Fri 31 Oct', 'dark', 'languages', 'In your language',
  '<div class="kick">8 languages</div>'
  '<div class="d" style="font-size:42px;margin-top:8px;">Built for karting.<br><span class="hl">In your language.</span></div>'
  '<div class="lang" style="margin-top:18px;"><div>English</div><div>Español</div><div>Français</div><div>Italiano</div>'
  '<div>Deutsch</div><div>Português</div><div>日本語</div><div>العربية</div></div>',
  'Languages', [
  "Built for karting. In your language.\n\nKart Connect is available in English, Spanish, French, Italian, German, Portuguese, Japanese and Arabic. Same app, wherever you race.\n\nkart-connect.com\n\n#karting #kartracing #motorsport",
  "Racing abroad this season? Or running a team with drivers from all over?\n\nKart Connect speaks eight languages, so everyone works from the same setups in the language they know.\n\nkart-connect.com\n\n#karting #kartsetup #motorsport",
  "Eight languages. One paddock.\n\nKart Connect, wherever you race.\n\nkart-connect.com\n\n#karting #kartracing #motorsport"]))

L = json.load  # launch captions come from the approved specs
def caps(slug): return json.load(open(f'/home/user/Kart-Connect/marketing/social/posts/{slug}.json'))['captions']

P.append(('Mon 3 Nov', 'light', 'launch-teaser', 'Something is coming',
  '<div class="kick">Data Logger</div>'
  '<div class="d o" style="font-size:70px;margin-top:10px;">Something</div>'
  '<div class="d" style="font-size:70px;"><span class="hl">is coming.</span></div>'
  '<p class="sub" style="margin-top:auto;">Your logger. Your teammate\'s logger. Different brands. Not for much longer.</p>',
  'Coming soon', caps('post-s2-01-teaser')))

P.append(('Thu 6 Nov', 'dark', 'launch-problem', 'Four brands. Four apps',
  '<div class="kick">The problem</div>'
  '<div class="d o" style="font-size:44px;margin-top:10px;">AiM. Unipro.<br>Alfano. Starlane.</div>'
  '<div class="d" style="font-size:60px;margin-top:10px;">Four brands.<br><span class="hl">Four apps.</span></div>'
  '<p class="sub" style="margin-top:auto;">Each one only reads its own files. Until now.</p>',
  'Coming soon', caps('post-s2-02-the-problem')))

P.append(('Sun 9 Nov', 'light', 'launch-reveal', 'Every logger, one screen',
  '<div class="kick">Data Logger</div>'
  '<div class="d o" style="font-size:58px;margin-top:8px;">Every logger.</div>'
  '<div class="d" style="font-size:64px;"><span class="hl">One screen.</span></div>'
  '<div class="chips" style="margin-top:16px;"><span class="chip2">AiM MyChron 5 / 5S / 6</span><span class="chip2">Alfano Pro 6 / 7 / 8</span>'
  '<span class="chip2">Unipro 6003 / 6004</span><span class="chip2">Starlane Stealth / Davinci</span></div>'
  '<p class="sub" style="margin-top:14px;">Speed traces, racing lines, lap tables and sectors. Brand against brand.</p>',
  'Coming soon', caps('post-s2-03-reveal')))

P.append(('Wed 12 Nov', 'dark', 'launch-video', 'Watch the lap. See the delta',
  '<div class="kick">Video sync</div>'
  '<div class="d" style="font-size:62px;margin-top:8px;">Watch<br>the lap.</div>'
  '<div class="d o" style="font-size:62px;margin-top:4px;">See the<br>delta.</div>'
  '<div class="chips" style="margin-top:16px;"><span class="chip2">Live delta</span><span class="chip2">Braking</span>'
  '<span class="chip2">Acceleration</span><span class="chip2">Speed</span><span class="chip2">GoPro + DJI</span></div>',
  'Coming soon', caps('post-s2-04-video')))

P.append(('Sat 15 Nov', 'light', 'launch-perfect-lap', 'Your perfect lap',
  '<div class="kick">Theoretical best</div>'
  '<div class="d" style="font-size:60px;margin-top:8px;">Your<br><span class="hl">perfect lap.</span></div>'
  '<div class="sec" style="margin-top:18px;"><div><b>S1</b><span>Fastest</span></div><div><b>S2</b><span>Fastest</span></div><div><b>S3</b><span>Fastest</span></div></div>'
  '<p class="sub" style="margin-top:auto;">Your three best sectors, from any lap, even across sessions.</p>',
  'Coming soon', caps('post-s2-05-perfect-lap')))

P.append(('Tue 18 Nov', 'dark', 'launch-giveaway', 'Win a year free',
  '<div class="flag"></div><div class="kick">Giveaway</div>'
  '<div class="d" style="font-size:118px;margin-top:6px;"><span class="hl">Win</span></div>'
  '<div class="d o" style="font-size:52px;margin-top:4px;">a year of</div>'
  '<div class="d" style="font-size:52px;">Kart Connect.</div>'
  '<div style="margin-top:14px;"><span class="sticker">Worth £155.88</span></div>'
  '<p class="sub" style="margin-top:auto;">Like, share and tag your karting mates.</p>',
  'Giveaway', caps('post-s2-06-giveaway')))

html = (f'<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Queue</title><style>{CSS}{EXTRA}</style></head><body>'
        + ''.join(tile(t, h, f, 'kart-connect.com') for _, t, _, _, h, f, _ in P) + '</body></html>')
open(os.path.join(HERE, 'queue.html'), 'w').write(html)
json.dump([{'date': d, 'slug': s, 'title': ti, 'captions': c} for d, _, s, ti, _, _, c in P],
          open(os.path.join(HERE, 'queue.json'), 'w'), indent=2, ensure_ascii=False)
print(len(P), 'posts')
