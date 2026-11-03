import { computed, reactive, ref } from 'vue'
import { now } from './utils/date'

/**
 * Verbindungs- und Speicherstatus. Im Mockup ist „der Server“ der localStorage; andere Browser-Tabs
 * spielen andere Geräte. Mit Backend ersetzen API-Aufrufe `sendChanges` und das storage-Ereignis in store.ts.
 */
export const sync = reactive({
  online: navigator.onLine,
  /** Demo: Verbindung abschalten, ohne das Netz zu trennen */
  simulateOffline: false,
  /** Änderungen, die noch nicht beim Server sind */
  pending: 0,
  saving: false,
  savedAt: null as string | null,
})

export const isOffline = () => !sync.online || sync.simulateOffline

let timer: ReturnType<typeof setTimeout> | undefined
/** Kurz „Speichert …“ anzeigen, dann „Gespeichert“. */
function sendChanges() {
  sync.saving = true
  clearTimeout(timer)
  timer = setTimeout(() => {
    sync.saving = false
    sync.pending = 0
    sync.savedAt = now()
  }, 600)
}

/** Vom Store bei jeder lokalen Änderung aufgerufen. Offline bleibt sie in der Warteschlange (auf dem Gerät gespeichert). */
export function noteChange() {
  if (isOffline()) sync.pending += 1
  else sendChanges()
}

function setOnline(online: boolean) {
  sync.online = online
  if (!isOffline() && sync.pending) sendChanges()
}
window.addEventListener('online', () => setOnline(true))
window.addEventListener('offline', () => setOnline(false))

export function setSimulateOffline(off: boolean) {
  sync.simulateOffline = off
  setOnline(sync.online)
}

/* ---------- Änderungen von anderen Geräten ---------- */

/** seq zählt eingespielte Fremdänderungen; changed merkt pro Datensatz-ID, bei welcher zuletzt. */
const remote = reactive({ seq: 0, changed: {} as Record<string, number> })

type Entity = { id: string }
type Plain = Record<string, unknown>
const isPlain = (v: unknown): v is Plain => typeof v === 'object' && v !== null && !Array.isArray(v)
const isEntityList = (v: unknown): v is Entity[] => Array.isArray(v) && v.every((x) => isPlain(x) && typeof x.id === 'string')
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Fremden Stand in den eigenen einarbeiten, ohne Objekte auszutauschen: Listen mit IDs werden pro Datensatz
 * abgeglichen, damit offene Popups und Formulare weiter auf denselben Objekten arbeiten.
 */
function mergeInto(target: Plain, source: Plain, changed: string[]) {
  for (const key of Object.keys(target)) if (!(key in source)) delete target[key]
  for (const [key, value] of Object.entries(source)) {
    const cur = target[key]
    if (isEntityList(cur) && isEntityList(value)) mergeList(cur, value, changed)
    else if (isPlain(cur) && isPlain(value)) mergeInto(cur, value, changed)
    else if (!same(cur, value)) target[key] = value
  }
}

function mergeList(cur: Entity[], next: Entity[], changed: string[]) {
  const byId = new Map(cur.map((x) => [x.id, x]))
  const result = next.map((n) => {
    const old = byId.get(n.id)
    if (!old) return n
    if (!same(old, n)) {
      changed.push(n.id)
      mergeInto(old as Plain, n as Plain, changed)
    }
    return old
  })
  if (!same(cur.map((x) => x.id), result.map((x) => x.id))) cur.splice(0, cur.length, ...result)
}

export function applyRemote(target: Plain, source: Plain) {
  const changed: string[] = []
  mergeInto(target, source, changed)
  remote.seq += 1
  for (const id of changed) remote.changed[id] = remote.seq
}

/**
 * Für Formulare: wurde der Datensatz seit dem Öffnen auf einem anderen Gerät geändert?
 * reset() nach dem Übernehmen des neuen Stands.
 */
export function useChangedElsewhere(id: () => string | undefined) {
  const since = ref(remote.seq)
  const changed = computed(() => {
    const key = id()
    return !!key && (remote.changed[key] ?? 0) > since.value
  })
  return { changed, reset: () => { since.value = remote.seq } }
}
