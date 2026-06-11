export function lapMsToString(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const millis  = ms % 1000
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

export function stringToLapMs(str: string): number | null {
  const match = str.trim().match(/^(\d+):(\d{2})\.(\d{3})$/)
  if (!match) return null
  const minutes = parseInt(match[1], 10)
  const seconds = parseInt(match[2], 10)
  const millis  = parseInt(match[3], 10)
  if (seconds > 59) return null
  return minutes * 60000 + seconds * 1000 + millis
}

export function lapMsDelta(ms: number, bestMs: number): { label: string; faster: boolean; equal: boolean } {
  const diff = ms - bestMs
  if (diff === 0) return { label: '—', faster: false, equal: true }
  const abs = Math.abs(diff)
  const sign = diff < 0 ? '-' : '+'
  return { label: `${sign}${lapMsToString(abs)}`, faster: diff < 0, equal: false }
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
