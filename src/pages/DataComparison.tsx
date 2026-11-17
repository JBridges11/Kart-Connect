import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Upload, X, Download, TrendingUp, BarChart2, GitCompare,
  Layers, Video, FileText, AlertCircle, Navigation,
  Maximize2, Minimize2, CheckCircle2, Circle, ArrowLeftRight, MapPin, ChevronUp, ChevronDown,
} from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import {
  parseOCDBinary,
  // detectLapsFromGps, // kept for future SF override re-enable
  type ImportedDataSession,
  type ImportedGPSSession,
  type GpsPoint,
  type DataLoggerBrand,
  type ParseResult,
  BRAND_LABELS,
} from '@/lib/dataLoggerImport'
import { parseXrkBinary, parseXrzBinary } from '@/lib/parseXrk'
import { supabase } from '@/lib/supabase'
import { TrackMapCanvas } from '@/components/TrackMapCanvas'
import { ComparisonPlayer } from '@/components/data/ComparisonPlayer'
import type { GoproExtract } from '@/lib/gopro/extractGPMF'
import { SessionPicker } from '@/components/data/SessionPicker'
import { useAuth } from '@/contexts/AuthContext'
import { useKarts } from '@/hooks/useKarts'
import type { Kart } from '@/types'
import kartTracksRaw from '@/data/kartTracks.json'

// ─── Types ────────────────────────────────────────────────────────────────────

const SESSION_COLORS = ['#EF4444', '#3B82F6', '#F97316', '#22C55E']

type AnySession = { type: 'lap'; session: ImportedDataSession } | { type: 'gps'; session: ImportedGPSSession }
type Tab = 'laps' | 'analysis' | 'sectors' | 'export'
export type CameraType = 'gopro' | 'dji'

export interface DriverSlot {
  session: AnySession | null
  csvError: string | null
  driverName: string | null
  cameraType: CameraType
  videoFile: File | null
  videoUrl: string | null
  srtFile: File | null
  goproData: GoproExtract | null
  videoOffsetMs: number
  videoExtracting: boolean
  videoError: string | null
}

export function emptySlot(): DriverSlot {
  return {
    session: null, csvError: null, driverName: null,
    cameraType: 'gopro',
    videoFile: null, videoUrl: null, srtFile: null,
    goproData: null, videoOffsetMs: 0,
    videoExtracting: false, videoError: null,
  }
}

interface LapRow {
  sessionIdx: number
  driverLabel: string
  brand: DataLoggerBrand
  lapNumber: number
  lapTimeMs: number
  maxSpeedKmh: number | null
  avgSpeedKmh: number | null
  maxRpm: number | null
  waterTempC: number | null
  exhaustTempC: number | null
  points: GpsPoint[]
}

interface SectorRow {
  lapLabel: string
  color: string
  lapTimeMs: number
  s1Ms: number
  s2Ms: number
  s3Ms: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(ms: number): string {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const f = Math.floor((ms % 1000) / 10)
  return `${m}:${String(s).padStart(2, '0')}.${String(f).padStart(2, '0')}`
}

function fmtDelta(ms: number): string {
  return (ms > 0 ? '+' : '') + (ms / 1000).toFixed(2)
}

function n1(v: number | null) { return v != null ? v.toFixed(1) : '—' }
function n0(v: number | null) { return v != null ? Math.round(v).toString() : '—' }

function slotLabel(slot: DriverSlot): string {
  if (slot.driverName) return slot.driverName
  if (!slot.session) return ''
  return slot.session.type === 'lap' ? slot.session.session.driverLabel : slot.session.session.driverLabel
}

function slotBrand(slot: DriverSlot): DataLoggerBrand | null {
  if (!slot.session) return null
  return slot.session.type === 'lap' ? slot.session.session.brand : slot.session.session.brand
}

function slotLapCount(slot: DriverSlot): number {
  if (!slot.session) return 0
  return slot.session.type === 'lap'
    ? slot.session.session.laps.length
    : Math.max(1, slot.session.session.lapGroups.length)
}

function buildLapRows(slots: DriverSlot[]): LapRow[] {
  const rows: LapRow[] = []
  const sessions = slots.map(s => s.session).filter(Boolean) as AnySession[]
  sessions.forEach((s, idx) => {
    if (s.type === 'lap') {
      for (const lap of s.session.laps) {
        rows.push({
          sessionIdx: idx, driverLabel: s.session.driverLabel, brand: s.session.brand,
          lapNumber: lap.lapNumber, lapTimeMs: lap.lapTimeMs,
          maxSpeedKmh: lap.maxSpeedKmh, avgSpeedKmh: lap.avgSpeedKmh,
          maxRpm: lap.maxRpm, waterTempC: lap.waterTempC, exhaustTempC: lap.exhaustTempC,
          points: [],
        })
      }
    } else {
      const gps = s.session
      const groups = gps.lapGroups.length > 0 ? gps.lapGroups : [gps.points]
      const ct = gps.lapCrossingTimesS
      groups.forEach((group, gi) => {
        if (group.length < 2) return
        // Use interpolated S/F crossing times when available (sub-sample precision).
        // Fall back to GPS point timestamps (10 Hz = 100 ms resolution) otherwise.
        const lapTimeMs = ct && ct.length > gi + 1
          ? Math.round((ct[gi + 1] - ct[gi]) * 1000)
          : Math.round((group[group.length - 1].timeS - group[0].timeS) * 1000)
        if (lapTimeMs < 5000 || lapTimeMs > 600000) return
        const speeds  = group.map(p => p.speedKmh).filter((v): v is number => v != null)
        const rpms    = group.map(p => p.rpm).filter((v): v is number => v != null)
        const waters  = group.map(p => p.waterTempC).filter((v): v is number => v != null)
        const exhausts = group.map(p => p.exhaustTempC).filter((v): v is number => v != null)
        rows.push({
          sessionIdx: idx, driverLabel: gps.driverLabel, brand: gps.brand,
          lapNumber: gi + 1, lapTimeMs,
          maxSpeedKmh: speeds.length ? Math.max(...speeds) : null,
          avgSpeedKmh: speeds.length ? speeds.reduce((a, b) => a + b) / speeds.length : null,
          maxRpm: rpms.length ? Math.max(...rpms) : null,
          waterTempC:  waters.length  ? waters.reduce((a, b) => a + b)  / waters.length  : null,
          exhaustTempC: exhausts.length ? Math.max(...exhausts) : null,
          points: group,
        })
      })
    }
  })
  return rows
}

function buildSectorRows(laps: LapRow[]): SectorRow[] {
  return laps
    .filter(l => l.points.length >= 4)
    .map(lap => {
      const pts = lap.points
      const lapStartD = pts[0].distanceM
      const span = pts[pts.length - 1].distanceM - lapStartD
      const s1B = lapStartD + span / 3
      const s2B = lapStartD + (span * 2) / 3
      const s1Pt = pts.find(p => p.distanceM >= s1B) ?? pts[Math.floor(pts.length / 3)]
      const s2Pt = pts.find(p => p.distanceM >= s2B) ?? pts[Math.floor((pts.length * 2) / 3)]
      return {
        lapLabel: `${lap.driverLabel} — Lap ${lap.lapNumber}`,
        color: SESSION_COLORS[lap.sessionIdx % SESSION_COLORS.length],
        lapTimeMs: lap.lapTimeMs,
        s1Ms: Math.round((s1Pt.timeS - pts[0].timeS) * 1000),
        s2Ms: Math.round((s2Pt.timeS - s1Pt.timeS) * 1000),
        s3Ms: Math.round((pts[pts.length - 1].timeS - s2Pt.timeS) * 1000),
      }
    })
}

// ─── PDF Report ───────────────────────────────────────────────────────────────

const PDF_PANEL_H = 92
const PDF_W = 740
const PDF_PAD = { l: 46, r: 10, t: 7, b: 7 }

function buildTraceSVG(
  laps: LapRow[],
  colors: string[],
  yLabel: string,
  get: (p: GpsPoint) => number | null,
  maxDistOverride?: number,
  panelH = PDF_PANEL_H,
): string {
  const W = PDF_W, H = panelH
  const PAD = PDF_PAD
  const plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b

  const gpsLaps = laps.filter(l => l.points.some(p => get(p) != null))
  if (!gpsLaps.length) return ''
  const maxDist = maxDistOverride ?? Math.max(...gpsLaps.map(l => {
    const s = l.points[0]?.distanceM ?? 0
    return (l.points[l.points.length - 1]?.distanceM ?? 0) - s
  }))
  const allVals = gpsLaps.flatMap(l => l.points.map(p => get(p)).filter((v): v is number => v != null))
  const minVal = Math.min(0, ...allVals)
  const maxVal = Math.max(...allVals)
  if (maxDist <= 0 || maxVal <= minVal) return ''
  const range = maxVal - minVal

  const toX = (d: number) => PAD.l + (d / maxDist) * plotW
  const toY = (v: number) => PAD.t + plotH - ((v - minVal) / range) * plotH

  const paths = gpsLaps.map(lap => {
    const lapIdx = laps.indexOf(lap)
    const color = colors[lapIdx] ?? colors[0] ?? '#EF4444'
    const start = lap.points[0]?.distanceM ?? 0
    const pts = lap.points.filter((_, i) => i % 3 === 0)
    if (pts.length < 2) return ''
    const d = pts.map((p, i) => {
      const v = get(p) ?? minVal
      return `${i === 0 ? 'M' : 'L'}${toX(p.distanceM - start).toFixed(1)},${toY(v).toFixed(1)}`
    }).join(' ')
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.9"/>`
  }).join('')

  const nTicks = 5
  const yLines = Array.from({ length: nTicks }, (_, i) => {
    const v = minVal + (i / (nTicks - 1)) * range
    const y = toY(v).toFixed(1)
    const lbl = Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v).toString()
    return `<text x="${PAD.l - 4}" y="${y}" font-size="9" text-anchor="end" fill="#374151" dominant-baseline="middle">${lbl}</text>
     <line x1="${PAD.l}" y1="${y}" x2="${PAD.l + plotW}" y2="${y}" stroke="#9CA3AF" stroke-width="0.5"/>`
  }).join('')

  return `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="display:block;font-family:system-ui,sans-serif">
    <rect x="${PAD.l}" y="${PAD.t}" width="${plotW}" height="${plotH}" fill="#EBEBEB" rx="2"/>
    ${yLines}
    ${paths}
    <text x="${PAD.l - 28}" y="${PAD.t + plotH / 2}" font-size="9" fill="#374151" text-anchor="middle" transform="rotate(-90 ${PAD.l - 28} ${PAD.t + plotH / 2})">${yLabel}</text>
  </svg>`
}

function buildDeltaSVG(laps: LapRow[], colors: string[], maxDistOverride?: number, panelH = PDF_PANEL_H): string {
  const gpsLaps = laps.filter(l => l.points.length > 1)
  if (gpsLaps.length < 2) return ''

  const refLap = gpsLaps[0]
  const refStartT = refLap.points[0]?.timeS ?? 0
  const maxDist = maxDistOverride ?? Math.max(...gpsLaps.map(l => {
    const s = l.points[0]?.distanceM ?? 0
    return (l.points[l.points.length - 1]?.distanceM ?? 0) - s
  }))
  if (maxDist <= 0) return ''

  const SAMPLES = 160
  const series = gpsLaps.slice(1).map(lap => {
    const lapStartT = lap.points[0]?.timeS ?? 0
    const pts: { d: number; delta: number }[] = []
    for (let i = 0; i <= SAMPLES; i++) {
      const d = (i / SAMPLES) * maxDist
      const tRef = interpAtDist(refLap.points, d, p => p.timeS)
      const tLap = interpAtDist(lap.points, d, p => p.timeS)
      if (tRef == null || tLap == null) continue
      pts.push({ d, delta: (tLap - lapStartT) - (tRef - refStartT) })
    }
    return { lapIdx: laps.indexOf(lap), pts }
  })

  const allDeltas = series.flatMap(s => s.pts.map(p => p.delta))
  if (!allDeltas.length) return ''
  let minD = Math.min(0, ...allDeltas), maxD = Math.max(0, ...allDeltas)
  const span = Math.max(maxD - minD, 0.2)
  minD -= span * 0.08; maxD += span * 0.08
  const range = maxD - minD

  const W = PDF_W, H = panelH
  const PAD = PDF_PAD
  const plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b
  const toX = (d: number) => PAD.l + (d / maxDist) * plotW
  const toY = (v: number) => PAD.t + plotH - ((v - minD) / range) * plotH
  const zeroY = toY(0).toFixed(1)

  const nTicks = 5
  const yLines = Array.from({ length: nTicks }, (_, i) => {
    const v = minD + (i / (nTicks - 1)) * range
    const y = toY(v).toFixed(1)
    return `<text x="${PAD.l - 4}" y="${y}" font-size="9" text-anchor="end" fill="#374151" dominant-baseline="middle">${v.toFixed(1)}s</text>
     <line x1="${PAD.l}" y1="${y}" x2="${PAD.l + plotW}" y2="${y}" stroke="#9CA3AF" stroke-width="0.5"/>`
  }).join('')

  const paths = series.map(({ lapIdx, pts }) => {
    if (pts.length < 2) return ''
    const color = colors[lapIdx] ?? '#3B82F6'
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.d).toFixed(1)},${toY(p.delta).toFixed(1)}`).join(' ')
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.9"/>`
  }).join('')

  return `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="display:block;font-family:system-ui,sans-serif">
    <rect x="${PAD.l}" y="${PAD.t}" width="${plotW}" height="${plotH}" fill="#EBEBEB" rx="2"/>
    ${yLines}
    <line x1="${PAD.l}" y1="${zeroY}" x2="${PAD.l + plotW}" y2="${zeroY}" stroke="#4B5563" stroke-width="1" stroke-dasharray="4 2"/>
    ${paths}
    <text x="${PAD.l - 28}" y="${PAD.t + plotH / 2}" font-size="9" fill="#374151" text-anchor="middle" transform="rotate(-90 ${PAD.l - 28} ${PAD.t + plotH / 2})">Δ Time (s)</text>
  </svg>`
}

async function buildSessionReport(
  laps: LapRow[],
  colors: string[],
  sectors: SectorRow[],
  theoBestMs: number | null,
  sessionLabel: string,
  trackName: string,
): Promise<string> {
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const sortedLaps = [...laps].sort((a, b) => a.lapTimeMs - b.lapTimeMs)
  const bestLapMs = sortedLaps[0]?.lapTimeMs ?? 0

  let logoHtml = `<div class="logo">KART <span class="accent">CONNECT</span><div class="sub">Session Report</div></div>`
  try {
    const resp = await fetch('/logo-pdf.png')
    const blob = await resp.blob()
    const dataUri = await new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
    logoHtml = `<img src="${dataUri}" alt="Kart Connect" style="height:40px;display:block">`
  } catch { /* text fallback */ }

  const fmtMs = (ms: number) => {
    const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000), cs = Math.floor((ms % 1000) / 10)
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}` : `${s}.${String(cs).padStart(2, '0')}`
  }
  const fmtDelta = (ms: number) => (ms > 0 ? '+' : '') + (ms / 1000).toFixed(2)
  const lapColor = (lap: LapRow) => colors[laps.indexOf(lap)] ?? colors[0] ?? '#EF4444'

  const lapRows = sortedLaps.map(lap => {
    const isBest = lap.lapTimeMs === bestLapMs
    const delta = lap.lapTimeMs - bestLapMs
    const c = lapColor(lap)
    return `<tr${isBest ? ' class="best"' : ''}>
      <td><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${c};margin-right:5px"></span>${lap.driverLabel}</td>
      <td>${lap.lapNumber}</td>
      <td><strong>${fmtMs(lap.lapTimeMs)}</strong></td>
      <td>${delta === 0 ? '<span style="color:#16A34A">—</span>' : fmtDelta(delta)}</td>
      <td>${lap.maxSpeedKmh != null ? Math.round(lap.maxSpeedKmh) + ' km/h' : '—'}</td>
      <td>${lap.avgSpeedKmh != null ? Math.round(lap.avgSpeedKmh) + ' km/h' : '—'}</td>
    </tr>`
  }).join('')

  const minS1 = sectors.length ? Math.min(...sectors.map(s => s.s1Ms)) : 0
  const minS2 = sectors.length ? Math.min(...sectors.map(s => s.s2Ms)) : 0
  const minS3 = sectors.length ? Math.min(...sectors.map(s => s.s3Ms)) : 0
  const minTotal = sectors.length ? Math.min(...sectors.map(s => s.lapTimeMs)) : 0
  const sectorRowsHTML = sectors.map((row, i) => {
    const c = colors[i] ?? colors[0] ?? '#EF4444'
    return `<tr>
      <td><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${c};margin-right:5px"></span>${row.lapLabel}</td>
      <td${row.lapTimeMs === minTotal ? ' class="green"' : ''}>${fmtMs(row.lapTimeMs)}</td>
      <td${row.s1Ms === minS1 ? ' class="green"' : ''}>${fmtMs(row.s1Ms)}</td>
      <td${row.s2Ms === minS2 ? ' class="green"' : ''}>${fmtMs(row.s2Ms)}</td>
      <td${row.s3Ms === minS3 ? ' class="green"' : ''}>${fmtMs(row.s3Ms)}</td>
    </tr>`
  }).join('')
  const theoBestRow = theoBestMs != null ? `
    <tr class="theo-row">
      <td><strong>Theoretical Best</strong></td><td><strong>${fmtMs(theoBestMs)}</strong></td>
      <td class="green">${fmtMs(minS1)}</td><td class="green">${fmtMs(minS2)}</td><td class="green">${fmtMs(minS3)}</td>
    </tr>` : ''

  // Charts — only include channels with data
  const gpsLaps = laps.filter(l => l.points.length > 1)
  const sharedMaxDist = gpsLaps.length
    ? Math.max(...gpsLaps.map(l => (l.points[l.points.length - 1]?.distanceM ?? 0) - (l.points[0]?.distanceM ?? 0)))
    : 0
  const maxDist = sharedMaxDist || undefined

  const hasData = (get: (p: GpsPoint) => number | null) =>
    laps.some(l => l.points.some(p => { const v = get(p); return v != null && v !== 0 }))

  // Step 1: determine which channels to include (before knowing panel height)
  type ChanSpec = { label: string; buildSvg: (ph: number) => string }
  const candidates: ChanSpec[] = [
    { label: 'Speed km/h', buildSvg: ph => buildTraceSVG(laps, colors, 'Speed km/h', p => p.speedKmh,     maxDist, ph) },
    ...(hasData(p => p.rpm)           ? [{ label: 'RPM',       buildSvg: (ph: number) => buildTraceSVG(laps, colors, 'RPM',       p => p.rpm,          maxDist, ph) }] : []),
    ...(hasData(p => p.lateralG)      ? [{ label: 'Lateral G', buildSvg: (ph: number) => buildTraceSVG(laps, colors, 'Lateral G', p => p.lateralG,     maxDist, ph) }] : []),
    ...(hasData(p => p.longitudinalG) ? [{ label: 'Long. G',   buildSvg: (ph: number) => buildTraceSVG(laps, colors, 'Long. G',   p => p.longitudinalG, maxDist, ph) }] : []),
    ...(gpsLaps.length >= 2           ? [{ label: 'Δ Time (s)',buildSvg: (ph: number) => buildDeltaSVG(laps, colors, maxDist, ph) }] : []),
    ...(hasData(p => p.waterTempC)    ? [{ label: 'Water °C',  buildSvg: (ph: number) => buildTraceSVG(laps, colors, 'Water °C',  p => p.waterTempC,   maxDist, ph) }] : []),
    ...(hasData(p => p.exhaustTempC)  ? [{ label: 'EGT °C',    buildSvg: (ph: number) => buildTraceSVG(laps, colors, 'EGT °C',    p => p.exhaustTempC, maxDist, ph) }] : []),
  ]

  // Step 2: compute panel height to fill A4 (1070px usable at 96dpi with 7mm margins)
  const A4_H = 1070
  const lapRowPx    = sortedLaps.length * 19
  const sectorRowPx = sectors.length > 0 ? sectors.length * 19 + (theoBestMs != null ? 19 : 0) + (theoBestMs != null && bestLapMs > 0 ? 40 : 0) : 0
  const fixedPx =
    62 +                                                          // header
    47 + lapRowPx + 10 +                                         // lap times block
    (candidates.length > 0 ? 65 + 2 * Math.max(0, candidates.length - 1) : 0) + // charts overhead
    (sectors.length > 0 ? 47 + sectorRowPx + 10 : 0) +          // sector block
    32                                                            // footer + buffer
  const panelH = candidates.length > 0
    ? Math.min(280, Math.max(80, Math.floor((A4_H - fixedPx) / candidates.length)))
    : PDF_PANEL_H

  // Step 3: build SVGs at computed height
  const chartDefs = candidates.map(c => ({ label: c.label, svg: c.buildSvg(panelH) })).filter(c => c.svg)

  const chartsHTML = chartDefs.map(c => `<div class="chart-wrap">${c.svg}</div>`).join('')

  const legendHTML = laps.map((lap, i) => {
    const color = colors[i] ?? '#888'
    return `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:14px">
      <span style="display:inline-block;width:18px;height:3px;background:${color};border-radius:2px"></span>
      <span style="font-size:10px;color:#111827;font-weight:500">${lap.driverLabel} — Lap ${lap.lapNumber}</span>
    </span>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Kart Connect — Session Report</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{height:100%}
    body{font-family:system-ui,-apple-system,sans-serif;color:#111827;background:#fff;padding:14px 18px;font-size:11px;line-height:1.4;display:flex;flex-direction:column}
    .header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #111827;padding-bottom:8px;margin-bottom:10px;flex-shrink:0}
    .logo{font-size:20px;font-weight:900;letter-spacing:-0.5px;line-height:1}
    .logo .accent{color:#D97706}
    .logo .sub{font-size:8px;font-weight:500;color:#374151;letter-spacing:0.1em;text-transform:uppercase;margin-top:2px}
    .meta{text-align:right;font-size:10px;color:#374151}
    .meta strong{display:block;font-size:13px;color:#111827;margin-bottom:1px}
    .section-title{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#1F2937;margin-bottom:4px;padding-bottom:3px;border-bottom:1px solid #6B7280}
    table{width:100%;border-collapse:collapse;font-size:10.5px}
    th{background:#1F2937;color:#fff;padding:4px 8px;text-align:left;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em}
    td{padding:3px 8px;border-bottom:1px solid #D1D5DB;color:#111827}
    tr.best td{background:#F0FDF4}
    tr.best td strong{color:#16A34A}
    td.green{color:#16A34A;font-weight:700}
    tr.theo-row td{background:#F5F3FF;color:#7C3AED;border-top:1px solid #DDD6FE}
    .theo-gap{margin-top:5px;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:4px;padding:5px 8px;display:flex;justify-content:space-between;align-items:center}
    .theo-gap .label{font-weight:600;color:#7C3AED;font-size:10px}
    .theo-gap .gap{font-family:monospace;font-size:11px;color:#111827}
    .laps-block{margin-bottom:8px;flex-shrink:0}
    .charts-section{flex:1;min-height:0;display:flex;flex-direction:column}
    .charts-title{flex-shrink:0;margin-bottom:4px}
    .chart-wrap{flex:1;min-height:0;margin-bottom:2px}
    .chart-wrap svg{display:block;width:100%;height:100%}
    .charts-foot{flex-shrink:0;text-align:center;font-size:9px;color:#374151;margin-top:2px}
    .charts-legend{flex-shrink:0;margin-top:4px;display:flex;flex-wrap:wrap;gap:4px}
    .sectors-block{margin-top:8px;flex-shrink:0}
    .footer{border-top:1px solid #6B7280;padding-top:5px;margin-top:8px;font-size:8px;color:#374151;text-align:center;flex-shrink:0}
    @media print{body{padding:0;height:100vh;overflow:hidden} @page{margin:7mm 9mm;size:A4}}
  </style>
</head>
<body>
  <div class="header">
    ${logoHtml}
    <div class="meta">
      <strong>${sessionLabel || 'Session Report'}</strong>
      ${trackName ? `<span style="display:block;font-size:11px;color:#111827;font-weight:600;margin-bottom:1px">${trackName}</span>` : ''}
      ${date}
    </div>
  </div>

  <div class="laps-block">
    <div class="section-title">Lap Times</div>
    <table>
      <thead><tr><th>Driver</th><th>Lap</th><th>Time</th><th>Delta</th><th>Max km/h</th><th>Avg km/h</th></tr></thead>
      <tbody>${lapRows}</tbody>
    </table>
  </div>

  ${chartDefs.length ? `<div class="charts-section">
    <div class="section-title charts-title">Channel Traces vs Distance</div>
    ${chartsHTML}
    <div class="charts-foot">← Distance (m) →</div>
    <div class="charts-legend">${legendHTML}</div>
  </div>` : ''}

  ${sectorRowsHTML ? `<div class="sectors-block">
    <div class="section-title">Sector Analysis <span style="font-size:6px;font-weight:400;color:#374151">(3 equal sectors)</span></div>
    <table>
      <thead><tr><th>Lap</th><th>Total</th><th>S1</th><th>S2</th><th>S3</th></tr></thead>
      <tbody>${sectorRowsHTML}${theoBestRow}</tbody>
    </table>
    ${theoBestMs != null && bestLapMs > 0 ? `<div class="theo-gap"><span class="label">Gap to theoretical best</span><span class="gap">${fmtDelta(bestLapMs - theoBestMs)}</span></div>` : ''}
  </div>` : ''}

  <div class="footer">Generated by Kart Connect · kartconnect.netlify.app</div>
</body>
</html>`
}

// ─── Channel definitions ──────────────────────────────────────────────────────

const ALL_CHANNELS = [
  { id: 'speed',    label: 'Speed km/h', get: (p: GpsPoint) => p.speedKmh,    yStep: (m: number) => m > 120 ? 20 : m > 60 ? 10 : 5, roundMax: (m: number) => Math.ceil(m / 10) * 10,    symmetric: false, note: '' },
  { id: 'rpm',      label: 'RPM',        get: (p: GpsPoint) => p.rpm,          yStep: (m: number) => m > 10000 ? 2000 : 1000,         roundMax: (m: number) => Math.ceil(m / 1000) * 1000, symmetric: false, note: '' },
  { id: 'latG',     label: 'Lateral G',  get: (p: GpsPoint) => p.lateralG,     yStep: (_m: number) => 0.5,                            roundMax: (m: number) => Math.ceil(m * 2) / 2 || 1, symmetric: true,  note: '' },
  { id: 'lonG',     label: 'Long. G',    get: (p: GpsPoint) => p.longitudinalG, yStep: (_m: number) => 0.5,                            roundMax: (m: number) => Math.ceil(m * 2) / 2 || 1, symmetric: true,  note: '' },
  { id: 'delta',    label: 'Δ Time (s)', get: (_p: GpsPoint) => null,          yStep: (_m: number) => 0.5,                            roundMax: (m: number) => m,                          symmetric: false, note: 'Select 2+ laps to see time delta' },
  { id: 'waterTemp',label: 'Water °C',   get: (p: GpsPoint) => p.waterTempC,   yStep: (m: number) => m > 80 ? 20 : 10,                roundMax: (m: number) => Math.ceil(m / 10) * 10,    symmetric: false, note: '' },
  { id: 'egt',      label: 'EGT °C',     get: (p: GpsPoint) => p.exhaustTempC, yStep: (m: number) => m > 400 ? 100 : 50,              roundMax: (m: number) => Math.ceil(m / 50) * 50,    symmetric: false, note: '' },
]

// ─── Speed + RPM Trace ────────────────────────────────────────────────────────

function interpAtDist(points: GpsPoint[], dist: number, get: (p: GpsPoint) => number | null): number | null {
  const start = points[0]?.distanceM ?? 0
  for (let i = 1; i < points.length; i++) {
    const d0 = points[i - 1].distanceM - start
    const d1 = points[i].distanceM - start
    if (dist >= d0 && dist <= d1) {
      const v0 = get(points[i - 1]), v1 = get(points[i])
      if (v0 == null || v1 == null) return v0 ?? v1 ?? null
      return v0 + (v1 - v0) * ((dist - d0) / (d1 - d0))
    }
  }
  return null
}


function speedDStep(range: number) {
  return range > 5000 ? 1000 : range > 2000 ? 500 : range > 1000 ? 250 : range > 400 ? 100 : range > 150 ? 50 : 25
}

function SpeedTraceCanvas({ laps, colors, height = 440, fillHeight, enabledChannelIds, channelOrder, onHoverDist }: {
  laps: LapRow[]; colors: string[]; height?: number; fillHeight?: boolean
  enabledChannelIds?: string[]
  channelOrder?: string[]
  onHoverDist?: (d: number | null) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewRef  = useRef<[number, number] | null>(null)
  const dragRef  = useRef<{ clientX: number; vStart: number; vEnd: number } | null>(null)
  const [cursor, setCursor] = useState<'crosshair' | 'grab' | 'grabbing'>('crosshair')

  type ChLayout = { id: string; label: string; top: number; height: number; minVal: number; maxVal: number; yStep: number; get: (p: GpsPoint) => number | null }
  const stateRef = useRef<{
    laps: LapRow[]; colors: string[]; height: number; fillHeight: boolean; mouseDistM: number | null; mouseY: number | null
    enabledChannelIds: string[] | undefined
    channelOrder: string[] | undefined
    onHoverDist: ((d: number | null) => void) | undefined
    layout: null | { padL: number; padR: number; padTop: number; pw: number; maxDist: number; viewStart: number; viewEnd: number; channels: ChLayout[] }
  }>({ laps, colors, height, fillHeight: fillHeight ?? false, mouseDistM: null, mouseY: null, enabledChannelIds, channelOrder, onHoverDist, layout: null })
  stateRef.current.laps = laps
  stateRef.current.colors = colors
  stateRef.current.fillHeight = fillHeight ?? false
  stateRef.current.enabledChannelIds = enabledChannelIds
  stateRef.current.channelOrder = channelOrder
  stateRef.current.onHoverDist = onHoverDist

  const draw = useRef((mouseDistM: number | null) => {
    stateRef.current.mouseDistM = mouseDistM
    const canvas = canvasRef.current
    if (!canvas) return
    const { laps, colors, height, fillHeight, enabledChannelIds, channelOrder } = stateRef.current
    const gpsLaps = laps.filter(l => l.points.length > 1)
    if (!gpsLaps.length) return

    const sortedChannels = channelOrder
      ? [...ALL_CHANNELS].sort((a, b) => {
          const ai = channelOrder.indexOf(a.id); const bi = channelOrder.indexOf(b.id)
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
        })
      : ALL_CHANNELS
    const activeChannels = sortedChannels.filter(ch => {
      if (enabledChannelIds && !enabledChannelIds.includes(ch.id)) return false
      if (ch.id === 'delta') return gpsLaps.length >= 2
      return gpsLaps.some(l => l.points.some(p => { const v = ch.get(p); return v != null && v !== 0 }))
    })
    if (!activeChannels.length) return

    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth || 600
    const H = fillHeight ? (canvas.offsetHeight || height) : height
    if (!H) return
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) { canvas.width = W * dpr; canvas.height = H * dpr }
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H)

    let maxDist = 0
    for (const lap of gpsLaps) {
      const s = lap.points[0].distanceM
      for (const p of lap.points) if (p.distanceM - s > maxDist) maxDist = p.distanceM - s
    }
    if (!maxDist) return

    const [viewStart, viewEnd] = viewRef.current ?? [0, maxDist]
    const viewWidth = viewEnd - viewStart
    const zoomed = viewRef.current !== null

    const padL = 52, padR = 16, padTop = 36, padBot = 38
    const pw = W - padL - padR
    const usable = H - padTop - padBot
    const nCh = activeChannels.length
    const chGap = nCh > 1 ? 16 : 0
    const chH = Math.floor((usable - chGap * (nCh - 1)) / nCh)

    const channelLayouts: ChLayout[] = activeChannels.map((ch, ci) => {
      const top = padTop + ci * (chH + chGap)
      if (ch.id === 'delta') {
        const refPts = gpsLaps[0].points
        const refStartT = refPts[0].timeS
        let minDelta = -0.5, maxDelta = 0.5
        for (const lap of gpsLaps.slice(1)) {
          const lapStartT = lap.points[0].timeS
          const lapStartD = lap.points[0].distanceM
          for (const p of lap.points) {
            const tRef = interpAtDist(refPts, p.distanceM - lapStartD, pt => pt.timeS)
            if (tRef == null) continue
            const delta = (p.timeS - lapStartT) - (tRef - refStartT)
            if (delta < minDelta) minDelta = delta
            if (delta > maxDelta) maxDelta = delta
          }
        }
        const absMax = Math.max(Math.abs(minDelta), Math.abs(maxDelta), 0.5)
        const rounded = Math.ceil(absMax * 4) / 4
        const yStep = rounded > 1 ? 0.5 : 0.25
        return { id: 'delta', label: 'Δ Time (s)', top, height: chH, minVal: -rounded, maxVal: rounded, yStep, get: () => null }
      }
      const allVals = gpsLaps.flatMap(l => l.points.map(p => ch.get(p))).filter((v): v is number => v != null)
      const rawMin = allVals.length ? Math.min(...allVals) : 0
      const rawMax = allVals.length ? Math.max(...allVals) : 1
      const absMax = ch.roundMax(Math.max(0.5, Math.max(Math.abs(rawMin), rawMax))) || 1
      const maxVal = ch.symmetric ? absMax : (ch.roundMax(Math.max(1, rawMin < 0 ? Math.max(Math.abs(rawMin), rawMax) : rawMax)) || 1)
      const minVal = ch.symmetric ? -absMax : (rawMin < 0 ? Math.floor(rawMin / 10) * 10 : 0)
      return { id: ch.id, label: ch.label, top, height: chH, minVal, maxVal, yStep: ch.yStep(maxVal), get: ch.get }
    })

    stateRef.current.layout = { padL, padR, padTop, pw, maxDist, viewStart, viewEnd, channels: channelLayouts }

    const dx = (d: number) => padL + ((d - viewStart) / viewWidth) * pw

    const drawPanel = (ch: ChLayout) => {
      const { top, height: pH, minVal, maxVal, label, yStep, get } = ch
      const range = maxVal - minVal
      const toY = (v: number) => top + pH - ((v - minVal) / range) * pH
      for (let v = minVal; v <= maxVal; v += yStep) {
        const y = toY(v)
        ctx.strokeStyle = v === 0 && minVal < 0 ? '#9CA3AF' : '#E9EAEC'; ctx.lineWidth = v === 0 && minVal < 0 ? 1.5 : 1
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + pw, y); ctx.stroke()
        ctx.fillStyle = '#9CA3AF'; ctx.textAlign = 'right'; ctx.font = '9px system-ui,sans-serif'
        ctx.fillText(v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`, padL - 5, y + 3)
      }
      ctx.strokeStyle = '#D1D5DB'; ctx.lineWidth = 1; ctx.strokeRect(padL, top, pw, pH)
      ctx.save(); ctx.translate(13, top + pH / 2); ctx.rotate(-Math.PI / 2)
      ctx.fillStyle = '#6B7280'; ctx.textAlign = 'center'; ctx.font = '10px system-ui,sans-serif'
      ctx.fillText(label, 0, 0); ctx.restore()
      ctx.save(); ctx.beginPath(); ctx.rect(padL, top, pw, pH); ctx.clip()
      if (ch.id === 'delta') {
        if (gpsLaps.length >= 2) {
          const refPts = gpsLaps[0].points
          const refStartT = refPts[0].timeS
          gpsLaps.slice(1).forEach((lap, idx) => {
            const color = colors[idx + 1] ?? '#999'
            const lapStartT = lap.points[0].timeS
            const lapStartD = lap.points[0].distanceM
            ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.9; ctx.beginPath()
            let first = true
            for (const p of lap.points) {
              const d = p.distanceM - lapStartD
              const tRef = interpAtDist(refPts, d, pt => pt.timeS)
              if (tRef == null) continue
              const delta = (p.timeS - lapStartT) - (tRef - refStartT)
              const x = dx(d)
              const y = toY(Math.min(Math.max(delta, minVal), maxVal))
              if (first) { ctx.moveTo(x, y); first = false } else ctx.lineTo(x, y)
            }
            ctx.stroke(); ctx.globalAlpha = 1
          })
          ctx.strokeStyle = colors[0] ?? '#999'; ctx.lineWidth = 1; ctx.globalAlpha = 0.35
          ctx.setLineDash([4, 3])
          ctx.beginPath(); ctx.moveTo(padL, toY(0)); ctx.lineTo(padL + pw, toY(0)); ctx.stroke()
          ctx.setLineDash([]); ctx.globalAlpha = 1
        }
      } else {
        gpsLaps.forEach((lap, li) => {
          const color = colors[li] ?? '#999'
          const start = lap.points[0].distanceM
          ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.9; ctx.beginPath()
          let first = true
          for (const p of lap.points) {
            const val = get(p); if (val == null) continue
            const x = dx(p.distanceM - start)
            const y = toY(Math.min(Math.max(val, minVal), maxVal))
            if (first) { ctx.moveTo(x, y); first = false } else ctx.lineTo(x, y)
          }
          ctx.stroke(); ctx.globalAlpha = 1
        })
      }
      ctx.restore()
    }

    channelLayouts.forEach(drawPanel)

    const lastCh = channelLayouts[channelLayouts.length - 1]
    const xBot = lastCh.top + lastCh.height
    const dStep = speedDStep(viewWidth)
    ctx.font = '9px system-ui,sans-serif'; ctx.fillStyle = '#9CA3AF'; ctx.textAlign = 'center'
    for (let d = Math.ceil(viewStart / dStep) * dStep; d <= viewEnd + 1; d += dStep) {
      const x = dx(d); if (x < padL - 2 || x > padL + pw + 2) continue
      ctx.fillText(`${Math.round(d)}`, x, xBot + 12)
    }
    ctx.font = '10px system-ui,sans-serif'; ctx.fillStyle = '#6B7280'
    ctx.fillText('Distance (m)', padL + pw / 2, H - 22)

    const barY = H - 13, barH2 = 5
    ctx.fillStyle = '#F0F0F0'; ctx.fillRect(padL, barY, pw, barH2)
    if (zoomed) {
      ctx.fillStyle = '#6B7280'
      ctx.fillRect(padL + (viewStart / maxDist) * pw, barY, (viewWidth / maxDist) * pw, barH2)
      ctx.font = '8px system-ui,sans-serif'; ctx.fillStyle = '#9CA3AF'; ctx.textAlign = 'right'
      ctx.fillText(`${Math.round(viewStart)}–${Math.round(viewEnd)} m  ·  dbl-click to reset`, padL + pw, barY - 2)
    } else {
      ctx.fillStyle = '#C5C5C5'; ctx.fillRect(padL, barY, pw, barH2)
      ctx.font = '8px system-ui,sans-serif'; ctx.fillStyle = '#C5C5C5'; ctx.textAlign = 'right'
      ctx.fillText('scroll to zoom · drag to pan', padL + pw, barY - 2)
    }

    // Lap pill badges
    ctx.textAlign = 'left'
    ctx.font = 'bold 10px system-ui,sans-serif'
    const pillH = 20, pillPad = 10, dotR = 4, gap = 8
    let lx = padL
    gpsLaps.forEach((lap, li) => {
      const color = colors[li] ?? '#999'
      const llabel = `${lap.driverLabel} · Lap ${lap.lapNumber}`
      const textW = ctx.measureText(llabel).width
      const pillW = dotR * 2 + gap + textW + pillPad * 2
      const py = padTop - pillH - 4
      // Pill background
      ctx.beginPath()
      ctx.roundRect(lx, py, pillW, pillH, pillH / 2)
      ctx.fillStyle = 'rgba(30,30,30,0.72)'
      ctx.fill()
      // Coloured dot
      ctx.beginPath(); ctx.arc(lx + pillPad + dotR, py + pillH / 2, dotR, 0, Math.PI * 2)
      ctx.fillStyle = color; ctx.fill()
      // Label
      ctx.fillStyle = '#FFFFFF'
      ctx.fillText(llabel, lx + pillPad + dotR * 2 + gap, py + pillH / 2 + 3.5)
      lx += pillW + 8
    })

    if (mouseDistM == null || mouseDistM < viewStart || mouseDistM > viewEnd) return
    const cx = dx(mouseDistM)

    ctx.save()
    ctx.strokeStyle = 'rgba(55,65,81,0.55)'; ctx.lineWidth = 1; ctx.setLineDash([5, 4])
    ctx.beginPath(); ctx.moveTo(cx, padTop); ctx.lineTo(cx, xBot); ctx.stroke()
    ctx.setLineDash([]); ctx.restore()

    channelLayouts.forEach(ch => {
      const range = ch.maxVal - ch.minVal
      if (ch.id === 'delta') {
        if (gpsLaps.length >= 2) {
          const refPts = gpsLaps[0].points
          gpsLaps.slice(1).forEach((lap, idx) => {
            const color = colors[idx + 1] ?? '#999'
            const tRef = interpAtDist(refPts, mouseDistM, pt => pt.timeS)
            const tLap = interpAtDist(lap.points, mouseDistM, pt => pt.timeS)
            if (tRef == null || tLap == null) return
            const delta = (tLap - lap.points[0].timeS) - (tRef - refPts[0].timeS)
            const y = ch.top + ch.height - ((Math.min(Math.max(delta, ch.minVal), ch.maxVal) - ch.minVal) / range) * ch.height
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, y, 5, 0, Math.PI * 2); ctx.fill()
            ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, y, 5, 0, Math.PI * 2); ctx.stroke()
          })
        }
      } else {
        gpsLaps.forEach((lap, li) => {
          const color = colors[li] ?? '#999'
          const val = interpAtDist(lap.points, mouseDistM, ch.get)
          if (val == null) return
          const y = ch.top + ch.height - ((Math.min(Math.max(val, ch.minVal), ch.maxVal) - ch.minVal) / range) * ch.height
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, y, 5, 0, Math.PI * 2); ctx.fill()
          ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, y, 5, 0, Math.PI * 2); ctx.stroke()
        })
      }
    })

    // Per-panel inline value labels (Unipro LapCentre style)
    const labelsOnLeft = cx > W * 0.62
    ctx.save()
    channelLayouts.forEach(ch => {
      const range = ch.maxVal - ch.minVal
      if (range === 0) return
      type LapLabel = { text: string; y: number; color: string }
      const entries: LapLabel[] = []
      if (ch.id === 'delta') {
        if (gpsLaps.length >= 2) {
          const refPts = gpsLaps[0].points
          gpsLaps.slice(1).forEach((lap, idx) => {
            const color = colors[idx + 1] ?? '#999'
            const tRef = interpAtDist(refPts, mouseDistM, pt => pt.timeS)
            const tLap = interpAtDist(lap.points, mouseDistM, pt => pt.timeS)
            if (tRef == null || tLap == null) return
            const delta = (tLap - lap.points[0].timeS) - (tRef - refPts[0].timeS)
            const clamped = Math.min(Math.max(delta, ch.minVal), ch.maxVal)
            const y = ch.top + ch.height - ((clamped - ch.minVal) / range) * ch.height
            entries.push({ color, y, text: `${delta >= 0 ? '+' : ''}${delta.toFixed(3)}s` })
          })
        }
      } else {
        gpsLaps.forEach((lap, li) => {
          const color = colors[li] ?? '#999'
          const val = interpAtDist(lap.points, mouseDistM, ch.get)
          if (val == null) return
          const clamped = Math.min(Math.max(val, ch.minVal), ch.maxVal)
          const y = ch.top + ch.height - ((clamped - ch.minVal) / range) * ch.height
          const text = ch.id === 'rpm' ? Math.round(val).toLocaleString() : val.toFixed(ch.id === 'steering' ? 0 : 1)
          entries.push({ color, y, text })
        })
      }
      if (entries.length === 0) return
      // Push overlapping labels apart (min 15px)
      entries.sort((a, b) => a.y - b.y)
      for (let i = 1; i < entries.length; i++) {
        if (entries[i].y - entries[i - 1].y < 15) entries[i].y = entries[i - 1].y + 15
      }
      entries.forEach(e => { e.y = Math.max(ch.top + 8, Math.min(ch.top + ch.height - 4, e.y)) })
      // Draw pill labels
      ctx.font = 'bold 10px system-ui,sans-serif'
      const lx = labelsOnLeft ? cx - 8 : cx + 8
      ctx.textAlign = labelsOnLeft ? 'right' : 'left'
      entries.forEach(e => {
        const tw = ctx.measureText(e.text).width
        const pH = 14, pW = tw + 8
        const pX = labelsOnLeft ? lx - pW : lx
        const pY = e.y - pH / 2
        ctx.fillStyle = 'rgba(10,10,20,0.75)'
        ctx.beginPath(); ctx.roundRect(pX, pY, pW, pH, 3); ctx.fill()
        ctx.fillStyle = e.color
        ctx.fillText(e.text, labelsOnLeft ? lx - 4 : lx + 4, e.y + 3)
      })
    })
    ctx.restore()
  })

  useEffect(() => { draw.current(null) }, [laps, colors, height, enabledChannelIds, channelOrder])

  // Redraw when panel width changes (e.g. split pane resize)
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ro = new ResizeObserver(() => draw.current(stateRef.current.mouseDistM))
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const layout = stateRef.current.layout; if (!layout) return
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const { padL, pw, maxDist, viewStart, viewEnd } = layout
      const vw = viewEnd - viewStart
      const factor = e.deltaY < 0 ? 0.65 : 1 / 0.65
      const newW = Math.max(maxDist * 0.02, Math.min(maxDist, vw * factor))
      const ratio = Math.max(0, Math.min(1, (mouseX - padL) / pw))
      let ns = viewStart + ratio * (vw - newW), ne = ns + newW
      if (ns < 0) { ns = 0; ne = newW }
      if (ne > maxDist) { ne = maxDist; ns = Math.max(0, maxDist - newW) }
      const full = ne - ns >= maxDist * 0.99
      viewRef.current = full ? null : [ns, ne]
      setCursor(full ? 'crosshair' : 'grab')
      draw.current(stateRef.current.mouseDistM)
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!viewRef.current) return
    const layout = stateRef.current.layout; if (!layout) return
    dragRef.current = { clientX: e.clientX, vStart: layout.viewStart, vEnd: layout.viewEnd }
    setCursor('grabbing')
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; const layout = stateRef.current.layout
    if (!canvas || !layout) return
    stateRef.current.mouseY = e.clientY - canvas.getBoundingClientRect().top
    if (dragRef.current) {
      const { clientX, vStart, vEnd } = dragRef.current
      const vw = vEnd - vStart
      const dDist = -((e.clientX - clientX) / layout.pw) * vw
      let ns = vStart + dDist, ne = vEnd + dDist
      if (ns < 0) { ns = 0; ne = vw }
      if (ne > layout.maxDist) { ne = layout.maxDist; ns = layout.maxDist - vw }
      viewRef.current = [ns, ne]; draw.current(null)
    } else {
      const rect = canvas.getBoundingClientRect()
      const { padL, pw, viewStart, viewEnd } = layout
      const dist = viewStart + ((e.clientX - rect.left - padL) / pw) * (viewEnd - viewStart)
      stateRef.current.onHoverDist?.(dist)
      draw.current(dist)
    }
  }

  const handleMouseUp = () => { dragRef.current = null; setCursor(viewRef.current ? 'grab' : 'crosshair') }
  const handleDblClick = () => { viewRef.current = null; setCursor('crosshair'); draw.current(null) }

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: fillHeight ? '100%' : height, display: 'block', borderRadius: '8px', border: '1px solid #E5E7EB', cursor }}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        stateRef.current.mouseY = null
        dragRef.current = null; setCursor(viewRef.current ? 'grab' : 'crosshair')
        stateRef.current.onHoverDist?.(null); draw.current(null)
      }}
      onDoubleClick={handleDblClick}
    />
  )
}

// ─── Speed Trace — Separate mode (one canvas per lap, synchronized crosshair) ─

function SpeedTraceSingleCanvas({ lap, color, maxDistAll, height, fillHeight, mouseDistRef, drawFnsRef, onMouseDistChange, viewRangeRef, onViewChange, channelOrder, enabledChannelIds }: {
  lap: LapRow; color: string; maxDistAll: number; height: number; fillHeight?: boolean
  mouseDistRef: React.MutableRefObject<number | null>
  drawFnsRef: React.MutableRefObject<Array<(d: number | null) => void>>
  onMouseDistChange: (d: number | null) => void
  viewRangeRef: React.MutableRefObject<[number, number] | null>
  onViewChange: () => void
  channelOrder?: string[]
  enabledChannelIds?: string[]
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  type PanelInfo = { id: string; top: number; pH: number; minVal: number; maxVal: number; symmetric: boolean; get: (p: GpsPoint) => number | null; label: string }
  const layoutRef = useRef<{ padL: number; pw: number; padTop: number; xBot: number; maxDist: number; viewStart: number; viewEnd: number; panels: PanelInfo[] } | null>(null)
  const dragRef = useRef<{ clientX: number; vStart: number; vEnd: number } | null>(null)
  const [cursor, setCursor] = useState<'crosshair' | 'grab' | 'grabbing'>('crosshair')

  const draw = useRef((mouseDistM: number | null) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth || 300
    const H = fillHeight ? (canvas.offsetHeight || height) : height
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) { canvas.width = W * dpr; canvas.height = H * dpr }
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H)

    const start = lap.points[0]?.distanceM ?? 0
    const maxDist = maxDistAll || ((lap.points[lap.points.length - 1]?.distanceM ?? 0) - start)
    const [viewStart, viewEnd] = viewRangeRef.current ?? [0, maxDist]
    const viewWidth = viewEnd - viewStart
    const zoomed = viewRangeRef.current !== null

    // Build ordered, enabled, data-bearing channel list
    const order = channelOrder ?? ALL_CHANNELS.map(c => c.id)
    const enabled = new Set(enabledChannelIds ?? ALL_CHANNELS.map(c => c.id))
    const orderedChannels = order.map(id => ALL_CHANNELS.find(c => c.id === id)).filter(Boolean) as typeof ALL_CHANNELS
    const activeChannels = orderedChannels.filter(ch => {
      if (!enabled.has(ch.id)) return false
      if (ch.id === 'delta') return false // delta needs 2+ laps — skip in single view
      return lap.points.some(p => { const v = ch.get(p); return v != null && v !== 0 })
    })

    if (activeChannels.length === 0) return

    const padL = 46, padR = 12, padTop = 30, padBot = 32
    const pw = W - padL - padR
    const usable = H - padTop - padBot
    const gap = activeChannels.length > 1 ? 12 : 0
    const panelH = Math.floor((usable - gap * (activeChannels.length - 1)) / activeChannels.length)

    // Compute per-channel min/max from data
    const panels: PanelInfo[] = activeChannels.map((ch, i) => {
      let rawMin = Infinity, rawMax = -Infinity
      for (const p of lap.points) {
        const v = ch.get(p)
        if (v == null) continue
        if (v < rawMin) rawMin = v
        if (v > rawMax) rawMax = v
      }
      if (rawMin === Infinity) { rawMin = 0; rawMax = 1 }
      let minVal: number, maxVal: number
      if (ch.symmetric) {
        const absMax = ch.roundMax(Math.max(0.5, Math.max(Math.abs(rawMin), rawMax))) || 1
        maxVal = absMax; minVal = -absMax
      } else {
        maxVal = ch.roundMax(Math.max(1, rawMin < 0 ? Math.max(Math.abs(rawMin), rawMax) : rawMax)) || 1
        minVal = rawMin < 0 ? Math.floor(rawMin / 10) * 10 : 0
      }
      const top = padTop + i * (panelH + gap)
      return { id: ch.id, top, pH: panelH, minVal, maxVal, symmetric: ch.symmetric, get: ch.get, label: ch.label }
    })

    const xBot = panels[panels.length - 1].top + panelH
    layoutRef.current = { padL, pw, padTop, xBot, maxDist, viewStart, viewEnd, panels }

    const ddx = (d: number) => padL + ((d - viewStart) / viewWidth) * pw
    const valY = (panel: PanelInfo, val: number) =>
      panel.top + panel.pH - ((Math.min(Math.max(val, panel.minVal), panel.maxVal) - panel.minVal) / (panel.maxVal - panel.minVal)) * panel.pH

    // Lap badge
    ctx.fillStyle = color; ctx.fillRect(padL, 8, 16, 4)
    ctx.fillStyle = '#374151'; ctx.font = 'bold 10px system-ui,sans-serif'; ctx.textAlign = 'left'
    ctx.fillText(`${lap.driverLabel}  Lap ${lap.lapNumber}`, padL + 22, 16)

    // Draw each channel panel
    for (const panel of panels) {
      const ch = ALL_CHANNELS.find(c => c.id === panel.id)!
      const hStep = ch.yStep(panel.maxVal)
      const range = panel.maxVal - panel.minVal

      // Grid lines
      for (let v = panel.minVal; v <= panel.maxVal + 0.001; v += hStep) {
        const y = panel.top + panel.pH - ((v - panel.minVal) / range) * panel.pH
        const isZero = panel.symmetric && Math.abs(v) < 0.001
        ctx.strokeStyle = isZero ? '#D1D5DB' : '#E9EAEC'; ctx.lineWidth = isZero ? 1.5 : 1
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + pw, y); ctx.stroke()
        ctx.fillStyle = '#9CA3AF'; ctx.textAlign = 'right'; ctx.font = '8px system-ui,sans-serif'
        const lbl = Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : panel.symmetric ? v.toFixed(1) : `${Math.round(v)}`
        ctx.fillText(lbl, padL - 4, y + 3)
      }

      ctx.strokeStyle = '#D1D5DB'; ctx.lineWidth = 1; ctx.strokeRect(padL, panel.top, pw, panel.pH)

      // Y axis label
      ctx.save(); ctx.translate(13, panel.top + panel.pH / 2); ctx.rotate(-Math.PI / 2)
      ctx.fillStyle = '#6B7280'; ctx.textAlign = 'center'; ctx.font = '9px system-ui,sans-serif'
      ctx.fillText(panel.label, 0, 0); ctx.restore()

      // Trace
      ctx.save(); ctx.beginPath(); ctx.rect(padL, panel.top, pw, panel.pH); ctx.clip()
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.9; ctx.beginPath()
      let first = true
      for (const p of lap.points) {
        const val = panel.get(p)
        if (val == null) continue
        const x = ddx(p.distanceM - start)
        const y = valY(panel, val)
        if (first) { ctx.moveTo(x, y); first = false } else ctx.lineTo(x, y)
      }
      ctx.stroke(); ctx.globalAlpha = 1; ctx.restore()
    }

    // X axis
    const dStep = speedDStep(viewWidth)
    ctx.font = '8px system-ui,sans-serif'; ctx.fillStyle = '#9CA3AF'; ctx.textAlign = 'center'
    for (let d = Math.ceil(viewStart / dStep) * dStep; d <= viewEnd + 1; d += dStep) {
      const x = ddx(d); if (x < padL - 2 || x > padL + pw + 2) continue
      ctx.fillText(`${Math.round(d)}`, x, xBot + 10)
    }
    ctx.fillStyle = '#6B7280'; ctx.font = '9px system-ui,sans-serif'; ctx.fillText('Distance (m)', padL + pw / 2, H - 18)

    // Mini scrollbar
    const barY = H - 10, barH2 = 4
    ctx.fillStyle = '#F0F0F0'; ctx.fillRect(padL, barY, pw, barH2)
    if (zoomed) {
      ctx.fillStyle = '#6B7280'
      ctx.fillRect(padL + (viewStart / maxDist) * pw, barY, (viewWidth / maxDist) * pw, barH2)
    } else {
      ctx.fillStyle = '#C5C5C5'; ctx.fillRect(padL, barY, pw, barH2)
    }

    // Crosshair
    if (mouseDistM == null || mouseDistM < viewStart || mouseDistM > viewEnd) return
    const cx = ddx(mouseDistM)
    ctx.save(); ctx.strokeStyle = 'rgba(55,65,81,0.55)'; ctx.lineWidth = 1; ctx.setLineDash([5, 4])
    ctx.beginPath(); ctx.moveTo(cx, padTop); ctx.lineTo(cx, xBot); ctx.stroke(); ctx.setLineDash([]); ctx.restore()

    // Dots + tooltip
    const tipLines: string[] = [`${Math.round(mouseDistM)} m`]
    for (const panel of panels) {
      const val = interpAtDist(lap.points, mouseDistM, panel.get)
      if (val != null) {
        const y = valY(panel, val)
        const r = panel.id === 'speed' ? 5 : 4
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, y, r, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, y, r, 0, Math.PI * 2); ctx.stroke()
        const ch = ALL_CHANNELS.find(c => c.id === panel.id)!
        const fmt = panel.id === 'rpm' ? `${Math.round(val).toLocaleString()} rpm`
          : panel.id === 'speed' ? `${val.toFixed(1)} km/h`
          : (panel.id === 'latG' || panel.id === 'lonG') ? `${val.toFixed(2)} G`
          : panel.id === 'waterTemp' ? `${val.toFixed(0)} °C (W)`
          : panel.id === 'egt' ? `${val.toFixed(0)} °C (E)`
          : ch.label
        tipLines.push(fmt)
      }
    }
    const tipW = 110, tipLineH = 14, tipPad = 7
    const tipH = tipPad * 2 + tipLines.length * tipLineH
    const tipX = cx + 8 + tipW > W - padR ? cx - tipW - 8 : cx + 8
    const tipY = padTop + 4
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.strokeStyle = '#D1D5DB'; ctx.lineWidth = 1
    ctx.fillRect(tipX, tipY, tipW, tipH); ctx.strokeRect(tipX, tipY, tipW, tipH)
    ctx.textAlign = 'left'; ctx.fillStyle = '#374151'
    tipLines.forEach((line, i) => {
      ctx.font = i === 0 ? 'bold 9px system-ui,sans-serif' : '9px system-ui,sans-serif'
      ctx.fillText(line, tipX + tipPad, tipY + tipPad + 9 + i * tipLineH)
    })
  })

  useEffect(() => {
    const fn = (d: number | null) => draw.current(d)
    drawFnsRef.current.push(fn)
    draw.current(mouseDistRef.current)
    return () => { drawFnsRef.current = drawFnsRef.current.filter(f => f !== fn) }
  }, [lap, color, maxDistAll, height]) // eslint-disable-line react-hooks/exhaustive-deps

  // Non-passive wheel listener
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const layout = layoutRef.current; if (!layout) return
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const { padL, pw, maxDist, viewStart, viewEnd } = layout
      const vw = viewEnd - viewStart
      const factor = e.deltaY < 0 ? 0.65 : 1 / 0.65
      const newW = Math.max(maxDist * 0.02, Math.min(maxDist, vw * factor))
      const ratio = Math.max(0, Math.min(1, (mouseX - padL) / pw))
      let ns = viewStart + ratio * (vw - newW), ne = ns + newW
      if (ns < 0) { ns = 0; ne = newW }
      if (ne > maxDist) { ne = maxDist; ns = Math.max(0, maxDist - newW) }
      const full = ne - ns >= maxDist * 0.99
      viewRangeRef.current = full ? null : [ns, ne]
      setCursor(full ? 'crosshair' : 'grab')
      onViewChange()
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [onViewChange, viewRangeRef]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!viewRangeRef.current) return
    const layout = layoutRef.current; if (!layout) return
    dragRef.current = { clientX: e.clientX, vStart: layout.viewStart, vEnd: layout.viewEnd }
    setCursor('grabbing')
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; const layout = layoutRef.current
    if (!canvas || !layout) return
    if (dragRef.current) {
      const { clientX, vStart, vEnd } = dragRef.current
      const vw = vEnd - vStart
      const dDist = -((e.clientX - clientX) / layout.pw) * vw
      let ns = vStart + dDist, ne = vEnd + dDist
      if (ns < 0) { ns = 0; ne = vw }
      if (ne > layout.maxDist) { ne = layout.maxDist; ns = layout.maxDist - vw }
      viewRangeRef.current = [ns, ne]
      onViewChange()
    } else {
      const rect = canvas.getBoundingClientRect()
      const { padL, pw, viewStart, viewEnd } = layout
      const dist = viewStart + ((e.clientX - rect.left - padL) / pw) * (viewEnd - viewStart)
      onMouseDistChange(dist)
    }
  }

  const handleMouseUp = () => { dragRef.current = null; setCursor(viewRangeRef.current ? 'grab' : 'crosshair') }
  const handleDblClick = () => { viewRangeRef.current = null; setCursor('crosshair'); onViewChange() }

  return (
    <canvas ref={canvasRef}
      style={{ width: '100%', height: fillHeight ? '100%' : height, display: 'block', borderRadius: '8px', border: '1px solid #E5E7EB', cursor }}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { dragRef.current = null; setCursor(viewRangeRef.current ? 'grab' : 'crosshair'); onMouseDistChange(null) }}
      onDoubleClick={handleDblClick}
    />
  )
}

// @ts-ignore — kept for future use
function SpeedTraceSeparate({ laps, colors, height = 440, fillHeight, channelOrder, enabledChannelIds }: { laps: LapRow[]; colors: string[]; height?: number; fillHeight?: boolean; channelOrder?: string[]; enabledChannelIds?: string[] }) {
  const mouseDistRef = useRef<number | null>(null)
  const drawFnsRef   = useRef<Array<(d: number | null) => void>>([])
  const viewRangeRef = useRef<[number, number] | null>(null)

  let maxDistAll = 0
  for (const lap of laps) {
    if (!lap.points.length) continue
    const d = (lap.points[lap.points.length - 1]?.distanceM ?? 0) - (lap.points[0]?.distanceM ?? 0)
    if (d > maxDistAll) maxDistAll = d
  }

  const cols   = laps.length === 1 ? 1 : 2
  const singleH = laps.length <= 2 ? height : Math.floor((height - 12) / 2)

  const handleViewChange = useCallback(() => {
    drawFnsRef.current.forEach(fn => fn(mouseDistRef.current))
  }, [])

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, height: fillHeight ? '100%' : undefined }}
      onMouseLeave={() => { mouseDistRef.current = null; drawFnsRef.current.forEach(fn => fn(null)) }}
    >
      {laps.map((lap, i) => (
        <SpeedTraceSingleCanvas
          key={`${lap.sessionIdx}-${lap.lapNumber}`}
          lap={lap} color={colors[i]} maxDistAll={maxDistAll} height={singleH} fillHeight={fillHeight}
          mouseDistRef={mouseDistRef} drawFnsRef={drawFnsRef}
          onMouseDistChange={d => { mouseDistRef.current = d; drawFnsRef.current.forEach(fn => fn(d)) }}
          viewRangeRef={viewRangeRef} onViewChange={handleViewChange}
          channelOrder={channelOrder} enabledChannelIds={enabledChannelIds}
        />
      ))}
    </div>
  )
}

// ─── Track location detection ────────────────────────────────────────────────

type KartTrack = { n: string; lat: number; lon: number; cc?: string; city?: string }
const kartTracks = kartTracksRaw as KartTrack[]

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000, r = Math.PI / 180
  const dLat = (lat2 - lat1) * r
  const dLon = (lon2 - lon1) * r
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function nearestKartTrack(lat: number, lon: number, maxDistM = 2000): KartTrack | null {
  let best: KartTrack | null = null
  let bestDist = maxDistM
  for (const t of kartTracks) {
    const d = haversineM(lat, lon, t.lat, t.lon)
    if (d < bestDist) { bestDist = d; best = t }
  }
  return best
}

const _locCache = new Map<string, string>()

async function fetchTrackLocation(lat: number, lon: number): Promise<string> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`
  if (_locCache.has(key)) return _locCache.get(key)!

  // Check bundled karting-track database first (updated quarterly)
  const track = nearestKartTrack(lat, lon)
  if (track) {
    const suffix = [track.city, track.cc].filter(Boolean).join(', ')
    const label = suffix ? `${track.n} · ${suffix}` : track.n
    _locCache.set(key, label)
    return label
  }

  // Fall back to Nominatim reverse geocoding for area name
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}&zoom=12&addressdetails=1`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'KartConnect/1.0 (kartconnect.netlify.app)' },
  })
  if (!res.ok) throw new Error('geocode failed')
  const d = await res.json()

  const addr   = d.address ?? {}
  const area   = addr.town ?? addr.village ?? addr.city ?? addr.suburb ?? ''
  const region = addr.county ?? addr.state ?? ''
  const cc     = (addr.country_code ?? '').toUpperCase()
  const label  = [area, region, cc].filter(Boolean).join(', ')

  _locCache.set(key, label)
  return label
}

// ─── Import Diagnostics ───────────────────────────────────────────────────────

function GpsImportDiagnostics({
  session, onFlipChannels,
}: {
  session: ImportedGPSSession
  onFlipChannels?: () => void
}) {
  const pts = session.points

  const hasSpeed  = pts.some(p => p.speedKmh != null && p.speedKmh > 0)
  const hasRpm    = pts.some(p => p.rpm != null)
  const hasWater  = pts.some(p => p.waterTempC != null)
  const hasEgt    = pts.some(p => p.exhaustTempC != null)
  const hasGForce = pts.some(p => p.lateralG != null && p.lateralG !== 0)

  // GPS centroid — the single most useful sanity check for channel order.
  // For a European track: lat should be ~35–72°N, lon ~-10 to 40°E.
  // If the numbers appear swapped (e.g. lat ≈ 12, lon ≈ 42) the channels are wrong.
  const sampleN = Math.min(pts.length, 200)
  const centLat = pts.slice(0, sampleN).reduce((s, p) => s + p.lat, 0) / sampleN
  const centLon = pts.slice(0, sampleN).reduce((s, p) => s + p.lon, 0) / sampleN
  const fmtCoord = (v: number, posLabel: string, negLabel: string) => {
    const abs = Math.abs(v).toFixed(4)
    return `${abs}°${v >= 0 ? posLabel : negLabel}`
  }
  // Flag probable swap: lat looks more like a European longitude, lon looks like a latitude
  const channelsMaybeSwapped = Math.abs(centLat) < 25 && Math.abs(centLon) > 30

  const [trackLocation, setTrackLocation] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    fetchTrackLocation(centLat, centLon)
      .then(loc => { if (alive) setTrackLocation(loc) })
      .catch(() => {})
    return () => { alive = false }
  }, [centLat, centLon])

  // Speed sanity: constant value across a whole session means altitude was misread as speed
  const speedVals = pts.map(p => p.speedKmh).filter((v): v is number => v != null)
  let speedWarning: string | null = null
  if (hasSpeed && speedVals.length > 10) {
    const mean = speedVals.reduce((a, b) => a + b) / speedVals.length
    const stdDev = Math.sqrt(speedVals.reduce((s, v) => s + (v - mean) ** 2, 0) / speedVals.length)
    if (stdDev < 10) speedWarning = `Speed is unusually constant (~${Math.round(mean)} km/h) — data may be unreliable`
  }

  const lapCount = session.lapGroups.length
  const durations = session.lapGroups.map(g => (g[g.length - 1].timeS - g[0].timeS) * 1000)
  const sortedDur = [...durations].sort((a, b) => a - b)
  const medianMs  = sortedDur.length ? sortedDur[Math.floor(sortedDur.length / 2)] : null
  const bestMs    = sortedDur.length ? sortedDur[0] : null
  const worstMs   = sortedDur.length ? sortedDur[sortedDur.length - 1] : null

  let lapWarning: string | null = null
  if (lapCount === 0) {
    lapWarning = 'No laps detected — check the file or S/F placement'
  } else if (medianMs !== null && (medianMs < 20_000 || medianMs > 600_000)) {
    lapWarning = `Median lap time (${fmt(medianMs)}) looks unusual`
  } else if (lapCount >= 3 && bestMs != null && worstMs != null) {
    if (worstMs / bestMs > 2.5) lapWarning = `Lap times vary widely (${fmt(bestMs)}–${fmt(worstMs)}) — S/F may be misplaced`
  }

  const warnings = [speedWarning, lapWarning].filter(Boolean) as string[]

  const channels = [
    { label: 'GPS',     ok: true },
    { label: 'Speed',   ok: hasSpeed },
    { label: 'RPM',     ok: hasRpm },
    { label: 'G-Force', ok: hasGForce },
    { label: 'Water',   ok: hasWater },
    { label: 'EGT',     ok: hasEgt },
  ]

  const isOutlier = (ms: number) => bestMs != null && ms / bestMs > 2.0

  return (
    <div className="mt-2 rounded-card border border-border-color bg-bg-elevated p-2.5 space-y-2">
      <div>
        <p className="text-[9px] font-heading font-semibold uppercase tracking-wider text-text-muted mb-1.5">Channels</p>
        <div className="flex flex-wrap gap-1.5">
          {channels.map(ch => (
            <span key={ch.label} className={[
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold',
              ch.ok
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-bg-card text-text-muted/40 border border-border-color',
            ].join(' ')}>
              <span className={`text-[9px] font-bold ${ch.ok ? 'text-green-400' : 'text-red-400/70'}`}>
                {ch.ok ? '✓' : '✗'}
              </span>
              {ch.label}
            </span>
          ))}
        </div>
      </div>

      {/* GPS coordinate readout — most reliable way to verify channel order */}
      <div className={`flex items-center justify-between text-[10px] rounded px-2 py-1 ${channelsMaybeSwapped ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-bg-card'}`}>
        <span className="font-mono text-text-muted">
          {fmtCoord(centLat, 'N', 'S')} · {fmtCoord(centLon, 'E', 'W')}
        </span>
        {channelsMaybeSwapped
          ? <span className="text-amber-400 font-semibold">Channels may be swapped</span>
          : <span className="text-text-muted/50">GPS centre</span>
        }
      </div>

      {trackLocation && (
        <div className="flex items-center gap-1.5 text-[10px] text-text-muted px-2 py-1 bg-bg-card rounded">
          <MapPin size={10} className="flex-shrink-0 text-accent-primary" />
          <span>{trackLocation}</span>
        </div>
      )}

      {/* Lap summary header */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-text-muted">
          {lapCount > 0 ? `${lapCount} lap${lapCount !== 1 ? 's' : ''} detected` : 'No laps detected'}
        </span>
        {bestMs !== null && medianMs !== null && (
          <span className="font-mono text-[10px] text-text-muted">
            best <span className="text-accent-primary font-semibold">{fmt(bestMs)}</span>
            <span className="mx-1 opacity-40">·</span>
            med {fmt(medianMs)}
          </span>
        )}
      </div>

      {/* Per-lap time list */}
      {lapCount > 0 && (
        <div className="bg-bg-card rounded px-2 py-1.5 space-y-0.5 max-h-[120px] overflow-y-auto">
          {durations.map((ms, i) => {
            const isBest = ms === bestMs
            const bad = isOutlier(ms)
            return (
              <div key={i} className="flex items-center justify-between text-[10px]">
                <span className="text-text-muted/60">Lap {i + 1}</span>
                <span className={[
                  'font-mono font-semibold',
                  isBest ? 'text-accent-primary' : bad ? 'text-amber-400' : 'text-text-primary',
                ].join(' ')}>
                  {fmt(ms)}
                  {isBest && <span className="ml-1 text-[8px] text-accent-primary/70 font-bold uppercase tracking-wide">best</span>}
                  {bad && !isBest && <span className="ml-1 text-[8px] text-amber-400/80 font-bold">!</span>}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {(channelsMaybeSwapped || warnings.length > 0) && (
        <div className="space-y-1.5">
          {channelsMaybeSwapped && onFlipChannels && (
            <button
              type="button"
              onClick={onFlipChannels}
              className="w-full flex items-center justify-center gap-1.5 text-[10px] font-semibold text-amber-400 border border-amber-500/30 rounded py-1 hover:bg-amber-500/10 transition-colors"
            >
              <ArrowLeftRight size={11} />
              Flip GPS channels &amp; re-import
            </button>
          )}
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-400">
              <AlertCircle size={11} className="shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {!channelsMaybeSwapped && warnings.length === 0 && lapCount > 0 && (
        <p className="text-[10px] text-green-400/70">Data looks good</p>
      )}
    </div>
  )
}

// ─── Driver Import Panel ──────────────────────────────────────────────────────

const DRIVER_COLORS: Record<0 | 1, string> = { 0: '#EF4444', 1: '#3B82F6' }
const DRIVER_LABELS: Record<0 | 1, string> = { 0: 'Driver A', 1: 'Driver B' }

interface DriverPanelProps {
  slot: DriverSlot
  idx: 0 | 1
  onUpdate: (fn: (prev: DriverSlot) => DriverSlot) => void
  userId: string | null
  karts: Kart[]
}

type ParseStep = 'reading' | 'channels' | 'laps' | 'finishing'
type ParsePhase =
  | { phase: 'parsing'; filename: string; step: ParseStep }
  | { phase: 'reveal';  filename: string; result: ParseResult }


const PARSE_LOADING_MSGS = [
  'Reading logger data…',
  'Detecting channels…',
  'Processing lap splits…',
  'Computing speed traces…',
  'Finalising session…',
]

function fmtLapTime(ms: number) {
  const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000), cs = Math.floor((ms % 1000) / 10)
  return m > 0
    ? `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
    : `${s}.${String(cs).padStart(2, '0')}`
}

function RevealCard({ ps, onDone }: { ps: { phase: 'reveal'; filename: string; result: ParseResult }; onDone: () => void }) {
  const [shown, setShown] = useState(0)

  // Build the list of items to reveal
  const items: { label: string; found: boolean; value?: string }[] = []
  if (ps.result.type === 'gps') {
    const pts = ps.result.session.points
    const cached = localStorage.getItem('kc_ocd_swap_v2')
    const channelLabel = cached !== null ? 'GPS Channels (saved)' : 'GPS Channels'
    items.push({ label: channelLabel, found: true })
    items.push({ label: 'Speed',       found: pts.some(p => p.speedKmh != null) })
    items.push({ label: 'RPM',         found: pts.some(p => p.rpm != null) })
    items.push({ label: 'Water Temp',  found: pts.some(p => p.waterTempC != null) })
    items.push({ label: 'EGT',         found: pts.some(p => p.exhaustTempC != null) })
    const groups = ps.result.session.lapGroups
    if (groups.length > 0) {
      const durations = groups.map(g => (g[g.length - 1].timeS - g[0].timeS) * 1000)
      const sorted = [...durations].sort((a, b) => a - b)
      const median = sorted[Math.floor(sorted.length / 2)]
      const best = sorted[0]
      items.push({ label: 'Laps', found: true, value: `${groups.length} laps · best ${fmtLapTime(best)} · med ${fmtLapTime(median)}` })
    }
  } else if (ps.result.type === 'lap') {
    const laps = ps.result.session.laps
    items.push({ label: 'Lap Times',  found: laps.length > 0, value: `${laps.length} laps` })
    const best = laps.reduce<number | null>((b, l) => b === null || l.lapTimeMs < b ? l.lapTimeMs : b, null)
    if (best) items.push({ label: 'Best Lap', found: true, value: fmtLapTime(best) })
    items.push({ label: 'Speed',   found: laps.some(l => l.maxSpeedKmh != null) })
    items.push({ label: 'RPM',     found: laps.some(l => l.maxRpm != null) })
    items.push({ label: 'Temperatures', found: laps.some(l => l.waterTempC != null || l.exhaustTempC != null) })
  }

  // Reveal one item every 650 ms, then fire onDone 1.5 s after the last one
  useEffect(() => {
    if (shown < items.length) {
      const id = setTimeout(() => setShown(n => n + 1), 650)
      return () => clearTimeout(id)
    } else {
      const id = setTimeout(onDone, 1500)
      return () => clearTimeout(id)
    }
  }, [shown, items.length, onDone])

  return (
    <div className="border border-border-color rounded-card p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <CheckCircle2 size={16} className="text-accent-primary flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">Session analysed</p>
          <p className="text-[10px] text-text-muted truncate">{ps.filename}</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {items.map((item, i) => i < shown && (
          <div
            key={item.label}
            className="flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300"
          >
            <div className="flex items-center gap-2 text-xs">
              {item.found
                ? <CheckCircle2 size={12} className="text-accent-primary flex-shrink-0" />
                : <Circle      size={12} className="text-text-muted/40 flex-shrink-0" />}
              <span className={item.found ? 'text-text-primary font-medium' : 'text-text-muted/50 line-through'}>
                {item.label}
              </span>
            </div>
            {item.value && (
              <span className="text-[10px] font-mono text-accent-primary font-semibold">{item.value}</span>
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-0.5 rounded-full bg-bg-elevated overflow-hidden">
        <div
          className="h-full bg-accent-primary rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, (shown / Math.max(items.length, 1)) * 100)}%` }}
        />
      </div>
    </div>
  )
}

function DriverPanel({ slot, idx, onUpdate, userId, karts }: DriverPanelProps) {
  const color = DRIVER_COLORS[idx]
  const label = DRIVER_LABELS[idx]
  const [csvDragging, setCsvDragging] = useState(false)
  const [parseState, setParseState] = useState<ParsePhase | null>(null)
  const [parsePct, setParsePct] = useState(0)
  const [parseLoadingMsgIdx, setParseLoadingMsgIdx] = useState(0)
  const pendingResultRef = useRef<{ filename: string; result: ParseResult } | null>(null)

  // Animate progress bar during parsing phase
  useEffect(() => {
    if (parseState?.phase !== 'parsing') {
      setParsePct(0)
      setParseLoadingMsgIdx(0)
      return
    }
    const start = Date.now()
    const ANIM_MS = 5000
    let done = false
    const id = setInterval(() => {
      if (done) return
      if (pendingResultRef.current) {
        setParsePct(prev => {
          const next = Math.round(Math.min(100, prev + Math.max(3, (100 - prev) * 0.12)))
          if (next >= 100 && !done) {
            done = true
            clearInterval(id)
            setTimeout(() => {
              const pr = pendingResultRef.current
              if (pr) {
                pendingResultRef.current = null
                setParseState({ phase: 'reveal', filename: pr.filename, result: pr.result })
              }
            }, 350)
          }
          return next
        })
      } else {
        const rawPct = Math.min(92, (Date.now() - start) / ANIM_MS * 100)
        setParsePct(Math.round(rawPct))
      }
    }, 50)
    return () => { done = true; clearInterval(id) }
  }, [parseState?.phase])

  // Cycle loading messages every 1 second while parsing
  useEffect(() => {
    if (parseState?.phase !== 'parsing') return
    const id = setInterval(() => setParseLoadingMsgIdx(i => (i + 1) % PARSE_LOADING_MSGS.length), 1000)
    return () => clearInterval(id)
  }, [parseState?.phase])

  const commitResult = useCallback((result: ParseResult) => {
    setParseState(null)
    if (result.type === 'error') {
      onUpdate(p => ({ ...p, csvError: result.error }))
    } else if (result.type === 'lap') {
      onUpdate(p => ({ ...p, session: { type: 'lap', session: result.session }, csvError: null }))
    } else {
      onUpdate(p => ({ ...p, session: { type: 'gps', session: result.session }, csvError: null }))
    }
  }, [onUpdate])

  async function handleCsvFiles(files: FileList | null) {
    if (!files?.length) return
    const file = files[0]
    const nameLow = file.name.toLowerCase()

    const isOcd  = nameLow.endsWith('.ocd')
    const isDrk  = nameLow.endsWith('.drk')
    const isXdrk = nameLow.endsWith('.xdrk')
    const isXrk  = nameLow.endsWith('.xrk')
    const isXrz  = nameLow.endsWith('.xrz')
    const isAld  = nameLow.endsWith('.ald')

    if (!isOcd && !isDrk && !isXdrk && !isXrk && !isXrz && !isAld) {
      onUpdate(p => ({ ...p, csvError: 'Unsupported file type. Accepted: .ocd (Unipro), .xrk (AiM / MyChron — use the XRK file from your session folder), .ald (Alfano)' }))
      return
    }

    if (isDrk || isXdrk) {
      onUpdate(p => ({ ...p, csvError: 'AiM .drk/.xdrk files are not yet supported — please use the .xrk or .xrz session file instead.' }))
      return
    }

    if (isAld) {
      onUpdate(p => ({ ...p, csvError: 'Alfano file recognised (.ald) — full parsing support is coming soon.' }))
      return
    }

    const yield_ = () => new Promise<void>(r => setTimeout(r, 60))

    setParseState({ phase: 'parsing', filename: file.name, step: 'reading' })
    await yield_()

    const buffer = await file.arrayBuffer()
    setParseState(s => s?.phase === 'parsing' ? { ...s, step: 'channels' } : s); await yield_()

    let result: ParseResult
    if (isXrk) {
      setParseState(s => s?.phase === 'parsing' ? { ...s, step: 'laps' } : s); await yield_()
      result = parseXrkBinary(file.name, buffer)
    } else if (isXrz) {
      setParseState(s => s?.phase === 'parsing' ? { ...s, step: 'laps' } : s); await yield_()
      result = await parseXrzBinary(file.name, buffer)
    } else {
      const cachedSwap = localStorage.getItem('kc_ocd_swap_v2')
      const swapHint = cachedSwap !== null ? { swapChannels: cachedSwap === '1' } : undefined
      setParseState(s => s?.phase === 'parsing' ? { ...s, step: 'laps' }     : s); await yield_()
      result = parseOCDBinary(file.name, buffer, swapHint)
      if (result.type === 'gps' && result.session.ocdSwapped !== undefined) {
        try { localStorage.setItem('kc_ocd_swap_v2', result.session.ocdSwapped ? '1' : '0') } catch {}
      }
    }
    setParseState(s => s?.phase === 'parsing' ? { ...s, step: 'finishing' } : s); await yield_()

    if (result.type === 'error') {
      pendingResultRef.current = null
      setParseState(null)
      onUpdate(p => ({ ...p, csvError: result.error }))
    } else {
      // Store result; animation effect transitions to reveal once % reaches 100
      pendingResultRef.current = { filename: file.name, result }
    }
  }

  const brand = slotBrand(slot)

  // Build driver options from karts: use driver_name if set, else nickname
  const driverOptions = karts
    .map(k => k.driver_name?.trim() || k.nickname?.trim())
    .filter((n): n is string => !!n)
    .filter((n, i, arr) => arr.indexOf(n) === i)  // dedupe
    .sort()

  return (
    <div className="bg-bg-card border border-border-color rounded-card p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-xs font-heading font-bold uppercase tracking-widest" style={{ color }}>{label}</span>
      </div>

      {/* ── Driver selector ── */}
      {driverOptions.length > 0 && (
        <div>
          <p className="text-[10px] font-heading font-semibold text-text-muted uppercase tracking-wider mb-1.5">Driver</p>
          <select
            value={slot.driverName ?? ''}
            onChange={e => onUpdate(p => ({ ...p, driverName: e.target.value || null }))}
            className="w-full bg-bg-elevated border border-border-color rounded-card px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
          >
            <option value=''>— Select driver —</option>
            {driverOptions.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── CSV section ── */}
      <div>
        <p className="text-[10px] font-heading font-semibold text-text-muted uppercase tracking-wider mb-2">Logger Data</p>
        {parseState?.phase === 'parsing' ? (
          /* ── Parsing loading card ── */
          <div className="border border-border-color rounded-card p-5 space-y-4">
            <div className="text-center space-y-0.5">
              <p className="text-[10px] font-heading font-bold text-text-muted uppercase tracking-wider">Analysing</p>
              <p className="text-xs font-medium text-text-primary truncate max-w-[200px] mx-auto">{parseState.filename}</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-text-muted text-center transition-all duration-500 min-h-[1.2em]">
                {PARSE_LOADING_MSGS[parseLoadingMsgIdx]}
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-primary rounded-full transition-all duration-150 ease-out"
                  style={{ width: `${parsePct}%` }}
                />
              </div>
              <p className="text-right text-xs font-mono text-text-muted">{parsePct}%</p>
            </div>
          </div>
        ) : parseState?.phase === 'reveal' ? (
          /* ── Post-parse reveal card ── */
          <RevealCard ps={parseState} onDone={() => commitResult(parseState.result)} />
        ) : slot.session ? (
          <>
            <div className="flex items-center justify-between bg-bg-elevated rounded-card px-3 py-2.5 border border-border-color">
              <div>
                <p className="text-xs font-semibold text-text-primary">{slotLabel(slot)}</p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  {brand ? BRAND_LABELS[brand] : ''} · {slotLapCount(slot)} lap{slotLapCount(slot) !== 1 ? 's' : ''}
                  {slot.session.type === 'gps' && <span className="ml-1.5 font-bold text-accent-primary">GPS</span>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUpdate(p => ({ ...p, session: null, csvError: null }))}
                className="text-text-muted hover:text-text-primary transition-colors ml-2"
              >
                <X size={12} />
              </button>
            </div>
            {slot.session.type === 'gps' && (
              <GpsImportDiagnostics
                session={slot.session.session}
                onFlipChannels={() => {
                  // Invert the cached channel order so the next import uses the opposite swap
                  const cur = localStorage.getItem('kc_ocd_swap_v2')
                  const flipped = cur === '1' ? '0' : '1'
                  try { localStorage.setItem('kc_ocd_swap_v2', flipped) } catch {}
                  // Clear session so user is prompted to re-import
                  onUpdate(p => ({ ...p, session: null, csvError: 'Channel order flipped — drop your .ocd file again to re-import with the new setting.' }))
                }}
              />
            )}
          </>
        ) : (
          <div className="flex flex-col gap-2">
            {userId && (
              <SessionPicker
                userId={userId}
                onSession={result => {
                  if (result.type === 'error') {
                    onUpdate(p => ({ ...p, csvError: result.error }))
                  } else if (result.type === 'lap') {
                    onUpdate(p => ({ ...p, session: { type: 'lap', session: result.session }, csvError: null }))
                  } else {
                    onUpdate(p => ({ ...p, session: { type: 'gps', session: result.session }, csvError: null }))
                  }
                }}
              />
            )}
            <div
              onDrop={e => { e.preventDefault(); setCsvDragging(false); void handleCsvFiles(e.dataTransfer.files) }}
              onDragOver={e => { e.preventDefault(); setCsvDragging(true) }}
              onDragLeave={() => setCsvDragging(false)}
              className={[
                'border-2 border-dashed rounded-card p-4 text-center transition-colors',
                csvDragging ? 'border-accent-primary bg-accent-primary/5' : 'border-border-color',
              ].join(' ')}
            >
              <Upload size={16} className="mx-auto mb-2 text-text-muted" />
              <p className="text-xs font-semibold text-text-primary mb-1">Drop your logger file here</p>
              <div className="flex flex-wrap justify-center gap-1.5 mb-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 text-[10px] font-semibold">.ocd — Unipro ✓</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 text-[10px] font-semibold">.xrk / .xrz — AiM ✓</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg-elevated text-text-muted text-[10px] font-semibold">.ald — Alfano</span>
              </div>
              <label className="cursor-pointer inline-flex items-center px-3 py-1 rounded-card bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-xs font-bold hover:bg-accent-primary/20 transition-colors">
                Browse
                <input type="file" accept=".ocd,.xrk,.ald" className="hidden" onChange={e => void handleCsvFiles(e.target.files)} />
              </label>
            </div>
          </div>
        )}
        {slot.csvError && (
          <div className={`flex items-center gap-2 mt-2 text-xs ${slot.csvError.includes('coming soon') ? 'text-amber-500' : 'text-red-400'}`}>
            <AlertCircle size={11} />
            <span>{slot.csvError}</span>
          </div>
        )}
      </div>

      {/* ── Video section — Coming Soon ── */}
      <div>
        <p className="text-[10px] font-heading font-semibold text-text-muted uppercase tracking-wider mb-2">Video Footage</p>
        <div className="border border-dashed border-border-color rounded-card p-4 text-center opacity-50 select-none">
          <Video size={16} className="mx-auto mb-1.5 text-text-muted" />
          <p className="text-xs font-bold text-text-muted">Video Analysis</p>
          <p className="text-[10px] text-text-muted mt-0.5">Coming soon</p>
        </div>
      </div>
    </div>
  )
}

// ─── Session persistence ──────────────────────────────────────────────────────

const PERSIST_KEY_A = 'kc-dl-slot-a'
const PERSIST_KEY_B = 'kc-dl-slot-b'
// Bump this whenever the parse algorithm changes so stale cached sessions are discarded
const PARSE_VERSION = 12

function persistSlot(key: string, slot: DriverSlot) {
  try {
    if (!slot.session) { localStorage.removeItem(key); return }
    localStorage.setItem(key, JSON.stringify({ v: PARSE_VERSION, session: slot.session, driverName: slot.driverName }))
  } catch { /* storage full — silently skip */ }
}

function restoreSlot(key: string): { session: AnySession; driverName: string | null } | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { v?: number; session: AnySession; driverName: string | null }
    if (parsed.v !== PARSE_VERSION) { localStorage.removeItem(key); return null }
    return parsed
  } catch { return null }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DataComparisonPage() {
  const { user } = useAuth()
  const { data: karts } = useKarts()
  const [slotA, setSlotA] = useState<DriverSlot>(emptySlot)
  const [slotB, setSlotB] = useState<DriverSlot>(emptySlot)
  const [tab, setTab] = useState<Tab>('laps')
  const [selectedLaps, setSelectedLaps] = useState<LapRow[]>([])
  const [traceMode, setTraceMode] = useState<'overlay' | 'separate'>('overlay')
  const [separateLapKey, setSeparateLapKey] = useState<string | null>(null)
  const [speedFullscreen, setSpeedFullscreen] = useState(false)

  const [trackName, setTrackName] = useState('')
  const [hoverDistM, setHoverDistM] = useState<number | null>(null)
  const [enabledChannels, setEnabledChannels] = useState<Set<string>>(() => new Set(['speed', 'rpm', 'latG', 'lonG', 'waterTemp', 'egt', 'delta']))
  const [channelOrder, setChannelOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kc_channel_order')
      if (saved) {
        const parsed = JSON.parse(saved) as string[]
        const allIds = ALL_CHANNELS.map(c => c.id)
        // keep saved order, append any new channels not yet in it
        const known = new Set(parsed)
        return [...parsed.filter((id: string) => allIds.includes(id)), ...allIds.filter(id => !known.has(id))]
      }
    } catch {}
    return ALL_CHANNELS.map(c => c.id)
  })
  const [splitPercent, setSplitPercent] = useState(60)
  const splitContainerRef = useRef<HTMLDivElement>(null)
  const [setSFMode, setSFModeActive] = useState(false)
  const [pendingSF, setPendingSF] = useState<{ lat: number; lon: number; headingDeg: number } | null>(null)
  const [lapColors, setLapColors] = useState<Record<string, string>>({})
  const [pendingLap, setPendingLap] = useState<{ lap: LapRow; x: number; y: number } | null>(null)
  const [sfOverrides, setSfOverrides] = useState<Record<string, { lat: number; lon: number; headingDeg?: number }>>(() => {
    try { return JSON.parse(localStorage.getItem('kc_sf_overrides_v3') ?? '{}') } catch { return {} }
  })

  function handleDividerMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    const container = splitContainerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    function onMove(ev: MouseEvent) {
      const pct = Math.max(20, Math.min(80, ((ev.clientX - rect.left) / rect.width) * 100))
      setSplitPercent(pct)
    }
    function onUp() { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Stable track key from GPS centroid — same track always gets the same key regardless of filename.
  function computeTrackKey(points: GpsPoint[]): string {
    if (!points.length) return 'unknown'
    const lat = points.reduce((s, p) => s + p.lat, 0) / points.length
    const lon = points.reduce((s, p) => s + p.lon, 0) / points.length
    return `${lat.toFixed(3)}_${lon.toFixed(3)}`
  }

  // Restore persisted sessions on first mount
  useEffect(() => {
    const a = restoreSlot(PERSIST_KEY_A)
    if (a) setSlotA(s => ({ ...s, session: a.session, driverName: a.driverName }))
    const b = restoreSlot(PERSIST_KEY_B)
    if (b) setSlotB(s => ({ ...s, session: b.session, driverName: b.driverName }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load saved S/F positions from Supabase on sign-in.
  // v3 migration: wipe any stale rows written before the track-key schema was stable.
  useEffect(() => {
    if (!user) return
    const MIGRATED_KEY = 'kc_sf_v3_migrated'
    if (!localStorage.getItem(MIGRATED_KEY)) {
      // One-time wipe of old Supabase S/F rows so stale overrides don't resurface.
      void supabase.from('track_sf_positions').delete().eq('user_id', user.id).then(() => {
        localStorage.setItem(MIGRATED_KEY, '1')
      })
      return
    }
    void supabase
      .from('track_sf_positions')
      .select('track_key, sf_lat, sf_lon')
      .then(({ data }) => {
        if (!data?.length) return
        const fromDB: Record<string, { lat: number; lon: number }> = {}
        for (const row of data) fromDB[row.track_key] = { lat: row.sf_lat, lon: row.sf_lon }
        setSfOverrides(prev => ({ ...fromDB, ...prev }))
      })
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist whenever a session is loaded or cleared
  useEffect(() => { persistSlot(PERSIST_KEY_A, slotA) }, [slotA.session, slotA.driverName])
  useEffect(() => { persistSlot(PERSIST_KEY_B, slotB) }, [slotB.session, slotB.driverName])

  const hasAnyCsv = !!slotA.session || !!slotB.session
  const hasAnyVideo = !!slotA.videoFile || !!slotB.videoFile

  // Apply S/F override to a slot: re-run lap detection with the user-placed S/F point.
  // Currently disabled — always use auto-detected laps. Manual SF placement only affects
  // the visual marker; auto-detection is reliable and all override heuristics were causing
  // approach-road / half-lap regressions. Re-enable once a robust validation strategy exists.
  function applySlotSF(slot: DriverSlot): DriverSlot {
    return slot
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const effectiveSlotA = useMemo(() => applySlotSF(slotA), [slotA, sfOverrides])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const effectiveSlotB = useMemo(() => applySlotSF(slotB), [slotB, sfOverrides])
  const effectiveSlots = [effectiveSlotA, effectiveSlotB]

  const gpsSlots = [
    { slot: effectiveSlots[0], color: SESSION_COLORS[0] },
    { slot: effectiveSlots[1], color: SESSION_COLORS[1] },
  ].filter(x => x.slot.session?.type === 'gps')
  // Memoized so the array reference is stable — prevents TrackMapCanvas from resetting
  // its viewport on every render when in S/F placement mode.
  const gpsSessionList = useMemo(
    () => gpsSlots.map(x => (x.slot.session as { type: 'gps'; session: ImportedGPSSession }).session),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveSlotA, effectiveSlotB],
  )
  const hasGPS = gpsSessionList.length > 0

  // Detect mismatched tracks: if both slots have GPS data with centroids > 2 km apart,
  // the sessions are from different venues and cannot be meaningfully compared.
  const isDifferentTrack = useMemo(() => {
    const ptsA = effectiveSlotA.session?.type === 'gps' ? effectiveSlotA.session.session.points : null
    const ptsB = effectiveSlotB.session?.type === 'gps' ? effectiveSlotB.session.session.points : null
    if (!ptsA?.length || !ptsB?.length) return false
    const cA = { lat: ptsA.reduce((s, p) => s + p.lat, 0) / ptsA.length, lon: ptsA.reduce((s, p) => s + p.lon, 0) / ptsA.length }
    const cB = { lat: ptsB.reduce((s, p) => s + p.lat, 0) / ptsB.length, lon: ptsB.reduce((s, p) => s + p.lon, 0) / ptsB.length }
    const R = 6371000, rad = Math.PI / 180
    const dLat = (cB.lat - cA.lat) * rad, dLon = (cB.lon - cA.lon) * rad
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(cA.lat * rad) * Math.cos(cB.lat * rad) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) > 2000
  }, [effectiveSlotA, effectiveSlotB])

  const allLaps = buildLapRows(effectiveSlots)
  // Keep a ref so the sfOverrides effect can read the latest allLaps without stale closures
  const allLapsRef = useRef(allLaps)
  allLapsRef.current = allLaps

  // Stage position on canvas click — user must press Save to commit
  function handleSFCanvasClick(lat: number, lon: number, headingDeg: number) {
    setPendingSF({ lat, lon, headingDeg })
  }

  function confirmSetSF() {
    if (!pendingSF) return
    const { lat, lon, headingDeg } = pendingSF
    const newOvr = { ...sfOverrides }
    const trackKeys: string[] = []
    for (const slot of [slotA, slotB]) {
      if (slot.session?.type === 'gps') {
        const tk = computeTrackKey(slot.session.session.points)
        newOvr[tk] = { lat, lon, headingDeg }
        trackKeys.push(tk)
      }
    }
    setSfOverrides(newOvr)
    localStorage.setItem('kc_sf_overrides_v3', JSON.stringify(newOvr))
    setSFModeActive(false)
    setPendingSF(null)
    if (user && trackKeys.length) {
      void supabase.from('track_sf_positions').upsert(
        trackKeys.map(tk => ({ user_id: user.id, track_key: tk, sf_lat: lat, sf_lon: lon, updated_at: new Date().toISOString() })),
        { onConflict: 'user_id,track_key' },
      )
    }
  }

  function cancelSFMode() {
    setSFModeActive(false)
    setPendingSF(null)
  }

  function resetSF() {
    const newOvr = { ...sfOverrides }
    const trackKeys: string[] = []
    for (const slot of [slotA, slotB]) {
      if (slot.session?.type === 'gps') {
        const tk = computeTrackKey(slot.session.session.points)
        delete newOvr[tk]
        trackKeys.push(tk)
      }
    }
    setSfOverrides(newOvr)
    localStorage.setItem('kc_sf_overrides_v3', JSON.stringify(newOvr))
    if (user) {
      for (const tk of trackKeys) {
        void supabase.from('track_sf_positions').delete().eq('user_id', user.id).eq('track_key', tk)
      }
    }
  }

  const hasSFOverride = [slotA, slotB].some(s =>
    s.session?.type === 'gps' && !!sfOverrides[computeTrackKey((s.session as { type: 'gps'; session: ImportedGPSSession }).session.points)]
  )
  const bestLapMs = allLaps.length ? Math.min(...allLaps.map(l => l.lapTimeMs)) : 0

  // When S/F override changes, remap selected laps to the new segmentation so the map updates
  useEffect(() => {
    setSelectedLaps(prev => {
      if (prev.length === 0) return prev
      const newAll = allLapsRef.current
      const remapped = prev.flatMap(l => {
        const match = newAll.find(nl => nl.sessionIdx === l.sessionIdx && nl.lapNumber === l.lapNumber)
        return match ? [match] : []
      })
      return remapped.length === prev.length && remapped.every((l, i) => l === prev[i]) ? prev : remapped
    })
  // sfOverrides is the trigger — allLapsRef.current is always fresh via the ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sfOverrides])

  // When a slot is cleared, drop any selected laps that came from it
  useEffect(() => {
    setSelectedLaps(prev => prev.filter(l => {
      if (l.sessionIdx === 0 && !slotA.session) return false
      if (l.sessionIdx === 1 && !slotB.session) return false
      return true
    }))
  }, [slotA.session, slotB.session])

  const lapKey = (l: LapRow) => `${l.sessionIdx}-${l.lapNumber}`

  // Up to 4 laps; click to deselect if already selected, else show color picker
  function handleLapClick(lap: LapRow, e: React.MouseEvent) {
    const key = lapKey(lap)
    const idx = selectedLaps.findIndex(l => lapKey(l) === key)
    if (idx >= 0) { setSelectedLaps(prev => prev.filter((_, i) => i !== idx)); return }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPendingLap({ lap, x: rect.left, y: Math.min(rect.bottom + 4, window.innerHeight - 180) })
  }

  function onColorPick(color: string) {
    if (!pendingLap) return
    const lap = pendingLap.lap
    const key = lapKey(lap)
    setLapColors(prev => ({ ...prev, [key]: color }))
    setSelectedLaps(prev => {
      if (prev.length < 4) return [...prev, lap]
      return [...prev.slice(1), lap]
    })
    setPendingLap(null)
  }

  // Synthetic GPS sessions from selected laps (for TrackMapCanvas)
  // useMemo keeps the array reference stable across hover re-renders so TrackMapCanvas
  // doesn't reset its viewport (zoom/pan) every time hoverDistM changes.
  const selectedMapSessions: ImportedGPSSession[] = useMemo(() => selectedLaps.map((lap) => ({
    id: `sel-${lap.sessionIdx}-${lap.lapNumber}`,
    filename: lap.driverLabel,
    brand: lap.brand,
    driverLabel: `${lap.driverLabel} — Lap ${lap.lapNumber}`,
    points: lap.points,
    lapGroups: [lap.points],
    lapCrossingTimesS: lap.points.length > 0 ? [lap.points[0].timeS] : undefined,
    totalDistanceM: lap.points[lap.points.length - 1]?.distanceM ?? 0,
    durationS: lap.points[lap.points.length - 1]?.timeS ?? 0,
  })), [selectedLaps])

  // Full-circuit reference GPS for the grey ribbon and racing-line clip.
  // Using middle laps only (index 1 to N-2) guarantees clean circuit coverage
  // without approach-road or departure-road GPS points.
  const mapReferencePoints = useMemo(() => {
    if (setSFMode || gpsSessionList.length === 0) return undefined
    const sess = gpsSessionList[0]
    if (!sess) return undefined
    if (sess.lapGroups && sess.lapGroups.length >= 3) {
      return sess.lapGroups.slice(1, -1).flat()
    }
    return sess.lapGroups?.flat() ?? sess.points
  }, [gpsSessionList, setSFMode])
  const LAP_COLOR_OPTIONS = ['#EF4444','#3B82F6','#22C55E','#F59E0B','#8B5CF6','#EC4899','#14B8A6','#F97316','#0EA5E9']
  const selectedColors = useMemo(
    () => selectedLaps.map((l, i) => lapColors[lapKey(l)] ?? LAP_COLOR_OPTIONS[i % LAP_COLOR_OPTIONS.length]),
    [selectedLaps, lapColors] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Sector data: display uses selected laps; theoretical best uses all laps
  const sectors    = buildSectorRows(selectedLaps)
  const allSectors = buildSectorRows(allLaps)
  const theoBestMs = allSectors.length
    ? Math.min(...allSectors.map(s => s.s1Ms))
    + Math.min(...allSectors.map(s => s.s2Ms))
    + Math.min(...allSectors.map(s => s.s3Ms))
    : null

  const TABS: { id: Tab; label: string; gpsOnly?: boolean }[] = [
    { id: 'laps',     label: 'Lap Times' },
    { id: 'analysis', label: 'Analysis',  gpsOnly: true },
    { id: 'sectors',  label: 'Sectors',   gpsOnly: true },
    { id: 'export',   label: 'Export' },
  ]

  function toggleChannel(id: string) {
    setEnabledChannels(prev => {
      const next = new Set(prev)
      if (next.has(id)) { if (next.size > 1) next.delete(id) } else next.add(id)
      return next
    })
  }

  function moveChannel(id: string, dir: -1 | 1) {
    setChannelOrder(prev => {
      const idx = prev.indexOf(id)
      const next = idx + dir
      if (idx < 0 || next < 0 || next >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      try { localStorage.setItem('kc_channel_order', JSON.stringify(arr)) } catch {}
      return arr
    })
  }

  function hasChannelData(channelId: string): boolean {
    if (channelId === 'delta') return selectedLaps.filter(l => l.points.length > 1).length >= 2
    const ch = ALL_CHANNELS.find(c => c.id === channelId)
    if (!ch) return false
    return selectedLaps.some(l => l.points.some(p => { const v = ch.get(p); return v != null && v > 0 }))
  }

  return (
    <PageWrapper title="Data Logger">

      {/* ── Two-driver import panels ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <DriverPanel slot={slotA} idx={0} onUpdate={setSlotA} userId={user?.id ?? null} karts={karts} />
        <DriverPanel slot={slotB} idx={1} onUpdate={setSlotB} userId={user?.id ?? null} karts={karts} />
      </div>

      {/* ── Continue button ── */}
      {(hasAnyCsv || hasAnyVideo) && (
        <div className="flex justify-center mb-6">
          <button
            onClick={() => document.getElementById('analysis-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-3 rounded-card bg-accent-primary text-bg-base font-heading font-bold text-sm uppercase tracking-wide hover:opacity-90 transition-opacity"
          >
            Continue →
          </button>
        </div>
      )}

      {/* ── Video comparison player ── */}
      {hasAnyVideo && (
        <div className="mb-6">
          <ComparisonPlayer slotA={slotA} slotB={slotB} />
        </div>
      )}

      {/* ── Feature intro when nothing loaded ── */}
      {!hasAnyCsv && !hasAnyVideo && (
        <div className="space-y-4">
          <div className="bg-bg-card border border-border-color rounded-card p-5">
            <p className="font-heading font-bold text-text-primary text-base mb-2">The first karting tool that compares across all major logger brands</p>
            <p className="text-sm text-text-muted leading-relaxed">
              Drop a CSV from any logger brand into Driver A and Driver B above — AiM, Unipro, Alfano, Starlane — and see both sessions
              compared side by side.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-bg-card border border-dashed border-border-color rounded-card p-4 flex items-center gap-4 opacity-50 select-none">
              <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center flex-shrink-0">
                <Video size={16} className="text-text-muted" />
              </div>
              <div>
                <p className="text-[10px] font-heading font-bold uppercase tracking-widest text-text-muted mb-0.5">Coming Soon</p>
                <p className="font-heading font-bold text-text-primary text-sm leading-snug">Video Analysis — GoPro &amp; DJI</p>
                <p className="text-xs text-text-muted mt-0.5">Side-by-side video with live telemetry overlay. Upload GoPro or DJI footage and both cameras play in sync with your data.</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-heading font-bold text-text-muted uppercase tracking-wider mb-3">Data analysis tools</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { icon: Layers,    title: 'Lap Time Comparison',  body: 'All laps ranked in one table. Best lap highlighted, delta to fastest shown, theoretical best from your quickest sectors.' },
                { icon: TrendingUp,title: 'Speed Trace Overlay',  body: 'Speed vs distance for every lap on one chart. See exactly where you gain or lose speed vs another driver.' },
                { icon: Navigation, title: 'GPS Track Map',        body: 'Racing lines drawn from GPS and colour-coded slow to fast. Overlay multiple drivers to see where lines diverge.' },
                { icon: BarChart2, title: 'Sector Analysis',      body: 'Track auto-split into three sectors. See which sector costs you time and which you already own.' },
                { icon: GitCompare,title: 'Theoretical Best Lap', body: 'Takes your fastest sectors from any lap — even across sessions — to show what a perfect lap looks like for you.' },
                { icon: Download,  title: 'Export Anywhere',      body: 'GPX for Google Maps, KML for Google Earth, or normalised CSV for Excel and Python analysis.' },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="bg-bg-card border border-border-color rounded-card p-4">
                  <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center mb-3">
                    <Icon size={16} className="text-accent-primary" />
                  </div>
                  <p className="font-heading font-bold text-text-primary text-sm mb-1.5">{title}</p>
                  <p className="text-xs text-text-muted leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-border-color rounded-card p-4 bg-bg-card">
            <p className="text-xs font-heading font-bold text-text-muted uppercase tracking-wider mb-3">Supported logger brands</p>
            <div className="flex flex-wrap gap-2">
              {[
                { brand: 'AiM MyChron 5 / 5S', note: 'GPS + G-force' },
                { brand: 'AiM MyChron 6', note: 'GPS + G-force' },
                { brand: 'Alfano Pro 6 / 7 / 8', note: 'GPS on Pro 6 GPS model' },
                { brand: 'Unipro 6003 / 6004', note: 'GPS + optional steering angle' },
                { brand: 'Starlane Stealth GPS', note: 'GPS' },
                { brand: 'Starlane Davinci', note: 'GPS + G-force' },
              ].map(({ brand, note }) => (
                <div key={brand} className="px-3 py-2 rounded-card border border-border-color bg-bg-elevated">
                  <p className="text-xs font-semibold text-text-primary">{brand}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Analysis tabs ── */}
      <div id="analysis-section" />
      {hasAnyCsv && (
        <>
          <div className="flex gap-1 border-b border-border-color mb-4">
            {TABS.map(t => {
              const off = !!(t.gpsOnly && !hasGPS)
              return (
                <button key={t.id} type="button" disabled={off}
                  onClick={() => setTab(t.id)}
                  className={[
                    'px-4 py-2 text-xs font-heading font-semibold border-b-2 -mb-px transition-colors',
                    tab === t.id ? 'border-accent-primary text-accent-primary'
                    : off ? 'border-transparent text-text-muted/30 cursor-not-allowed'
                    : 'border-transparent text-text-muted hover:text-text-primary',
                  ].join(' ')}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          {isDifferentTrack && (
            <div className="flex items-start gap-4 rounded-card border border-amber-400/60 bg-amber-400/10 p-5 my-4">
              <svg className="shrink-0 mt-0.5 text-amber-400" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div>
                <p className="font-heading font-semibold text-sm text-amber-400 mb-1">Sessions are from different tracks</p>
                <p className="text-sm text-text-muted">Both drivers' data must be from the same circuit for a valid comparison. Please remove one session and upload GPS data recorded at the same track.</p>
              </div>
            </div>
          )}

          {!isDifferentTrack && tab === 'laps' && (
            <div>
              <p className="text-[10px] text-text-muted mb-2 px-0.5">
                Timed laps only — out-lap and in-lap excluded. Click any lap to select it for comparison (up to 2). Click again to deselect.
              </p>
            <div className="overflow-x-auto rounded-card border border-border-color">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-color text-text-muted bg-bg-card">
                    {['Driver','Brand','Lap','Time','Delta','Max km/h','Avg km/h','Max RPM','H₂O °C','EGT °C'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 font-heading font-semibold uppercase text-[10px] tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...allLaps].sort((a, b) => a.lapTimeMs - b.lapTimeMs).map((lap, i) => {
                    const isBest   = lap.lapTimeMs === bestLapMs
                    const delta    = lap.lapTimeMs - bestLapMs
                    const dotColor = SESSION_COLORS[lap.sessionIdx % SESSION_COLORS.length]
                    const selIdx   = selectedLaps.findIndex(l => lapKey(l) === lapKey(lap))
                    const selColor = selIdx >= 0 ? (lapColors[lapKey(lap)] ?? LAP_COLOR_OPTIONS[selIdx % LAP_COLOR_OPTIONS.length]) : null
                    return (
                      <tr
                        key={i}
                        onClick={e => handleLapClick(lap, e)}
                        className="border-b border-border-color/40 cursor-pointer transition-colors hover:bg-bg-elevated/60"
                        style={{ backgroundColor: selColor ? `${selColor}18` : undefined }}
                      >
                        <td className="px-3 py-2" style={{ borderLeft: `3px solid ${selColor ?? 'transparent'}` }}>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                            <span className="font-semibold text-text-primary">{lap.driverLabel}</span>
                            {isBest && <span className="text-[9px] font-bold text-accent-primary ml-0.5">▲ BEST</span>}
                            <span className="ml-auto w-[18px] flex-shrink-0">
                              {selColor && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded leading-none" style={{ backgroundColor: selColor, color: '#fff' }}>
                                  {selIdx + 1}
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-text-muted">{BRAND_LABELS[lap.brand]}</td>
                        <td className="px-3 py-2 font-mono text-text-muted">{lap.lapNumber}</td>
                        <td className="px-3 py-2 font-mono font-bold text-text-primary">{fmt(lap.lapTimeMs)}</td>
                        <td className={`px-3 py-2 font-mono ${delta === 0 ? 'text-accent-primary' : 'text-text-muted'}`}>{delta === 0 ? '—' : fmtDelta(delta)}</td>
                        <td className="px-3 py-2 font-mono text-text-muted">{n1(lap.maxSpeedKmh)}</td>
                        <td className="px-3 py-2 font-mono text-text-muted">{n1(lap.avgSpeedKmh)}</td>
                        <td className="px-3 py-2 font-mono text-text-muted">{n0(lap.maxRpm)}</td>
                        <td className="px-3 py-2 font-mono text-text-muted">{n1(lap.waterTempC)}</td>
                        <td className="px-3 py-2 font-mono text-text-muted">{n1(lap.exhaustTempC)}</td>
                      </tr>
                    )
                  })}
                  {theoBestMs != null && (
                    <tr className="bg-purple-500/5 border-t border-purple-500/20">
                      <td className="px-3 py-2 font-semibold text-purple-400">Theoretical Best</td>
                      <td className="px-3 py-2 text-text-muted text-[10px]" colSpan={2}>Best sector combo</td>
                      <td className="px-3 py-2 font-mono font-bold text-purple-400">{fmt(theoBestMs)}</td>
                      <td className="px-3 py-2 font-mono text-purple-400">{fmtDelta(theoBestMs - bestLapMs)}</td>
                      <td colSpan={5} />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </div>
          )}

          {!isDifferentTrack && tab === 'analysis' && (
            <div className={speedFullscreen ? 'fixed inset-0 z-50 bg-bg-card flex flex-col overflow-hidden' : 'bg-bg-card border border-border-color rounded-card p-4 flex flex-col'} style={speedFullscreen ? undefined : { minHeight: 'calc(100vh - 180px)' }}>
              {/* Header row */}
              <div className={`flex items-center justify-between flex-wrap gap-2 ${speedFullscreen ? 'px-4 pt-4 pb-3 shrink-0' : 'mb-3'}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wide mr-1">Channels:</span>
                  {channelOrder.map((id, orderIdx) => {
                    const ch = ALL_CHANNELS.find(c => c.id === id)
                    if (!ch) return null
                    const active = enabledChannels.has(ch.id)
                    const hasDataForCh = selectedLaps.length === 0 || hasChannelData(ch.id)
                    const unsupported = selectedLaps.length > 0 && !hasDataForCh
                    return (
                      <div key={ch.id} className="flex items-center gap-0.5">
                        {/* Up / Down reorder arrows */}
                        <div className="flex flex-col gap-px">
                          <button
                            type="button"
                            onClick={() => moveChannel(id, -1)}
                            disabled={orderIdx === 0}
                            className="text-text-muted/40 hover:text-text-primary disabled:opacity-20 disabled:cursor-default transition-colors leading-none"
                            title="Move up"
                          >
                            <ChevronUp size={9} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveChannel(id, 1)}
                            disabled={orderIdx === channelOrder.length - 1}
                            className="text-text-muted/40 hover:text-text-primary disabled:opacity-20 disabled:cursor-default transition-colors leading-none"
                            title="Move down"
                          >
                            <ChevronDown size={9} />
                          </button>
                        </div>
                        {/* Position number */}
                        <span className="text-[9px] font-mono text-text-muted/40 w-3 text-center select-none">{orderIdx + 1}</span>
                        {/* Toggle button */}
                        <button type="button"
                          onClick={() => hasDataForCh && toggleChannel(ch.id)}
                          disabled={!hasDataForCh}
                          className={[
                            'px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
                            unsupported ? 'bg-transparent text-text-muted/30 border-border-color/30 cursor-not-allowed'
                              : active ? 'bg-accent-primary text-white border-accent-primary'
                              : 'bg-transparent text-text-muted border-border-color hover:text-text-primary cursor-pointer',
                          ].join(' ')}
                        >
                          {ch.label}
                          {unsupported && <span className="ml-1 text-[9px] opacity-60">N/A</span>}
                        </button>
                      </div>
                    )
                  })}
                  {selectedLaps.length > 0 && (
                    <div className="flex items-center gap-1 bg-bg-base rounded-full p-0.5 border border-border-color ml-2">
                      {(['overlay', 'separate'] as const).map(m => (
                        <button key={m} type="button"
                          onClick={() => { setTraceMode(m); if (m === 'separate') setSeparateLapKey(null) }}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors capitalize ${traceMode === m ? 'bg-accent-primary text-white' : 'text-text-muted hover:text-text-primary'}`}
                        >{m}</button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => setSpeedFullscreen(f => !f)}
                  className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
                  title={speedFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {speedFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
              </div>

              {selectedLaps.length === 0 && !hasGPS
                ? <p className="text-sm text-text-muted text-center py-10">Select a lap from the Lap Times tab to view it here</p>
                : (() => {
                    const panelH = speedFullscreen ? undefined : Math.max(420, 160 + enabledChannels.size * 130)
                    return (
                      <div ref={splitContainerRef} style={{ display: 'flex', userSelect: 'none', ...(speedFullscreen ? { flex: '1 1 0', minHeight: 0, padding: '0 16px 16px' } : { flex: '1 1 0', minHeight: panelH }) }}>
                        {/* Trace panel */}
                        <div style={{ width: `${splitPercent}%`, height: '100%', overflow: 'hidden', flexShrink: 0 }}>
                          {selectedLaps.length === 0
                            ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted, #6B7280)', fontSize: 13 }}>Select a lap from the Lap Times tab to view the trace</div>
                            : traceMode === 'overlay'
                            ? <SpeedTraceCanvas laps={selectedLaps} colors={selectedColors} height={panelH ?? 500}
                                fillHeight={true}
                                enabledChannelIds={[...enabledChannels]}
                                channelOrder={channelOrder}
                                onHoverDist={setHoverDistM} />
                            : (() => {
                                // Auto-select when only one lap is chosen
                                const autoKey = selectedLaps.length === 1 ? lapKey(selectedLaps[0]) : null
                                const activeKey = separateLapKey ?? autoKey
                                const separateLap = selectedLaps.find(l => lapKey(l) === activeKey) ?? null
                                const lapIdx = separateLap ? selectedLaps.indexOf(separateLap) : -1
                                const sepColor = lapIdx >= 0 ? selectedColors[lapIdx] : '#6B7280'

                                if (!separateLap) {
                                  // Lap picker
                                  return (
                                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 32, gap: 16 }}>
                                      <p style={{ fontSize: 13, color: 'var(--color-text-muted, #6B7280)', fontWeight: 500 }}>Which lap would you like to view in detail?</p>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                                        {selectedLaps.map((lap, i) => {
                                          const c = selectedColors[i]
                                          return (
                                            <button key={lapKey(lap)} type="button"
                                              onClick={() => setSeparateLapKey(lapKey(lap))}
                                              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, border: `2px solid ${c}`, background: 'transparent', cursor: 'pointer' }}
                                            >
                                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, flexShrink: 0 }} />
                                              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary, #111)' }}>{lap.driverLabel}</span>
                                              <span style={{ fontSize: 11, color: 'var(--color-text-muted, #6B7280)' }}>Lap {lap.lapNumber}</span>
                                            </button>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )
                                }

                                // Single-lap detail view — use SpeedTraceCanvas for identical rendering to Overlay
                                return (
                                  <div style={{ position: 'relative', height: '100%' }}>
                                    <button type="button"
                                      onClick={() => setSeparateLapKey(null)}
                                      style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                                    >
                                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: sepColor, flexShrink: 0 }} />
                                      {separateLap.driverLabel} · Lap {separateLap.lapNumber}
                                      <span style={{ opacity: 0.65, marginLeft: 4 }}>· change</span>
                                    </button>
                                    <SpeedTraceCanvas laps={[separateLap]} colors={[sepColor]} height={panelH ?? 500}
                                      fillHeight={true}
                                      enabledChannelIds={[...enabledChannels]}
                                      channelOrder={channelOrder}
                                      onHoverDist={setHoverDistM} />
                                  </div>
                                )
                              })()
                          }
                        </div>
                        {/* Draggable divider */}
                        <div
                          onMouseDown={handleDividerMouseDown}
                          style={{ width: 8, flexShrink: 0, cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}
                        >
                          <div style={{ width: 2, height: '60%', borderRadius: 2, background: 'var(--color-border, #374151)', opacity: 0.35 }} />
                        </div>
                        {/* Map panel */}
                        <div style={{ flex: 1, height: '100%', overflow: 'hidden', minWidth: 0, position: 'relative' }}>
                          <TrackMapCanvas
                            sessions={setSFMode && gpsSessionList.length > 0 ? gpsSessionList : selectedMapSessions}
                            colors={setSFMode && gpsSessionList.length > 0 ? gpsSlots.map(s => s.color) : selectedColors}
                            hoverDistM={hoverDistM}
                            setSFMode={setSFMode}
                            onSetSF={handleSFCanvasClick}
                            pendingSF={pendingSF}
                            referencePoints={mapReferencePoints}
                          />
                          {/* Auto-detect notice — top of map, only shown until user manually places the S/F line */}
                          {hasGPS && !hasSFOverride && !setSFMode && (
                            <div style={{ position: 'absolute', top: 8, left: 8, right: 90, background: 'rgba(255,255,255,0.93)', borderRadius: 6, border: '1px solid #E5E7EB', padding: '5px 10px', fontSize: 11, color: '#6B7280', zIndex: 10, pointerEvents: 'none' }}>
                              Start/finish line auto-detected — if it looks wrong, use "Set S/F" to reposition it
                            </div>
                          )}
                          {/* S/F controls overlaid on map */}
                          <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6, zIndex: 10 }}>
                            {!setSFMode && hasSFOverride && (
                              <button type="button" onClick={resetSF}
                                style={{ padding: '3px 8px', fontSize: 10, fontWeight: 700, borderRadius: 5, border: '1px solid #F59E0B', color: '#92400E', background: 'rgba(255,255,255,0.92)', cursor: 'pointer' }}
                              >Reset S/F</button>
                            )}
                            {setSFMode && pendingSF && (
                              <button type="button" onClick={confirmSetSF}
                                style={{ padding: '3px 8px', fontSize: 10, fontWeight: 700, borderRadius: 5, border: '1px solid #16A34A', background: '#16A34A', color: '#fff', cursor: 'pointer' }}
                              >Save</button>
                            )}
                            <button type="button" onClick={setSFMode ? cancelSFMode : () => setSFModeActive(true)}
                              style={{ padding: '3px 8px', fontSize: 10, fontWeight: 700, borderRadius: 5, border: '1px solid', borderColor: setSFMode ? '#F59E0B' : '#D1D5DB', background: setSFMode ? '#F59E0B' : 'rgba(255,255,255,0.92)', color: setSFMode ? '#fff' : '#374151', cursor: 'pointer' }}
                            >{setSFMode ? 'Cancel' : 'Set S/F'}</button>
                          </div>
                        </div>
                      </div>
                    )
                  })()
              }
            </div>
          )}


          {!isDifferentTrack && tab === 'sectors' && (() => {
            if (!sectors.length) return (
              <p className="text-sm text-text-muted text-center py-10">No GPS lap data available for sector analysis</p>
            )
            const minS1 = Math.min(...sectors.map(s => s.s1Ms))
            const minS2 = Math.min(...sectors.map(s => s.s2Ms))
            const minS3 = Math.min(...sectors.map(s => s.s3Ms))
            const minTotal = Math.min(...sectors.map(s => s.lapTimeMs))
            return (
              <div>
                <p className="text-xs text-text-muted mb-3">Track auto-split into 3 equal sectors by distance.</p>
                <div className="overflow-x-auto rounded-card border border-border-color">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border-color text-text-muted bg-bg-card">
                        {['Lap','Total','Sector 1','Sector 2','Sector 3'].map(h => (
                          <th key={h} className="text-left px-3 py-2.5 font-heading font-semibold uppercase text-[10px] tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sectors.map((row, i) => (
                        <tr key={i} className="border-b border-border-color/40 hover:bg-bg-elevated">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                              <span className="font-semibold text-text-primary">{row.lapLabel}</span>
                            </div>
                          </td>
                          <td className={`px-3 py-2 font-mono font-bold ${row.lapTimeMs === minTotal ? 'text-accent-primary' : 'text-text-primary'}`}>{fmt(row.lapTimeMs)}</td>
                          <td className={`px-3 py-2 font-mono ${row.s1Ms === minS1 ? 'text-green-400 font-bold' : 'text-text-muted'}`}>{fmt(row.s1Ms)}</td>
                          <td className={`px-3 py-2 font-mono ${row.s2Ms === minS2 ? 'text-green-400 font-bold' : 'text-text-muted'}`}>{fmt(row.s2Ms)}</td>
                          <td className={`px-3 py-2 font-mono ${row.s3Ms === minS3 ? 'text-green-400 font-bold' : 'text-text-muted'}`}>{fmt(row.s3Ms)}</td>
                        </tr>
                      ))}
                      {theoBestMs != null && (
                        <tr className="bg-purple-500/5 border-t border-purple-500/20">
                          <td className="px-3 py-2 font-semibold text-purple-400">Theoretical Best</td>
                          <td className="px-3 py-2 font-mono font-bold text-purple-400">{fmt(theoBestMs)}</td>
                          <td className="px-3 py-2 font-mono text-green-400 font-bold">{fmt(minS1)}</td>
                          <td className="px-3 py-2 font-mono text-green-400 font-bold">{fmt(minS2)}</td>
                          <td className="px-3 py-2 font-mono text-green-400 font-bold">{fmt(minS3)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}

          {!isDifferentTrack && tab === 'export' && (
            <div className="bg-bg-card border border-border-color rounded-card p-6">
              {!hasGPS ? (
                <p className="text-sm text-text-muted text-center py-6">Import GPS data files to generate a session report</p>
              ) : (
                <div className="flex flex-col items-center gap-5 py-4 w-full max-w-sm">
                  <div className="text-center">
                    <p className="font-heading font-bold text-text-primary text-base mb-1">Session Report</p>
                    <p className="text-xs text-text-muted">
                      Generates a report for your <strong>selected laps</strong>. Select laps in the Lap Times tab first.
                    </p>
                    {selectedLaps.length === 0 && (
                      <p className="text-xs text-amber-500 mt-2">No laps selected — go to Lap Times and select up to 4 laps.</p>
                    )}
                  </div>
                  <div className="w-full">
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">Track Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Viterbo, PF International…"
                      value={trackName}
                      onChange={e => setTrackName(e.target.value)}
                      className="w-full px-3 py-2 rounded-card border border-border-color bg-bg-base text-text-primary text-sm placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent-primary"
                    />
                  </div>
                  {selectedLaps.length > 0 && (() => {
                    const openReport = async (print: boolean) => {
                      const slotNames = [slotLabel(slotA), slotLabel(slotB)]
                      const labeledLaps = selectedLaps.map(l => ({
                        ...l,
                        driverLabel: slotNames[l.sessionIdx] || l.driverLabel,
                      }))
                      const labeledSectors = buildSectorRows(labeledLaps)
                      const sessionLabel = [...new Set(labeledLaps.map(l => l.driverLabel))].join(' vs ')
                      const html = await buildSessionReport(labeledLaps, selectedColors, labeledSectors, theoBestMs, sessionLabel, trackName)
                      const w = window.open('', '_blank', 'width=860,height=1200')
                      if (!w) { alert('Please allow pop-ups for this site to generate the report.'); return }
                      w.document.write(html)
                      w.document.close()
                      w.focus()
                      if (print) setTimeout(() => w.print(), 800)
                    }
                    return (
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => openReport(false)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-card border border-border-color bg-bg-base text-text-primary text-sm font-semibold hover:bg-bg-elevated transition-colors"
                        >
                          <FileText size={14} /> Preview
                        </button>
                        <button type="button" onClick={() => openReport(true)}
                          className="inline-flex items-center gap-2 px-5 py-2 rounded-card bg-accent-primary text-white text-sm font-bold hover:bg-accent-primary/90 transition-colors shadow-sm"
                        >
                          <Download size={14} /> Save PDF
                        </button>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )}
        </>
      )}
      {pendingLap && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setPendingLap(null)} />
          <div style={{
            position: 'fixed', top: pendingLap.y, left: pendingLap.x, zIndex: 100,
            background: 'var(--color-bg-card)', border: '1px solid var(--color-border-color)',
            borderRadius: 999, padding: '8px 12px', boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            {LAP_COLOR_OPTIONS.map(color => (
              <button
                key={color}
                type="button"
                onClick={e => { e.stopPropagation(); onColorPick(color) }}
                style={{
                  width: 22, height: 22, borderRadius: '50%', background: color,
                  border: '2px solid transparent', cursor: 'pointer', flexShrink: 0,
                  transition: 'transform 0.12s, box-shadow 0.12s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.25)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 3px 10px ${color}99` }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.18)' }}
              />
            ))}
          </div>
        </>
      )}
    </PageWrapper>
  )
}
