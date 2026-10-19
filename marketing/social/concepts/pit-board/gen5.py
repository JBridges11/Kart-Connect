"""Batch 3: twelve new single-image posts in the v4 style (Anton, brand gradient, logo top-left).
Writes queue5.html (one <section class="s"> per post) and pack2/index.html (review page with captions)."""
import os, re, json, html as H, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('gen4', os.path.join(HERE, 'gen4.py'))
g4 = importlib.util.module_from_spec(spec); spec.loader.exec_module(g4)
CSS5 = g4.CSS4 + r'''
@font-face{font-family:'Caveat';font-weight:600;src:url('fonts/Caveat-600.woff2') format('woff2');}
/* bingo */
.bingo { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
.bingo div { aspect-ratio: 1.3; border-radius: 6px; background: #fff; box-shadow: 0 2px 8px rgba(26,16,51,.07); display: grid; place-items: center;
             text-align: center; font-size: 8.4px; font-weight: 700; line-height: 1.22; padding: 4px; color: #1A1033; position: relative; }
.bingo div.x::after { content: ""; position: absolute; inset: 9px 18px; border: 2.5px solid #7B5EA7; border-radius: 50%; opacity: .55; transform: rotate(-12deg); }
.bingo div.free { background: #1A1033; color: #F5C842; font-family: 'Anton'; font-size: 13px; letter-spacing: .04em; font-weight: 400; }
/* stacked list with a line through */
.scr { list-style: none; display: flex; flex-direction: column; gap: 6px; }
.scr li { font-family: 'Anton'; font-size: 30px; line-height: 1.1; text-transform: uppercase; opacity: .55; position: relative; width: max-content; }
.scr li::after { content: ""; position: absolute; left: -4px; right: -4px; top: 52%; height: 3px; background: #F5C842; transform: rotate(-2deg); }
.scr li.ok { opacity: 1; color: #F5C842; } .scr li.ok::after { display: none; }
/* quiz */
.lapc { display: flex; align-items: center; gap: 8px; }
.lapc .card { flex: 1; background: #fff; border-radius: 10px; padding: 10px 12px; box-shadow: 0 4px 16px rgba(26,16,51,.08); color: #1A1033; }
.lapc .card span { display: block; font-size: 8px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #7A7388; }
.lapc .card b { font-family: 'Anton'; font-weight: 400; font-size: 30px; line-height: 1.1; font-variant-numeric: tabular-nums; }
.lapc .q { font-family: 'Anton'; font-size: 34px; color: #7B5EA7; }
.delta { display: inline-block; background: #5CC85A; color: #fff; font-weight: 800; font-size: 11px; padding: 3px 7px; border-radius: 4px; }
.opts { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.opts div { background: #fff; border: 1.5px solid #E2DBF0; border-radius: 8px; padding: 9px 12px; font-size: 12.5px; font-weight: 700; color: #1A1033; display: flex; gap: 8px; align-items: center; }
.s.dark .opts div { background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.16); color: #fff; }
.opts b { font-family: 'Anton'; font-weight: 400; font-size: 15px; color: #7B5EA7; } .s.dark .opts b { color: #F5C842; }
/* paper note */
.paper { background: #FFFDF4; color: #2A2A3A; border-radius: 3px; padding: 10px 14px 12px; transform: rotate(-2.2deg); width: 88%;
         box-shadow: 0 10px 24px rgba(26,16,51,.18); font-family: 'Caveat', cursive; font-size: 17px; line-height: 1.05;
         background-image: repeating-linear-gradient(transparent 0 17px, rgba(90,120,200,.18) 17px 18px); position: relative; }
.paper s { text-decoration-thickness: 2px; } .paper .ring { position: absolute; right: 14px; top: 8px; width: 46px; height: 46px; border-radius: 50%;
         border: 4px solid rgba(150,100,50,.18); }
.lbl { font-size: 8.5px; font-weight: 800; letter-spacing: .24em; text-transform: uppercase; color: #7B5EA7; display: flex; align-items: center; gap: 8px; }
.lbl.new { color: #3FAF3D; }
/* roles */
.roles { display: flex; flex-direction: column; gap: 10px; }
.roles div { border-left: 3px solid #F5C842; padding: 2px 0 2px 12px; }
.roles div:nth-child(2) { border-color: #5CC85A; } .roles div:nth-child(3) { border-color: #A07FE0; }
.roles b { display: block; font-family: 'Anton'; font-weight: 400; font-size: 24px; text-transform: uppercase; line-height: 1.05; }
.roles span { font-size: 11.5px; font-weight: 600; opacity: .85; line-height: 1.4; }
/* plans */
.plans { display: flex; flex-direction: column; gap: 7px; }
.plans div { background: #fff; border-radius: 10px; padding: 10px 14px; display: grid; grid-template-columns: 1fr auto; align-items: center;
             box-shadow: 0 3px 12px rgba(26,16,51,.07); color: #1A1033; }
.plans div.hi { background: #1A1033; color: #fff; }
.plans b { font-family: 'Anton'; font-weight: 400; font-size: 24px; text-transform: uppercase; line-height: 1; }
.plans i { font-style: normal; display: block; font-size: 10.5px; font-weight: 600; opacity: .7; margin-top: 3px; }
.plans em { font-style: normal; font-size: 10px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; background: #F5C842; color: #1A1033;
            padding: 5px 7px; border-radius: 4px; text-align: center; }
.plans div:not(.hi) em { background: #F1EDF8; color: #7B5EA7; }
/* devices */
.devs { display: flex; align-items: flex-end; gap: 14px; justify-content: center; }
.devs .d1, .devs .d2, .devs .d3 { border: 3px solid #fff; border-radius: 8px; position: relative; background: linear-gradient(160deg, #2E1C52, #120B22); }
.devs .d1 { width: 46px; height: 88px; border-radius: 10px; }
.devs .d2 { width: 92px; height: 120px; }
.devs .d3 { width: 140px; height: 90px; border-radius: 6px 6px 0 0; }
.devs .d3::after { content: ""; position: absolute; left: -16px; right: -16px; bottom: -11px; height: 8px; background: #fff; border-radius: 0 0 6px 6px; }
.devs .scr2 { position: absolute; inset: 8px; display: flex; flex-direction: column; gap: 4px; }
.devs .scr2 i { height: 5px; border-radius: 3px; background: rgba(255,255,255,.22); }
.devs .scr2 i:nth-child(1) { background: #F5C842; width: 60%; } .devs .scr2 i:nth-child(3) { background: #5CC85A; width: 75%; }
.devl { display: flex; justify-content: center; gap: 22px; font-family: 'Anton'; font-size: 16px; letter-spacing: .06em; }
.devl span:nth-child(1) { color: #F5C842; } .devl span:nth-child(2) { color: #5CC85A; } .devl span:nth-child(3) { color: #A07FE0; }
/* checklist */
.ticks { list-style: none; display: flex; flex-direction: column; gap: 9px; }
.ticks li { display: flex; gap: 10px; align-items: center; font-size: 13px; font-weight: 700; }
.ticks li::before { content: "\2713"; flex: none; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; background: #5CC85A;
                    color: #fff; font-size: 13px; font-weight: 900; }
/* tyres */
.tyres { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; }
.tyres .g { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
.tyres .g div { background: #fff; border-radius: 8px; padding: 6px 4px; text-align: center; box-shadow: 0 2px 8px rgba(26,16,51,.07); color: #1A1033; }
.tyres .g span { display: block; font-size: 7.5px; font-weight: 800; letter-spacing: .14em; color: #7A7388; }
.tyres .g b { font-family: 'Anton'; font-weight: 400; font-size: 19px; line-height: 1.15; }
.tyres .hot b { color: #E0662F; } .tyres .cold b { color: #3B7DD8; }
.tyres .ar { font-family: 'Anton'; font-size: 30px; color: #7B5EA7; }
.tyres h5 { grid-column: span 2; font-size: 8.5px; font-weight: 800; letter-spacing: .2em; text-transform: uppercase; text-align: center; margin-bottom: 1px; }
.warn { display: inline-flex; align-items: center; gap: 7px; background: #fff; border-radius: 999px; padding: 5px 11px; font-size: 10.5px; font-weight: 700;
        color: #1A1033; box-shadow: 0 2px 8px rgba(26,16,51,.07); }
.warn::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: #F5B400; }
/* big number */
.bign { font-family: 'Anton'; font-size: 165px; line-height: .86; letter-spacing: -.01em;
        background: linear-gradient(95deg, #F5C842 0%, #5CC85A 55%, #A07FE0 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
'''

CSS5 += r'''
.chg { display: flex; align-items: center; gap: 10px; background: #fff; border-radius: 10px; padding: 10px 12px; box-shadow: 0 4px 16px rgba(26,16,51,.08); color: #1A1033; }
.chg i { display: block; font-style: normal; font-size: 8px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; color: #7A7388; }
.chg b { font-family: 'Anton'; font-weight: 400; font-size: 20px; text-transform: uppercase; margin-right: 8px; }
.chg em { font-style: normal; font-size: 12px; font-weight: 700; color: #3FAF3D; }
.pflow { display: flex; flex-direction: column; }
.prow h5 { font-size: 8px; font-weight: 800; letter-spacing: .2em; text-transform: uppercase; margin-bottom: 3px; color: #7A7388; }
.prow { position: relative; }
.prow .pc { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; width: 68%; }
.prow .pc div { background: #fff; border-radius: 6px; padding: 3px 2px; text-align: center; box-shadow: 0 2px 8px rgba(26,16,51,.07); color: #1A1033; }
.prow .pc span { display: block; font-size: 6.5px; font-weight: 800; letter-spacing: .12em; color: #7A7388; }
.prow .pc b { font-family: 'Anton'; font-weight: 400; font-size: 16px; line-height: 1.1; }
.prow.hot b { color: #E0662F; } .prow.cold b { color: #3B7DD8; }
.prow .stg { position: absolute; right: 0; bottom: 6px; font-style: normal; font-size: 10px; font-weight: 800; padding: 6px 8px; border-radius: 6px; background: #F5C842; color: #1A1033; }
.prow .stg.ok { background: #E9E2F6; color: #7B5EA7; }
.dn { font-family: 'Anton'; font-size: 16px; color: #7B5EA7; line-height: 1; margin: 2px 0 2px 28%; }
'''
CSS5 += r'''
.chl { flex: 1; } .chl > div { display: flex; align-items: baseline; justify-content: space-between; }
.chl > div + div { border-top: 1px solid #EEE9F6; margin-top: 4px; padding-top: 4px; }
'''
CSS5 += r'''
.prow .pc i.df { display: block; font-style: normal; font-size: 8.5px; font-weight: 800; color: #3FAF3D; margin-top: 1px; }
.prow.cold .pc div:has(i.df) { padding-bottom: 4px; }
'''
P = []  # (theme, slug, title, inner_html, foot, [captions A, B, C], note)

bingo = ['Forgot the tyre pressures', 'Clipboard got soaked', 'Rain with 2 mins to go', 'No signal in the paddock',
         'Chain off in practice', '&ldquo;Did we change the gearing?&rdquo;', 'KART CONNECT', 'Setup written on your hand',
         'Quickest lap. No idea why.', '&ldquo;Same as last week&rdquo; (it wasn&rsquo;t)', 'Packed up in the dark', 'Borrowed a spanner. Never returned.',
         'Cold pressures guessed', 'Tyres gone in the final', 'Weighbridge panic', 'Lost the race-day notes']
ticked = {0, 3, 7, 13}
cells = ''.join(f'<div class="{"free" if t == "KART CONNECT" else ("x" if i in ticked else "")}">{"Kart<br>Connect" if t == "KART CONNECT" else t}</div>'
                for i, t in enumerate(bingo))
P.append(('light', 'paddock-bingo', 'Paddock bingo',
  '<div class="kick">Race weekend</div>'
  '<div class="d" style="font-size:58px;margin-top:8px;">Paddock <span class="o">bingo.</span></div>'
  f'<div class="bingo" style="margin-top:12px;">{cells}</div>'
  '<p class="sub" style="margin-top:auto;font-weight:700;">Screenshot it. Tick off yours. Share it to your story.</p>',
  'Paddock bingo', [
  "PADDOCK BINGO 🏁\n\nHow many have you ticked off this season? Be honest. 👀\n\nScreenshot it, mark off yours and share it to your story. Tag us @kartconnect so we can see your card.\n\nFull house? You need Kart Connect more than anyone. 😅\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartLife #PaddockLife",
  "Race weekend bingo. How many have you got? 🎯\n\nComment your number below 👇\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartLife",
  "Every karter has played this game. Most of us have got a full house. 😂\n\nForgotten pressures, soaked clipboards, \"same as last week\" when it absolutely wasn't...\n\nThe free square's on us. Kart Connect keeps every setup, every change and every session in one place, so a few of these stop happening.\n\nScreenshot, tick yours off and share it to your story. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #PaddockLife"],
  ''))

P.append(('dark', 'where-written', "Where's your setup written?",
  '<div class="kick">Be honest</div>'
  '<div class="d" style="font-size:41px;margin-top:8px;">Where&rsquo;s your setup</div>'
  '<div class="d" style="font-size:41px;"><span class="hl">written right now?</span></div>'
  '<ul class="scr" style="margin-top:26px;"><li>Back of your hand</li><li>Tape on the seat</li><li>Back of a receipt</li>'
  '<li>Your mate&rsquo;s memory</li><li class="ok">Kart Connect</li></ul>',
  'Be honest', [
  "Be honest. Where's your setup written right now? 👀\n\nBack of your hand? Tape on the seat? A receipt from the café? Or locked away in your mate's memory, never to be seen again? 😅\n\nTime to skip the scribbles. Kart Connect keeps every setup, every change and every session saved and ready, all season long. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartLife #KartSetup",
  "Hand. Tape. Receipt. Memory. ❌\nKart Connect. ✅\n\nYour setup deserves better.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing",
  "We've seen setups written on hands, seat tape, fag packets and once on a pizza box. 🍕\n\nWherever yours is written right now, it's time for an upgrade. When you're ready for something that won't wash off, Kart Connect saves every setup with the session it belongs to.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartLife"],
  ''))

P.append(('light', 'what-changed', 'What changed? Now you know.',
  '<div class="kick">Every lap. Every setup.</div>'
  '<div class="d" style="font-size:56px;margin-top:8px;">What changed?</div>'
  '<div class="d o" style="font-size:56px;">Now you know.</div>'
  '<div class="lapc" style="margin-top:14px;"><div class="card"><span>Session 3</span><b>0:58.92</b></div><div class="q">&rarr;</div>'
  '<div class="card"><span>Session 4</span><b>0:58.61</b></div></div>'
  '<div class="chg" style="margin-top:10px;"><span class="delta">&minus;0.31s</span><div class="chl"><i>2 changes</i>'
  '<div><b>Rear width</b><em>1395 &rarr; 1390 mm</em></div><div><b>Rear sprocket</b><em>80 &rarr; 81</em></div></div></div>'
  '<p class="sub" style="margin-top:auto;">Every lap time saved with the setup behind it, so you know exactly why you went quicker. Example data.</p>',
  'Every lap. Every setup.', [
  "What changed? Now you KNOW. 🏁\n\nYou found 0.31s between sessions. Was it the rear width? The sprocket? Both? Without the data, it's a guess.\n\nWith Kart Connect, every lap time is saved with the exact setup behind it. Open the two sessions and see exactly what changed (5mm off the rear width and one tooth up on the sprocket) and exactly why you went quicker. ⏱️\n\nNo more guessing. Just faster.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartSetup #KartData",
  "0.31s quicker. And you know exactly why. ⏱️\n\nEvery lap. Every setup. Kart Connect.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartSetup",
  "Ever gone quicker and had NO idea why? 🤷\n\nThat speed is useless if you can't find it again. Kart Connect saves the setup behind every lap time, so when it clicks you know exactly what changed and you can go straight back to it.\n\nFind it. Keep it. Build on it. 🏎️\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartData"],
  'The lap times and both setup changes are example data.'))

P.append(('light', 'old-vs-new', 'The old way vs the new way',
  '<div class="d" style="font-size:46px;">Old way. <span class="o">New way.</span></div>'
  '<div class="lbl" style="margin-top:14px;">The old way</div>'
  '<div class="paper" style="margin-top:8px;"><div class="ring"></div>Rear width 1395? 1390??<br>Axle &mdash; <s>medium</s> hard<br>'
  'Pressures 0.6 / 0.55 (front?)<br>Gearing 10/80 or 81 &mdash; ask Dave</div>'
  '<div class="lbl new" style="margin-top:16px;">The Kart Connect way</div>'
  '<div class="dev" style="margin-top:8px;"><img src="app-setup.png" alt=""></div>',
  'Old way vs new way', [
  "The old way vs the Kart Connect way. 📋➡️📱\n\nScribbled notes, question marks and \"ask Dave\" when you can't read your own handwriting... we've all been there. 😅\n\nWith Kart Connect, every setup is saved properly: rear, engine, front end, wheels and tyres, chassis. Clear, searchable and ready for the next session.\n\nNo smudges. No guessing. No Dave required. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartSetup #KartLife",
  "Left: \"Gearing 10/80 or 81, ask Dave.\" 😬\nRight: Kart Connect. ✅\n\nWhich one's yours?\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartSetup",
  "Your setup notes deserve better than a soggy bit of paper. 🌧️📋\n\nKart Connect saves every part of the kart, every session, so when it's quick you know exactly why, and you can get straight back to it.\n\nComment \"📋\" if your notes still look like the left. No judgement. 👀\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartSetup"],
  ''))

P.append(('dark', 'whole-team', 'One app. Whole team.',
  '<div class="kick">Built for the awning</div>'
  '<div class="d" style="font-size:58px;margin-top:8px;">One app.</div>'
  '<div class="d o" style="font-size:58px;">Whole team.</div>'
  '<div class="roles" style="margin-top:18px;">'
  '<div><b>Driver</b><span>Log every session in seconds and know exactly what worked.</span></div>'
  '<div><b>Mechanic</b><span>Every setup and every change in one place. No more guessing.</span></div>'
  '<div><b>Team manager</b><span>Every driver and every kart in one team view.</span></div></div>',
  'Whole team', [
  "One app. Whole team. 🏁\n\n🏎️ DRIVERS: log every session in seconds and know exactly what worked.\n🔧 MECHANICS: every setup and every change in one place. No more guessing.\n📋 TEAM MANAGERS: every driver and every kart in one team view.\n\nKart Connect is built for everyone in the awning, so the whole team works from the same information, every session.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartTeam #Motorsport",
  "Driver. Mechanic. Team manager. 🤝\n\nOne app for all three.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartTeam",
  "Running a team? Here's the problem: the driver remembers one thing, the mechanic wrote down another and the team manager wasn't even there. 🤦\n\nKart Connect puts everyone on the same page, with every session, setup and change shared across the team.\n\nTag your team below 👇\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartTeam"],
  ''))

P.append(('light', 'which-plan', 'Which one are you?',
  '<div class="kick">Plans</div>'
  '<div class="d" style="font-size:58px;margin-top:8px;">Which one</div>'
  '<div class="d" style="font-size:58px;"><span class="hl">are you?</span></div>'
  '<div class="plans" style="margin-top:16px;">'
  '<div><span><b>Privateer</b><i>For the solo racer</i></span><em>1 driver</em></div>'
  '<div class="hi"><span><b>Team</b><i>For small racing teams</i></span><em>Up to 5 drivers</em></div>'
  '<div><span><b>Pro Team</b><i>For professional operations</i></span><em>Up to 30 drivers</em></div></div>'
  '<p class="sub" style="margin-top:auto;">Plans and pricing at kart-connect.com</p>',
  'Plans', [
  "Which one are you? 👇\n\n🏎️ PRIVATEER: for the solo racer. One driver, one kart, every feature you need.\n👥 TEAM: for small racing teams. Up to 5 drivers, multi-kart management and a team manager view.\n🏆 PRO TEAM: for professional operations. Up to 30 drivers, team-branded setup sheets and analytics across the whole roster.\n\nComment PRIVATEER, TEAM or PRO 👇\n\nFull plans and pricing at kart-connect.com 🏁\n\n#KartConnect #Karting #KartRacing #KartTeam #Motorsport",
  "Privateer, Team or Pro Team? 🤔\n\nThere's a Kart Connect plan for every awning. Comment yours 👇\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing",
  "Solo racer or running a whole team? 🏁\n\nKart Connect grows with you, from one driver and one kart up to 30 drivers with team-branded setup sheets.\n\nFind your plan at kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartTeam"],
  'Plan names, taglines and driver limits come from the app code (2 Oct). Check they are still current before posting.'))

P.append(('dark', 'any-device', 'Phone, tablet, laptop',
  '<div class="kick">Any device</div>'
  '<div class="d" style="font-size:41px;margin-top:8px;">Log it in the awning.</div>'
  '<div class="d o" style="font-size:39px;">Review it on the sofa.</div>'
  '<div class="devs" style="margin-top:22px;">'
  '<div class="d1"><div class="scr2"><i></i><i></i><i></i><i></i><i></i></div></div>'
  '<div class="d2"><div class="scr2"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>'
  '<div class="d3"><div class="scr2"><i></i><i></i><i></i><i></i><i></i></div></div></div>'
  '<div class="devl" style="margin-top:20px;"><span>iOS</span><span>Android</span><span>Web</span></div>'
  '<p class="sub" style="margin-top:auto;text-align:center;">Same data. Every device.</p>',
  'Any device', [
  "Log it in the awning. Review it on the sofa. 🛋️\n\nKart Connect works on iOS, Android and the web, with the same data on every device.\n\nRecord your setup on your phone between sessions, then go through the whole weekend on the big screen when you're home. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartLife #Motorsport",
  "Phone in the paddock. Laptop at home. Same data. 📱💻\n\nKart Connect on iOS, Android and web.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing",
  "Where do you do your debrief? 🤔\n\n📱 In the awning\n🚐 In the van on the way home\n🛋️ On the sofa on Sunday night\n\nWherever it is, Kart Connect is there, on iOS, Android and the web. Comment yours 👇\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartLife"],
  ''))

P.append(('light', 'won-in-winter', 'Championships are won in winter',
  '<div class="kick">Off-season</div>'
  '<div class="d" style="font-size:56px;margin-top:8px;">Championships</div>'
  '<div class="d" style="font-size:56px;">are won in</div>'
  '<div class="d o" style="font-size:96px;">winter.</div>'
  '<ul class="ticks" style="margin-top:16px;"><li>Go back through every session</li><li>Find what actually worked</li>'
  '<li>Save your baselines for next season</li></ul>',
  'Off-season', [
  "Championships are won in winter. ❄️🏆\n\nThe season might be winding down, but this is where next year's results start.\n\n✅ Go back through every session\n✅ Find what actually worked\n✅ Save your baselines for next season\n\nWith every session saved in Kart Connect, your off-season homework is already done. Turn up to round one with a setup you KNOW works. 🏁\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #OffSeason #KartSetup",
  "Off-season = homework season. 📚❄️\n\nGo back through every session, find what worked and start next year ahead.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #OffSeason",
  "The quickest drivers next season are already preparing. 👀\n\nWhile everyone else packs the kart away, use the winter to look back at every session you ran this year and lock in your baselines for round one.\n\nWhat's the one thing you're changing for next season? Comment below 👇\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #OffSeason"],
  ''))

P.append(('dark', 'build-next', 'What should we build next?',
  '<div class="kick">You decide</div>'
  '<div class="d" style="font-size:52px;margin-top:8px;">What should we</div>'
  '<div class="d o" style="font-size:52px;">build next?</div>'
  '<div class="opts" style="margin-top:18px;grid-template-columns:1fr;"><div><b>A</b>Engine hours tracker</div><div><b>B</b>Tyre wear log</div>'
  '<div><b>C</b>Gearing calculator</div><div><b>D</b>Something else? Tell us.</div></div>'
  '<p class="sub" style="margin-top:auto;font-weight:700;">Vote in the comments.</p>',
  'You decide', [
  "YOU decide what we build next. 🛠️\n\nKart Connect is built for the paddock, so we want the paddock to choose.\n\nA) Engine hours tracker\nB) Tyre wear log\nC) Gearing calculator\nD) Something else? Tell us!\n\nVote in the comments 👇 The most popular idea goes to the top of our list.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartLife",
  "What should we build next? 🤔\n\nA, B, C or D? Vote below 👇\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing",
  "If you could add ONE feature to Kart Connect, what would it be? 💭\n\nWe've given you a few ideas, but we'd love to hear yours. Every comment gets read by the team. 👇\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartTech"],
  'Waiting on your four options. The ones shown are placeholders.'))

P.append(('light', 'hot-cold', 'Cold. Hot. Sorted.',
  '<div class="kick">Tyre pressures</div>'
  '<div class="d" style="font-size:46px;margin-top:8px;">Cold. Hot.</div>'
  '<div class="d o" style="font-size:46px;">Sorted.</div>'
  '<div class="pflow" style="margin-top:12px;"><div class="prow cold"><h5>Cold (run 1)</h5><div class="pc"><div><span>FL</span><b>9.00</b></div><div><span>FR</span><b>9.00</b></div><div><span>RL</span><b>9.00</b></div><div><span>RR</span><b>9.00</b></div></div><em class="stg ok">0.00 psi stagger</em></div><div class="dn">&darr;</div><div class="prow hot"><h5>Hot (after run 1)</h5><div class="pc"><div><span>FL</span><b>12.62</b></div><div><span>FR</span><b>13.40</b></div><div><span>RL</span><b>12.18</b></div><div><span>RR</span><b>13.04</b></div></div></div><div class="dn">&darr;</div><div class="prow cold"><h5>Next cold (recommended)</h5><div class="pc"><div><span>FL</span><b>9.19</b><i class="df">+0.19</i></div><div><span>FR</span><b>8.41</b><i class="df">&minus;0.59</i></div><div><span>RL</span><b>9.63</b><i class="df">+0.63</i></div><div><span>RR</span><b>8.77</b><i class="df">&minus;0.23</i></div></div><em class="stg">1.22 psi stagger</em></div></div>'
  '<p class="sub" style="margin-top:auto;font-size:11px;">Record your hot pressures and get your next cold pressures, stagger and all. Example data.</p>',
  'Tyre pressures', [
  "Cold. Hot. Sorted. 🔥❄️\n\nStart square at 9.00 psi all round. Come in, record your hot pressures, and Kart Connect works out your cold pressures for the next run, stagger included. 🏁\n\nRun 1: 0.00 psi stagger.\nNext run: FL +0.19, FR −0.59, RL +0.63, RR −0.23. That's 1.22 psi of stagger, set up to even out the hots.\n\nNo calculator. No guesswork. Just the right pressures, every run.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #KartSetup #TyrePressures",
  "Hot pressures in. Next cold pressures out. Stagger sorted. 🔥➡️❄️\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartSetup #TyrePressures",
  "Still doing tyre pressure maths on the back of a glove? 🧮\n\nPut your hot pressures into Kart Connect after the session and it recommends your cold pressures for the next run, showing you exactly how much stagger you need across the four corners.\n\nLess maths. More grip. 🏎️\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #TyrePressures"],
  'Example psi figures. Check the recommendation in the current app matches how this post describes it.'))

P.append(('dark', 'free-trial', 'Try it free for 30 days',
  '<div class="kick">Free trial</div>'
  '<div class="d" style="font-size:44px;margin-top:8px;">Try Kart Connect</div><div class="d" style="font-size:44px;"><span class="hl">free for</span></div>'
  '<div class="bign" style="margin-top:6px;">30</div>'
  '<div class="d" style="font-size:60px;margin-top:-2px;">days.</div>'
  '<div style="margin-top:14px;"><span class="sticker">Cancel any time</span></div>'
  '<p class="sub" style="margin-top:auto;">On Privateer. Start yours at kart-connect.com</p>',
  'Free trial', [
  "Try Kart Connect FREE for 30 days. 🎉\n\nLog your sessions, save every setup, build your baselines and see what Kart Connect does for your weekend, all for free for 30 days on Privateer.\n\nNo risk. Cancel any time. 🏁\n\n🔗 Start your free trial at kart-connect.com\n\n#KartConnect #Karting #KartRacing #FreeTrial #KartSetup",
  "30 days. Free. Cancel any time. 🏁\n\nStart your Kart Connect trial today.\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing",
  "Not sure if Kart Connect is for you? Try it for a month. 👀\n\n30 days free on Privateer. Log a couple of race weekends and see the difference for yourself.\n\nTag a mate who should try it too 👇\n\n🔗 kart-connect.com\n\n#KartConnect #Karting #KartRacing #FreeTrial"],
  'The 30-day Privateer trial comes from the app code (2 Oct). Check it is still on offer before posting.'))

ORDER = ['paddock-bingo', 'where-written', 'what-changed', 'whole-team', 'old-vs-new', 'any-device', 'which-plan',
         'build-next', 'won-in-winter', 'free-trial', 'hot-cold']
P.sort(key=lambda p: ORDER.index(p[1]))
P = [(('light', 'dark')[i % 2],) + p[1:] for i, p in enumerate(P)]


def shrink(h):
    return g4.shrink(h)


page = ('<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Batch 3</title>'
        f'<style>{CSS5}</style></head><body>'
        + ''.join(g4.tile4(t, shrink(h), f) for t, _, _, h, f, _, _ in P) + '</body></html>')
open(os.path.join(HERE, 'queue5.html'), 'w').write(page)

# review page: reuse the queue page's head and styles
src = open(os.path.join(HERE, 'pack', 'index.html')).read()
head = src[:src.index('<main>')]
tail = src[src.index('</main>'):]
arts = []
for i, (t, slug, title, _, _, caps, note) in enumerate(P, 1):
    capsh = ''.join(f'<div class="cap"><div class="cap-h"><span>Caption {"ABC"[j]}</span><button type="button" id="b{i}-{j}" data-t="t{i}-{j}">Copy</button></div>'
                    f'<pre id="t{i}-{j}">{H.escape(c)}</pre></div>' for j, c in enumerate(caps))
    noteh = f'<p class="tip"><b>Check before posting:</b> {H.escape(note)}</p>' if note else ''
    arts.append(f'<article class="post" id="p{i}"><div class="meta"><span class="n">{i:02d}</span><span class="title">{H.escape(title)}</span></div>'
                f'<div class="row"><figure><img src="{i:02d}-{slug}.png" alt="{H.escape(title)}" width="1080" height="1350" loading="lazy"></figure>'
                f'<div class="caps">{noteh}{capsh}</div></div></article>')
main = (f'<main><header><h1>Approved <span>posts</span></h1><p class="lede">All {len(P)} approved posts in posting order, alternating light and dark. '
        'Pick a caption for each, then press and hold an image to save it. A few have a note to check before they go out.</p></header>'
        + ''.join(arts))
os.makedirs(os.path.join(HERE, 'pack2'), exist_ok=True)
open(os.path.join(HERE, 'pack2', 'index.html'), 'w').write(head.replace('Kart Connect Post Queue', 'Kart Connect Approved Posts') + main + tail)
json.dump([{'n': i, 'slug': s, 'title': ti, 'captions': c, 'note': no} for i, (_, s, ti, _, _, c, no) in enumerate(P, 1)],
          open(os.path.join(HERE, 'pack2', 'queue.json'), 'w'), indent=2, ensure_ascii=False)
print(len(P), 'posts')
