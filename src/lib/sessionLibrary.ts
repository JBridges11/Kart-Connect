import { supabase } from './supabase'
import { parseCSVAny, parseOCDBinary, type ParseResult } from './dataLoggerImport'

export interface SessionMeta {
  id: string
  filename: string
  brand: string
  lap_count: number | null
  duration_s: number | null
  created_at: string
  storage_path: string
}

// Upload a file to Storage, parse it locally, save metadata row, return ParseResult
export async function uploadSession(
  file: File,
  userId: string,
): Promise<{ result: ParseResult; meta: SessionMeta } | { error: string }> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const storagePath = `${userId}/${crypto.randomUUID()}.${ext}`

  // Upload raw file
  const { error: uploadErr } = await supabase.storage
    .from('session-files')
    .upload(storagePath, file, { upsert: false })
  if (uploadErr) return { error: `Upload failed: ${uploadErr.message}` }

  // Parse locally
  let result: ParseResult
  if (ext === 'ocd') {
    const buf = await file.arrayBuffer()
    result = parseOCDBinary(file.name, buf)
  } else {
    const text = await file.text()
    result = parseCSVAny(file.name, text)
  }

  if (result.type === 'error') {
    // Remove the uploaded file since parsing failed
    await supabase.storage.from('session-files').remove([storagePath])
    return { error: result.error }
  }

  // Derive metadata from parsed result
  const sess = result.session
  const lapCount = sess.type === 'lap' ? sess.laps.length : null
  const durationS = sess.type === 'gps' ? sess.durationS : null

  const { data: row, error: insertErr } = await supabase
    .from('sessions')
    .insert({
      user_id:      userId,
      filename:     file.name,
      brand:        sess.brand,
      storage_path: storagePath,
      lap_count:    lapCount,
      duration_s:   durationS,
    })
    .select()
    .single()

  if (insertErr || !row) {
    await supabase.storage.from('session-files').remove([storagePath])
    return { error: `Save failed: ${insertErr?.message ?? 'unknown'}` }
  }

  return { result, meta: row as SessionMeta }
}

// List all sessions for the current user, newest first
export async function listSessions(): Promise<SessionMeta[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, filename, brand, lap_count, duration_s, created_at, storage_path')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error || !data) return []
  return data as SessionMeta[]
}

// Download and parse a saved session
export async function loadSession(meta: SessionMeta): Promise<ParseResult> {
  const { data, error } = await supabase.storage
    .from('session-files')
    .download(meta.storage_path)

  if (error || !data) {
    return { type: 'error', error: `Could not load file: ${error?.message ?? 'not found'}` }
  }

  const ext = meta.storage_path.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'ocd') {
    const buf = await data.arrayBuffer()
    return parseOCDBinary(meta.filename, buf)
  }
  const text = await data.text()
  return parseCSVAny(meta.filename, text)
}

// Delete a session (Storage + metadata row)
export async function deleteSession(meta: SessionMeta): Promise<void> {
  await supabase.storage.from('session-files').remove([meta.storage_path])
  await supabase.from('sessions').delete().eq('id', meta.id)
}
