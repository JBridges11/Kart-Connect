import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Clock, Thermometer, Wind, Droplets, FileDown } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, Badge, Button, Modal, Input, Textarea } from '@/components/ui'
import { SetupForm } from '@/components/forms/SetupForm'
import { LapProgressChart } from '@/components/charts/LapProgressChart'
import { useSession } from '@/hooks/useSessions'
import { useSetup } from '@/hooks/useSetup'
import { useLapTimes } from '@/hooks/useLapTimes'
import { useSetupChanges } from '@/hooks/useSetupChanges'
import { supabase } from '@/lib/supabase'
import { lapMsToString, lapMsDelta, formatDate } from '@/lib/formatters'
import type { SetupFormData, PressureUnit } from '@/types'

const conditionVariant: Record<string, 'info' | 'positive' | 'neutral'> = {
  dry: 'positive', wet: 'info', damp: 'neutral',
}

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: session, loading: sessionLoading, refetch: refetchSession } = useSession(id ?? null)
  const { data: setup, loading: setupLoading, refetch: refetchSetup } = useSetup(id ?? null)
  const { data: lapTimes, bestLap } = useLapTimes(id ?? null)
  const { data: changes, refetch: refetchChanges } = useSetupChanges(id ?? null)

  const [editSetupOpen, setEditSetupOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [changeOpen, setChangeOpen] = useState(false)
  const [changeDesc, setChangeDesc] = useState('')
  const [lapDelta, setLapDelta] = useState('')
  const [feedback, setFeedback] = useState('')

  const pressureUnit: PressureUnit = (localStorage.getItem('kc_pressure_unit') as PressureUnit) ?? 'bar'

  async function saveSetup(data: Partial<SetupFormData>) {
    if (!id || !data.chassis_type || !data.engine_type) return
    setSaving(true)
    if (setup) {
      await supabase.from('setups').update(data).eq('id', setup.id)
    } else {
      await supabase.from('setups').insert({ session_id: id, ...data })
    }
    await refetchSetup()
    setSaving(false)
    setEditSetupOpen(false)
  }

  async function saveChange() {
    if (!id || !changeDesc.trim()) return
    const delta = lapDelta.trim() ? parseInt(lapDelta, 10) : null
    await supabase.from('setup_changes').insert({
      session_id: id,
      change_description: changeDesc.trim(),
      lap_delta_ms: isNaN(delta as number) ? null : delta,
      driver_feedback: feedback.trim() || null,
    })
    await refetchChanges()
    await refetchSession()
    setChangeOpen(false)
    setChangeDesc('')
    setLapDelta('')
    setFeedback('')
  }

  async function exportPDF() {
    if (!session) return
    setExporting(true)
    try {
      const { generateSessionPDF } = await import('@/components/SessionPDF')
      await generateSessionPDF({ session, setup: setup ?? null, lapTimes, changes, bestLap: bestLap ?? null })
    } finally {
      setExporting(false)
    }
  }

  if (sessionLoading) {
    return (
      <PageWrapper title="Session">
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PageWrapper>
    )
  }

  if (!session) {
    return (
      <PageWrapper title="Session">
        <p className="text-text-muted">Session not found.</p>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper
      title="Session Detail"
      action={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Back
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void exportPDF()} loading={exporting}>
            <FileDown size={14} /> Export PDF
          </Button>
        </div>
      }
    >
      {/* Header card */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-2xl font-bold text-text-primary">
              {session.track?.name ?? 'Unknown Track'}
            </h2>
            <p className="text-text-muted text-sm mt-0.5">
              {session.session_name && (
                <span className="text-accent-primary font-semibold mr-2">{session.session_name}</span>
              )}
              {session.kart?.nickname ?? '—'} &middot; {formatDate(session.session_date)}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge label={session.session_type} variant="neutral" />
              {session.conditions && <Badge label={session.conditions} variant={conditionVariant[session.conditions] ?? 'neutral'} />}
              {session.best_lap_time_ms && (
                <Badge label={lapMsToString(session.best_lap_time_ms)} variant="warning" />
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 text-xs text-text-muted font-mono">
            {session.air_temp_c !== null && (
              <span className="flex items-center gap-1"><Thermometer size={12} /> Air {session.air_temp_c}°C</span>
            )}
            {session.track_temp_c !== null && (
              <span className="flex items-center gap-1"><Thermometer size={12} /> Track {session.track_temp_c}°C</span>
            )}
            {session.humidity_pct !== null && (
              <span className="flex items-center gap-1"><Droplets size={12} /> {session.humidity_pct}% RH</span>
            )}
            {session.wind_description && (
              <span className="flex items-center gap-1"><Wind size={12} /> {session.wind_description}</span>
            )}
          </div>
        </div>
        {session.notes && (
          <p className="mt-3 text-sm text-text-muted border-t border-border-color pt-3">{session.notes}</p>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Lap Times */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary">
              <Clock size={14} className="inline mr-2 text-accent-primary" />
              Lap Times
            </h3>
            <span className="text-xs text-text-muted font-mono">{lapTimes.length} laps</span>
          </div>
          <LapProgressChart lapTimes={lapTimes} height={150} />
          {lapTimes.length > 0 && (
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-color">
                    <th className="px-2 py-1.5 text-left text-text-muted font-heading uppercase tracking-wider">#</th>
                    <th className="px-2 py-1.5 text-left text-text-muted font-heading uppercase tracking-wider">Time</th>
                    <th className="px-2 py-1.5 text-left text-text-muted font-heading uppercase tracking-wider">Delta</th>
                    <th className="px-2 py-1.5 text-left text-text-muted font-heading uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {lapTimes.map(lap => {
                    const isBest = lap.lap_time_ms === bestLap?.lap_time_ms
                    const delta  = bestLap ? lapMsDelta(lap.lap_time_ms, bestLap.lap_time_ms) : null
                    return (
                      <tr
                        key={lap.id}
                        className={[
                          'border-b border-border-color last:border-0',
                          isBest ? 'bg-accent-primary/5 border-l-2 border-l-accent-primary' : '',
                        ].join(' ')}
                      >
                        <td className="px-2 py-1.5 font-mono text-text-muted">{lap.lap_number}</td>
                        <td className="px-2 py-1.5 font-mono text-text-primary">{lapMsToString(lap.lap_time_ms)}</td>
                        <td className="px-2 py-1.5">
                          {isBest
                            ? <Badge label="BEST" variant="warning" />
                            : delta && !delta.equal && (
                                <Badge label={delta.label} variant={delta.faster ? 'positive' : 'negative'} />
                              )
                          }
                        </td>
                        <td className="px-2 py-1.5 text-text-muted">{lap.notes ?? ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Changes Log */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary">
              Changes Log
            </h3>
            <Button size="sm" variant="secondary" onClick={() => setChangeOpen(true)}>
              <Plus size={12} /> Log Change
            </Button>
          </div>
          {changes.length === 0 ? (
            <p className="text-text-muted text-sm">No changes logged yet.</p>
          ) : (
            <div className="space-y-3">
              {changes.map(c => (
                <div key={c.id} className="border-l-2 border-border-color pl-3">
                  <p className="text-sm text-text-primary">{c.change_description}</p>
                  {c.lap_delta_ms !== null && (
                    <Badge
                      label={`${c.lap_delta_ms < 0 ? '' : '+'}${c.lap_delta_ms}ms`}
                      variant={c.lap_delta_ms < 0 ? 'positive' : 'negative'}
                      className="mt-1"
                    />
                  )}
                  {c.driver_feedback && (
                    <p className="text-xs text-text-muted mt-1">{c.driver_feedback}</p>
                  )}
                  <p className="text-xs text-text-muted mt-1 font-mono">
                    {new Date(c.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Setup Display */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary">Setup</h3>
          <Button size="sm" variant="secondary" onClick={() => setEditSetupOpen(true)}>
            Edit Setup
          </Button>
        </div>
        {setupLoading ? (
          <p className="text-text-muted text-sm">Loading…</p>
        ) : setup ? (
          <SetupForm
            initialSetup={setup}
            readOnly
            pressureUnit={pressureUnit}
          />
        ) : (
          <div className="text-center py-4">
            <p className="text-text-muted text-sm mb-3">No setup recorded.</p>
            <Button size="sm" onClick={() => setEditSetupOpen(true)}>Add Setup</Button>
          </div>
        )}
      </Card>

      {/* Edit Setup Modal */}
      <Modal isOpen={editSetupOpen} onClose={() => setEditSetupOpen(false)} title="Edit Setup" maxWidth="max-w-3xl">
        <SetupForm
          initialSetup={setup ?? {}}
          onSave={saveSetup}
          saving={saving}
          pressureUnit={pressureUnit}
          showSaveButton
        />
      </Modal>

      {/* Log Change Modal */}
      <Modal isOpen={changeOpen} onClose={() => setChangeOpen(false)} title="Log a Change">
        <div className="space-y-4">
          <Textarea
            label="What changed? *"
            value={changeDesc}
            onChange={e => setChangeDesc(e.target.value)}
            placeholder="e.g. Raised axle height from Low to Med"
          />
          <Input
            label="Lap Delta (ms)"
            type="number"
            unit="ms"
            value={lapDelta}
            onChange={e => setLapDelta(e.target.value)}
            placeholder="e.g. -230 (negative = faster)"
            hint="Negative = faster, positive = slower"
          />
          <Textarea
            label="Driver Feedback"
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="How did the kart feel after the change?"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setChangeOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => void saveChange()} disabled={!changeDesc.trim()}>Save</Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  )
}
