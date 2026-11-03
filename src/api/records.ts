import type { AppState } from '../types'

/**
 * Der Zustand als Datensätze: jede Liste mit IDs ist eine Sammlung, `schedule` ist nach Datum geordnet,
 * `season` und `vereinsflieger` sind Einzelwerte (ID = Name der Sammlung). Zwischen Gerät und Server
 * wandern nur ganze Datensätze – angelegt, geändert (value) oder gelöscht (value null).
 */
/** Bei Änderungen am Datenmodell hochzählen: Demo-Server, Gerätespeicher und Warteschlange alter Stände werden dann verworfen. */
export const MODEL_VERSION = 21

export const LISTS = ['users', 'aircraft', 'tasks', 'templates', 'archive', 'defects', 'deadlines', 'documents', 'inventory', 'orders'] as const
export const SINGLES = ['season', 'vereinsflieger'] as const
export type Collection = (typeof LISTS)[number] | 'schedule' | (typeof SINGLES)[number]

/** Leerer Zustand bis zum ersten Laden. Der Server liefert immer alle Schlüssel, season und vereinsflieger ausgefüllt. */
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

/** JSON mit sortierten Schlüsseln, damit gleiche Inhalte unabhängig von der Reihenfolge gleich aussehen. */
export function stable(value: unknown): string {
  return JSON.stringify(value, (_, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, (v as Plain)[k]]))
      : v)
}

/** Alle Datensätze als Schlüssel → JSON. */
export function records(state: AppState): Map<string, { coll: Collection; id: string; json: string }> {
  const out = new Map<string, { coll: Collection; id: string; json: string }>()
  const add = (coll: Collection, id: string, value: unknown) => out.set(key(coll, id), { coll, id, json: stable(value) })
  for (const coll of LISTS) for (const r of state[coll] as { id: string }[]) add(coll, r.id, r)
  for (const [date, day] of Object.entries(state.schedule)) add('schedule', date, day)
  for (const coll of SINGLES) add(coll, coll, state[coll])
  return out
}

/** Was sich gegenüber dem bekannten Stand geändert hat; known wird dabei auf den neuen Stand gebracht. */
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

/** Änderungen in einen einfachen (nicht reaktiven) Zustand einspielen – für den Mock-Server und eigene wartende Änderungen. */
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
