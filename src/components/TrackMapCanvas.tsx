import { useRef, useEffect, useState } from 'react'
import type { ImportedGPSSession } from '@/lib/dataLoggerImport'

interface Props {
  sessions: ImportedGPSSession[]
  colors: string[]
  height?: number
  hoverDistM?: number | null
  setSFMode?: boolean
  onSetSF?: (lat: number, lon: number, headingDeg: number) => void
  pendingSF?: { lat: number; lon: number; headingDeg?: number } | null
}

function computeBearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180
  const lat1R = lat1 * Math.PI / 180, lat2R = lat2 * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(lat2R)
  const x = Math.cos(lat1R) * Math.sin(lat2R) - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLon)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

interface Wp { x: number; y: number; timeS: number; speedKmh: number | null; lat: number; lon: number; distM: number }

function toM(lat: number, lon: number, rLat: number, rLon: number) {
  const R = 6371000, rad = Math.PI / 180
  return {
    x:  (lon - rLon) * rad * R * Math.cos(rLat * rad),
    y: -(lat - rLat) * rad * R,   // negate so north = canvas-up, matching compass N label
  }
}

function fmtLap(s: number) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60), cs = Math.floor((s % 1) * 100)
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}` : `${sec}.${String(cs).padStart(2, '0')}`
}

const CX = 40, CY_MARGIN = 56, CR = 22

export function TrackMapCanvas({ sessions, colors, hoverDistM, setSFMode, onSetSF, pendingSF }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const vpRef        = useRef({ tx: 0, ty: 0, scale: 1, angle: 0 })
  const baseScaleRef = useRef(1)
  const worldRef     = useRef<Wp[][]>([])
  const refLatLonRef = useRef<{ lat: number; lon: number } | null>(null)
  const drawRef      = useRef<(() => void) | null>(null)
  const hoverDistMRef    = useRef<number | null>(null)
  const userHasZoomedRef = useRef(false)
  const setSFModeRef     = useRef(setSFMode)  // tracks S/F mode without being a dep of the main effect
  useEffect(() => { setSFModeRef.current = setSFMode }, [setSFMode])
  const pendingSFRef = useRef<{ lat: number; lon: number } | null>(pendingSF ?? null)
  useEffect(() => { pendingSFRef.current = pendingSF ?? null; drawRef.current?.() }, [pendingSF])
  const dragRef      = useRef<{
    isCompass: boolean
    sx: number; sy: number; stx: number; sty: number
    compCX: number; compCY: number; startA: number; vpA: number
  } | null>(null)
  const hitsRef = useRef<Array<{ si: number; pt: Wp; til: number } | null>>([])

  const [tooltip, setTooltip] = useState<{ x: number; y: number; items: Array<{ si: number; pt: Wp; til: number }> } | null>(null)
  const [cursor, setCursor]   = useState<'crosshair' | 'grab' | 'grabbing'>('crosshair')

  useEffect(() => {
    if (!sessions.length) return
    // Don't reset the viewport when switching to full-track sessions for S/F placement —
    // only reset when the user genuinely changes their lap selection.
    if (!setSFModeRef.current) userHasZoomedRef.current = false
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const dpr = window.devicePixelRatio || 1

    let sumLat = 0, sumLon = 0, cnt = 0
    for (const s of sessions) for (const p of s.points) { sumLat += p.lat; sumLon += p.lon; cnt++ }
    const rLat = sumLat / cnt, rLon = sumLon / cnt
    refLatLonRef.current = { lat: rLat, lon: rLon }

    worldRef.current = sessions.map(s => {
      const startD = s.points[0]?.distanceM ?? 0
      return s.points.map(p => ({
        ...toM(p.lat, p.lon, rLat, rLon),
        timeS: p.timeS, speedKmh: p.speedKmh ?? null,
        lat: p.lat, lon: p.lon,
        distM: (p.distanceM ?? 0) - startD,
      }))
    })

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const pts of worldRef.current) for (const p of pts) {
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y
    }
    const tcx = (minX + maxX) / 2, tcy = (minY + maxY) / 2
    const tw = maxX - minX || 1, th = maxY - minY || 1

    function toC(wx: number, wy: number): [number, number] {
      const { tx, ty, scale, angle } = vpRef.current
      const cos = Math.cos(angle), sin = Math.sin(angle)
      return [tx + (wx * cos - wy * sin) * scale, ty + (wx * sin + wy * cos) * scale]
    }

    function resetVp() {
      if (!canvas) return
      const W = canvas.width / dpr, H = canvas.height / dpr
      const PAD = 60
      const s = Math.min((W - PAD * 2) / tw, (H - PAD * 2) / th)
      baseScaleRef.current = s
      vpRef.current = { tx: W / 2 - tcx * s, ty: H / 2 - tcy * s, scale: s, angle: 0 }
    }

    function draw() {
      if (!canvas) return
      const W = canvas.width / dpr, H = canvas.height / dpr
      const ctx = canvas.getContext('2d')!
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#F3F4F6'
      ctx.fillRect(0, 0, W, H)

      // ── Track ribbon ──────────────────────────────────────────────────────────
      // The ribbon is a fixed-width band centered on the average GPS path.
      // It represents the approximate area the kart travelled through, not the
      // full physical track width (which is unknowable from GPS data alone).
      // The racing lines drawn on top show exactly where each lap's GPS was
      // recorded — that is the accurate, honest data.
      const HALF_WIDTH = 6.0   // m each side of the GPS centreline

      const refRaw = worldRef.current[0]
      if (refRaw?.length > 1) {
        const step = Math.max(1, Math.floor(refRaw.length / 2000))

        // Use the first session's GPS path as the ribbon centreline.
        // Fraction-based averaging across multiple sessions breaks on circuits
        // with crossing paths (e.g. figure-8 layouts) where the same fraction
        // maps to different physical arms of the track.
        const rpts: Wp[] = refRaw.filter((_, i) => i % step === 0)

        // Build left/right edge arrays (world space) — simple symmetric band
        const leftW:  [number, number][] = []
        const rightW: [number, number][] = []

        for (let i = 0; i < rpts.length; i++) {
          const p = rpts[i]
          const prev = rpts[Math.max(0, i - 1)], next = rpts[Math.min(rpts.length - 1, i + 1)]
          const tx = next.x - prev.x, ty = next.y - prev.y
          const tl = Math.sqrt(tx * tx + ty * ty) || 1
          const nx = -ty / tl, ny = tx / tl  // left normal

          leftW.push ([p.x + nx * HALF_WIDTH, p.y + ny * HALF_WIDTH])
          rightW.push([p.x - nx * HALF_WIDTH, p.y - ny * HALF_WIDTH])
        }

        // Convert to canvas coords
        const leftC  = leftW.map (([wx, wy]) => toC(wx, wy))
        const rightC = rightW.map(([wx, wy]) => toC(wx, wy))

        // Shadow pass (slightly expanded outline)
        ctx.beginPath()
        leftC.forEach (([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))
        for (let i = rightC.length - 1; i >= 0; i--) ctx.lineTo(rightC[i][0], rightC[i][1])
        ctx.closePath()
        ctx.fillStyle = 'rgba(0,0,0,0.18)'
        ctx.fill()

        // White kerb edges
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
        ctx.beginPath()
        leftC.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))
        ctx.stroke()
        ctx.beginPath()
        rightC.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))
        ctx.stroke()

        // Tarmac fill
        ctx.beginPath()
        leftC.forEach (([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))
        for (let i = rightC.length - 1; i >= 0; i--) ctx.lineTo(rightC[i][0], rightC[i][1])
        ctx.closePath()
        ctx.fillStyle = '#6B7280'
        ctx.fill()
      }

      // ── Racing lines ─────────────────────────────────────────────────────────
      // Thin (2.5 px) speed-colored line plotted at the exact GPS position.
      // Because the ribbon is 10× wider than the line, the driver's position
      // inside the track (inside apex, outside on entry etc.) is clearly visible.
      //
      // Clip all racing lines to the bounding box of session 0 (the reference
      // track, which the grey ribbon also uses) + 100 m margin.  This prevents
      // approach-road or departure-road GPS points — which lap-detection may not
      // have stripped — from extending the trace outside the circuit area.
      const ref0 = worldRef.current[0] ?? []
      let clipMinX = Infinity, clipMaxX = -Infinity, clipMinY = Infinity, clipMaxY = -Infinity
      for (const p of ref0) {
        if (p.x < clipMinX) clipMinX = p.x; if (p.x > clipMaxX) clipMaxX = p.x
        if (p.y < clipMinY) clipMinY = p.y; if (p.y > clipMaxY) clipMaxY = p.y
      }
      const CLIP_PAD = 100  // metres outside reference bounding box to tolerate

      sessions.forEach((_s, si) => {
        const raw = worldRef.current[si]
        if (!raw?.length) return
        const pts = raw.filter(p =>
          p.x >= clipMinX - CLIP_PAD && p.x <= clipMaxX + CLIP_PAD &&
          p.y >= clipMinY - CLIP_PAD && p.y <= clipMaxY + CLIP_PAD,
        )
        if (!pts.length) return
        const step = Math.max(1, Math.floor(pts.length / 3000))
        const fp = pts.filter((_, i) => i % step === 0)
        const spds = fp.map(p => p.speedKmh ?? 0)
        const minS = Math.min(...spds), maxS = Math.max(...spds)

        ctx.lineWidth = 2.5; ctx.lineCap = 'round'
        if (maxS > minS) {
          for (let i = 1; i < fp.length; i++) {
            const t = ((fp[i].speedKmh ?? 0) - minS) / (maxS - minS)
            // slow = red (220,0,0)  →  fast = green (0,200,0)
            const r = Math.round(220 * (1 - t))
            const g = Math.round(200 * t)
            const b = 0
            ctx.strokeStyle = `rgba(${r},${g},${b},1)`
            const [x0, y0] = toC(fp[i - 1].x, fp[i - 1].y)
            const [x1, y1] = toC(fp[i].x, fp[i].y)
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke()
          }
        } else {
          ctx.strokeStyle = colors[si % colors.length]; ctx.lineJoin = 'round'
          ctx.beginPath()
          fp.forEach((p, i) => { const [x, y] = toC(p.x, p.y); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) })
          ctx.stroke()
        }

      })

      // ── Single S/F crossbar ───────────────────────────────────────────────────
      // Collect S/F positions from all sessions and draw ONE averaged marker so
      // the bar doesn't appear twice when laps crossed at slightly different points.
      {
        const sfWorldPts: { x: number; y: number; idx: number }[] = []
        sessions.forEach((s, si) => {
          const pts = worldRef.current[si]
          if (!pts?.length) return
          const ct = s.lapCrossingTimesS
          if (!ct?.length) return
          let sfPt = pts[0], minDt = Infinity
          for (const p of pts) { const dt = Math.abs(p.timeS - ct[0]); if (dt < minDt) { minDt = dt; sfPt = p } }
          sfWorldPts.push({ x: sfPt.x, y: sfPt.y, idx: pts.indexOf(sfPt) })
        })
        if (sfWorldPts.length) {
          const avgX = sfWorldPts.reduce((s, p) => s + p.x, 0) / sfWorldPts.length
          const avgY = sfWorldPts.reduce((s, p) => s + p.y, 0) / sfWorldPts.length
          // Use session 0 tangent for bar orientation
          const pts0 = worldRef.current[0]
          const refIdx = sfWorldPts[0].idx
          const pPrev = pts0[Math.max(0, refIdx - 2)], pNext = pts0[Math.min(pts0.length - 1, refIdx + 2)]
          const [x0c, y0c] = toC(pPrev.x, pPrev.y), [x1c, y1c] = toC(pNext.x, pNext.y)
          const dx = x1c - x0c, dy = y1c - y0c, len = Math.sqrt(dx * dx + dy * dy) || 1
          const nx = -dy / len, ny = dx / len
          const [sfx, sfy] = toC(avgX, avgY), BAR = 14
          ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 8; ctx.lineCap = 'round'
          ctx.beginPath(); ctx.moveTo(sfx + nx * BAR, sfy + ny * BAR); ctx.lineTo(sfx - nx * BAR, sfy - ny * BAR); ctx.stroke()
          ctx.strokeStyle = 'white'; ctx.lineWidth = 6
          ctx.beginPath(); ctx.moveTo(sfx + nx * BAR, sfy + ny * BAR); ctx.lineTo(sfx - nx * BAR, sfy - ny * BAR); ctx.stroke()
          ctx.strokeStyle = '#DC2626'; ctx.lineWidth = 3
          ctx.beginPath(); ctx.moveTo(sfx + nx * BAR, sfy + ny * BAR); ctx.lineTo(sfx - nx * BAR, sfy - ny * BAR); ctx.stroke()
          const lx = sfx + nx * (BAR + 12), ly = sfy + ny * (BAR + 12)
          ctx.font = 'bold 10px system-ui,sans-serif'; ctx.textAlign = 'center'
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText('S/F', lx + 1, ly + 1)
          ctx.fillStyle = 'white'; ctx.fillText('S/F', lx, ly)
        }
      }

      // ── Pending S/F preview (amber bar shown before Save is clicked) ─────────
      {
        const pSF = pendingSFRef.current
        const pts0 = worldRef.current[0]
        if (pSF && refLatLonRef.current && pts0?.length > 1) {
          const { lat: rLat, lon: rLon } = refLatLonRef.current
          const { x: pvx, y: pvy } = toM(pSF.lat, pSF.lon, rLat, rLon)
          let nearestIdx = 0, minD = Infinity
          for (let i = 0; i < pts0.length; i++) {
            const d = Math.hypot(pts0[i].x - pvx, pts0[i].y - pvy)
            if (d < minD) { minD = d; nearestIdx = i }
          }
          const pPrev = pts0[Math.max(0, nearestIdx - 2)], pNext = pts0[Math.min(pts0.length - 1, nearestIdx + 2)]
          const [x0c, y0c] = toC(pPrev.x, pPrev.y), [x1c, y1c] = toC(pNext.x, pNext.y)
          const dx = x1c - x0c, dy = y1c - y0c, len = Math.sqrt(dx * dx + dy * dy) || 1
          const nx = -dy / len, ny = dx / len
          const [sfx, sfy] = toC(pvx, pvy), BAR = 14
          ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 8; ctx.lineCap = 'round'
          ctx.beginPath(); ctx.moveTo(sfx + nx * BAR, sfy + ny * BAR); ctx.lineTo(sfx - nx * BAR, sfy - ny * BAR); ctx.stroke()
          ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 5
          ctx.beginPath(); ctx.moveTo(sfx + nx * BAR, sfy + ny * BAR); ctx.lineTo(sfx - nx * BAR, sfy - ny * BAR); ctx.stroke()
          const lx = sfx + nx * (BAR + 14), ly = sfy + ny * (BAR + 14)
          ctx.font = 'bold 10px system-ui,sans-serif'; ctx.textAlign = 'center'
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText('S/F', lx + 1, ly + 1)
          ctx.fillStyle = '#F59E0B'; ctx.fillText('S/F', lx, ly)
        }
      }

      // ── Cursor hit markers ────────────────────────────────────────────────────
      for (const hit of hitsRef.current) {
        if (!hit) continue
        const [cx2, cy2] = toC(hit.pt.x, hit.pt.y)
        ctx.beginPath(); ctx.arc(cx2, cy2, 7, 0, Math.PI * 2); ctx.fillStyle = 'white'; ctx.fill()
        ctx.beginPath(); ctx.arc(cx2, cy2, 5, 0, Math.PI * 2); ctx.fillStyle = colors[hit.si % colors.length]; ctx.fill()
      }

      // ── Speed-trace hover cursor ─────────────────────────────────────────────
      const hdm = hoverDistMRef.current
      if (hdm != null) {
        sessions.forEach((_s, si) => {
          const pts = worldRef.current[si]
          if (!pts?.length) return
          let nearest: Wp | null = null, minD = Infinity
          for (const p of pts) { const d = Math.abs(p.distM - hdm); if (d < minD) { minD = d; nearest = p } }
          if (!nearest) return
          const [hcx, hcy] = toC(nearest.x, nearest.y)
          ctx.beginPath(); ctx.arc(hcx, hcy, 10, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill()
          ctx.beginPath(); ctx.arc(hcx, hcy, 8, 0, Math.PI * 2)
          ctx.fillStyle = colors[si % colors.length]; ctx.fill()
          ctx.beginPath(); ctx.arc(hcx, hcy, 4, 0, Math.PI * 2)
          ctx.fillStyle = '#fff'; ctx.fill()
        })
      }

      // ── Speed legend ──────────────────────────────────────────────────────────
      const bx = W - 16 - 80, by = H - 28
      const grad = ctx.createLinearGradient(bx, 0, bx + 80, 0)
      grad.addColorStop(0, 'rgba(0,0,220,0.9)'); grad.addColorStop(0.5, 'rgba(0,200,0,0.9)'); grad.addColorStop(1, 'rgba(220,0,0,0.9)')
      ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.fillRect(bx - 34, by - 5, 152, 18)
      ctx.fillStyle = grad; ctx.fillRect(bx, by, 80, 8)
      ctx.fillStyle = '#374151'; ctx.font = '9px system-ui,sans-serif'; ctx.textAlign = 'left'
      ctx.fillText('Slow', bx - 32, by + 7); ctx.fillText('Fast', bx + 84, by + 7)

      // ── Compass ───────────────────────────────────────────────────────────────
      const compX = CX, compY = H - CY_MARGIN, ang = vpRef.current.angle
      ctx.save()
      ctx.translate(compX, compY)
      ctx.beginPath(); ctx.arc(0, 0, CR, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fill()
      ctx.strokeStyle = '#D1D5DB'; ctx.lineWidth = 1; ctx.stroke()
      ctx.rotate(ang)
      ctx.beginPath(); ctx.moveTo(0, -(CR - 5)); ctx.lineTo(5, 0); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fillStyle = '#EF4444'; ctx.fill()
      ctx.beginPath(); ctx.moveTo(0, CR - 5); ctx.lineTo(5, 0); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fillStyle = '#9CA3AF'; ctx.fill()
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fillStyle = 'white'; ctx.fill()
      ctx.restore()
      const nlx = compX + Math.sin(ang) * (CR - 6), nly = compY - Math.cos(ang) * (CR - 6)
      ctx.fillStyle = '#EF4444'; ctx.font = 'bold 8px system-ui,sans-serif'; ctx.textAlign = 'center'
      ctx.fillText('N', nlx, nly + 3)

      // ── Hint text ─────────────────────────────────────────────────────────────
      ctx.fillStyle = '#9CA3AF'; ctx.font = '9px system-ui,sans-serif'; ctx.textAlign = 'center'
      ctx.fillText('Scroll to zoom · Drag to pan · Drag compass to rotate · Double-click to reset', W / 2, H - 6)
      ctx.restore()
    }

    drawRef.current = draw

    function resize() {
      if (!canvas || !container) return
      const W = container.offsetWidth, H = container.offsetHeight
      if (!W || !H) return
      canvas.width = W * dpr; canvas.height = H * dpr
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
      if (!userHasZoomedRef.current) resetVp()
      draw()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(container)
    resize()
    return () => ro.disconnect()
  }, [sessions, colors])

  // Sync hover distance from speed trace → redraw track cursor
  useEffect(() => {
    hoverDistMRef.current = hoverDistM ?? null
    drawRef.current?.()
  }, [hoverDistM])

  // Wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left, my = e.clientY - rect.top
      const rawFactor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      const vp = vpRef.current
      const minScale = baseScaleRef.current          // full track visible — can't zoom out further
      const maxScale = baseScaleRef.current * 5      // ~one corner filling the canvas — can't zoom in further
      const newScale = Math.max(minScale, Math.min(maxScale, vp.scale * rawFactor))
      const actualFactor = newScale / vp.scale
      vp.tx = mx + (vp.tx - mx) * actualFactor
      vp.ty = my + (vp.ty - my) * actualFactor
      vp.scale = newScale
      userHasZoomedRef.current = true
      drawRef.current?.()
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [])

  function inCompass(mx: number, my: number): boolean {
    const canvas = canvasRef.current
    if (!canvas) return false
    return Math.hypot(mx - CX, my - (canvas.getBoundingClientRect().height - CY_MARGIN)) <= CR
  }

  // Convert canvas pixel → world metres → nearest GPS lat/lon
  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top

    // S/F placement mode: snap to nearest GPS point and call back with heading
    if (setSFMode && onSetSF && !inCompass(mx, my)) {
      const { tx, ty, scale, angle } = vpRef.current
      const cos = Math.cos(-angle), sin = Math.sin(-angle)
      const rx = (mx - tx) / scale, ry = (my - ty) / scale
      const wx = rx * cos - ry * sin, wy = rx * sin + ry * cos
      let nearest: Wp | null = null, nearestPts: Wp[] = [], nearestIdx = 0, minD = Infinity
      for (const pts of worldRef.current) {
        for (let i = 0; i < pts.length; i++) {
          const d = Math.hypot(pts[i].x - wx, pts[i].y - wy)
          if (d < minD) { minD = d; nearest = pts[i]; nearestPts = pts; nearestIdx = i }
        }
      }
      if (nearest) {
        const pPrev = nearestPts[Math.max(0, nearestIdx - 3)]
        const pNext = nearestPts[Math.min(nearestPts.length - 1, nearestIdx + 3)]
        const headingDeg = computeBearingDeg(pPrev.lat, pPrev.lon, pNext.lat, pNext.lon)
        onSetSF(nearest.lat, nearest.lon, headingDeg)
      }
      return
    }

    if (inCompass(mx, my)) {
      const cy2 = rect.height - CY_MARGIN
      dragRef.current = { isCompass: true, sx: 0, sy: 0, stx: 0, sty: 0, compCX: CX, compCY: cy2, startA: Math.atan2(my - cy2, mx - CX), vpA: vpRef.current.angle }
    } else {
      dragRef.current = { isCompass: false, sx: mx, sy: my, stx: vpRef.current.tx, sty: vpRef.current.ty, compCX: 0, compCY: 0, startA: 0, vpA: 0 }
    }
    setCursor('grabbing')
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top

    if (dragRef.current) {
      if (dragRef.current.isCompass) {
        vpRef.current.angle = dragRef.current.vpA + (Math.atan2(my - dragRef.current.compCY, mx - dragRef.current.compCX) - dragRef.current.startA)
      } else {
        vpRef.current.tx = dragRef.current.stx + (mx - dragRef.current.sx)
        vpRef.current.ty = dragRef.current.sty + (my - dragRef.current.sy)
      }
      drawRef.current?.(); return
    }

    setCursor(inCompass(mx, my) ? 'grab' : 'crosshair')

    // Cursor hit test
    const { tx, ty, scale, angle } = vpRef.current
    const cos = Math.cos(-angle), sin = Math.sin(-angle)
    const rx = (mx - tx) / scale, ry = (my - ty) / scale
    const wx = rx * cos - ry * sin, wy = rx * sin + ry * cos
    const SNAP = 25 / scale

    const hits: Array<{ si: number; pt: Wp; til: number } | null> = sessions.map((s, si) => {
      const pts = worldRef.current[si]
      if (!pts) return null
      let nearest: Wp | null = null, minD = Infinity
      for (const p of pts) { const d = Math.hypot(p.x - wx, p.y - wy); if (d < minD) { minD = d; nearest = p } }
      if (!nearest || minD > SNAP) return null
      const cts = s.lapCrossingTimesS ?? []
      const base = cts.length ? cts[0] : (worldRef.current[si][0]?.timeS ?? 0)
      return { si, pt: nearest, til: nearest.timeS - base }
    })

    hitsRef.current = hits
    drawRef.current?.()
    const valid = hits.filter(Boolean) as Array<{ si: number; pt: Wp; til: number }>
    setTooltip(valid.length ? { x: mx, y: my, items: valid } : null)
  }

  function handleMouseUp() { dragRef.current = null; setCursor('crosshair') }
  function handleMouseLeave() {
    dragRef.current = null; setCursor('crosshair')
    hitsRef.current = []; setTooltip(null); drawRef.current?.()
  }
  function handleDblClick() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const W = canvas.width / dpr, H = canvas.height / dpr
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const pts of worldRef.current) for (const p of pts) {
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y
    }
    const tcx = (minX + maxX) / 2, tcy = (minY + maxY) / 2
    const tw = maxX - minX || 1, th = maxY - minY || 1
    const s = Math.min((W - 120) / tw, (H - 120) / th)
    baseScaleRef.current = s
    vpRef.current = { tx: W / 2 - tcx * s, ty: H / 2 - tcy * s, scale: s, angle: 0 }
    userHasZoomedRef.current = false
    drawRef.current?.()
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F3F4F6' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', cursor }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDblClick}
      />

      {/* S/F placement mode overlay */}
      {setSFMode && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          border: '2px dashed rgba(245,158,11,0.7)', borderRadius: 8,
          pointerEvents: 'none', zIndex: 5,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 40,
        }}>
          <div style={{ background: 'rgba(245,158,11,0.95)', color: '#fff', fontWeight: 700, fontSize: 11, padding: '5px 14px', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            Click on the track to position the S/F line, then press Save
          </div>
        </div>
      )}

      {/* Live data tooltip */}
      {tooltip && tooltip.items.length > 0 && (
        <div style={{
          position: 'absolute',
          left: Math.min(tooltip.x + 18, (containerRef.current?.offsetWidth ?? 400) - 190),
          top: Math.max(8, tooltip.y - 28),
          background: 'rgba(17,24,39,0.93)', borderRadius: 8, padding: '8px 12px',
          color: '#F9FAFB', fontSize: 12, lineHeight: 1.6, pointerEvents: 'none',
          minWidth: 170, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 10,
        }}>
          {tooltip.items.map((d, i) => (
            <div key={i} style={{ marginBottom: i < tooltip.items.length - 1 ? 8 : 0 }}>
              <div style={{ color: colors[d.si % colors.length], fontWeight: 700, fontSize: 11, marginBottom: 1 }}>
                {sessions[d.si]?.filename ?? `Session ${d.si + 1}`}
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                {d.pt.speedKmh != null && <span><span style={{ color: '#6B7280' }}>Speed </span><strong>{Math.round(d.pt.speedKmh)}</strong> km/h</span>}
                <span><span style={{ color: '#6B7280' }}>+</span>{fmtLap(Math.max(0, d.til))}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
