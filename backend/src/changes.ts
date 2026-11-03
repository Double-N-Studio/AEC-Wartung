// POST /changes: one batch = one action of a device, applied all or nothing in one transaction.
import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import type { Session } from './auth.js'
import type { Db } from './db.js'
import { checkChange, type Change } from './rules.js'
import { batches, records } from './schema.js'
import {
  bumpRev, deleteRecord, getRecord, getRev, listRecords, localDate, putRecord, type Origin, type Plain, type User,
} from './state.js'
import { validateChange } from './validate.js'

export const batchSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  baseRev: z.number(),
  at: z.string(),
  changes: z.array(z.object({ coll: z.string(), id: z.string(), value: z.record(z.string(), z.unknown()).nullable() })),
})
export type Batch = z.infer<typeof batchSchema>

export type BatchResult = { status: 200; rev: number } | { status: 401 | 403 | 409 | 422; error: string }

/** Steps 2–7 of the contract: retry, session, conflict, validation and permissions, apply, aircraft cascade. */
export function applyBatch(db: Db, batch: Batch, session: Session | null, now: Date): BatchResult {
  return db.transaction((tx): BatchResult => {
    if (tx.select().from(batches).where(eq(batches.id, batch.id)).get()) return { status: 200, rev: getRev(tx) }
    if (!session) return { status: 401, error: 'Nicht angemeldet' }
    const changes = batch.changes as Change[]

    // Conflict: someone else changed a record of this batch after the device last saw it.
    const old = new Map<string, Plain | undefined>()
    for (const c of changes) {
      const stored = getRecord(tx, c.coll, c.id)
      if (stored && stored.rev > batch.baseRev && stored.clientId !== batch.clientId) {
        return { status: 409, error: `${c.coll}/${c.id} wurde inzwischen geändert` }
      }
      if (!old.has(key(c))) old.set(key(c), stored?.value)
    }

    // Validation and permissions against the state before the batch; the first failure rejects everything.
    const users = accountsAfter(listRecords<User>(tx, 'users'), changes)
    const today = [...new Set([batch.at.slice(0, 10), localDate(now)])]
    const schedule = Object.fromEntries(today.map((d) => [d, getRecord(tx, 'schedule', d)?.value]))
    const ctx = { user: session.user, today, schedule }
    for (const c of changes) {
      const invalid = validateChange(c, users)
      if (invalid) return { status: 422, error: invalid }
      const denied = checkChange(c, old.get(key(c)), ctx)
      if (denied) return { status: 403, error: denied }
    }

    const at = now.toISOString()
    const rev = bumpRev(tx)
    const origin: Origin = { clientId: batch.clientId, userId: session.user.id, at }
    for (const c of changes) {
      if (c.value === null) deleteRecord(tx, c.coll, c.id)
      else putRecord(tx, c.coll, c.id, c.value, rev, origin)
    }
    tx.insert(batches).values({ id: batch.id, rev, receivedAt: at }).run()

    // Deleted aircraft: their defects and deadlines go too, as a revision of the server's own (the device then reloads).
    const gone = new Set(changes.filter((c) => c.coll === 'aircraft' && c.value === null).map((c) => c.id))
    if (!gone.size) return { status: 200, rev }
    const cascade = bumpRev(tx)
    for (const coll of ['defects', 'deadlines']) {
      const ids = listRecords<{ id: string; aircraftId: string }>(tx, coll).filter((r) => gone.has(r.aircraftId)).map((r) => r.id)
      if (ids.length) tx.delete(records).where(and(eq(records.coll, coll), inArray(records.id, ids))).run()
    }
    return { status: 200, rev: cascade }
  }, { behavior: 'immediate' })
}

const key = (c: Change) => `${c.coll}\u0000${c.id}`

/** Accounts as they will be after the batch, for the unique e-mail check. */
function accountsAfter(users: User[], changes: Change[]): User[] {
  const byId = new Map(users.map((u) => [u.id, u]))
  for (const c of changes) if (c.coll === 'users' && c.value) byId.set(c.id, c.value as unknown as User)
  return [...byId.values()]
}

/** A change by the server itself (e.g. an account created on sign-in); returns the new revision. */
export function serverChange(db: Db, coll: string, id: string, value: unknown, now: Date): number {
  return db.transaction((tx) => {
    const rev = bumpRev(tx)
    putRecord(tx, coll, id, value, rev, { clientId: null, userId: null, at: now.toISOString() })
    return rev
  }, { behavior: 'immediate' })
}
