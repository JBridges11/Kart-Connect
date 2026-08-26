import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

interface KartConnectDB extends DBSchema {
  sessions:   { key: string; value: Record<string, unknown> }
  karts:      { key: string; value: Record<string, unknown> }
  tracks:     { key: string; value: Record<string, unknown> }
  lap_times:  { key: string; value: Record<string, unknown>; indexes: { by_session: string } }
  setups:     { key: string; value: Record<string, unknown>; indexes: { by_session: string } }
  events:     { key: string; value: Record<string, unknown> }
  sync_queue: { key: string; value: SyncOperation }
}

export interface SyncOperation {
  id: string
  table: string
  type: 'insert' | 'update' | 'delete'
  data: Record<string, unknown>
  created_at: string
  retries: number
}

let dbPromise: Promise<IDBPDatabase<KartConnectDB>> | null = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<KartConnectDB>('kart-connect', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('sessions'))   db.createObjectStore('sessions',   { keyPath: 'id' })
        if (!db.objectStoreNames.contains('karts'))      db.createObjectStore('karts',      { keyPath: 'id' })
        if (!db.objectStoreNames.contains('tracks'))     db.createObjectStore('tracks',     { keyPath: 'id' })
        if (!db.objectStoreNames.contains('events'))     db.createObjectStore('events',     { keyPath: 'id' })
        if (!db.objectStoreNames.contains('sync_queue')) db.createObjectStore('sync_queue', { keyPath: 'id' })

        const lapStore   = db.createObjectStore('lap_times', { keyPath: 'id' })
        const setupStore = db.createObjectStore('setups',    { keyPath: 'id' })
        lapStore.createIndex('by_session',   'session_id')
        setupStore.createIndex('by_session', 'session_id')
      },
    })
  }
  return dbPromise
}

type StoreName = 'sessions' | 'karts' | 'tracks' | 'lap_times' | 'setups' | 'events'

export async function cacheAll(store: StoreName, rows: Record<string, unknown>[]) {
  const db = await getDB()
  const tx = db.transaction(store, 'readwrite')
  await Promise.all(rows.map(r => tx.store.put(r)))
  await tx.done
}

export async function getCached(store: StoreName): Promise<Record<string, unknown>[]> {
  const db = await getDB()
  return db.getAll(store)
}

export async function getCachedBySession(
  store: 'lap_times' | 'setups',
  sessionId: string
): Promise<Record<string, unknown>[]> {
  const db = await getDB()
  return db.getAllFromIndex(store, 'by_session', sessionId)
}

export async function enqueueSyncOp(op: Omit<SyncOperation, 'id' | 'created_at' | 'retries'>) {
  const db = await getDB()
  const full: SyncOperation = {
    ...op,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    retries: 0,
  }
  await db.put('sync_queue', full)
  return full
}

export async function getPendingSyncOps(): Promise<SyncOperation[]> {
  const db = await getDB()
  return db.getAll('sync_queue')
}

export async function removeSyncOp(id: string) {
  const db = await getDB()
  await db.delete('sync_queue', id)
}
