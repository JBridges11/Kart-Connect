import type { GoproGpsPoint } from './extractGPMF'
import type { GpsPoint } from '@/lib/dataLoggerImport'

/**
 * Binary-search the logger points array for the entry whose timeS is closest
 * to loggerTimeS.  Returns null only when the array is empty.
 */
export function findLoggerPoint(points: GpsPoint[], loggerTimeS: number): GpsPoint | null {
  if (!points.length) return null
  let lo = 0, hi = points.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (points[mid].timeS < loggerTimeS) lo = mid + 1
    else hi = mid
  }
  if (lo > 0 && Math.abs(points[lo - 1].timeS - loggerTimeS) < Math.abs(points[lo].timeS - loggerTimeS)) {
    return points[lo - 1]
  }
  return points[lo]
}

/**
 * Compute videoOffsetMs such that:
 *   loggerTimeS = (videoTimeMs - videoOffsetMs) / 1000
 *
 * UTC alignment only — requires GoPro Hero 7+ (GPS with UTC) and a logger
 * CSV that includes a session start timestamp (loggerStartUtcMs).
 */
export function computeVideoOffset(
  goproPoints: GoproGpsPoint[],
  loggerPoints: GpsPoint[],
  loggerStartUtcMs?: number,
): number {
  if (!goproPoints.length || !loggerPoints.length) return 0

  const firstWithUtc = goproPoints.find(p => p.utcMs != null)
  if (!firstWithUtc) {
    throw new Error(
      "This GoPro footage isn't compatible. Lap comparison requires a GoPro Hero 7 or newer with GPS enabled in the camera settings.",
    )
  }

  if (loggerStartUtcMs == null) {
    throw new Error(
      "Your logger CSV doesn't include a session date and time. Re-export from your logger software with the session timestamp enabled.",
    )
  }

  // UTC of video frame 0
  const videoStartUtcMs = firstWithUtc.utcMs! - firstWithUtc.videoTimeMs
  return loggerStartUtcMs - videoStartUtcMs
}
