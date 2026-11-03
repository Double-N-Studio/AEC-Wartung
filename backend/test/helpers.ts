// Test setup: in-memory database, temp data directory, adjustable clock, accounts and sessions without the HTTP round trip.
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomToken } from '../src/auth.js'
import { createApp } from '../src/app.js'
import { openDb, type Db } from '../src/db.js'
import { createEvents } from '../src/events.js'
import { sessions } from '../src/schema.js'
import { bumpRev, putRecord, type User } from '../src/state.js'

export const ADMIN: User = { id: 'admin', name: 'Anna Admin', role: 'admin', email: 'anna@example.org' }
export const LEAD: User = { id: 'lead', name: 'Werner Leiter', role: 'wl', email: 'werner@example.org' }
export const LEAD2: User = { id: 'lead2', name: 'Wanda Leiterin', role: 'wl', email: 'wanda@example.org' }
export const MEMBER: User = { id: 'member', name: 'Max Mitglied', role: 'user' }
export const MEMBER2: User = { id: 'member2', name: 'Mia Mitglied', role: 'user' }
export const TABLET: User = { id: 'tablet', name: 'Werkstatt-Tablet', role: 'wl', email: 'werkstatt@example.org', device: true }

export function setup(start = '2026-11-07T10:00:00Z') {
  const db = openDb(':memory:')
  const dataDir = mkdtempSync(join(tmpdir(), 'wartung-test-'))
  const clock = { now: new Date(start) }
  const events = createEvents()
  const app = createApp({ db, dataDir, now: () => clock.now, events })
  return { db, dataDir, clock, app, events }
}

/** Writes records directly (as the server would have stored them), as one revision. */
export function put(db: Db, coll: string, values: object[], clientId: string | null = 'seed') {
  db.transaction((tx) => {
    const rev = bumpRev(tx)
    for (const v of values) putRecord(tx, coll, coll === 'season' ? 'season' : (v as { id: string }).id, v, rev, { clientId, userId: null, at: '' })
  })
}

/** Cookie header of a fresh session for the account. */
export function login(db: Db, user: User, auth: 'name' | 'password' = user.role === 'user' && !user.device ? 'name' : 'password') {
  const id = randomToken()
  db.insert(sessions).values({ id, userId: user.id, auth, createdAt: new Date().toISOString(), lastSeenAt: new Date().toISOString() }).run()
  return { Cookie: `wartung_session=${id}` }
}

let batchNo = 0

export interface PushOptions {
  id?: string
  clientId?: string
  baseRev?: number
  at?: string
}

export async function push(
  app: ReturnType<typeof createApp>, headers: Record<string, string> | null,
  changes: { coll: string; id: string; value: unknown }[], opts: PushOptions = {},
) {
  const batch = {
    id: opts.id ?? `batch-${++batchNo}`, clientId: opts.clientId ?? 'device-1', baseRev: opts.baseRev ?? 1_000_000,
    at: opts.at ?? '2026-11-07T11:00', changes,
  }
  const res = await app.request('/api/changes', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(batch),
  })
  return { status: res.status, body: (await res.json()) as { rev?: number; error?: string } }
}

export async function getState(app: ReturnType<typeof createApp>) {
  return (await (await app.request('/api/state')).json()) as { rev: number; state: Record<string, any> }
}

export const entry = (who: string, text = 'Eintrag', at = '2026-11-07T11:00') => ({ text, who, at })

export const task = (over: Record<string, unknown> = {}): Record<string, any> => ({
  id: 't1', aircraftId: 'a1', status: 'offen', level: 'ein', title: 'Reifen prüfen', desc: '–', duration: '~1 h',
  checklist: [{ text: 'Luftdruck', done: false }], history: [entry('admin', 'Angelegt', '2026-11-01')], ...over,
})

export const defect = (over: Record<string, unknown> = {}) => ({
  id: 'd1', aircraftId: 'a1', title: 'Kratzer', desc: '–', source: 'befund', photos: [], reportedAt: '2026-11-01',
  reportedBy: 'member', priority: 'Normal', owner: null, status: 'open', history: [entry('member', 'Befund erfasst.', '2026-11-01')],
  ...over,
})

export const aircraft = (over: Record<string, unknown> = {}) => ({
  id: 'a1', type: 'ASK21', reg: 'D-1234', start: '2026-11-07', end: '2026-11-28', ...over,
})
