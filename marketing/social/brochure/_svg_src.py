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
# 2 GPS map: grey track surface with a thin racing line coloured slow (red) to fast (green), layout traced from the owner's reference
RAW = [(190, 57), (240, 44), (290, 32), (330, 40), (348, 70), (345, 110), (320, 140), (305, 170), (300, 210), (290, 240),
       (265, 270), (240, 295), (215, 300), (205, 285), (210, 262), (235, 240), (262, 215), (268, 195), (255, 183),
       (235, 190), (215, 215), (195, 235), (175, 250), (160, 275), (160, 310), (150, 345), (130, 355), (110, 340),
       (105, 300), (115, 250), (140, 215), (175, 185), (220, 150), (255, 125), (275, 105), (280, 85), (265, 78),
       (240, 85), (195, 100), (150, 115), (120, 130), (105, 150), (112, 165), (135, 160), (155, 165), (160, 185),
       (140, 198), (110, 195), (75, 175), (55, 140), (65, 105), (100, 85), (150, 70)]
def chaikin(p, it):
    for _ in range(it):
        q = []
        for a in range(len(p)):
            (x0, y0), (x1, y1) = p[a], p[(a + 1) % len(p)]
            q += [(0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1), (0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1)]
        p = q
    return p
raw = chaikin(RAW, 4)
L = [0]
for a in range(len(raw)):
    (x0, y0), (x1, y1) = raw[a], raw[(a + 1) % len(raw)]
    L.append(L[-1] + math.hypot(x1 - x0, y1 - y0))
tot = L[-1]; N = 420; pts = []; seg = 0
for k in range(N):
    d = tot * k / N
    while L[seg + 1] < d: seg += 1
    t = (d - L[seg]) / (L[seg + 1] - L[seg] + 1e-12)
    (x0, y0), (x1, y1) = raw[seg], raw[(seg + 1) % len(raw)]
    pts.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t))
M = len(pts)
def ang(i):
    ax, ay = pts[i - 1]; bx, by = pts[i]; cx, cy = pts[(i + 1) % M]
    d = (math.atan2(cy - by, cx - bx) - math.atan2(by - ay, bx - ax) + math.pi) % (2 * math.pi) - math.pi
    return abs(d) / (math.hypot(cx - bx, cy - by) + 1e-6)
curv = [ang(i) for i in range(M)]
sm = [sum(curv[(i + k) % M] for k in range(-6, 7)) / 13 for i in range(M)]
hi = sorted(sm)[int(M * .78)]
speed = [max(0, 1 - min(1, c / hi)) for c in sm]
speed = [sum(speed[(i + k) % M] for k in range(-4, 5)) / 9 for i in range(M)]
def col(v):
    stops = [(0, (214, 40, 28)), (.5, (150, 110, 20)), (1, (60, 200, 30))]
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        if v <= p1:
            k = (v - p0) / (p1 - p0)
            return '#%02x%02x%02x' % tuple(round(c0[q] + (c1[q] - c0[q]) * k) for q in range(3))
    return '#3CC81E'
MW, MH = 290, 182
xs = [p[0] for p in RAW]; ys = [p[1] for p in RAW]
sc = (MH - 24) / (max(ys) - min(ys))
ox = (MW - (max(xs) - min(xs)) * sc) / 2 - min(xs) * sc
oy = 12 - min(ys) * sc
X = lambda x: ox + x * sc
Y = lambda y: oy + y * sc
outline = 'M' + ' L'.join(f'{X(x):.1f},{Y(y):.1f}' for x, y in pts) + ' Z'
segs = ''.join(f'<line x1="{X(pts[i][0]):.1f}" y1="{Y(pts[i][1]):.1f}" x2="{X(pts[(i + 1) % M][0]):.1f}" y2="{Y(pts[(i + 1) % M][1]):.1f}" '
               f'stroke="{col(speed[i])}" stroke-width="2.6" stroke-linecap="round"/>' for i in range(M))
# start / finish marker across the track at the first point
(x0, y0), (x1, y1) = pts[0], pts[2]
dx, dy = x1 - x0, y1 - y0; Ln = math.hypot(dx, dy)
nx, ny = -dy / Ln, dx / Ln
sfx, sfy = X(x0), Y(y0)
sf = (f'<line x1="{sfx - nx * 11:.1f}" y1="{sfy - ny * 11:.1f}" x2="{sfx + nx * 11:.1f}" y2="{sfy + ny * 11:.1f}" stroke="#fff" stroke-width="5" stroke-linecap="round"/>'
      f'<line x1="{sfx - nx * 10:.1f}" y1="{sfy - ny * 10:.1f}" x2="{sfx + nx * 10:.1f}" y2="{sfy + ny * 10:.1f}" stroke="#D6281C" stroke-width="2.4" stroke-linecap="round"/>')
svg2 = (f'<svg viewBox="0 0 {MW} {MH}" width="100%" style="display:block;margin-top:4px;">'
        f'<path d="{outline}" fill="none" stroke="#6B7080" stroke-width="13" stroke-linejoin="round"/>{segs}{sf}</svg>')
