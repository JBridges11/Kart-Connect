import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Input, Badge, Button } from '@/components/ui'
import { lapMsToString, stringToLapMs, lapMsDelta } from '@/lib/formatters'

interface LapRow {
  lap_number: number
  lap_time_ms: number
  notes: string | null
}

interface LapEntryProps {
  laps: LapRow[]
  onAdd: (lap: LapRow) => void
  onRemove?: (lapNumber: number) => void
}

export function LapEntry({ laps, onAdd, onRemove }: LapEntryProps) {
  const [timeStr, setTimeStr] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const nextLap = laps.length + 1
  const bestMs  = laps.length > 0 ? Math.min(...laps.map(l => l.lap_time_ms)) : null

  function handleAdd() {
    const ms = stringToLapMs(timeStr)
    if (ms === null) {
      setError('Use format 0.00.00 (e.g. 0.58.23)')
      return
    }
    setError(null)
    onAdd({ lap_number: nextLap, lap_time_ms: ms, notes: notes || null })
    setTimeStr('')
    setNotes('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="w-20 flex-shrink-0">
          <Input
            label="Lap #"
            value={nextLap}
            readOnly
            className="text-center font-mono"
          />
        </div>
        <div className="flex-1">
          <Input
            label="Lap Time"
            value={timeStr}
            onChange={e => setTimeStr(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="0.00.00"
            error={error ?? undefined}
            className="font-mono"
          />
        </div>
        <div className="flex-1 hidden sm:block">
          <Input
            label="Notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Optional..."
          />
        </div>
        <Button onClick={handleAdd} size="md" className="flex-shrink-0 mb-0.5">
          <Plus size={14} />
          Add
        </Button>
      </div>

      {laps.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-border-color">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-color bg-bg-elevated">
                <th className="px-3 py-2 text-left font-heading text-xs uppercase tracking-wider text-text-muted w-12">#</th>
                <th className="px-3 py-2 text-left font-heading text-xs uppercase tracking-wider text-text-muted">Time</th>
                <th className="px-3 py-2 text-left font-heading text-xs uppercase tracking-wider text-text-muted">Delta</th>
                <th className="px-3 py-2 text-left font-heading text-xs uppercase tracking-wider text-text-muted">Notes</th>
                {onRemove && <th className="w-8" />}
              </tr>
            </thead>
            <tbody>
              {laps.map(lap => {
                const delta = bestMs !== null ? lapMsDelta(lap.lap_time_ms, bestMs) : null
                const isBest = lap.lap_time_ms === bestMs

                return (
                  <tr
                    key={lap.lap_number}
                    className={[
                      'border-b border-border-color last:border-0',
                      isBest ? 'bg-accent-primary/5 border-l-2 border-l-accent-primary' : 'hover:bg-bg-elevated',
                    ].join(' ')}
                  >
                    <td className="px-3 py-2 font-mono text-text-muted">{lap.lap_number}</td>
                    <td className="px-3 py-2 font-mono text-text-primary">{lapMsToString(lap.lap_time_ms)}</td>
                    <td className="px-3 py-2">
                      {delta && !delta.equal && (
                        <Badge
                          label={delta.label}
                          variant={delta.faster ? 'positive' : 'negative'}
                        />
                      )}
                      {isBest && <Badge label="BEST" variant="warning" />}
                    </td>
                    <td className="px-3 py-2 text-text-muted">{lap.notes ?? ''}</td>
                    {onRemove && (
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => onRemove(lap.lap_number)}
                          className="text-text-muted hover:text-accent-secondary transition-colors text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
