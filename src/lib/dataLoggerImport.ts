export type DataLoggerBrand = 'aim' | 'unipro' | 'starlane' | 'alfano' | 'unknown'

// ─── GPS time-series types ────────────────────────────────────────────────────

export interface GpsPoint {
  timeS: number
  lat: number
  lon: number
  speedKmh: number | null
  rpm: number | null
  throttlePct: number | null
  waterTempC: number | null
  exhaustTempC: number | null
  brakePressure: number | null  // bar — Unipro with brake sensor only
  steeringAngle: number | null  // degrees — Unipro with potentiometer only
  lateralG: number | null       // GPS-computed lateral (cornering) G-force
  longitudinalG: number | null  // GPS-computed longitudinal (braking/accel) G-force
  lapNumber: number | null
  distanceM: number          // cumulative metres from first point
}

export interface ImportedGPSSession {
  id: string
  filename: string
  brand: DataLoggerBrand
  driverLabel: string
  points: GpsPoint[]
  lapGroups: GpsPoint[][]   // one sub-array per lap; empty when no Lap column
  lapCrossingTimesS?: number[] // interpolated S/F crossing times; length = lapGroups.length + 1
  totalDistanceM: number
  durationS: number
  startUtcMs?: number       // Unix epoch ms of session start, when parseable from CSV header
  ocdSwapped?: boolean      // true = lon channel came before lat in the OCD binary (device-specific)
}

// Discriminated union returned by parseCSVAny
export type ParseResult =
  | { type: 'lap'; session: ImportedDataSession }
  | { type: 'gps'; session: ImportedGPSSession }
  | { type: 'error'; error: string }

export interface NormalizedLap {
  lapNumber: number
  lapTimeMs: number
  maxSpeedKmh: number | null
  avgSpeedKmh: number | null
  maxRpm: number | null
  avgRpm: number | null
  waterTempC: number | null
  exhaustTempC: number | null
}

export interface ImportedDataSession {
  id: string
  filename: string
  brand: DataLoggerBrand
  driverLabel: string
  laps: NormalizedLap[]
}

export const BRAND_COLORS: Record<DataLoggerBrand, string> = {
  aim:      '#EF4444',
  unipro:   '#3B82F6',
  starlane: '#F97316',
  alfano:   '#22C55E',
  unknown:  '#6B7280',
}

export const BRAND_LABELS: Record<DataLoggerBrand, string> = {
  aim:      'AIM',
  unipro:   'Unipro',
  starlane: 'Starlane',
  alfano:   'Alfano',
  unknown:  'Unknown',
}

// Lap time string → milliseconds
// Handles: "1:02.345", "62.345", "62345", "1:02,345"
function parseLapTimeMs(raw: string): number | null {
  if (!raw || !raw.trim()) return null
  const s = raw.trim().replace(/,(?=\d{1,3}$)/, '.')

  // mm:ss.fff
  const m = s.match(/^(\d{1,2}):(\d{2})\.(\d+)$/)
  if (m) {
    const frac = m[3].padEnd(3, '0').slice(0, 3)
    return (parseInt(m[1]) * 60 + parseInt(m[2])) * 1000 + parseInt(frac)
  }

  // ss.fff
  const f = s.match(/^(\d+)\.(\d+)$/)
  if (f) {
    const frac = f[2].padEnd(3, '0').slice(0, 3)
    return parseInt(f[1]) * 1000 + parseInt(frac)
  }

  // plain integer — treat as ms if > 60 000, else seconds
  const n = parseInt(s)
  if (!isNaN(n) && n > 0) return n > 60000 ? n : n * 1000

  return null
}

function parseNum(s: string): number | null {
  if (!s || !s.trim()) return null
  const n = parseFloat(s.replace(',', '.'))
  return isNaN(n) ? null : n
}

function detectSep(text: string): ',' | ';' | '\t' {
  const line = text.split('\n').find(l => l.trim()) ?? ''
  const counts = { ',': (line.match(/,/g) ?? []).length, ';': (line.match(/;/g) ?? []).length, '\t': (line.match(/\t/g) ?? []).length }
  if (counts['\t'] > counts[','] && counts['\t'] > counts[';']) return '\t'
  return counts[';'] > counts[','] ? ';' : ','
}

function splitLine(line: string, sep: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ }
    else if (ch === sep && !inQ) { out.push(cur.trim()); cur = '' }
    else cur += ch
  }
  out.push(cur.trim())
  return out
}

// First row with ≥ 2 alphabetic cells = header
function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].filter(c => /[a-zA-Z]/.test(c)).length >= 2) return i
  }
  return 0
}

// Find column by one of several keyword fragments (case-insensitive)
function col(headers: string[], ...kws: string[]): number {
  const norm = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim())
  for (const kw of kws) {
    const idx = norm.findIndex(h => h.includes(kw.toLowerCase()))
    if (idx >= 0) return idx
  }
  return -1
}

function detectBrand(headers: string[], preamble: string): DataLoggerBrand {
  const all = (headers.join(' ') + ' ' + preamble.slice(0, 800)).toLowerCase()
  if (all.includes('mychron') || all.includes('race studio') || all.includes('aim sport')) return 'aim'
  if (all.includes('unipro') || all.includes('laptimer6') || all.includes('laptimer8')) return 'unipro'
  if (all.includes('starlane') || all.includes('davinci') || all.includes('stealth gps')) return 'starlane'
  if (all.includes('alfano')) return 'alfano'

  // Heuristic by column signature
  const h = headers.map(s => s.toLowerCase())
  if (h.some(c => /^lap\s?#$/.test(c.trim()))) return 'aim'
  if (h.some(c => c.trim() === 'laptime')) return 'unipro'
  if (h.some(c => c.includes('top speed') || c.includes('lap number'))) return 'starlane'
  return 'unknown'
}

// ─── Haversine distance (metres) ─────────────────────────────────────────────

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── GPS-derived G-force computation ─────────────────────────────────────────
// Computes lateral (cornering) and longitudinal (braking/acceleration) G-forces
// from GPS positions and speed alone — no accelerometer channel required.

function bearingRad(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = Math.PI / 180
  const φ1 = lat1 * toRad, φ2 = lat2 * toRad
  const Δλ = (lon2 - lon1) * toRad
  return Math.atan2(Math.sin(Δλ) * Math.cos(φ2), Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ))
}

function angleDiffRad(a: number, b: number): number {
  let d = b - a
  while (d >  Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return d
}

export function computeGForces(points: GpsPoint[]): void {
  const G = 9.81
  const WIN = 3  // ±3 samples central difference (~0.3 s at 10 Hz)

  // Longitudinal G: derivative of speed along direction of travel
  for (let i = 0; i < points.length; i++) {
    const lo = Math.max(0, i - WIN)
    const hi = Math.min(points.length - 1, i + WIN)
    const dt = points[hi].timeS - points[lo].timeS
    if (dt < 0.05) continue
    const dv = ((points[hi].speedKmh ?? 0) - (points[lo].speedKmh ?? 0)) / 3.6  // m/s
    points[i].longitudinalG = dv / dt / G
  }

  // Lateral G: v × Δheading/Δt (centripetal acceleration)
  for (let i = 1; i < points.length - 1; i++) {
    const lo = Math.max(0, i - WIN)
    const hi = Math.min(points.length - 1, i + WIN)
    const dt = points[hi].timeS - points[lo].timeS
    if (dt < 0.05) continue
    const speedMs = (points[i].speedKmh ?? 0) / 3.6
    if (speedMs < 2) { points[i].lateralG = 0; continue }
    const h1 = bearingRad(points[lo].lat, points[lo].lon, points[Math.min(lo + 1, points.length - 1)].lat, points[Math.min(lo + 1, points.length - 1)].lon)
    const h2 = bearingRad(points[Math.max(hi - 1, 0)].lat, points[Math.max(hi - 1, 0)].lon, points[hi].lat, points[hi].lon)
    const dHdt = angleDiffRad(h1, h2) / dt  // rad/s
    points[i].lateralG = speedMs * dHdt / G
  }

  // Smooth both channels with a ±2-sample moving average to reduce GPS noise
  const smooth = (get: (p: GpsPoint) => number | null, set: (p: GpsPoint, v: number | null) => void) => {
    const raw = points.map(get)
    for (let i = 0; i < points.length; i++) {
      const lo = Math.max(0, i - 2), hi = Math.min(points.length - 1, i + 2)
      const slice = raw.slice(lo, hi + 1).filter((v): v is number => v != null)
      set(points[i], slice.length ? Math.round(slice.reduce((a, b) => a + b) / slice.length * 100) / 100 : null)
    }
  }
  smooth(p => p.lateralG, (p, v) => { p.lateralG = v })
  smooth(p => p.longitudinalG, (p, v) => { p.longitudinalG = v })
}

// ─── Session UTC extractor ────────────────────────────────────────────────────

function extractStartUtc(preamble: string): number | undefined {
  // ISO datetime anywhere in preamble: "2024-01-15T10:23:45" or "2024-01-15 10:23:45"
  const isoMatch = preamble.match(/(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2}(?:\.\d+)?)/)
  if (isoMatch) {
    const ts = Date.parse(`${isoMatch[1]}T${isoMatch[2]}Z`)
    if (!isNaN(ts)) return ts
  }

  // "Date: DD/MM/YYYY" + "Time: HH:MM:SS[.mmm]" (AiM Race Studio style)
  const dateMatch = preamble.match(/[Dd]ate[:\s,]+(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/)
  const timeMatch = preamble.match(/[Tt]ime[:\s,]+(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/)
  if (dateMatch && timeMatch) {
    const day   = dateMatch[1].padStart(2, '0')
    const month = dateMatch[2].padStart(2, '0')
    const year  = dateMatch[3]
    const hh = timeMatch[1], mm = timeMatch[2], ss = timeMatch[3]
    const msStr = timeMatch[4] ? timeMatch[4].slice(0, 3).padEnd(3, '0') : '000'
    const ts = Date.parse(`${year}-${month}-${day}T${hh}:${mm}:${ss}.${msStr}Z`)
    if (!isNaN(ts)) return ts
  }

  return undefined
}

// ─── GPS time-series parser ───────────────────────────────────────────────────

function parseGPSCSV(filename: string, text: string): ParseResult {
  try {
    const sep = detectSep(text)
    const rawLines = text.split(/\r?\n/).filter(l => l.trim())
    const rows = rawLines.map(l => splitLine(l, sep))
    const hi = findHeaderRow(rows)
    const headers = rows[hi]
    const preamble = rawLines.slice(0, hi).join('\n')
    const brand = detectBrand(headers, preamble)
    const startUtcMs = extractStartUtc(preamble)

    const cTime  = col(headers, 'time', 'sample time', 'elapsed', 't ')
    const cLat   = col(headers, 'latitude', 'gps lat', ' lat')
    const cLon   = col(headers, 'longitude', 'gps lon', 'gps long', ' lon')
    const cSpd   = col(headers, 'gps speed', 'speed km', 'speed (km', 'speed')
    const cRpm   = col(headers, 'rpm', 'engine rpm', 'rev')
    const cThr   = col(headers, 'throttle', 'tps', 'accel', 'gas')
    const cBrake = col(headers, 'brake', 'brake press', 'brake pressure', 'braking')
    const cSteer = col(headers, 'steering', 'steer', 'steering angle', 'steer angle')
    const cLap   = col(headers, 'lap #', 'lap no', 'lap number', 'lap')

    if (cLat < 0 || cLon < 0) {
      return { type: 'error', error: `${filename}: No GPS latitude/longitude columns found` }
    }

    const points: GpsPoint[] = []
    let cumDist = 0
    let prevLat: number | null = null
    let prevLon: number | null = null

    for (const row of rows.slice(hi + 1)) {
      const lat = parseNum(row[cLat] ?? '')
      const lon = parseNum(row[cLon] ?? '')
      if (lat == null || lon == null) continue
      if (Math.abs(lat) < 0.001 && Math.abs(lon) < 0.001) continue // skip 0,0 points

      if (prevLat != null && prevLon != null) {
        cumDist += haversineM(prevLat, prevLon, lat, lon)
      }
      prevLat = lat; prevLon = lon

      const rawLap = cLap >= 0 ? parseInt(row[cLap] ?? '') : NaN
      points.push({
        timeS:        cTime >= 0 ? (parseNum(row[cTime] ?? '') ?? points.length * 0.04) : points.length * 0.04,
        lat,
        lon,
        speedKmh:     cSpd >= 0   ? parseNum(row[cSpd]   ?? '') : null,
        rpm:          cRpm >= 0   ? parseNum(row[cRpm]   ?? '') : null,
        throttlePct:  cThr >= 0   ? parseNum(row[cThr]   ?? '') : null,
        waterTempC:   null,
        exhaustTempC: null,
        brakePressure:  cBrake >= 0 ? parseNum(row[cBrake] ?? '') : null,
        steeringAngle:  cSteer >= 0 ? parseNum(row[cSteer] ?? '') : null,
        lateralG:       null,
        longitudinalG:  null,
        lapNumber:    isNaN(rawLap) ? null : rawLap,
        distanceM:    cumDist,
      })
    }

    if (points.length < 10) {
      return { type: 'error', error: `${filename}: Not enough GPS points found (${points.length})` }
    }

    computeGForces(points)

    // Group by lap number if column exists
    const lapGroups: GpsPoint[][] = []
    if (points[0].lapNumber != null) {
      const lapMap = new Map<number, GpsPoint[]>()
      for (const p of points) {
        const k = p.lapNumber ?? 0
        if (!lapMap.has(k)) lapMap.set(k, [])
        lapMap.get(k)!.push(p)
      }
      const lapNums = [...lapMap.keys()].sort((a, b) => a - b)
      for (const n of lapNums) lapGroups.push(lapMap.get(n)!)
    }

    // GPS-based lap detection when no Lap column exists
    let csvCrossings: number[] | undefined
    if (lapGroups.length === 0 && points.length > 50) {
      const detected = detectLapsFromGps(points)
      detected.lapGroups.forEach(g => lapGroups.push(g))
      csvCrossings = detected.crossings
    }

    return {
      type: 'gps',
      session: {
        id: crypto.randomUUID(),
        filename,
        brand,
        driverLabel: filename.replace(/\.[^.]+$/, ''),
        points,
        lapGroups,
        lapCrossingTimesS: csvCrossings,
        totalDistanceM: cumDist,
        durationS: points[points.length - 1].timeS,
        startUtcMs,
      },
    }
  } catch (e) {
    return { type: 'error', error: `${filename}: ${e instanceof Error ? e.message : 'Parse error'}` }
  }
}

// ─── Auto-dispatch: detect GPS vs lap-summary ─────────────────────────────────

export function parseCSVAny(filename: string, text: string): ParseResult {
  const sep = detectSep(text)
  const rows = text.split(/\r?\n/).filter(l => l.trim()).map(l => splitLine(l, sep))
  const hi = findHeaderRow(rows)
  const headers = rows[hi]

  const hasLat = col(headers, 'latitude', 'gps lat', ' lat') >= 0
  const hasLon = col(headers, 'longitude', 'gps lon', ' lon') >= 0

  if (hasLat && hasLon) return parseGPSCSV(filename, text)

  const result = parseDataLoggerCSVInternal(filename, text)
  if (result.session) return { type: 'lap', session: result.session }
  return { type: 'error', error: result.error ?? `${filename}: Unrecognised format` }
}

export function parseDataLoggerCSV(filename: string, text: string) {
  return parseDataLoggerCSVInternal(filename, text)
}

// ─── Unipro OCD binary parser ─────────────────────────────────────────────────
// Format confirmed by binary analysis of Viterbo OCD.ocd (multi-lap, 5.1 MB):
// - File header: UTF-16 BE channel names (00 XX pairs)
// - Channel data blocks: stride 16 bytes per record
// - Record layout: [8 bytes uint64 BE timestamp in nanoseconds][8 bytes float64 BE value]
// - Channels stored in header-definition order; blocks may have a 2-byte separator between them.
// GPS channels found by scanning for longest valid lat/lon run; blocks are contiguous.

// Read uint64 BE as a JS number. Precision loss for t > ~9007s — fine for kart sessions.
function readU64(view: DataView, off: number): number {
  return view.getUint32(off, false) * 4294967296 + view.getUint32(off + 4, false)
}

// Find an OCD data block whose stride-16 records have:
//   - timestamps matching GPS lat block timestamps within TS_TOL nanoseconds
//   - float64 values in [minVal, maxVal]
// Scans at stride 2 within [searchStart, searchEnd] so block boundaries ≠ 8-byte aligned.
function findOcdBlockByGpsTs(
  view: DataView, byteLen: number,
  gpsLatOff: number, gpsCount: number,
  minVal: number, maxVal: number,
  searchStart: number, searchEnd: number,
): { off: number; count: number } | null {
  const STRIDE = 16
  const TS_TOL = 200_000_000 // 200 ms in ns (GPS receiver timestamps can drift slightly)
  const gpsTs0 = readU64(view, gpsLatOff)
  const gpsTs1 = readU64(view, gpsLatOff + STRIDE)
  const gpsTs2 = readU64(view, gpsLatOff + 2 * STRIDE)

  for (let f64 = Math.max(8, searchStart + 8); f64 + 8 <= Math.min(byteLen, searchEnd); f64 += 2) {
    const val0 = view.getFloat64(f64, false)
    if (!isFinite(val0) || val0 < minVal || val0 > maxVal) continue

    const recOff = f64 - 8
    const ts0 = readU64(view, recOff)
    if (Math.abs(ts0 - gpsTs0) > TS_TOL) continue

    const ts1 = readU64(view, recOff + STRIDE)
    if (Math.abs(ts1 - gpsTs1) > TS_TOL) continue

    const val1 = view.getFloat64(f64 + STRIDE, false)
    if (!isFinite(val1) || val1 < minVal || val1 > maxVal) continue

    const ts2 = readU64(view, recOff + 2 * STRIDE)
    if (Math.abs(ts2 - gpsTs2) > TS_TOL) continue

    // Count consecutive valid records
    let count = 0
    for (let j = recOff; j + STRIDE <= byteLen; j += STRIDE) {
      const v = view.getFloat64(j + 8, false)
      if (!isFinite(v) || v < minVal || v > maxVal) break
      count++
    }

    if (count >= Math.floor(gpsCount * 0.9)) return { off: recOff, count }
  }
  return null
}

// Find an OCD data block with timestamps within the GPS session time window and
// values in [minVal, maxVal]. Used for channels at different sampling rates (RPM, temp).
function findOcdBlockBySession(
  view: DataView, byteLen: number,
  ts0Ns: number, tsEndNs: number,
  minVal: number, maxVal: number,
  minCount: number,
  excludeRanges: [number, number][],
): { off: number; count: number } | null {
  const STRIDE = 16
  const MARGIN = 5_000_000_000 // 5s margin

  let f64 = 8
  while (f64 + 8 <= byteLen) {
    const recOff = f64 - 8

    // Skip excluded regions
    let skipped = false
    for (const [a, b] of excludeRanges) {
      if (recOff >= a && recOff < b) { f64 = b + 8; skipped = true; break }
    }
    if (skipped) continue

    const val0 = view.getFloat64(f64, false)
    if (!isFinite(val0) || val0 < minVal || val0 > maxVal) { f64 += 2; continue }

    const ts0 = readU64(view, recOff)
    if (ts0 < ts0Ns - MARGIN || ts0 > tsEndNs + MARGIN) { f64 += 2; continue }

    // Quick second-record check
    if (recOff + 2 * STRIDE > byteLen) { f64 += 2; continue }
    const ts1 = readU64(view, recOff + STRIDE)
    if (ts1 <= ts0 || ts1 > tsEndNs + MARGIN) { f64 += 2; continue }
    const val1 = view.getFloat64(f64 + STRIDE, false)
    if (!isFinite(val1) || val1 < minVal || val1 > maxVal) { f64 += 2; continue }

    // Count consecutive
    let count = 0
    for (let j = recOff; j + STRIDE <= byteLen; j += STRIDE) {
      const ts = readU64(view, j)
      if (ts < ts0Ns - MARGIN || ts > tsEndNs + MARGIN) break
      const v = view.getFloat64(j + 8, false)
      if (!isFinite(v) || v < minVal || v > maxVal) break
      count++
    }

    if (count >= minCount) return { off: recOff, count }
    f64 += 2
  }
  return null
}

// Linearly interpolate a channel value at the given session time.
// channelData must be sorted by timeS ascending.
function interpOcdChannel(channelData: Array<{ timeS: number; value: number }>, timeS: number): number | null {
  if (channelData.length === 0) return null
  if (timeS <= channelData[0].timeS) return channelData[0].value
  if (timeS >= channelData[channelData.length - 1].timeS) return channelData[channelData.length - 1].value

  // Binary search
  let lo = 0, hi = channelData.length - 1
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1
    if (channelData[mid].timeS <= timeS) lo = mid; else hi = mid
  }
  const a = channelData[lo], b = channelData[hi]
  const frac = (timeS - a.timeS) / (b.timeS - a.timeS)
  return a.value + frac * (b.value - a.value)
}

// Read all {timeS, value} pairs from an OCD data block.
function readOcdChannelData(view: DataView, off: number, count: number): Array<{ timeS: number; value: number }> {
  const STRIDE = 16
  const out: Array<{ timeS: number; value: number }> = []
  for (let i = 0; i < count; i++) {
    const rec = off + i * STRIDE
    if (rec + STRIDE > view.byteLength) break
    const tsNs = readU64(view, rec)
    const value = view.getFloat64(rec + 8, false)
    if (isFinite(value)) out.push({ timeS: tsNs / 1e9, value })
  }
  return out
}

// Scan the OCD header (first 64 KB) for virtual GPS marks stored by LapCentre.
// The header contains a track config section with float64 BE lat/lon pairs —
// the first pair is always the S/F line marker configured by the user in LapCentre.
// refLat / refLon are the approximate center of the GPS track.
// trackPoints (optional): if provided, the found mark must be within 200 m of an
// actual GPS point — this rejects stale marks from a different circuit saved in the header.
function findOCDSFMark(
  view: DataView,
  byteLen: number,
  refLat: number,
  refLon: number,
  trackPoints?: GpsPoint[],
): { lat: number; lon: number } | null {
  const scanLimit = Math.min(byteLen - 16, 65536)
  for (let off = 8; off <= scanLimit; off += 2) {
    const lat = view.getFloat64(off, false)
    if (!isFinite(lat) || lat < -89 || lat > 89) continue
    if (Math.abs(lat - refLat) > 0.5) continue
    const lon = view.getFloat64(off + 8, false)
    if (!isFinite(lon) || lon < -180 || lon > 180) continue
    if (Math.abs(lon - refLon) > 0.5) continue

    // Reject marks from a different circuit that happen to fall within the 0.5° coarse window
    if (trackPoints && trackPoints.length > 0) {
      const step = Math.max(1, Math.floor(trackPoints.length / 300))
      let onTrack = false
      for (let i = 0; i < trackPoints.length && !onTrack; i += step) {
        if (haversineM(lat, lon, trackPoints[i].lat, trackPoints[i].lon) < 200) onTrack = true
      }
      if (!onTrack) continue
    }

    return { lat, lon }
  }
  return null
}

function findOcdGpsBlock(view: DataView, byteLen: number): { latOff: number; lonOff: number; count: number } | null {
  const STRIDE = 16
  const MIN_COUNT = 500

  // Return the FIRST GPS block found (not the largest) — OCD files typically
  // contain one session. Scan at stride 2 so we catch float64 fields at any
  // 2-byte alignment (the OCD format does not guarantee 4- or 8-byte alignment).
  for (let f64 = 8; f64 + 8 <= byteLen; f64 += 2) {
    const lat0 = view.getFloat64(f64, false)
    if (!isFinite(lat0) || lat0 < -89 || lat0 > 89 || Math.abs(lat0) < 0.001) continue

    // Validate timestamp spacing: Unipro GPS runs at exactly 10 Hz (100 ms between records).
    // Allow ±30 ms for real-world clock jitter → 70–130 ms. This rejects RPM (10 ms),
    // steering/accel (10–20 ms), and temperature (1 s) channels before the expensive count loop.
    // The 8 bytes before each float64 field are the uint64 BE nanosecond timestamp.
    if (f64 - 8 + STRIDE + 8 <= byteLen) {
      const ts0 = readU64(view, f64 - 8)
      const ts1 = readU64(view, f64 - 8 + STRIDE)
      const dtNs = ts1 > ts0 ? ts1 - ts0 : 0
      if (dtNs < 70_000_000 || dtNs > 130_000_000) continue
    }

    // Count consecutive valid lat values at stride 16.
    // At 200 km/h, 10 Hz GPS moves ≤5.6 m per sample; with ±10 m GPS noise the absolute
    // worst-case jump is ~20 m ≈ 0.00018°. 0.0003° (≈33 m) gives 60% headroom while
    // firmly rejecting any non-GPS channel whose values happen to drift through [-89, 89].
    let count = 0
    let prevLat = lat0
    for (let j = f64; j + 8 <= byteLen; j += STRIDE) {
      const lat = view.getFloat64(j, false)
      if (!isFinite(lat) || lat < -89 || lat > 89 || Math.abs(lat) < 0.001) break
      if (Math.abs(lat - prevLat) > 0.0003) break  // >~33 m between samples — not GPS
      prevLat = lat
      count++
      // Early termination: not enough remaining samples to meet minimum
      const remaining = (byteLen - j) / STRIDE
      if (count + remaining < MIN_COUNT) break
    }
    if (count < MIN_COUNT) continue

    // Search for lon block within 96 bytes after the lat block, step 2
    const latBlockEnd = f64 + count * STRIDE
    for (let lonF64 = latBlockEnd; lonF64 < latBlockEnd + 96 && lonF64 + 8 <= byteLen; lonF64 += 2) {
      const lon0 = view.getFloat64(lonF64, false)
      if (!isFinite(lon0) || Math.abs(lon0) < 0.001 || lon0 < -180 || lon0 > 180) continue
      let lonCount = 0
      let prevLon = lon0
      for (let j = lonF64; j + 8 <= byteLen; j += STRIDE) {
        const lon = view.getFloat64(j, false)
        if (!isFinite(lon) || lon < -180 || lon > 180 || Math.abs(lon) < 0.001) break
        if (Math.abs(lon - prevLon) > 0.0003) break  // >~33 m between samples — not GPS
        prevLon = lon
        lonCount++
      }
      if (lonCount >= count * 0.9) {
        return { latOff: f64 - 8, lonOff: lonF64 - 8, count }
      }
    }
  }

  return null
}

// Return sample standard deviation of float64 values in an OCD block.
// Used to distinguish speed (always varies) from altitude (nearly constant).
function blockStdDev(view: DataView, off: number, count: number): number {
  const STRIDE = 16
  const sampleN = Math.min(count, 200)
  let sum = 0, sum2 = 0, n = 0
  for (let i = 0; i < sampleN; i++) {
    const v = view.getFloat64(off + i * STRIDE + 8, false)
    if (!isFinite(v)) continue
    sum += v; sum2 += v * v; n++
  }
  if (n < 2) return 0
  const mean = sum / n
  return Math.sqrt(Math.max(0, sum2 / n - mean * mean))
}

export function parseOCDBinary(
  filename: string,
  buffer: ArrayBuffer,
  options?: { swapChannels?: boolean },
): ParseResult {
  try {
    const view = new DataView(buffer)
    const bytes = new Uint8Array(buffer)

    // OCD file header: uint32 BE length (4 bytes) + UTF-16 BE string "OCDBinaryFile"
    // bytes 0-3: 00 00 00 1A (= 26, the byte-length of the string)
    // bytes 4-29: 00 4F 00 43 ... (= "OCDBinaryFile" in UTF-16 BE)
    const sig = 'OCDBinaryFile'
    if (buffer.byteLength < 4 + sig.length * 2) {
      return { type: 'error', error: `${filename}: File too small to be a valid OCD file` }
    }
    let decoded = ''
    for (let i = 0; i < sig.length; i++) decoded += String.fromCharCode(bytes[4 + i * 2 + 1])
    if (decoded !== sig) {
      return { type: 'error', error: `${filename}: Not a valid Unipro OCD file (signature mismatch)` }
    }

    let gps = findOcdGpsBlock(view, buffer.byteLength)
    if (!gps) {
      return { type: 'error', error: `${filename}: No GPS data found in OCD file` }
    }

    // Determine lat/lon channel order. Two paths:
    //   1. Caller supplies options.swapChannels (cached from a previous successful parse) → use it.
    //   2. Auto-detect via findOCDSFMark: the OCD header encodes the S/F position in real
    //      geographic coordinates, so it only validates against the correct centroid ordering.
    let ocdSwapped = false
    if (options?.swapChannels !== undefined) {
      ocdSwapped = options.swapChannels
    } else {
      const STRIDE = 16
      const sampleN = Math.min(50, gps.count)
      let sumA = 0, sumB = 0
      for (let i = 0; i < sampleN; i++) {
        sumA += view.getFloat64(gps.latOff + i * STRIDE + 8, false)
        sumB += view.getFloat64(gps.lonOff + i * STRIDE + 8, false)
      }
      const meanA = sumA / sampleN
      const meanB = sumB / sampleN

      const sfNormal  = findOCDSFMark(view, buffer.byteLength, meanA, meanB)
      const sfSwapped = findOCDSFMark(view, buffer.byteLength, meanB, meanA)

      if (sfSwapped && !sfNormal) {
        ocdSwapped = true  // S/F mark only valid with channels swapped
      } else if (!sfSwapped && !sfNormal) {
        // No S/F mark found either way — use geographic plausibility.
        // For Europe and N America: latitude (positive, 25–75°) is numerically larger than
        // longitude (which is either small-positive or negative).
        // If meanB > meanA, then B is the larger/latitude value → channels are swapped.
        ocdSwapped = meanB > meanA
      }
      // sfNormal && !sfSwapped → ocdSwapped stays false (correct order confirmed)
      // sfNormal && sfSwapped  → both marks found (ambiguous); trust normal ordering
    }
    if (ocdSwapped) {
      gps = { latOff: gps.lonOff, lonOff: gps.latOff, count: gps.count }
    }

    const STRIDE = 16
    const byteLen = buffer.byteLength
    const ts0Ns   = readU64(view, gps.latOff)
    const tsEndNs = readU64(view, gps.latOff + (gps.count - 1) * STRIDE)

    // GPS Speed: same 10 Hz timestamps as lat/lon — search in the channel block after lon.
    // GPS Altitude comes first in the OCD channel order and can fall in [0, 200] at low-lying
    // tracks, causing it to be misread as speed (giving a constant ~190 km/h on a 190m circuit).
    // Guard: speed always varies; altitude is nearly constant. If std dev < 15, skip to the
    // next GPS-matched block past the altitude channel.
    const lonEnd = gps.lonOff + gps.count * STRIDE
    let speedBlock = findOcdBlockByGpsTs(
      view, byteLen, gps.latOff, gps.count, 0, 200, lonEnd, lonEnd + 600_000,
    )
    if (speedBlock && blockStdDev(view, speedBlock.off, speedBlock.count) < 15) {
      const pastAlt = speedBlock.off + speedBlock.count * STRIDE + 32
      speedBlock = findOcdBlockByGpsTs(view, byteLen, gps.latOff, gps.count, 0, 200, pastAlt, pastAlt + 600_000)
      if (speedBlock && blockStdDev(view, speedBlock.off, speedBlock.count) < 15) speedBlock = null
    }

    // RPM and temperature channels may be at a different sample rate; use session
    // time-window matching. Exclude known GPS/speed blocks from the scan.
    const excludeGps: [number, number][] = [
      [gps.latOff, gps.latOff + gps.count * STRIDE + 32],
      [gps.lonOff, gps.lonOff + gps.count * STRIDE + 32],
      ...(speedBlock ? [[speedBlock.off, speedBlock.off + speedBlock.count * STRIDE + 32] as [number, number]] : []),
    ]
    const minCount = Math.floor(gps.count * 0.2)

    const rpmBlock = findOcdBlockBySession(
      view, byteLen, ts0Ns, tsEndNs, 500, 20_000, minCount, excludeGps,
    )
    const excludeRpm: [number, number][] = rpmBlock
      ? [...excludeGps, [rpmBlock.off, rpmBlock.off + rpmBlock.count * STRIDE + 32]]
      : excludeGps

    const temp1Block = findOcdBlockBySession(
      view, byteLen, ts0Ns, tsEndNs, 20, 200, minCount, excludeRpm,
    )
    const excludeTemp1: [number, number][] = temp1Block
      ? [...excludeRpm, [temp1Block.off, temp1Block.off + temp1Block.count * STRIDE + 32]]
      : excludeRpm

    const temp2Block = findOcdBlockBySession(
      view, byteLen, ts0Ns, tsEndNs, 20, 1_000, minCount, excludeTemp1,
    )

    // Read channel arrays for interpolation
    const rpmData   = rpmBlock   ? readOcdChannelData(view, rpmBlock.off,   rpmBlock.count)   : []
    const temp1Data = temp1Block ? readOcdChannelData(view, temp1Block.off, temp1Block.count) : []
    const temp2Data = temp2Block ? readOcdChannelData(view, temp2Block.off, temp2Block.count) : []

    // Decide which temp channel is water (~40-120 °C) and which is EGT (higher)
    const temp1Avg = temp1Data.length ? temp1Data.reduce((s, r) => s + r.value, 0) / temp1Data.length : null
    const temp2Avg = temp2Data.length ? temp2Data.reduce((s, r) => s + r.value, 0) / temp2Data.length : null
    const waterData   = (temp1Avg != null && temp2Avg != null && temp2Avg > temp1Avg) ? temp1Data : (temp1Data.length ? temp1Data : temp2Data)
    const exhaustData = (temp1Avg != null && temp2Avg != null && temp2Avg > temp1Avg) ? temp2Data : (temp1Data.length && temp2Data.length ? temp2Data : [])

    const points: GpsPoint[] = []
    let cumDist = 0
    let prevLat: number | null = null
    let prevLon: number | null = null

    for (let i = 0; i < gps.count; i++) {
      const latRec = gps.latOff + i * STRIDE
      const lonRec = gps.lonOff + i * STRIDE
      if (lonRec + 16 > byteLen) break

      // Timestamp: uint64 BE in nanoseconds
      const tsHi = view.getUint32(latRec, false)
      const tsLo = view.getUint32(latRec + 4, false)
      const timeS = (tsHi * 4294967296 + tsLo) / 1e9

      const lat = view.getFloat64(latRec + 8, false)
      const lon = view.getFloat64(lonRec + 8, false)

      if (!isFinite(lat) || !isFinite(lon)) continue
      if (lat < -89 || lat > 89 || lon < -180 || lon > 180) continue
      if (Math.abs(lat) < 0.001 && Math.abs(lon) < 0.001) continue

      if (prevLat != null && prevLon != null) {
        cumDist += haversineM(prevLat, prevLon, lat, lon)
      }
      prevLat = lat; prevLon = lon

      // GPS Speed: direct index (same record count and timestamps as lat)
      let speedKmh: number | null = null
      if (speedBlock) {
        const sRec = speedBlock.off + i * STRIDE
        if (sRec + 16 <= byteLen) {
          const sv = view.getFloat64(sRec + 8, false)
          if (isFinite(sv) && sv >= 0 && sv <= 400) speedKmh = sv
        }
      }

      points.push({
        timeS,
        lat,
        lon,
        speedKmh,  // may be null — GPS-computed fallback applied below
        rpm:           rpmData.length    ? interpOcdChannel(rpmData,    timeS) : null,
        throttlePct:   null,
        waterTempC:    waterData.length  ? interpOcdChannel(waterData,  timeS) : null,
        exhaustTempC:  exhaustData.length ? interpOcdChannel(exhaustData, timeS) : null,
        brakePressure:  null,
        steeringAngle:  null,
        lateralG:       null,
        longitudinalG:  null,
        lapNumber:      null,
        distanceM:     cumDist,
      })
    }

    if (points.length < 10) {
      return { type: 'error', error: `${filename}: Could not extract GPS data from OCD file` }
    }

    // GPS-computed speed fallback: when the speed channel wasn't found or all values are ≤ 0,
    // derive speed from position deltas. Use a ±3-sample window (0.6 s at 10 Hz) for smoothing.
    const hasChannelSpeed = points.some(p => p.speedKmh != null && p.speedKmh > 0)
    if (!hasChannelSpeed) {
      for (let i = 0; i < points.length; i++) {
        const lo = Math.max(0, i - 3)
        const hi = Math.min(points.length - 1, i + 3)
        const dt = points[hi].timeS - points[lo].timeS
        if (dt > 0.05) {
          const dist = haversineM(points[lo].lat, points[lo].lon, points[hi].lat, points[hi].lon)
          points[i].speedKmh = Math.round((dist / dt) * 3.6 * 10) / 10
        }
      }
    }

    computeGForces(points)

    // Sanity-check: if the GPS block is wrong (e.g. a non-GPS channel misidentified),
    // consecutive (lat,lon) pairs will jump wildly. At 10 Hz, even 200 km/h = 5.6 m per
    // sample; allow up to 100 m to be generous with GPS glitches, but >10% bad pairs means
    // we found the wrong block.
    {
      const checkN = Math.min(points.length - 1, 100)
      let badPairs = 0
      for (let i = 0; i < checkN; i++) {
        if (haversineM(points[i].lat, points[i].lon, points[i + 1].lat, points[i + 1].lon) > 50) {
          badPairs++
        }
      }
      if (badPairs > checkN * 0.1) {
        return {
          type: 'error',
          error: `${filename}: GPS coordinates are erratic (${badPairs}/${checkN} consecutive pairs jump >50 m). The file format may differ from what is supported — try exporting as CSV from Unipro Race Studio.`,
        }
      }
    }

    // Use the S/F mark stored in the OCD header by LapCentre (most accurate).
    // Compute track centre from the first 100 GPS points as the search anchor.
    const sampleN = Math.min(100, points.length)
    const refLat = points.slice(0, sampleN).reduce((s, p) => s + p.lat, 0) / sampleN
    const refLon = points.slice(0, sampleN).reduce((s, p) => s + p.lon, 0) / sampleN
    const headerSF = findOCDSFMark(view, byteLen, refLat, refLon, points)
    const { lapGroups, crossings: ocdCrossings } = detectLapsFromGps(points, headerSF ?? undefined)

    return {
      type: 'gps',
      session: {
        id: crypto.randomUUID(),
        filename,
        brand: 'unipro',
        driverLabel: filename.replace(/\.[^.]+$/, ''),
        points,
        lapGroups,
        lapCrossingTimesS: ocdCrossings,
        totalDistanceM: cumDist,
        durationS: points[points.length - 1].timeS,
        ocdSwapped,
      },
    }
  } catch (e) {
    return { type: 'error', error: `${filename}: ${e instanceof Error ? e.message : 'OCD parse error'}` }
  }
}

// ─── GPS lap detection (shared by CSV and OCD) ────────────────────────────────

function computeBearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180
  const lat1R = lat1 * Math.PI / 180, lat2R = lat2 * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(lat2R)
  const x = Math.cos(lat1R) * Math.sin(lat2R) - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLon)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

function headingAngleDiff(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180)
}

/**
 * Trim GPS points to end at the genuine S/F crossing — removing any departure-road
 * GPS that was recorded after the kart left the circuit.
 *
 * A clean racing lap has exactly 2 "near S/F" zone entries (start, end).
 * If 3+ zones are found the extra one is the departure-road re-entry; the lap
 * is trimmed to end at the GPS point closest to S/F inside zone index 1.
 */
export function trimLapToCircuit(
  pts: GpsPoint[],
  sfLat: number,
  sfLon: number,
  nearM = 40,
): GpsPoint[] {
  if (pts.length === 0) return pts
  const zones: { start: number; end: number }[] = []
  let inZ = false, zSt = 0
  for (let i = 0; i < pts.length; i++) {
    const near = haversineM(sfLat, sfLon, pts[i].lat, pts[i].lon) < nearM
    if (!inZ && near) { inZ = true; zSt = i }
    else if (inZ && !near) { inZ = false; zones.push({ start: zSt, end: i - 1 }) }
  }
  if (inZ) zones.push({ start: zSt, end: pts.length - 1 })
  if (zones.length < 3) return pts  // clean lap — nothing to trim
  // zones[1] = end of racing circuit at S/F; zones[2+] = departure-road re-entry
  let minD = Infinity, endIdx = zones[1].start
  for (let i = zones[1].start; i <= zones[1].end; i++) {
    const d = haversineM(sfLat, sfLon, pts[i].lat, pts[i].lon)
    if (d < minD) { minD = d; endIdx = i }
  }
  return pts.slice(0, endIdx + 1)
}

export function detectLapsFromGps(
  points: GpsPoint[],
  sfHint?: { lat: number; lon: number; headingDeg?: number }   // manual S/F override — skips auto-detection
): { lapGroups: GpsPoint[][]; crossings: number[] } {
  if (points.length < 50) return { lapGroups: [], crossings: [] }

  const SF_DETECT_M = 40  // radius for voting which GPS location is crossed most (S/F finder)
  const NEAR_M = 40       // search window for crossing zone; 40 m tolerates cross-session GPS drift
  const FAR_M  = 100      // must travel this far from S/F before next crossing can register

  // Find S/F: use manual hint if provided, otherwise score each candidate by
  // (crossing count × average speed). S/F lines are on main straights (high speed),
  // which correctly distinguishes them from false positives in slow/dense corners.
  let sfLat: number, sfLon: number
  if (sfHint) {
    sfLat = sfHint.lat; sfLon = sfHint.lon
  } else {
    sfLat = points[0].lat; sfLon = points[0].lon
    const step = Math.max(1, Math.floor(points.length / 150))
    // Subsample inner loop to cap at ~1000 checks regardless of session length.
    // Uniform sampling preserves relative crossing counts and scores correctly.
    const innerStep = Math.max(1, Math.floor(points.length / 1000))
    let bestScore = 0
    for (let ci = 0; ci < points.length; ci += step) {
      const cand = points[ci]
      let count = 0, lastT = -Infinity, totalSpeed = 0
      const candHeadings: number[] = []
      for (let pi = 0; pi < points.length; pi += innerStep) {
        const p = points[pi]
        if (haversineM(cand.lat, cand.lon, p.lat, p.lon) < SF_DETECT_M && p.timeS - lastT > 30) {
          count++; lastT = p.timeS
          totalSpeed += p.speedKmh ?? 50
          const prev = points[Math.max(0, pi - innerStep)]
          const next = points[Math.min(points.length - 1, pi + innerStep)]
          candHeadings.push(computeBearingDeg(prev.lat, prev.lon, next.lat, next.lon))
        }
      }
      if (count === 0) continue
      const avgSpeed = totalSpeed / count
      let score = count * (avgSpeed / 50)
      // Penalize candidates where the kart crosses in opposite directions on alternating passes —
      // the hallmark of a bidirectional connector rather than a true start/finish line.
      // Bidirectional penalty: find the best single-direction majority.
      // If no direction captures ≥60% of crossings, the candidate is a bidirectional
      // connector rather than a true one-way S/F line — apply a heavy score penalty.
      if (candHeadings.length >= 6) {
        let maxSameDir = 0
        for (const h0 of candHeadings) {
          const sameDir = candHeadings.filter(h => headingAngleDiff(h, h0) <= 75).length
          if (sameDir > maxSameDir) maxSameDir = sameDir
        }
        if (maxSameDir / candHeadings.length < 0.6) score *= 0.15
      }
      if (score > bestScore) { bestScore = score; sfLat = cand.lat; sfLon = cand.lon }
    }
  }

  // Get every raw crossing of the detected S/F zone.
  // Track the minimum-distance GPS sample within each zone passage — that is the
  // closest approach to the S/F reference, i.e. the actual lap crossing — rather
  // than the zone entry point (~40 m too early, often mid-braking-zone).
  // Parabolic interpolation across the three samples bracketing the minimum gives
  // ~5 ms accuracy from 10 Hz GPS instead of snapping to the nearest 100 ms sample.
  const rawCrossings: number[] = []
  let wasFar = false
  let inZone = false
  let zoneSamples: { timeS: number; d: number; lat: number; lon: number }[] = []

  function flushZone() {
    if (!zoneSamples.length) return
    const minIdx = zoneSamples.reduce((mi, s, i) => s.d < zoneSamples[mi].d ? i : mi, 0)

    // Heading filter: if the user placed S/F with a known travel direction, only count
    // crossings moving in roughly that same direction (within ±90°). This prevents
    // bidirectional main straights from being detected twice per lap.
    if (sfHint?.headingDeg !== undefined && zoneSamples.length >= 2) {
      const prevS = zoneSamples[Math.max(0, minIdx - 1)]
      const nextS = zoneSamples[Math.min(zoneSamples.length - 1, minIdx + 1)]
      const crossingHeading = computeBearingDeg(prevS.lat, prevS.lon, nextS.lat, nextS.lon)
      if (headingAngleDiff(crossingHeading, sfHint.headingDeg) > 90) {
        zoneSamples = []
        inZone = false
        return
      }
    }

    let crossTime = zoneSamples[minIdx].timeS
    // Parabolic interpolation: fit a-t²+b·t+c to (prev, min, next) samples
    if (minIdx > 0 && minIdx < zoneSamples.length - 1) {
      const prev = zoneSamples[minIdx - 1], min = zoneSamples[minIdx], next = zoneSamples[minIdx + 1]
      const denom = prev.d - 2 * min.d + next.d
      if (denom > 1e-9) {
        const h = (next.timeS - prev.timeS) / 2
        const offset = h * (prev.d - next.d) / (2 * denom)
        crossTime = min.timeS + offset
        crossTime = Math.max(prev.timeS, Math.min(next.timeS, crossTime))
      }
    }
    rawCrossings.push(crossTime)
    zoneSamples = []
    inZone = false
  }

  for (const p of points) {
    const d = haversineM(sfLat, sfLon, p.lat, p.lon)
    if (d > FAR_M) {
      if (inZone) flushZone()
      wasFar = true
    } else if (d < NEAR_M) {
      if (!inZone && wasFar) { inZone = true; wasFar = false }
      if (inZone) zoneSamples.push({ timeS: p.timeS, d, lat: p.lat, lon: p.lon })
    } else if (inZone) {
      flushZone()
    }
  }
  if (inZone) flushZone()

  // Check for bimodal alternating pattern (double-counting symptom).
  // Find the largest jump between adjacent sorted gaps — a clear gap means two
  // distinct clusters (real laps vs a nearby false crossing). Filter crossings
  // so only those spaced ≥ the real lap time are kept.
  let minSpacing = 30
  if (rawCrossings.length >= 4) {
    const gaps = rawCrossings.map((t, i) => i === 0 ? t : t - rawCrossings[i - 1])
    gaps.sort((a, b) => a - b)
    let maxJump = 0, maxJumpIdx = 0
    for (let k = 0; k < gaps.length - 1; k++) {
      const jump = gaps[k + 1] - gaps[k]
      if (jump > maxJump) { maxJump = jump; maxJumpIdx = k }
    }
    const shortSpread = gaps[maxJumpIdx] - gaps[0]
    if (maxJump > 3 && maxJump > shortSpread * 2 && maxJumpIdx >= 1) {
      minSpacing = gaps[Math.floor(maxJumpIdx / 2)] * 1.5
      // Cap: minSpacing must not cause more than half of raw crossings to be dropped.
      // Uses median gap (robust real-lap estimate) as an upper bound.
      const medGap = gaps[Math.floor(gaps.length / 2)]
      if (minSpacing > medGap) minSpacing = medGap
    }
  }

  // Keep only crossings that are ≥ minSpacing seconds after the previous kept crossing
  const crossings: number[] = []
  let lastKept = -Infinity
  for (const t of rawCrossings) {
    if (t - lastKept >= minSpacing) { crossings.push(t); lastKept = t }
  }

  if (crossings.length < 2) return { lapGroups: [], crossings: [] }

  // Drop spurious approach-road (first) and departure-road (last) crossings.
  // The kart drives to/from the paddock at slow speed and may pass through the 40 m
  // S/F zone on its way.  Those slow crossings become crossings[0] or crossings[-1]:
  //   • crossings[0] too early → "Lap 1" spans approach drive + out-lap (approach road GPS)
  //   • crossings[-1] too slow  → "Last lap" = full racing circuit + departure road GPS
  //     (this lap is *longer* than median so the short-lap strip does NOT catch it)
  //
  // Guards for first crossing:
  //   (a) Timing — crossings[0] < 40 % of median inter-lap gap: not a real out-lap end
  //   (b) Speed  — kart was going < 50 % of median crossing speed: approach road crawl
  // Guard for last crossing (symmetric speed check only):
  //   (c) Speed  — last crossing < 50 % of median earlier-crossing speed: departure crawl
  if (crossings.length >= 3) {
    const avgSpeedAt = (t: number): number | null => {
      const near = points.filter(p => Math.abs(p.timeS - t) <= 2 && p.speedKmh !== null)
      return near.length === 0 ? null : near.reduce((s, p) => s + p.speedKmh!, 0) / near.length
    }

    // (a)+(b) first crossing
    let dropFirst = false
    if (crossings.length >= 4) {
      const interGaps = crossings.slice(1).map((t, i) => t - crossings[i])
      const sg = [...interGaps].sort((a, b) => a - b)
      const medGap = sg[Math.floor(sg.length / 2)]
      if (crossings[0] < medGap * 0.4) dropFirst = true
    }
    if (!dropFirst) {
      const speed0 = avgSpeedAt(crossings[0])
      const laterSpeeds = crossings.slice(1, Math.min(4, crossings.length))
        .map(t => avgSpeedAt(t)).filter((s): s is number => s !== null)
      if (speed0 !== null && laterSpeeds.length >= 2) {
        const sortedS = [...laterSpeeds].sort((a, b) => a - b)
        const medSpeed = sortedS[Math.floor(sortedS.length / 2)]
        if (speed0 < medSpeed * 0.5) dropFirst = true
      }
    }
    if (dropFirst) crossings.shift()

    // (c) last crossing — re-check length after possible shift above
    if (crossings.length >= 3) {
      const speedLast = avgSpeedAt(crossings[crossings.length - 1])
      const earlierSpeeds = crossings.slice(Math.max(0, crossings.length - 4), crossings.length - 1)
        .map(t => avgSpeedAt(t)).filter((s): s is number => s !== null)
      if (speedLast !== null && earlierSpeeds.length >= 2) {
        const sortedS = [...earlierSpeeds].sort((a, b) => a - b)
        const medSpeed = sortedS[Math.floor(sortedS.length / 2)]
        if (speedLast < medSpeed * 0.5) crossings.pop()
      }
    }
  }

  // crossings[0] = end of out-lap / start of Lap 1.
  // Build lap groups between consecutive crossings only — the segment before
  // crossings[0] (the out-lap) is intentionally discarded.
  const lapGroups: GpsPoint[][] = []
  const usedCrossings: number[] = [crossings[0]] // start of Lap 1
  let lapNum = 1

  // Find the index of the point at/after crossings[0] — that's where Lap 1 starts.
  let lapStart = points.findIndex(p => p.timeS >= crossings[0])
  if (lapStart < 0) lapStart = points.length - 1

  for (let ci = 1; ci < crossings.length; ci++) {
    const crossT = crossings[ci]
    const endIdx = points.findIndex((p, i) => i >= lapStart && p.timeS >= crossT)
    if (endIdx > lapStart) {
      const lap = points.slice(lapStart, endIdx + 1)
      lap.forEach(p => { p.lapNumber = lapNum })
      lapGroups.push(lap)
      usedCrossings.push(crossT)
      lapStart = endIdx
      lapNum++
    }
  }
  // The trailing segment (last S/F crossing → session end) is the in-lap back to
  // the pits. Exclude it from lapGroups — it is not a timed lap.

  // ── Zone-based departure/approach road GPS trim ───────────────────────────
  // The departure road is physically connected to the circuit at the S/F, so
  // spatial distance filters cannot cleanly separate them.  Instead, count how
  // many times the kart enters the S/F zone (NEAR_M radius) within each lap.
  //
  // A clean lap has exactly 2 zone entries: start (kart comes from previous lap)
  // and end (kart completes this lap).  A lap that includes departure-road GPS
  // has 3 zone entries: start, circuit-end, departure-road-return.
  //
  // Last lap: if ≥ 3 zone entries, trim to end at the GPS point closest to S/F
  //   in zone index 1 (the genuine end of the racing circuit).
  // First lap: if ≥ 2 zone entries and zone 0 looks like an approach-road pass
  //   (the kart immediately exits the zone going in the wrong direction), trim to
  //   start at the closest-to-SF GPS point in zone 1.
  {
    function sfZones(group: GpsPoint[]): { start: number; end: number }[] {
      const zs: { start: number; end: number }[] = []
      let inZ = false, zSt = 0
      for (let i = 0; i < group.length; i++) {
        const near = haversineM(sfLat, sfLon, group[i].lat, group[i].lon) < NEAR_M
        if (!inZ && near) { inZ = true; zSt = i }
        else if (inZ && !near) { inZ = false; zs.push({ start: zSt, end: i - 1 }) }
      }
      if (inZ) zs.push({ start: zSt, end: group.length - 1 })
      return zs
    }
    function closestSF(group: GpsPoint[], z: { start: number; end: number }): number {
      let minD = Infinity, minI = z.start
      for (let i = z.start; i <= z.end; i++) {
        const d = haversineM(sfLat, sfLon, group[i].lat, group[i].lon)
        if (d < minD) { minD = d; minI = i }
      }
      return minI
    }

    // Trim departure-road GPS from the last lap group.
    if (lapGroups.length > 0) {
      const last = lapGroups[lapGroups.length - 1]
      const zones = sfZones(last)
      if (zones.length >= 3) {
        // zones[1] = racing-circuit end at S/F; zones[2+] = departure road re-entry.
        const endIdx = closestSF(last, zones[1])
        lapGroups[lapGroups.length - 1] = last.slice(0, endIdx + 1)
      }
    }

    // Trim approach-road GPS from the first lap group.
    if (lapGroups.length > 0) {
      const first = lapGroups[0]
      const zones = sfZones(first)
      if (zones.length >= 2) {
        // zones[0] = approach-road crossing; zones[1] = start of proper racing section.
        const startIdx = closestSF(first, zones[1])
        lapGroups[0] = first.slice(startIdx)
      }
    }
  }

  // Strip partial/spurious laps from the first/last positions.
  // Short  (< 70 % median): fragment from imprecise S/F detection → remove.
  // Long   (> 150% median): approach-road out-lap or departure-road in-lap that
  //   slipped through the crossing filter (kart does a U-turn on the approach road
  //   and re-enters the S/F zone at similar speed to racing) → remove.
  // Only the outermost laps are examined so a legitimately slow mid-session lap is safe.
  if (lapGroups.length >= 3) {
    const durations = lapGroups.map(g => g[g.length - 1].timeS - g[0].timeS)
    const sorted = [...durations].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    const minDur = median * 0.7
    const maxDur = median * 1.5
    const dur = (g: GpsPoint[]) => g[g.length - 1].timeS - g[0].timeS
    while (lapGroups.length > 0 && (dur(lapGroups[0]) < minDur || dur(lapGroups[0]) > maxDur)) {
      lapGroups.shift()
      usedCrossings.shift()
    }
    while (lapGroups.length > 0) {
      const last = lapGroups[lapGroups.length - 1]
      if (dur(last) < minDur || dur(last) > maxDur) {
        lapGroups.pop()
        usedCrossings.pop()
      } else break
    }
    lapGroups.forEach((g, i) => g.forEach(p => { p.lapNumber = i + 1 }))
  }

  return { lapGroups, crossings: usedCrossings }
}

function parseDataLoggerCSVInternal(filename: string, text: string): { session: ImportedDataSession | null; error: string | null } {
  try {
    const sep = detectSep(text)
    const rawLines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
    const rows = rawLines.map(l => splitLine(l, sep))
    const hi = findHeaderRow(rows)
    const headers = rows[hi]
    const brand = detectBrand(headers, rawLines.slice(0, hi).join('\n'))

    const cTime    = col(headers, 'lap time', 'laptime', 'time', 'lap t')
    const cLap     = col(headers, 'lap #', 'lap no', 'lap number', 'lap', 'lp')
    const cMaxSpd  = col(headers, 'max speed', 'top speed', 'maximum speed', 'vmax', 'v max', 'max spd', 'speed max')
    const cAvgSpd  = col(headers, 'avg speed', 'average speed', 'aver speed', 'mean speed', 'avg spd')
    const cMaxRpm  = col(headers, 'max rpm', 'rpm max', 'peak rpm', 'max rev', 'maximum rpm')
    const cAvgRpm  = col(headers, 'avg rpm', 'rpm avg', 'average rpm', 'aver rpm', 'mean rpm')
    const cWater   = col(headers, 'water temp', 'coolant', 'h2o', 'water t')
    const cExhaust = col(headers, 'exhaust', 'egt', 'cht', 'cylinder head', 'head temp')

    if (cTime < 0) {
      return { session: null, error: `${filename}: No lap time column found` }
    }

    const laps: NormalizedLap[] = []
    for (const row of rows.slice(hi + 1)) {
      const ms = parseLapTimeMs(row[cTime] ?? '')
      if (!ms || ms < 5000 || ms > 600000) continue // skip non-lap rows

      const rawLap = cLap >= 0 ? parseInt(row[cLap] ?? '') : NaN
      laps.push({
        lapNumber:   isNaN(rawLap) ? laps.length + 1 : rawLap,
        lapTimeMs:   ms,
        maxSpeedKmh: cMaxSpd  >= 0 ? parseNum(row[cMaxSpd]  ?? '') : null,
        avgSpeedKmh: cAvgSpd  >= 0 ? parseNum(row[cAvgSpd]  ?? '') : null,
        maxRpm:      cMaxRpm  >= 0 ? parseNum(row[cMaxRpm]  ?? '') : null,
        avgRpm:      cAvgRpm  >= 0 ? parseNum(row[cAvgRpm]  ?? '') : null,
        waterTempC:  cWater   >= 0 ? parseNum(row[cWater]   ?? '') : null,
        exhaustTempC:cExhaust >= 0 ? parseNum(row[cExhaust] ?? '') : null,
      })
    }

    if (laps.length === 0) {
      return { session: null, error: `${filename}: No valid lap data found` }
    }

    return {
      session: {
        id: crypto.randomUUID(),
        filename,
        brand,
        driverLabel: filename.replace(/\.[^.]+$/, ''),
        laps,
      },
      error: null,
    }
  } catch (e) {
    return { session: null, error: `${filename}: ${e instanceof Error ? e.message : 'Parse error'}` }
  }
}
