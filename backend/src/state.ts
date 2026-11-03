// The app state as records (same shape as frontend/src/api/records.ts): lists by `id`, `schedule` keyed by date,
// `season` and `vereinsflieger` as single values whose record ID is the collection name.
import { and, eq, sql } from 'drizzle-orm'
import type { Db } from './db.js'
import { meta, records } from './schema.js'

export const LISTS = ['users', 'aircraft', 'tasks', 'templates', 'archive', 'defects', 'deadlines', 'documents', 'inventory', 'orders'] as const
export const SINGLES = ['season', 'vereinsflieger'] as const
export const COLLECTIONS: readonly string[] = [...LISTS, 'schedule', ...SINGLES]

export type Plain = Record<string, unknown>

export interface User {
  id: string
  name: string
  role: 'admin' | 'wl' | 'user'
  email?: string
  device?: boolean
  removed?: boolean
}

export interface HistoryEntry {
  text: string
  who: string
  at: string
}

/** Who stored a record: the device (clientId) and account; null for changes by the server itself. */
export interface Origin {
  clientId: string | null
  userId: string | null
  at: string
}

export const needsPassword = (u: User) => !!u.device || u.role !== 'user'

const DEFAULTS: Record<string, Plain> = {
  season: { label: '', start: '', end: '' },
  vereinsflieger: { lastSync: '' },
}

/** The whole state, lists in insertion order. */
export function loadState(db: Db): Plain {
  const state: Plain = { schedule: {}, ...Object.fromEntries(LISTS.map((l) => [l, []])), ...structuredClone(DEFAULTS) }
  const rows = db.select({ coll: records.coll, id: records.id, value: records.value }).from(records).orderBy(sql`rowid`).all()
  for (const r of rows) {
    const value = JSON.parse(r.value) as Plain
    if (r.coll === 'schedule') (state.schedule as Plain)[r.id] = value
    else if ((SINGLES as readonly string[]).includes(r.coll)) state[r.coll] = value
    else if (Array.isArray(state[r.coll])) (state[r.coll] as Plain[]).push(value)
  }
  return state
}

export interface StoredRecord {
  value: Plain
  rev: number
  clientId: string | null
}

export function getRecord(db: Db, coll: string, id: string): StoredRecord | undefined {
  const row = db.select().from(records).where(and(eq(records.coll, coll), eq(records.id, id))).get()
  return row && { value: JSON.parse(row.value) as Plain, rev: row.rev, clientId: row.clientId }
}

/** All records of a collection, in insertion order. */
export function listRecords<T = Plain>(db: Db, coll: string): T[] {
  return db.select({ value: records.value }).from(records).where(eq(records.coll, coll)).orderBy(sql`rowid`).all()
    .map((r) => JSON.parse(r.value) as T)
}

export const users = (db: Db) => listRecords<User>(db, 'users')
export const userById = (db: Db, id: string) => getRecord(db, 'users', id)?.value as User | undefined

/** Upsert, so the rowid (and with it the order) of an existing record stays the same. */
export function putRecord(db: Db, coll: string, id: string, value: unknown, rev: number, origin: Origin) {
  const row = { value: JSON.stringify(value), rev, clientId: origin.clientId, updatedBy: origin.userId, updatedAt: origin.at }
  db.insert(records).values({ coll, id, ...row }).onConflictDoUpdate({ target: [records.coll, records.id], set: row }).run()
}

export function deleteRecord(db: Db, coll: string, id: string) {
  db.delete(records).where(and(eq(records.coll, coll), eq(records.id, id))).run()
}

export function getRev(db: Db): number {
  return Number(db.select().from(meta).where(eq(meta.key, 'rev')).get()?.value ?? 0)
}

/** Next revision; call inside a transaction. */
export function bumpRev(db: Db): number {
  const rev = getRev(db) + 1
  db.insert(meta).values({ key: 'rev', value: String(rev) }).onConflictDoUpdate({ target: meta.key, set: { value: String(rev) } }).run()
  return rev
}

/** Local date and time of the club (YYYY-MM-DD, YYYY-MM-DDTHH:mm), independent of the server's time zone. */
export function localDate(d: Date) {
  return d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })
}
export function localDateTime(d: Date) {
  return `${localDate(d)}T${d.toLocaleTimeString('sv-SE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })}`
}
