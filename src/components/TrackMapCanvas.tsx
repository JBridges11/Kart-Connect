import { useRef, useEffect } from 'react'
import type { ImportedGPSSession } from '@/lib/dataLoggerImport'

interface Props {
  sessions: ImportedGPSSession[]
  colors: string[]
  height?: number
}

// Parse "#RRGGBB" into "r,g,b" for canvas rgba()
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ].join(',')
}

export function TrackMapCanvas({ sessions, colors, height = 400 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || sessions.length === 0) return

    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth
    const H = height
    canvas.width  = W * dpr
    canvas.height = H * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    // Compute bounds across all sessions
    let minLat = Infinity, maxLat = -Infinity
    let minLon = Infinity, maxLon = -Infinity
    for (const s of sessions) {
      for (const p of s.points) {
        if (p.lat < minLat) minLat = p.lat
        if (p.lat > maxLat) maxLat = p.lat
        if (p.lon < minLon) minLon = p.lon
        if (p.lon > maxLon) maxLon = p.lon
      }
    }

    const midLat = (minLat + maxLat) / 2
    const cosLat = Math.cos(midLat * Math.PI / 180)
    const latSpanM = (maxLat - minLat) * 111000 || 1
    const lonSpanM = (maxLon - minLon) * 111000 * cosLat || 1

    const pad = 40
    const scale = Math.min((W - pad * 2) / lonSpanM, (H - pad * 2) / latSpanM)
    const cx = W / 2
    const cy = H / 2

    function toXY(lat: number, lon: number): [number, number] {
      const x = cx + (lon - (minLon + maxLon) / 2) * 111000 * cosLat * scale
      const y = cy - (lat - midLat) * 111000 * scale
      return [x, y]
    }

    // Background
    ctx.fillStyle = '#12121A'
    ctx.fillRect(0, 0, W, H)

    // Draw a ghost track (all sessions combined, grey) for context
    ctx.strokeStyle = '#2A2A3A'
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const s of sessions) {
      ctx.beginPath()
      s.points.forEach((p, i) => {
        const [x, y] = toXY(p.lat, p.lon)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.stroke()
    }

    // Draw each session's trace
    sessions.forEach((s, si) => {
      const rgb = hexToRgb(colors[si % colors.length])
      const hasSpeed = s.points.some(p => p.speedKmh != null)
      const allSpeeds = hasSpeed ? s.points.map(p => p.speedKmh ?? 0) : []
      const minSpd = hasSpeed ? Math.min(...allSpeeds) : 0
      const maxSpd = hasSpeed ? Math.max(...allSpeeds) : 1

      // Downsample for performance (max 2000 points per session on canvas)
      const step = Math.max(1, Math.floor(s.points.length / 2000))
      const pts = s.points.filter((_, i) => i % step === 0)

      // If speed data exists, colour-code by speed (blue→green→red)
      if (hasSpeed && maxSpd > minSpd) {
        pts.forEach((p, i) => {
          if (i === 0) return
          const prev = pts[i - 1]
          const t = ((p.speedKmh ?? 0) - minSpd) / (maxSpd - minSpd)
          // Cold → warm: blue (0) → green (0.5) → red (1)
          const r = Math.round(t < 0.5 ? 0 : (t - 0.5) * 2 * 220)
          const g = Math.round(t < 0.5 ? t * 2 * 200 : (1 - (t - 0.5) * 2) * 200)
          const b = Math.round(t < 0.5 ? (1 - t * 2) * 220 : 0)
          ctx.strokeStyle = `rgba(${r},${g},${b},0.9)`
          ctx.lineWidth = 2.5
          ctx.beginPath()
          const [x0, y0] = toXY(prev.lat, prev.lon)
          const [x1, y1] = toXY(p.lat, p.lon)
          ctx.moveTo(x0, y0)
          ctx.lineTo(x1, y1)
          ctx.stroke()
        })
      } else {
        ctx.strokeStyle = `rgba(${rgb},0.85)`
        ctx.lineWidth = 2.5
        ctx.beginPath()
        pts.forEach((p, i) => {
          const [x, y] = toXY(p.lat, p.lon)
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        })
        ctx.stroke()
      }

      // Start/finish dot
      const first = s.points[0]
      const [sx, sy] = toXY(first.lat, first.lon)
      ctx.fillStyle = colors[si % colors.length]
      ctx.beginPath()
      ctx.arc(sx, sy, 5, 0, Math.PI * 2)
      ctx.fill()
    })

    // Legend
    const legendY = H - 10
    let legendX = pad
    sessions.forEach((s, i) => {
      ctx.fillStyle = colors[i % colors.length]
      ctx.fillRect(legendX, legendY - 10, 16, 10)
      ctx.fillStyle = '#F0F0F0'
      ctx.font = '11px JetBrains Mono, monospace'
      ctx.fillText(s.driverLabel, legendX + 20, legendY - 1)
      legendX += ctx.measureText(s.driverLabel).width + 44
    })

    // Speed colour scale hint (only when speed data exists)
    const anySpeed = sessions.some(s => s.points.some(p => p.speedKmh != null))
    if (anySpeed) {
      const barW = 80, barH = 8, bx = W - pad - barW, by = H - 22
      const grad = ctx.createLinearGradient(bx, 0, bx + barW, 0)
      grad.addColorStop(0,   'rgba(0,0,220,0.9)')
      grad.addColorStop(0.5, 'rgba(0,200,0,0.9)')
      grad.addColorStop(1,   'rgba(220,0,0,0.9)')
      ctx.fillStyle = grad
      ctx.fillRect(bx, by, barW, barH)
      ctx.fillStyle = '#6B7A99'
      ctx.font = '9px JetBrains Mono, monospace'
      ctx.fillText('Slow', bx - 28, by + 7)
      ctx.fillText('Fast', bx + barW + 4, by + 7)
    }
  }, [sessions, colors, height])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height, display: 'block', borderRadius: '8px' }}
    />
  )
}
