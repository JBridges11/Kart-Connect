import { useState, useEffect, useRef } from 'react'
import { Upload, Clock, Trash2, ChevronDown, AlertCircle, Loader, Library } from 'lucide-react'
import { BRAND_LABELS, BRAND_COLORS, type ParseResult } from '@/lib/dataLoggerImport'
import {
  listSessions,
  loadSession,
  uploadSession,
  deleteSession,
  type SessionMeta,
} from '@/lib/sessionLibrary'

interface Props {
  userId: string
  onSession: (result: ParseResult) => void
  disabled?: boolean
}

function fmtDuration(s: number | null): string {
  if (s == null) return ''
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function SessionPicker({ userId, onSession, disabled }: Props) {
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listSessions().then(s => { setSessions(s); setLoading(false) })
  }, [])

  // Close panel on outside click
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    const file = files[0]
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (ext !== 'csv' && ext !== 'ocd') {
      setError('Unsupported file — drop a .csv or .ocd file')
      return
    }
    setError(null)
    setUploading(true)
    const res = await uploadSession(file, userId)
    setUploading(false)
    if ('error' in res) { setError(res.error); return }
    setSessions(prev => [res.meta, ...prev])
    onSession(res.result)
    setOpen(false)
  }

  async function handleSelect(meta: SessionMeta) {
    setLoadingId(meta.id)
    const result = await loadSession(meta)
    setLoadingId(null)
    if (result.type === 'error') { setError(result.error); return }
    onSession(result)
    setOpen(false)
  }

  async function handleDelete(e: React.MouseEvent, meta: SessionMeta) {
    e.stopPropagation()
    await deleteSession(meta)
    setSessions(prev => prev.filter(s => s.id !== meta.id))
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-card border border-dashed border-border-color text-xs text-text-muted hover:border-accent-primary hover:text-accent-primary transition-colors disabled:opacity-40"
      >
        <Library size={13} />
        <span className="flex-1 text-left">
          {sessions.length > 0 ? `${sessions.length} saved session${sessions.length !== 1 ? 's' : ''}` : 'Session library'}
        </span>
        <ChevronDown size={12} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-bg-elevated border border-border-color rounded-card shadow-xl overflow-hidden">

          {/* Upload drop zone */}
          <div
            onDrop={e => { e.preventDefault(); setDragging(false); void handleFiles(e.dataTransfer.files) }}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileRef.current?.click()}
            className={[
              'flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors border-b border-border-color text-xs',
              dragging ? 'bg-accent-primary/10 text-accent-primary' : 'hover:bg-bg-card text-text-muted hover:text-text-primary',
            ].join(' ')}
          >
            {uploading ? <Loader size={13} className="animate-spin shrink-0" /> : <Upload size={13} className="shrink-0" />}
            <span>{uploading ? 'Uploading…' : 'Upload new file (.csv or .ocd)'}</span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.ocd"
              className="hidden"
              onChange={e => void handleFiles(e.target.files)}
            />
          </div>

          {/* Session list */}
          <div className="max-h-60 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-text-muted">
                <Loader size={13} className="animate-spin" /> Loading…
              </div>
            )}
            {!loading && sessions.length === 0 && (
              <p className="text-center py-6 text-xs text-text-muted">No saved sessions yet</p>
            )}
            {sessions.map(meta => {
              const brand = meta.brand as keyof typeof BRAND_LABELS
              const color = BRAND_COLORS[brand] ?? '#888'
              const isLoading = loadingId === meta.id
              return (
                <button
                  key={meta.id}
                  type="button"
                  disabled={!!loadingId}
                  onClick={() => void handleSelect(meta)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-bg-card transition-colors text-left border-b border-border-color/50 last:border-0 disabled:opacity-50"
                >
                  {/* Brand dot */}
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">{meta.filename}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {BRAND_LABELS[brand] ?? meta.brand}
                      {meta.lap_count != null && <> · {meta.lap_count} lap{meta.lap_count !== 1 ? 's' : ''}</>}
                      {meta.duration_s != null && <> · {fmtDuration(meta.duration_s)}</>}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-text-muted flex items-center gap-1">
                      <Clock size={10} />{fmtDate(meta.created_at)}
                    </span>
                    {isLoading
                      ? <Loader size={12} className="animate-spin text-accent-primary" />
                      : (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={e => void handleDelete(e as unknown as React.MouseEvent, meta)}
                          onKeyDown={e => e.key === 'Enter' && void handleDelete(e as unknown as React.MouseEvent, meta)}
                          className="text-text-muted hover:text-red-400 transition-colors p-0.5 rounded"
                        >
                          <Trash2 size={11} />
                        </span>
                      )
                    }
                  </div>
                </button>
              )
            })}
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 border-t border-border-color text-xs text-red-400">
              <AlertCircle size={11} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
