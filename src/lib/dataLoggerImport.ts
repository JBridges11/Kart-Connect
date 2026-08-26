export type DataLoggerBrand = 'aim' | 'unipro' | 'starlane' | 'alfano' | 'unknown'

// ─── GPS time-series types ────────────────────────────────────────────────────

export interface GpsPoint {
  timeS: number
  lat: number
  lon: number
  speedKmh: number | null
  rpm: number | null
  throttlePct: number | null
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
  totalDistanceM: number
  durationS: number
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

// ─── GPS time-series parser ───────────────────────────────────────────────────

function parseGPSCSV(filename: string, text: string): ParseResult {
  try {
    const sep = detectSep(text)
    const rawLines = text.split(/\r?\n/).filter(l => l.trim())
    const rows = rawLines.map(l => splitLine(l, sep))
    const hi = findHeaderRow(rows)
    const headers = rows[hi]
    const brand = detectBrand(headers, rawLines.slice(0, hi).join('\n'))

    const cTime  = col(headers, 'time', 'sample time', 'elapsed', 't ')
    const cLat   = col(headers, 'latitude', 'gps lat', ' lat')
    const cLon   = col(headers, 'longitude', 'gps lon', 'gps long', ' lon')
    const cSpd   = col(headers, 'gps speed', 'speed km', 'speed (km', 'speed')
    const cRpm   = col(headers, 'rpm', 'engine rpm', 'rev')
    const cThr   = col(headers, 'throttle', 'tps', 'accel', 'gas')
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
        timeS:       cTime >= 0 ? (parseNum(row[cTime] ?? '') ?? points.length * 0.04) : points.length * 0.04,
        lat,
        lon,
        speedKmh:    cSpd >= 0  ? parseNum(row[cSpd]  ?? '') : null,
        rpm:         cRpm >= 0  ? parseNum(row[cRpm]  ?? '') : null,
        throttlePct: cThr >= 0  ? parseNum(row[cThr]  ?? '') : null,
        lapNumber:   isNaN(rawLap) ? null : rawLap,
        distanceM:   cumDist,
      })
    }

    if (points.length < 10) {
      return { type: 'error', error: `${filename}: Not enough GPS points found (${points.length})` }
    }

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

    return {
      type: 'gps',
      session: {
        id: crypto.randomUUID(),
        filename,
        brand,
        driverLabel: filename.replace(/\.[^.]+$/, ''),
        points,
        lapGroups,
        totalDistanceM: cumDist,
        durationS: points[points.length - 1].timeS,
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
