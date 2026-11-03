import type { AppState } from '../types'

/**
 * The state as records: every list with IDs is a collection, `schedule` is keyed by date,
 * `season` and `vereinsflieger` are single values (ID = name of the collection). Between device and server
 * only whole records travel – created, changed (value) or deleted (value null).
 */
/** Bump on changes to the data model: demo server, device storage and queue of old revisions are then discarded. */
export const MODEL_VERSION = 21

export const LISTS = ['users', 'aircraft', 'tasks', 'templates', 'archive', 'defects', 'deadlines', 'documents', 'inventory', 'orders'] as const
export const SINGLES = ['season', 'vereinsflieger'] as const
export type Collection = (typeof LISTS)[number] | 'schedule' | (typeof SINGLES)[number]

/** Empty state until the first load. The server always delivers all keys, season and vereinsflieger filled in. */
export const emptyState = (): AppState => ({
  users: [], season: { label: '', start: '', end: '' }, aircraft: [], schedule: {}, tasks: [], templates: [], archive: [],
  defects: [], deadlines: [], documents: [], inventory: [], orders: [], vereinsflieger: { lastSync: '' },
})

export interface Change {
  coll: Collection
  id: string
  value: unknown
}

type Plain = Record<string, unknown>
const key = (coll: string, id: string) => `${coll}\u0000${id}`

/** JSON with sorted keys, so equal contents look the same regardless of order. */
export function stable(value: unknown): string {
  return JSON.stringify(value, (_, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, (v as Plain)[k]]))
      : v)
}

/** All records as key → JSON. */
export function records(state: AppState): Map<string, { coll: Collection; id: string; json: string }> {
  const out = new Map<string, { coll: Collection; id: string; json: string }>()
  const add = (coll: Collection, id: string, value: unknown) => out.set(key(coll, id), { coll, id, json: stable(value) })
  for (const coll of LISTS) for (const r of state[coll] as { id: string }[]) add(coll, r.id, r)
  for (const [date, day] of Object.entries(state.schedule)) add('schedule', date, day)
  for (const coll of SINGLES) add(coll, coll, state[coll])
  return out
}

/** What has changed compared to the known state; known is brought up to the new state in the process. */
export function diff(known: Map<string, string>, state: AppState): Change[] {
  const changes: Change[] = []
  const now = records(state)
  for (const [k, r] of now) {
    if (known.get(k) === r.json) continue
    changes.push({ coll: r.coll, id: r.id, value: JSON.parse(r.json) })
    known.set(k, r.json)
  }
  for (const k of [...known.keys()]) {
    if (now.has(k)) continue
    const [coll, id] = k.split('\u0000') as [Collection, string]
    changes.push({ coll, id, value: null })
    known.delete(k)
  }
  return changes
}

export const knownOf = (state: AppState) => new Map([...records(state)].map(([k, r]) => [k, r.json]))

/** Apply changes to a plain (non-reactive) state – for the mock server and own pending changes. */
export function applyChanges(state: AppState, changes: Change[]) {
  for (const { coll, id, value } of changes) {
    if (coll === 'schedule') {
      if (value === null) delete state.schedule[id]
      else state.schedule[id] = value as AppState['schedule'][string]
    } else if ((SINGLES as readonly string[]).includes(coll)) {
      if (value !== null) (state as unknown as Plain)[coll] = value
    } else {
      const list = state[coll as (typeof LISTS)[number]] as { id: string }[]
      const i = list.findIndex((r) => r.id === id)
      if (value === null) { if (i >= 0) list.splice(i, 1) }
      else if (i >= 0) list[i] = value as { id: string }
      else list.push(value as { id: string })
    }
  }
}
