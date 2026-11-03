import { computed, reactive, ref, watch } from 'vue'
import type { AppState } from './types'
import { backend, type Batch, type PushResult } from './api/backend'
import { flushFiles } from './api/files'
import { applyChanges, type Change, diff, knownOf, MODEL_VERSION } from './api/records'
import { notify } from './notify'
import { now } from './utils/date'
import { newId } from './utils/id'

/**
 * Abgleich zwischen Gerät und Server. Der Store ändert nur seinen Zustand; hier wird nach jeder Aktion
 * verglichen, was sich geändert hat, und das als Sendung (Batch) in die Warteschlange gestellt. Die Warteschlange
 * liegt im Gerätespeicher und geht der Reihe nach raus, offline eben später. Änderungen anderer Geräte meldet der
 * Server über `subscribe`; dann wird der Stand neu geladen und die eigenen wartenden Änderungen darübergelegt.
 */
export const sync = reactive({
  /** Ein Stand ist da (vom Server oder aus dem Gerätespeicher). */
  ready: false,
  /** Weder Server noch gespeicherter Stand – die App kann nichts anzeigen. */
  loadError: '',
  online: navigator.onLine,
  /** Demo: Verbindung abschalten, ohne das Netz zu trennen */
  simulateOffline: false,
  /** Server beim letzten Versuch erreicht */
  reachable: true,
  /** Sendungen, die noch nicht beim Server sind */
  pending: 0,
  saving: false,
  savedAt: null as string | null,
})

const canSend = () => sync.online && !sync.simulateOffline
export const isOffline = () => !canSend() || !sync.reachable

const QUEUE_KEY = `aec-winterwartung-warteschlange-v${MODEL_VERSION}`
const CACHE_KEY = `aec-winterwartung-stand-v${MODEL_VERSION}`
/** Dieser Tab bzw. dieses Gerät, damit der Server eigene Änderungen nicht als Konflikt wertet. */
const clientId = newId()

let target: AppState | null = null
/** Server-Stand, auf dem der Zustand hier beruht */
let rev = 0
/** Bekannter Stand jedes Datensatzes (Server plus eigene wartende Änderungen) – Vergleichsbasis für diff */
let known = new Map<string, string>()
let queue: Batch[] = []

function readLocal<T>(key: string): T | null {
  try {
    const raw = backend.local.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
function writeLocal(key: string, value: unknown) {
  try {
    backend.local.setItem(key, JSON.stringify(value))
  } catch {
    // Voll oder gesperrt: dann geht nach einem Neuladen offline nichts verloren, was schon beim Server ist.
  }
}
const saveQueue = () => writeLocal(QUEUE_KEY, queue)
let cacheTimer: ReturnType<typeof setTimeout> | undefined
function saveCache() {
  clearTimeout(cacheTimer)
  cacheTimer = setTimeout(() => writeLocal(CACHE_KEY, { rev, state: target }), 300)
}
const pendingChanges = (): Change[] => queue.flatMap((b) => b.changes)

/** Neuen Stand übernehmen, ohne Objekte auszutauschen (offene Popups behalten ihre Datensätze). */
function adopt(next: AppState) {
  known = knownOf(next)
  applyRemote(target as unknown as Plain, next as unknown as Plain)
}

/** Nach jeder Aktion: was ist neu? Läuft gebündelt pro Tick, eine Aktion ergibt also eine Sendung. */
function capture() {
  if (!target || !sync.ready) return
  const changes = diff(known, target)
  if (!changes.length) return
  queue.push({ id: newId(), clientId, baseRev: rev, at: now(), changes })
  sync.pending = queue.length
  saveQueue()
  saveCache()
  void flush()
}

/* ---------- Senden ---------- */

let flushing = false
let retryTimer: ReturnType<typeof setTimeout> | undefined
let retryDelay = 3000

function unreachable() {
  sync.reachable = false
  clearTimeout(retryTimer)
  retryTimer = setTimeout(() => { void flush().then(refresh) }, retryDelay)
  retryDelay = Math.min(retryDelay * 2, 60_000)
}
function reached() {
  sync.reachable = true
  retryDelay = 3000
}

const LABELS: Partial<Record<Change['coll'], string>> = {
  tasks: 'Kanban-Karte', defects: 'Mangel/Befund', orders: 'Bestellung', inventory: 'Artikel', schedule: 'Werkstatttag',
  documents: 'Dokument', aircraft: 'Flugzeug', users: 'Konto', templates: 'Vorlage', season: 'Saison',
}
function describe(c: Change) {
  const v = c.value as { title?: string; name?: string } | null
  const name = v?.title ?? v?.name
  return `${LABELS[c.coll] ?? 'Eintrag'}${name ? ` „${name}“` : ''}`
}
function rejected(batch: Batch, result: Exclude<PushResult, { ok: true }>) {
  const what = batch.changes.length ? describe(batch.changes[0]) : 'Änderung'
  if (result.reason === 'conflict') notify(`${what} wurde inzwischen auf einem anderen Gerät geändert. Deine Änderung ist nicht gespeichert – der aktuelle Stand ist geladen.`)
  else notify(`${what}: nicht gespeichert (${result.message}).`)
}

/** Warteschlange der Reihe nach senden. Abgelehnte Sendungen fallen weg; danach wird der Server-Stand geladen. */
async function flush() {
  if (flushing || !canSend() || !queue.length) return
  flushing = true
  sync.saving = true
  let reload = false
  try {
    await flushFiles()
    while (queue.length && canSend()) {
      const batch = queue[0]
      const result = await backend.push(batch)
      reached()
      queue.shift()
      sync.pending = queue.length
      saveQueue()
      if (result.ok) {
        // Dazwischen hat jemand anderes etwas geändert – das holen wir gleich mit.
        if (result.rev > rev + 1) reload = true
        rev = Math.max(rev, result.rev)
      } else {
        reload = true
        rejected(batch, result)
      }
    }
    sync.savedAt = now()
  } catch {
    unreachable()
  } finally {
    flushing = false
    sync.saving = false
  }
  if (reload) await refresh()
}

/* ---------- Laden ---------- */

let refreshing: Promise<void> | null = null
let again = false

/** Stand vom Server holen und die eigenen wartenden Änderungen darüberlegen. */
export function refresh(): Promise<void> {
  if (!canSend()) return Promise.resolve()
  if (refreshing) {
    again = true
    return refreshing
  }
  refreshing = (async () => {
    try {
      do {
        again = false
        const snap = await backend.load()
        reached()
        applyChanges(snap.state, pendingChanges())
        rev = snap.rev
        adopt(snap.state)
        sync.ready = true
        sync.loadError = ''
        saveCache()
      } while (again)
    } catch (e) {
      if (!sync.ready) sync.loadError = e instanceof Error ? e.message : 'Server nicht erreichbar'
      unreachable()
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

/** Beim Start: gespeicherten Stand sofort zeigen (auch offline), dann beim Server nachladen. */
export async function connect(state: AppState) {
  target = state
  queue = readLocal<Batch[]>(QUEUE_KEY) ?? []
  sync.pending = queue.length
  const cached = readLocal<{ rev: number; state: AppState }>(CACHE_KEY)
  if (cached?.state) {
    applyChanges(cached.state, pendingChanges())
    rev = cached.rev
    adopt(cached.state)
    sync.ready = true
  }
  watch(state, capture, { deep: true })
  backend.subscribe((r) => { if (r > rev) void refresh() })
  window.addEventListener('online', () => setOnline(true))
  window.addEventListener('offline', () => setOnline(false))
  // Tablets schlafen; beim Aufwachen nachsehen, was sich getan hat.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void refresh() })
  await refresh()
  await flush()
}

/** Nach Aktionen, die der Server selbst ausführt (Konto anlegen, Vereinsflieger), oder in der Demo nach dem Zurücksetzen. */
export function discardQueue() {
  queue = []
  sync.pending = 0
  saveQueue()
}

function setOnline(online: boolean) {
  sync.online = online
  if (canSend()) void flush().then(refresh)
}

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

function applyRemote(target: Plain, source: Plain) {
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
