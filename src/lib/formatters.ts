export function lapMsToString(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const centis  = Math.floor((ms % 1000) / 10)
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`
}

export function stringToLapMs(str: string): number | null {
  // Accepts 0.00.00 (preferred) or 0:00.00 (legacy)
  const match = str.trim().match(/^(\d+)[.:](\d{2})\.(\d{2})$/)
  if (!match) return null
  const minutes = parseInt(match[1], 10)
  const seconds = parseInt(match[2], 10)
  const centis  = parseInt(match[3], 10)
  if (seconds > 59 || centis > 99) return null
  return minutes * 60000 + seconds * 1000 + centis * 10
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
