"""Build a Kart Connect social post from a JSON spec.

Usage:
    python3 marketing/social/build.py <spec.json> <outDir>

Writes to <outDir>:
    slides.html        the slides, for rendering
    slide-NN.png       1080x1350 Instagram images, one per slide
    index.html         the review page that gets published as an Artifact
    preview.png        all slides side by side, for a quick visual check
    <slug>.pdf         every slide in one PDF, one page per slide

Spec format (see examples/*.json):
    {
      "slug": "post-1-add-weather",
      "title": "Add weather",              # used on the review page
      "slides": [ {"label": "...", "html": "..."}, ... ],
      "captions": ["option A ...", "option B ..."]
    }

Slide chrome is added automatically: logo top-left and "Swipe" on slide 1,
the label top-left on the rest, a 01 / NN counter, and kart-connect.com
plus the logo on the last slide. Write only the body of each slide.
"""
import html as htmlmod
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LOGO = '<img class="logo" src="logo.png" alt="Kart Connect">'


def slides_html(spec):
    css = open(os.path.join(HERE, 'slides.css')).read()
    total = len(spec['slides'])
    out = []
    for i, s in enumerate(spec['slides'], 1):
        first, last = i == 1, i == total
        top_left = LOGO if first else f'<span class="label">{s.get("label", "")}</span>'
        if last:
            foot = f'<span class="url" style="font-size:13px;">kart-connect.com</span>{LOGO}'
        elif first:
            foot = '<span class="url">kart-connect.com</span><span class="swipe">Swipe →</span>'
        else:
            foot = '<span></span><span class="swipe">Swipe →</span>'
        out.append(f'''<section class="s">
  <div class="top">{top_left}<span class="count">{i:02d} / {total:02d}</span></div>
  <div class="body">{s["html"]}</div>
  <div class="foot">{foot}</div>
</section>''')
    return f'''<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><title>{spec["slug"]}</title>
<style>{css}</style></head>
<body>
{chr(10).join(out)}
</body></html>
'''


def review_page(spec, n):
    esc = htmlmod.escape
    imgs = '\n'.join(
        f'<figure><img src="slide-{i:02d}.png" alt="Slide {i} of {n}" width="1080" height="1350">'
        f'<figcaption>Slide {i} of {n}</figcaption></figure>'
        for i in range(1, n + 1))
    caps = '\n'.join(
        f'''<article class="cap">
  <div class="cap-head"><h3>Option {chr(65 + k)}</h3><button type="button" id="copy-{k}" data-k="{k}">Copy</button></div>
  <pre id="cap-{k}">{esc(c)}</pre>
</article>''' for k, c in enumerate(spec.get('captions', [])))
    return f'''<title>Kart Connect: {esc(spec["title"])}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap">
<style>
/* Layout: one narrow column; slides first, captions after. Kart Connect brand: white, Inter, gradient frame. */
:root {{
  --bg: #ffffff; --panel: #f4f4f4; --ink: #1a1a1a; --ink-mid: #444444; --ink-lt: #6f6f6f;
  --rule: #e8e8e8; --purple: #7B5EA7; --on-purple: #ffffff;
  --gradient: linear-gradient(to right, #F5C842 0%, #5CC85A 50%, #7B5EA7 100%);
  --font: 'Inter', Arial, sans-serif;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{
  --bg: #141414; --panel: #1f1f1f; --ink: #f2f2f2; --ink-mid: #cfcfcf; --ink-lt: #9a9a9a;
  --rule: #2e2e2e; --purple: #a58bd0; --on-purple: #141414; color-scheme: dark; }} }}
:root[data-theme="dark"] {{
  --bg: #141414; --panel: #1f1f1f; --ink: #f2f2f2; --ink-mid: #cfcfcf; --ink-lt: #9a9a9a;
  --rule: #2e2e2e; --purple: #a58bd0; --on-purple: #141414; color-scheme: dark; }}
* {{ box-sizing: border-box; }}
body {{ background: var(--bg); color: var(--ink); font-family: var(--font); margin: 0; }}
.frame {{ height: 6px; background: var(--gradient); }}
main {{ max-width: 560px; margin: 0 auto; padding-inline: 16px; padding-block: 28px 40px; display: flex; flex-direction: column; gap: 28px; }}
.eyebrow {{ font-size: 11px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase; color: var(--purple); margin: 0 0 6px; }}
h1 {{ font-size: 28px; font-weight: 800; letter-spacing: -.03em; line-height: 1.15; margin: 0; text-wrap: balance; }}
.lede {{ color: var(--ink-mid); font-size: 15px; line-height: 1.6; margin: 10px 0 0; }}
h2 {{ font-size: 18px; font-weight: 700; letter-spacing: -.02em; margin: 0; }}
.slides {{ display: flex; flex-direction: column; gap: 18px; }}
figure {{ margin: 0; }}
figure img {{ display: block; width: 100%; height: auto; max-width: 100%; border: 1px solid var(--rule); }}
figcaption {{ font-size: 12px; color: var(--ink-lt); margin-top: 6px; }}
.cap {{ background: var(--panel); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }}
.cap-head {{ display: flex; justify-content: space-between; align-items: center; gap: 12px; }}
h3 {{ font-size: 13px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase; color: var(--ink-lt); margin: 0; }}
pre {{ font-family: var(--font); font-size: 15px; line-height: 1.6; color: var(--ink-mid); white-space: pre-wrap; margin: 0; }}
button {{ font: 600 13px var(--font); background: var(--purple); color: var(--on-purple); border: 0; border-radius: 6px; padding: 8px 14px; cursor: pointer; }}
button:focus-visible {{ outline: 2px solid var(--purple); outline-offset: 2px; }}
.tip {{ font-size: 13px; color: var(--ink-lt); line-height: 1.5; margin: 0; }}
</style>
<div class="frame"></div>
<main>
  <header>
    <p class="eyebrow">Social post</p>
    <h1>{esc(spec["title"])}</h1>
    <p class="lede">{n} slides at 1080×1350. On your phone, press and hold each slide to save it, then post them in order as an Instagram carousel.</p>
  </header>
  <section class="slides" aria-label="Slides">
{imgs}
  </section>
  <section style="display:flex;flex-direction:column;gap:14px;">
    <h2>Captions</h2>
{caps}
    <p class="tip">Pick one caption and paste it into the post.</p>
  </section>
</main>
<script>
document.querySelectorAll('button[data-k]').forEach(b => b.addEventListener('click', () => {{
  const pre = document.getElementById('cap-' + b.dataset.k);
  const done = () => {{ b.textContent = 'Copied'; setTimeout(() => b.textContent = 'Copy', 1500); }};
  const pick = () => {{ const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Selected'; }};
  try {{ navigator.clipboard.writeText(pre.textContent).then(done, pick); }} catch (e) {{ pick(); }}
}}));
</script>
'''


def main():
    spec_path, out = sys.argv[1], sys.argv[2]
    spec = json.load(open(spec_path))
    spec.setdefault('title', spec['slug'])
    os.makedirs(out, exist_ok=True)
    # assets the slide HTML refers to: logo.png and assets/shots/*
    shutil.copy(os.path.join(HERE, 'assets', 'logo.png'), os.path.join(out, 'logo.png'))
    shutil.copytree(os.path.join(HERE, 'assets'), os.path.join(out, 'assets'), dirs_exist_ok=True)
    open(os.path.join(out, 'slides.html'), 'w').write(slides_html(spec))
    npm_root = subprocess.check_output(['npm', 'root', '-g'], text=True).strip()
    subprocess.run(['node', os.path.join(HERE, 'render.cjs'), os.path.join(out, 'slides.html'), out],
                   check=True, env={**os.environ, 'NODE_PATH': npm_root})
    n = len(spec['slides'])
    open(os.path.join(out, 'index.html'), 'w').write(review_page(spec, n))
    from PIL import Image
    ims = [Image.open(os.path.join(out, f'slide-{i:02d}.png')).resize((432, 540)) for i in range(1, n + 1)]
    sheet = Image.new('RGB', (442 * n, 540), (200, 200, 200))
    for i, im in enumerate(ims):
        sheet.paste(im, (i * 442, 0))
    sheet.save(os.path.join(out, 'preview.png'))
    pages = [Image.open(os.path.join(out, f'slide-{i:02d}.png')).convert('RGB') for i in range(1, n + 1)]
    pages[0].save(os.path.join(out, f'{spec["slug"]}.pdf'), save_all=True, append_images=pages[1:], resolution=216)
    print(f'built {spec["slug"]}: {n} slides in {out}')


if __name__ == '__main__':
    main()
