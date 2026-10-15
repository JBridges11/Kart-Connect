"""v4: the punchy v2 energy, rebuilt so its signature details are Kart Connect's own.
Upright Anton (not condensed italic), brand-gradient fill instead of outline words, coloured key words instead of a
stripe behind them, logo top-left (not centred), speed lines at the logo's 57 degree slant, faded full mark kept,
chequered strip kept. Content comes from gen2.py's post list."""
import os, sys, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('gen2', os.path.join(HERE, 'gen2.py'))
g2 = importlib.util.module_from_spec(spec); spec.loader.exec_module(g2)
MARK = g2.gen.MARK

CSS4 = g2.CSS + g2.EXTRA + r'''
@font-face{font-family:'Anton';font-style:normal;font-weight:400;src:url('fonts/Anton-400n.woff2') format('woff2');}
.s.dark  { background: radial-gradient(120% 80% at 100% 0%, #3A2468 0%, #1C1236 45%, #0E0919 100%); }
.s.light { background: radial-gradient(120% 80% at 100% 0%, #FFFFFF 0%, #F3EFFA 60%, #E9E2F6 100%); }
.lines { background: repeating-linear-gradient(-57deg, transparent 0 38px, rgba(255,255,255,.035) 38px 40px) !important; }
.s.light .lines { background: repeating-linear-gradient(-57deg, transparent 0 38px, rgba(123,94,167,.06) 38px 40px) !important; }
.wm { width: 260px !important; left: auto !important; top: auto !important; right: -6px; bottom: 30px; transform: none !important; }
.top { justify-content: space-between !important; left: 24px !important; right: 24px !important; align-items: center; }
.top img { height: 28px; }
.top .site { font-size: 8px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; opacity: .7; }
.d { font-family: 'Anton', 'Inter', sans-serif !important; font-style: normal !important; font-weight: 400 !important;
     line-height: .95 !important; letter-spacing: .01em !important; transform: scaleY(1.04); transform-origin: left top; }
.o { color: transparent !important; -webkit-text-stroke: 0 !important;
     background: linear-gradient(95deg, #F5C842 0%, #5CC85A 50%, #A07FE0 100%); -webkit-background-clip: text; background-clip: text; }
.s.light .o { background: linear-gradient(95deg, #D9A514 0%, #3FAF3D 50%, #7B5EA7 100%); -webkit-background-clip: text; background-clip: text; }
.hl::before { display: none !important; }
.hl { color: #F5C842; }
.s.light .hl { color: #7B5EA7; }
.kick { display: inline-flex; align-items: center; gap: 8px; }
.tlv div, .lang div, .sec b, .lbr .p { font-family: 'Anton', 'Inter', sans-serif !important; font-style: normal !important; font-weight: 400 !important; }
.tlv div { font-size: 23px !important; letter-spacing: .02em; }
.lang div { font-size: 21px !important; }
.kick::before { content: ""; width: 18px; height: 7px; border-radius: 999px; background: currentColor; transform: rotate(-57deg); }
'''


def tile4(theme, inner, foot_l):
    logo = 'logo-white.png' if theme == 'dark' else 'logo.png'
    return (f'<section class="s {theme}"><div class="lines"></div>{MARK}'
            f'<div class="top"><img src="{logo}" alt="Kart Connect"><span class="site">kart-connect.com</span></div>'
            f'<div class="in">{inner}</div>'
            f'<div class="foot"><span>{foot_l}</span><i></i><span>Kart Connect</span></div><div class="chk"></div></section>')


# Anton runs a little wider than Barlow Condensed: scale headline sizes down slightly
import re
def shrink(html, k=0.86):
    return re.sub(r'(class="d[^"]*" style="font-size:)(\d+)px', lambda m: f'{m.group(1)}{round(int(m.group(2)) * k)}px', html)

html = ('<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Queue v4</title>'
        f'<style>{CSS4}</style></head><body>'
        + ''.join(tile4(t, shrink(h), f) for _, t, _, _, h, f, _ in g2.P) + '</body></html>')
open(os.path.join(HERE, 'queue4.html'), 'w').write(html)
print(len(g2.P), 'posts')
