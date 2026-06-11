import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Wrench } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, Button, Modal, Input, Textarea, Badge } from '@/components/ui'
import { useKarts } from '@/hooks/useKarts'
import { useSessions } from '@/hooks/useSessions'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { lapMsToString, formatDate } from '@/lib/formatters'
import type { Kart } from '@/types'

export function GaragePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: karts, loading, refetch } = useKarts()
  const { data: sessions } = useSessions()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Kart | null>(null)
  const [form, setForm] = useState<Partial<Omit<Kart, 'id' | 'user_id' | 'created_at'>>>({
    nickname: '', chassis_type: '', engine_type: '', notes: '',
  })

  async function save() {
    if (!form.nickname?.trim() || !form.chassis_type?.trim() || !form.engine_type?.trim()) return
    setSaving(true)
    await supabase.from('karts').insert({
      user_id:      user!.id,
      nickname:     form.nickname.trim(),
      chassis_type: form.chassis_type.trim(),
      engine_type:  form.engine_type.trim(),
      notes:        form.notes?.trim() || null,
    })
    await refetch()
    setOpen(false)
    setSaving(false)
    setForm({ nickname: '', chassis_type: '', engine_type: '', notes: '' })
  }

  function kartSessions(kartId: string) {
    return sessions.filter(s => s.kart_id === kartId)
  }

  return (
    <PageWrapper
      title="Garage"
      action={
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus size={14} /> Add Kart
        </Button>
      }
    >
      {loading ? (
        <div className="text-text-muted text-sm">Loading…</div>
      ) : karts.length === 0 ? (
        <div className="text-center py-16">
          <Wrench size={40} className="text-text-muted mx-auto mb-4 opacity-40" />
          <p className="text-text-muted text-sm mb-4">No karts in garage yet.</p>
          <Button onClick={() => setOpen(true)}><Plus size={14} /> Add your first kart</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {karts.map(kart => {
            const ks = kartSessions(kart.id)
            const bestLaps = ks.filter(s => s.best_lap_time_ms !== null)
            const best = bestLaps.length > 0
              ? Math.min(...bestLaps.map(s => s.best_lap_time_ms!))
              : null
            return (
              <Card
                key={kart.id}
                onClick={() => setSelected(kart)}
                className="hover:border-accent-primary/30 transition-colors"
              >
                <h3 className="font-heading font-bold text-lg text-text-primary mb-1">{kart.nickname}</h3>
                <p className="text-xs text-text-muted">{kart.chassis_type}</p>
                <p className="text-xs text-text-muted">{kart.engine_type}</p>
                <div className="flex gap-3 mt-3 text-xs">
                  <span className="text-text-muted">{ks.length} session{ks.length !== 1 ? 's' : ''}</span>
                  {best && <span className="text-accent-primary font-mono">Best: {lapMsToString(best)}</span>}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Kart detail modal */}
      {selected && (
        <Modal isOpen onClose={() => setSelected(null)} title={selected.nickname}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-text-muted text-xs font-heading uppercase tracking-wider mb-1">Chassis</p>
                <p className="text-text-primary">{selected.chassis_type}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs font-heading uppercase tracking-wider mb-1">Engine</p>
                <p className="text-text-primary">{selected.engine_type}</p>
              </div>
            </div>
            {selected.notes && (
              <p className="text-text-muted text-sm border-t border-border-color pt-3">{selected.notes}</p>
            )}
            <div className="border-t border-border-color pt-3">
              <p className="font-heading text-xs uppercase tracking-wider text-text-muted mb-2">Sessions</p>
              {kartSessions(selected.id).length === 0 ? (
                <p className="text-text-muted text-xs">No sessions yet.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {kartSessions(selected.id).map(s => (
                    <div
                      key={s.id}
                      onClick={() => navigate(`/sessions/${s.id}`)}
                      className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-bg-elevated cursor-pointer"
                    >
                      <div>
                        <p className="text-sm text-text-primary">{s.track?.name ?? '—'}</p>
                        <p className="text-xs text-text-muted font-mono">{formatDate(s.session_date)}</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Badge label={s.session_type} variant="neutral" />
                        {s.best_lap_time_ms && (
                          <span className="text-accent-primary font-mono text-xs">
                            {lapMsToString(s.best_lap_time_ms)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Add Kart Modal */}
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Add Kart">
        <div className="space-y-4">
          <Input
            label="Nickname *"
            value={form.nickname ?? ''}
            onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
            placeholder="e.g. #23 Race Kart"
          />
          <Input
            label="Chassis Type *"
            value={form.chassis_type ?? ''}
            onChange={e => setForm(f => ({ ...f, chassis_type: e.target.value }))}
            placeholder="e.g. Tony Kart 401R"
          />
          <Input
            label="Engine Type *"
            value={form.engine_type ?? ''}
            onChange={e => setForm(f => ({ ...f, engine_type: e.target.value }))}
            placeholder="e.g. Rotax Max Senior"
          />
          <Textarea
            label="Notes"
            value={form.notes ?? ''}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Any notes about this kart…"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              loading={saving}
              onClick={() => void save()}
              disabled={!form.nickname?.trim() || !form.chassis_type?.trim() || !form.engine_type?.trim()}
            >
              Save Kart
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  )
}
