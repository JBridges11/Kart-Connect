import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Wrench, Trash2, Pencil, Flag } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, Button, Modal, Input, Textarea, Badge } from '@/components/ui'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useKarts } from '@/hooks/useKarts'
import { useSessions } from '@/hooks/useSessions'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { supabase } from '@/lib/supabase'
import { lapMsToString, formatDate } from '@/lib/formatters'
import type { Kart, KartEngine } from '@/types'

type EngineEntry = { id: string; make: string; number: string; rank: string }

function emptyEngine(rank: number): EngineEntry {
  return { id: crypto.randomUUID(), make: '', number: '', rank: String(rank) }
}

function kartToEngineEntries(kart: Kart): EngineEntry[] {
  if (kart.engines?.length > 0) {
    return kart.engines.map(e => ({ id: e.id, make: e.make, number: e.number, rank: String(e.rank) }))
  }
  if (kart.engine_make) {
    return [{ id: crypto.randomUUID(), make: kart.engine_make, number: kart.engine_number ?? '', rank: '1' }]
  }
  return [emptyEngine(1)]
}

const TIER_DRIVER_LIMITS: Record<string, number> = {
  privateer: 1,
  team: 5,
  pro_team: 30,
}

const RANK_OPTIONS = ['1','2','3','4','5'].map(v => ({ label: `#${v}`, value: v }))
const STIFFNESS_OPTIONS = [
  { label: 'Standard', value: 'Standard' },
  { label: 'Hard',     value: 'Hard' },
  { label: 'Soft',     value: 'Soft' },
]

type FormState = {
  driver_name: string
  kart_class: string
  kart_make: string
  kart_model: string
  chassis_number: string
  chassis_stiffness: 'Standard' | 'Hard' | 'Soft' | null
  phone_number: string
  notes: string
}

function blankForm(): FormState {
  return { driver_name: '', kart_class: '', kart_make: '', kart_model: '', chassis_number: '', chassis_stiffness: null, phone_number: '', notes: '' }
}

function kartToForm(kart: Kart): FormState {
  return {
    driver_name:       kart.driver_name ?? '',
    kart_class:        kart.kart_class ?? '',
    kart_make:         kart.kart_make ?? '',
    kart_model:        kart.kart_model ?? '',
    chassis_number:    kart.chassis_number ?? '',
    chassis_stiffness: kart.chassis_stiffness ?? null,
    phone_number:      kart.phone_number ?? '',
    notes:             kart.notes ?? '',
  }
}

// ── Extracted outside GaragePage so React never remounts it on re-render ──
interface DriverFormProps {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  engines: EngineEntry[]
  setEngines: React.Dispatch<React.SetStateAction<EngineEntry[]>>
  saving: boolean
  onSave: () => void
  onCancel: () => void
}

function DriverForm({ form, setForm, engines, setEngines, saving, onSave, onCancel }: DriverFormProps) {
  function addEngine() {
    if (engines.length >= 5) return
    setEngines(e => [...e, emptyEngine(e.length + 1)])
  }
  function removeEngine(id: string) {
    setEngines(e => e.filter(eng => eng.id !== id))
  }
  function updateEngine(id: string, field: keyof EngineEntry, value: string) {
    setEngines(e => e.map(eng => eng.id === id ? { ...eng, [field]: value } : eng))
  }

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <Input label="Driver Name" value={form.driver_name} onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))} placeholder="e.g. Jack Smith" />
      <Input label="WhatsApp Number" value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} placeholder="e.g. +447911123456" />
      <Input label="Kart Class" value={form.kart_class} onChange={e => setForm(f => ({ ...f, kart_class: e.target.value }))} placeholder="e.g. Max Senior" />

      <p className="text-xs font-heading font-bold text-text-muted uppercase pt-1">Kart</p>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Kart Make *" value={form.kart_make} onChange={e => setForm(f => ({ ...f, kart_make: e.target.value }))} placeholder="e.g. Tony Kart" />
        <Input label="Kart Model *" value={form.kart_model} onChange={e => setForm(f => ({ ...f, kart_model: e.target.value }))} placeholder="e.g. 401R" />
      </div>
      <Input label="Chassis Number" value={form.chassis_number} onChange={e => setForm(f => ({ ...f, chassis_number: e.target.value }))} placeholder="e.g. TK-2024-001" />
      <SegmentedControl
        label="Chassis Stiffness"
        options={STIFFNESS_OPTIONS}
        value={form.chassis_stiffness}
        onChange={v => setForm(f => ({ ...f, chassis_stiffness: v as 'Standard' | 'Hard' | 'Soft' }))}
      />

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs font-heading font-bold text-text-muted uppercase">Engines</p>
        {engines.length < 5 && (
          <button type="button" onClick={addEngine} className="text-xs text-accent-primary hover:underline cursor-pointer">
            + Add Engine
          </button>
        )}
      </div>

      {engines.map((eng, i) => (
        <div key={eng.id} className="bg-bg-elevated rounded-card p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-bold text-text-muted uppercase">Engine {i + 1}</span>
            {engines.length > 1 && (
              <button type="button" onClick={() => removeEngine(eng.id)} className="text-text-muted hover:text-accent-secondary cursor-pointer">
                <Trash2 size={13} />
              </button>
            )}
          </div>
          <Input label="Engine Make" value={eng.make} onChange={e => updateEngine(eng.id, 'make', e.target.value)} placeholder="e.g. Rotax" />
          <Input label="Engine Number" value={eng.number} onChange={e => updateEngine(eng.id, 'number', e.target.value)} placeholder="e.g. ROT-56789" />
          <SegmentedControl
            label="Engine Rank"
            options={RANK_OPTIONS}
            value={eng.rank}
            onChange={v => updateEngine(eng.id, 'rank', v)}
          />
        </div>
      ))}

      <Textarea label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes about this driver…" />

      <div className="flex gap-2 justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button
          size="sm"
          loading={saving}
          onClick={onSave}
          disabled={!form.kart_make.trim() || !form.kart_model.trim()}
        >
          Save Driver
        </Button>
      </div>
    </div>
  )
}

export function GaragePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { tier, subscription, refetch: refetchSub } = useSubscription()
  const pageTitle = tier === 'privateer' ? 'My Kart' : tier === 'team' || tier === 'pro_team' ? 'My Team' : 'Garage'
  const { data: karts, loading, refetch } = useKarts()
  const { data: sessions } = useSessions()
  const [addOpen, setAddOpen]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [selected, setSelected]     = useState<Kart | null>(null)
  const [editing, setEditing]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError]     = useState<string | null>(null)

  const [form, setForm]       = useState<FormState>(blankForm())
  const [engines, setEngines] = useState<EngineEntry[]>([emptyEngine(1)])

  function openAdd() {
    setForm(blankForm())
    setEngines([emptyEngine(1)])
    setAddOpen(true)
  }

  function openEdit(kart: Kart) {
    setForm(kartToForm(kart))
    setEngines(kartToEngineEntries(kart))
    setEditing(true)
  }

  function buildEngineList(): KartEngine[] {
    return engines
      .filter(e => e.make.trim())
      .map(e => ({ id: e.id, make: e.make.trim(), number: e.number.trim(), rank: Number(e.rank) }))
  }

  async function saveNew() {
    if (!form.kart_make.trim() || !form.kart_model.trim()) return
    setSaving(true)
    const nickname   = `${form.kart_make.trim()} ${form.kart_model.trim()}`
    const primaryEng = engines[0]
    await supabase.from('karts').insert({
      user_id:           user!.id,
      nickname,
      chassis_type:      nickname,
      engine_type:       primaryEng?.make.trim() || '',
      driver_name:       form.driver_name.trim() || null,
      kart_make:         form.kart_make.trim(),
      kart_model:        form.kart_model.trim(),
      kart_class:        form.kart_class.trim() || null,
      chassis_number:    form.chassis_number.trim() || null,
      chassis_stiffness: form.chassis_stiffness,
      phone_number:      form.phone_number.trim() || null,
      engine_make:       primaryEng?.make.trim() || null,
      engine_number:     primaryEng?.number.trim() || null,
      engines:           buildEngineList(),
      notes:             form.notes.trim() || null,
    })
    await refetch()
    setAddOpen(false)
    setSaving(false)
  }

  async function saveEdit() {
    if (!selected || !form.kart_make.trim() || !form.kart_model.trim()) return
    setSaving(true)
    const nickname   = `${form.kart_make.trim()} ${form.kart_model.trim()}`
    const primaryEng = engines[0]
    await supabase.from('karts').update({
      nickname,
      chassis_type:      nickname,
      engine_type:       primaryEng?.make.trim() || '',
      driver_name:       form.driver_name.trim() || null,
      kart_make:         form.kart_make.trim(),
      kart_model:        form.kart_model.trim(),
      kart_class:        form.kart_class.trim() || null,
      chassis_number:    form.chassis_number.trim() || null,
      chassis_stiffness: form.chassis_stiffness,
      phone_number:      form.phone_number.trim() || null,
      engine_make:       primaryEng?.make.trim() || null,
      engine_number:     primaryEng?.number.trim() || null,
      engines:           buildEngineList(),
      notes:             form.notes.trim() || null,
    }).eq('id', selected.id)
    await refetch()
    setEditing(false)
    setSelected(null)
    setSaving(false)
  }

  async function deleteDriver() {
    if (!selected) return

    // Only enforce the 30-day cooldown when the user is at (or over) their tier's driver limit,
    // i.e. they're deleting to free up a slot for a swap rather than just trimming the roster.
    const tierLimit = tier ? TIER_DRIVER_LIMITS[tier] : Infinity
    const atLimit = karts.length >= tierLimit

    if (atLimit && subscription?.last_kart_deleted_at) {
      const daysSince = (Date.now() - new Date(subscription.last_kart_deleted_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince < 30) {
        const daysLeft = Math.ceil(30 - daysSince)
        setDeleteError(`You can only swap one driver per month when at your plan's limit. Available again in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`)
        return
      }
    }

    setSaving(true)
    const { error: delErr } = await supabase.from('karts').delete().eq('id', selected.id)
    if (delErr) {
      setDeleteError(delErr.message + ' (code: ' + delErr.code + ')')
      setSaving(false)
      return
    }
    // Only stamp the cooldown timestamp when a limit-swap deletion occurs
    if (atLimit) {
      await supabase.from('subscriptions').update({ last_kart_deleted_at: new Date().toISOString() }).eq('user_id', user!.id)
    }
    await Promise.all([refetch(), refetchSub()])
    setSelected(null)
    setConfirmDelete(false)
    setDeleteError(null)
    setSaving(false)
  }

  function kartSessions(kartId: string) {
    return sessions.filter(s => s.kart_id === kartId)
  }

  const driverLimit = tier ? TIER_DRIVER_LIMITS[tier] : null
  const driverCount = karts.length

  return (
    <PageWrapper
      title={pageTitle}
      action={
        <div className="flex items-center gap-3">
          {driverLimit && (tier === 'team' || tier === 'pro_team') && (
            <span className={`text-sm font-mono font-bold ${driverCount >= driverLimit ? 'text-accent-secondary' : 'text-text-muted'}`}>
              {driverCount}/{driverLimit} Drivers
            </span>
          )}
          <Button variant="secondary" size="sm" onClick={() => navigate('/race-weekend/new')}>
            <Flag size={14} className="inline mr-1" /> Race Weekend
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus size={14} /> Add Driver
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="text-text-muted text-sm">Loading…</div>
      ) : karts.length === 0 ? (
        <div className="text-center py-16">
          <Wrench size={40} className="text-text-muted mx-auto mb-4 opacity-40" />
          <p className="text-text-muted text-sm mb-4">No drivers added yet.</p>
          <Button onClick={openAdd}><Plus size={14} /> Add your first driver</Button>
        </div>
      ) : (() => {
        // Group karts by kart_class
        const groups: Record<string, Kart[]> = {}
        for (const kart of karts) {
          const key = kart.kart_class?.trim() || 'Unassigned'
          if (!groups[key]) groups[key] = []
          groups[key].push(kart)
        }
        return (
          <div className="space-y-8">
            {Object.entries(groups).map(([className, groupKarts]) => (
              <div key={className}>
                <h2 className="font-heading text-sm font-bold uppercase tracking-widest text-accent-primary mb-3 border-b border-border-color pb-2">
                  {className}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupKarts.map(kart => {
                    const ks = kartSessions(kart.id)
                    const bestLaps = ks.filter(s => s.best_lap_time_ms !== null)
                    const best = bestLaps.length > 0 ? Math.min(...bestLaps.map(s => s.best_lap_time_ms!)) : null
                    return (
                      <Card key={kart.id} onClick={() => setSelected(kart)} className="hover:border-accent-primary/30 transition-colors">
                        <h3 className="font-heading font-bold text-lg text-text-primary mb-0.5">
                          {kart.driver_name ?? kart.nickname}
                        </h3>
                        <p className="text-xs text-text-muted">
                          {[kart.kart_make, kart.kart_model].filter(Boolean).join(' · ')}
                        </p>
                        <div className="flex gap-3 mt-3 text-xs">
                          <span className="text-text-muted">{ks.length} session{ks.length !== 1 ? 's' : ''}</span>
                          {best && <span className="text-accent-primary font-mono">Best: {lapMsToString(best)}</span>}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Driver detail modal */}
      {selected && !editing && (
        <Modal isOpen onClose={() => setSelected(null)} title={selected.driver_name ?? selected.nickname}>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Button size="sm" onClick={() => openEdit(selected)}>
                <Pencil size={13} /> Edit
              </Button>
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => { setConfirmDelete(true); setDeleteError(null) }}
                  className="text-xs text-accent-secondary hover:underline cursor-pointer"
                >
                  Delete Driver
                </button>
              ) : (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setConfirmDelete(false); setDeleteError(null) }} className="text-xs text-text-muted hover:text-text-primary cursor-pointer">
                      Cancel
                    </button>
                    <button type="button" onClick={() => void deleteDriver()} className="text-xs text-accent-secondary font-bold hover:underline cursor-pointer">
                      {saving ? 'Deleting…' : 'Confirm Delete'}
                    </button>
                  </div>
                  {deleteError && <p className="text-xs text-accent-secondary text-right max-w-xs">{deleteError}</p>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-text-muted text-xs font-heading mb-1">Kart Make</p>
                <p className="text-text-primary">{selected.kart_make ?? '—'}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs font-heading mb-1">Kart Model</p>
                <p className="text-text-primary">{selected.kart_model ?? '—'}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs font-heading mb-1">Kart Class</p>
                <p className="text-text-primary">{selected.kart_class ?? '—'}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs font-heading mb-1">Chassis Number</p>
                <p className="text-text-primary">{selected.chassis_number ?? '—'}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs font-heading mb-1">Chassis Stiffness</p>
                <p className="text-text-primary">{selected.chassis_stiffness ?? '—'}</p>
              </div>
            </div>

            {selected.engines?.length > 0 && (
              <div className="border-t border-border-color pt-3">
                <p className="font-heading text-xs uppercase tracking-wider text-text-muted mb-2">Engines</p>
                <div className="space-y-2">
                  {selected.engines.map(eng => (
                    <div key={eng.id} className="bg-bg-elevated rounded-card px-3 py-2 text-xs">
                      <span className="font-heading font-bold text-text-primary">#{eng.rank} — {eng.make || '—'}</span>
                      <div className="mt-1 text-text-muted">
                        <span>Number: <span className="text-text-primary">{eng.number || '—'}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                          <span className="text-accent-primary font-mono text-xs">{lapMsToString(s.best_lap_time_ms)}</span>
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

      {/* Edit Driver Modal */}
      {selected && editing && (
        <Modal isOpen onClose={() => { setEditing(false); setSelected(null) }} title="Edit Driver">
          <DriverForm
            form={form} setForm={setForm}
            engines={engines} setEngines={setEngines}
            saving={saving}
            onSave={() => void saveEdit()}
            onCancel={() => { setEditing(false); setSelected(null) }}
          />
        </Modal>
      )}

      {/* Add Driver Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Driver">
        <DriverForm
          form={form} setForm={setForm}
          engines={engines} setEngines={setEngines}
          saving={saving}
          onSave={() => void saveNew()}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>
    </PageWrapper>
  )
}
