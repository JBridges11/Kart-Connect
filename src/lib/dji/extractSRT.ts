import type { GoproGpsPoint } from '@/lib/gopro/extractGPMF'

function parseSrtTimeMs(s: string): number {
  const m = s.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/)
  if (!m) return 0
  return parseInt(m[1]) * 3600000
       + parseInt(m[2]) * 60000
       + parseInt(m[3]) * 1000
       + parseInt(m[4])
}

/**
 * Parses a DJI Osmo Action .srt subtitle file into GoproGpsPoint[], using the
 * same interface as extractGPMF so the UTC-alignment sync pipeline is unchanged.
 *
 * Supported cameras: Osmo Action 3, 4, 5 (not drones).
 *
 * SRT block format (each frame):
 *   <block number>
 *   HH:MM:SS,mmm --> HH:MM:SS,mmm
 *   <font ...>FrameCnt: N, DiffTime: Xms
 *   YYYY-MM-DD HH:MM:SS.mmm
 *   [latitude: 51.234567] [longitude: -1.234567] [speed(m/s): X:1.23 Y:0.45 Z:0.12]</font>
 */
export async function extractDJISRT(srtFile: File): Promise<GoproGpsPoint[]> {
  const text = await srtFile.text()

  // Split into per-frame blocks separated by blank lines
  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)

  const points: GoproGpsPoint[] = []

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim())
    if (lines.length < 2) continue

    // Line 1: SRT timecode
    const videoTimeMs = parseSrtTimeMs(lines[1] ?? '')

    // Flatten remaining content, strip HTML-like font tags
    const content = lines.slice(2).join(' ').replace(/<[^>]+>/g, ' ')

    // UTC datetime: "2024-01-15 10:23:45.123" — DJI records in UTC
    const dtMatch = content.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}(?:\.\d+)?)/)
    const utcRaw  = dtMatch ? Date.parse(`${dtMatch[1]}T${dtMatch[2]}Z`) : NaN
    const utcMs   = !isNaN(utcRaw) ? utcRaw : null

    const latMatch = content.match(/\[latitude:\s*([-\d.]+)\]/)
    const lonMatch = content.match(/\[longitude:\s*([-\d.]+)\]/)
    if (!latMatch || !lonMatch) continue

    const lat = parseFloat(latMatch[1])
    const lon = parseFloat(lonMatch[1])
    if (Math.abs(lat) < 0.01 || Math.abs(lon) < 0.01) continue

    // Speed vector magnitude → km/h
    const spdMatch = content.match(/\[speed\(m\/s\):\s*X:([-\d.]+)\s+Y:([-\d.]+)\s+Z:([-\d.]+)\]/)
    let speedKmh = 0
    if (spdMatch) {
      const x = parseFloat(spdMatch[1])
      const y = parseFloat(spdMatch[2])
      const z = parseFloat(spdMatch[3])
      speedKmh = Math.sqrt(x * x + y * y + z * z) * 3.6
    }

    points.push({ videoTimeMs, utcMs, lat, lon, speedKmh })
  }

  if (points.length < 10) {
    throw new Error(
      "This DJI file doesn't contain GPS data. Make sure GPS is enabled on your Osmo Action before recording.",
    )
  }

  const hasUtc = points.some(p => p.utcMs != null)
  if (!hasUtc) {
    throw new Error(
      "This DJI file doesn't contain GPS data. Make sure GPS is enabled on your Osmo Action before recording.",
    )
  }

  return points
}
