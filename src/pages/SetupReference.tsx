import { useState, useMemo } from 'react'
import { Search, X, AlertTriangle, Info } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card } from '@/components/ui'
import { SETUP_CHANGES, SECTION_LABELS, SECTION_ORDER, type SetupItem } from '@/data/setupChanges'

// Future hook: supabase `setup_notes` table per driver per session
// const { data: notes } = useSetupNotes(sessionId)

function DirectionCard({ dir, side }: { dir: SetupItem['directions'][number]; side: 'left' | 'right' }) {
  const isLeft = side === 'left'
  return (
    <div className={`flex-1 rounded-card p-3 border ${isLeft ? 'border-border-color bg-bg-elevated' : 'border-accent-primary/30 bg-accent-primary/5'}`}>
      <p className={`text-xs font-heading font-bold uppercase tracking-wider mb-1 ${isLeft ? 'text-text-muted' : 'text-accent-primary'}`}>
        {dir.label}
      </p>
      <p className="text-sm text-text-primary leading-relaxed">{dir.effect}</p>
    </div>
  )
}

function SetupCard({ item }: { item: SetupItem }) {
  return (
    <div className="border-b border-border-color last:border-0 py-4">
      <p className="font-heading font-bold text-sm text-text-primary mb-2">{item.name}</p>
      <div className="flex gap-2">
        <DirectionCard dir={item.directions[0]} side="left" />
        <DirectionCard dir={item.directions[1]} side="right" />
      </div>
      {item.notes && (
        <div className="flex items-start gap-1.5 mt-2">
          <AlertTriangle size={11} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-text-muted leading-relaxed">{item.notes}</p>
        </div>
      )}
    </div>
  )
}

export function SetupReferencePage() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SETUP_CHANGES
    return SETUP_CHANGES.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.directions[0].label.toLowerCase().includes(q) ||
      item.directions[0].effect.toLowerCase().includes(q) ||
      item.directions[1].label.toLowerCase().includes(q) ||
      item.directions[1].effect.toLowerCase().includes(q) ||
      (item.notes ?? '').toLowerCase().includes(q)
    )
  }, [query])

  const grouped = useMemo(() => {
    const map: Partial<Record<SetupItem['section'], SetupItem[]>> = {}
    for (const item of filtered) {
      if (!map[item.section]) map[item.section] = []
      map[item.section]!.push(item)
    }
    return SECTION_ORDER.filter(s => map[s]?.length).map(s => ({ section: s, items: map[s]! }))
  }, [filtered])

  return (
    <PageWrapper title="Setup Reference">
      <div className="max-w-2xl mx-auto space-y-5">

        <div className="flex items-start gap-2 bg-bg-elevated rounded-card p-3 border border-border-color">
          <Info size={14} className="text-accent-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-text-muted leading-relaxed">
            Quick reference for what each setup change does. Left card = first direction, right card (highlighted) = second direction.
            Use this trackside to understand a change before making it.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search setup changes, effects…"
            className="w-full bg-bg-card border border-border-color rounded-card pl-9 pr-8 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {grouped.length === 0 ? (
          <Card><p className="text-text-muted text-sm">No results for "{query}".</p></Card>
        ) : (
          grouped.map(({ section, items }) => (
            <div key={section}>
              <h3 className="font-heading text-xs uppercase tracking-widest text-accent-primary mb-2 px-1">
                {SECTION_LABELS[section]}
              </h3>
              <Card className="divide-y-0 px-4 py-0">
                {items.map(item => <SetupCard key={item.id} item={item} />)}
              </Card>
            </div>
          ))
        )}

      </div>
    </PageWrapper>
  )
}
