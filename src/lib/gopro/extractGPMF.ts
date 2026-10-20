import gpmfExtract from 'gpmf-extract'
import { goProTelemetry } from 'gopro-telemetry'

export interface GoproGpsPoint {
  videoTimeMs: number   // ms from video start (from cts)
  utcMs: number | null  // Unix epoch ms, null if GoPro had no GPS fix
  lat: number
  lon: number
  speedKmh: number      // converted from m/s
}

export interface GoproExtract {
  gpsPoints: GoproGpsPoint[]
  durationMs: number
  hasUtc: boolean       // true when every point has a UTC date
}

export async function extractGPMF(file: File): Promise<GoproExtract> {
  const extracted = await gpmfExtract(file, { browserMode: true, useWorker: false })

  const telemetry = await goProTelemetry(extracted, {
    stream: ['GPS5'],
    tolerant: true,
  })

  // Find first device that has a GPS5 stream
  let gps5: { samples: Array<{ value: [number,number,number,number,number]; cts: number; date?: string }> } | undefined
  for (const device of Object.values(telemetry)) {
    if (device.streams?.GPS5) {
      gps5 = device.streams.GPS5 as typeof gps5
      break
    }
  }

  if (!gps5 || !gps5.samples.length) {
    throw new Error(
      'No GPS data found in this video. Make sure GPS was enabled on the GoPro and the camera had a satellite fix before recording.'
    )
  }

  const gpsPoints: GoproGpsPoint[] = gps5.samples
    .filter(s => Array.isArray(s.value) && s.value.length >= 4)
    .map(s => ({
      videoTimeMs: Math.round(s.cts ?? 0),
      utcMs: s.date ? new Date(s.date).getTime() : null,
      lat: s.value[0],
      lon: s.value[1],
      speedKmh: (s.value[3] ?? 0) * 3.6,
    }))
    // Filter out invalid GPS fixes (0,0 or clearly wrong)
    .filter(p => Math.abs(p.lat) > 0.01 && Math.abs(p.lon) > 0.01)

  if (gpsPoints.length < 10) {
    throw new Error(
      `Only ${gpsPoints.length} valid GPS fixes found. The camera may not have had a satellite lock during this recording.`
    )
  }

  const hasUtc = gpsPoints.some(p => p.utcMs != null)
  if (!hasUtc) {
    throw new Error(
      "This GoPro footage isn't compatible. Lap comparison requires a GoPro Hero 7 or newer with GPS enabled in the camera settings.",
    )
  }

  const durationMs = gpsPoints[gpsPoints.length - 1].videoTimeMs
  return { gpsPoints, durationMs, hasUtc: true }
}
