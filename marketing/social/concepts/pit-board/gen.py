"""'Pit Board' concept: punchy single-image posts that alternate dark/light so the
Instagram grid reads as a chequered flag. Writes pit.html (one <section class="s"> per tile)."""
import os
HERE = os.path.dirname(os.path.abspath(__file__))

MARK = ('<svg class="wm" viewBox="140 10 214 128" aria-hidden="true"><g fill="currentColor">'
        '<rect x="-70" y="-22" width="140" height="44" rx="22" transform="translate(199,73) rotate(-57)"/>'
        '<rect x="-70" y="-22" width="140" height="44" rx="22" transform="translate(272,73) rotate(-57)"/>'
        '<circle cx="324" cy="106" r="23"/></g></svg>')

CSS = open(os.path.join(HERE, 'fonts', 'fonts.css')).read() + r'''
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #bbb; padding: 20px; display: flex; flex-wrap: wrap; gap: 20px; font-family: 'Inter', Arial, sans-serif; }
.s { width: 360px; height: 450px; position: relative; overflow: hidden;
     --acc: #F5C842; --acc2: #5CC85A; --num: #7B5EA7; --num2: #D8CCF2; --ink: #1A1033; }
.s.dark  { color: #fff;  background: radial-gradient(130% 95% at 88% 8%, #2E1C52 0%, #190F30 52%, #0D0918 100%); }
.s.light { color: var(--ink); background: linear-gradient(165deg, #FFFFFF 0%, #F1EDF8 100%); }
/* faded logo mark + speed lines */
.wm { position: absolute; width: 330px; left: 50%; top: 52%; transform: translate(-50%, -50%); opacity: .08; color: currentColor; }
.s.light .wm { color: #7B5EA7; opacity: .09; }
.lines { position: absolute; inset: 0; pointer-events: none; opacity: .5;
  background: repeating-linear-gradient(-28deg, transparent 0 46px, rgba(255,255,255,.035) 46px 47px); }
.s.light .lines { background: repeating-linear-gradient(-28deg, transparent 0 46px, rgba(123,94,167,.06) 46px 47px); }
/* chequered edge: the flag motif on every tile */
.chk { position: absolute; left: 0; right: 0; bottom: 0; height: 10px;
  background: repeating-conic-gradient(currentColor 0 25%, transparent 0 50%) 0 0 / 10px 10px; opacity: .9; }
.s.dark .chk { color: #fff; } .s.light .chk { color: var(--ink); }
.top { position: absolute; top: 22px; left: 0; right: 0; display: flex; justify-content: center; }
.top img { height: 30px; }
.in { position: absolute; inset: 70px 24px 44px; display: flex; flex-direction: column; }
.foot { position: absolute; left: 24px; right: 24px; bottom: 20px; display: flex; justify-content: space-between; align-items: center;
  font-size: 7.5px; font-weight: 700; letter-spacing: .26em; text-transform: uppercase; opacity: .85; }
.foot i { flex: 1; height: 1px; background: currentColor; opacity: .3; margin: 0 10px; }
.kick { font-size: 9px; font-weight: 700; letter-spacing: .32em; text-transform: uppercase; color: var(--acc); }
.s.light .kick { color: #7B5EA7; }
.d { font-family: 'Barlow Condensed', 'Inter', sans-serif; font-style: italic; font-weight: 900; text-transform: uppercase;
     line-height: .84; letter-spacing: -.005em; }
.o { color: transparent; -webkit-text-stroke: 1.6px #fff; }
.s.light .o { -webkit-text-stroke-color: var(--ink); }
.hl { position: relative; display: inline-block; z-index: 0; }
.hl::before { content: ""; position: absolute; left: -14px; right: -8px; top: 52%; height: 20%; background: var(--acc); z-index: -1; transform: skewX(-18deg); }
.sub { font-size: 12px; font-weight: 600; line-height: 1.45; opacity: .9; }
.rule { height: 1px; background: currentColor; opacity: .25; }
.num { font-size: 260px; color: var(--num); text-shadow: -9px 6px 0 var(--num2); text-align: center; line-height: .8; }
.s.dark .num { color: #fff; text-shadow: -9px 6px 0 var(--num); }
.tl { display: flex; justify-content: space-between; position: relative; margin-top: 14px; }
.tl::before { content: ""; position: absolute; left: 6px; right: 6px; top: 4px; height: 2px; background: #7B5EA7; opacity: .35; }
.tl span { position: relative; width: 10px; height: 10px; border-radius: 50%; background: currentColor; opacity: .25; }
.tl span.on { background: #7B5EA7; opacity: 1; box-shadow: 0 0 0 3px rgba(123,94,167,.25); }
.tl span.go { background: var(--acc); opacity: 1; }
.days { display: flex; justify-content: space-between; font-size: 6.5px; font-weight: 700; letter-spacing: .14em; margin-top: 6px; opacity: .7; }
.dev { border: 7px solid #0B0B10; border-radius: 12px; background: #0B0B10; box-shadow: 0 18px 40px rgba(0,0,0,.45); overflow: hidden; }
.s.light .dev { box-shadow: 0 16px 34px rgba(26,16,51,.25); }
.dev img { display: block; width: 100%; border-radius: 5px; }
.sticker { display: inline-block; background: var(--acc); color: #1A1033; font-weight: 800; font-size: 11px; letter-spacing: .06em;
           text-transform: uppercase; padding: 7px 11px; border-radius: 4px; transform: rotate(-4deg); }
.flag { position: absolute; width: 150px; height: 150px; right: -40px; top: 40px; transform: rotate(18deg); opacity: .16;
  background: repeating-conic-gradient(#fff 0 25%, transparent 0 50%) 0 0 / 30px 30px; }
/* alternative colourways */
.cwB.dark  { background: #0D0D0D; --acc: #F5C842; --num: #F5C842; }
.cwB.light { background: #F5C842; --ink: #0D0D0D; color: #0D0D0D; --num: #0D0D0D; --num2: rgba(255,255,255,.55); }
.cwB.light .kick { color: #0D0D0D; } .cwB.light .wm { color: #0D0D0D; opacity: .07; }
.cwC.dark  { background: linear-gradient(160deg, #8C6FC4 0%, #6A4D98 55%, #4E3576 100%); --acc: #F5C842; }
.cwC.light { background: linear-gradient(160deg, #F2FBF1 0%, #DDF3DB 100%); --ink: #123B12; color: #123B12; --num: #2E8F2C; --num2: #BFE7BD; }
.cwC.light .kick { color: #2E8F2C; }
'''


def tile(theme, inner, foot_l, foot_r, cw=''):
    logo = 'logo-white.png' if 'dark' in theme else 'logo.png'
    return (f'<section class="s {theme} {cw}"><div class="lines"></div>{MARK}'
            f'<div class="top"><img src="{logo}" alt="Kart Connect"></div>'
            f'<div class="in">{inner}</div>'
            f'<div class="foot"><span>{foot_l}</span><i></i><span>{foot_r}</span></div><div class="chk"></div></section>')


def countdown(n, theme, cw=''):
    dots = ''.join(f'<span class="{"on" if i == 3 - n + 3 else ("go" if i == 6 else "")}"></span>' for i in range(7))
    word = 'DAY' if n == 1 else 'DAYS'
    inner = (f'<div class="kick" style="text-align:center;">Data Logger</div>'
             f'<div class="d num" style="margin-top:6px;">{n}</div>'
             f'<div class="d" style="font-size:52px;text-align:center;margin-top:4px;">{word} TO GO</div>'
             f'<div style="margin-top:auto;"><div class="tl">{dots}</div>'
             f'<div class="days"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span></div></div>')
    return tile(theme, inner, 'Every logger. One screen.', 'kart-connect.com', cw)


def reveal(theme, k, title, img, line, cw=''):
    inner = (f'<div class="kick">Feature reveal #{k}</div>'
             f'<div class="d" style="font-size:58px;margin-top:8px;">{title}</div>'
             f'<div class="dev" style="margin-top:18px;"><img src="{img}" alt=""></div>'
             f'<p class="sub" style="margin-top:14px;">{line}</p>')
    return tile(theme, inner, 'Feature reveal', 'kart-connect.com', cw)


def live(theme, cw=''):
    inner = ('<div class="d" style="font-size:44px;">Data Logger,</div>'
             '<div class="d o" style="font-size:104px;margin-top:2px;">We&rsquo;re</div>'
             '<div class="d" style="font-size:150px;margin-top:-6px;"><span class="hl">Live.</span></div>'
             '<div class="rule" style="margin-top:auto;"></div>'
             '<p class="sub" style="margin-top:10px;font-size:14px;font-weight:700;">Every logger brand. One screen.</p>')
    return tile(theme, inner, 'Launch day', 'kart-connect.com', cw)


tiles = [
    # 1 dark: teaser
    tile('dark', '<div class="kick">Coming soon</div>'
         '<div class="d o" style="font-size:84px;margin-top:10px;">Every</div>'
         '<div class="d o" style="font-size:84px;">logger.</div>'
         '<div class="d" style="font-size:92px;margin-top:6px;"><span class="hl">One</span></div>'
         '<div class="d" style="font-size:92px;">screen.</div>',
         'Data Logger', 'kart-connect.com'),
    # 2 light: 3 days
    countdown(3, 'light'),
    # 3 dark: feature reveal weather
    reveal('dark', 1, 'Add weather.', 'live-weather.png', 'One tap and the live conditions are saved with your session.'),
    # 4 light: 2 days
    countdown(2, 'light'),
    # 5 dark: feature reveal report
    tile('dark', '<div class="kick">Feature reveal #2</div>'
         '<div class="d" style="font-size:50px;margin-top:8px;">Every session,<br>one page.</div>'
         '<div style="display:flex;justify-content:center;margin-top:16px;"><img src="report.png" alt="" '
         'style="width:136px;border-radius:4px;transform:rotate(-4deg);box-shadow:0 18px 40px rgba(0,0,0,.5);"></div>',
         'Feature reveal', 'kart-connect.com'),
    # 6 light: 1 day
    countdown(1, 'light'),
    # 7 dark: we're live
    live('dark'),
    # 8 light: feature reveal setup
    reveal('light', 3, 'Log it right.', 'app-setup.png', 'Axle, bumpers, brakes and engine. Every part of the kart, saved.'),
    # 9 dark: giveaway
    tile('dark', '<div class="flag"></div><div class="kick">Giveaway</div>'
         '<div class="d" style="font-size:118px;margin-top:6px;"><span class="hl">Win</span></div>'
         '<div class="d o" style="font-size:52px;margin-top:4px;">a year of</div>'
         '<div class="d" style="font-size:52px;">Kart Connect.</div>'
         '<div style="margin-top:14px;"><span class="sticker">Worth £155.88</span></div>'
         '<p class="sub" style="margin-top:auto;">Like, share and tag your karting mates.</p>',
         'Giveaway', 'Link in bio'),
]

alts = [live('dark', 'cwB'), countdown(2, 'light', 'cwB'), live('dark', 'cwC'), countdown(2, 'light', 'cwC')]

html = (f'<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Pit Board</title><style>{CSS}</style></head><body>'
        + ''.join(tiles) + ''.join(alts) + '</body></html>')
open(os.path.join(HERE, 'pit.html'), 'w').write(html)
print(len(tiles), 'tiles +', len(alts), 'colourway samples')
