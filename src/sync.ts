import { computed, reactive, ref, watch } from 'vue'
import type { AppState } from './types'
import { backend, type Batch, type PushResult } from './api/backend'
import { flushFiles } from './api/files'
import { applyChanges, type Change, diff, knownOf, MODEL_VERSION } from './api/records'
import { notify } from './notify'
import { now } from './utils/date'
import { newId } from './utils/id'

/**
 * Sync between device and server. The store only changes its state; here, after every action,
 * what has changed is compared and queued as a batch. The queue
 * lives in device storage and goes out in order, later when offline. Changes from other devices are reported by the
 * server via `subscribe`; then the state is reloaded and our own pending changes are applied on top.
 */
export const sync = reactive({
  /** A state is available (from the server or from device storage). */
  ready: false,
  /** Neither server nor stored state – the app cannot show anything. */
  loadError: '',
  online: navigator.onLine,
  /** Demo: switch off the connection without disconnecting the network */
  simulateOffline: false,
  /** Server reached on the last attempt */
  reachable: true,
  /** Batches that have not reached the server yet */
  pending: 0,
  saving: false,
  savedAt: null as string | null,
})

const canSend = () => sync.online && !sync.simulateOffline
export const isOffline = () => !canSend() || !sync.reachable

const QUEUE_KEY = `aec-winterwartung-warteschlange-v${MODEL_VERSION}`
const CACHE_KEY = `aec-winterwartung-stand-v${MODEL_VERSION}`
/** This tab or device, so the server does not treat our own changes as a conflict. */
const clientId = newId()

let target: AppState | null = null
/** Server revision the state here is based on */
let rev = 0
/** Known state of every record (server plus own pending changes) – baseline for diff */
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
    // Full or locked: then after a reload while offline, nothing that is already on the server is lost.
  }
}
const saveQueue = () => writeLocal(QUEUE_KEY, queue)
let cacheTimer: ReturnType<typeof setTimeout> | undefined
function saveCache() {
  clearTimeout(cacheTimer)
  cacheTimer = setTimeout(() => writeLocal(CACHE_KEY, { rev, state: target }), 300)
}
const pendingChanges = (): Change[] => queue.flatMap((b) => b.changes)

/** Adopt a new state without swapping objects (open popups keep their records). */
function adopt(next: AppState) {
  known = knownOf(next)
  applyRemote(target as unknown as Plain, next as unknown as Plain)
}

/** After every action: what is new? Runs batched per tick, so one action yields one batch. */
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

/* ---------- Sending ---------- */

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

/** Send the queue in order. Rejected batches are dropped; afterwards the server state is loaded. */
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
        // Someone else changed something in between – we fetch that right away.
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

/* ---------- Loading ---------- */

let refreshing: Promise<void> | null = null
let again = false

/** Fetch the state from the server and apply our own pending changes on top. */
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

/** On startup: show the stored state immediately (even offline), then reload from the server. */
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
  // Tablets sleep; on waking up, check what has happened.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void refresh() })
  await refresh()
  await flush()
}

/** After actions the server performs itself (create account, Vereinsflieger), or in the demo after resetting. */
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

/* ---------- Changes from other devices ---------- */

/** seq counts applied remote changes; changed remembers per record ID at which one it last changed. */
const remote = reactive({ seq: 0, changed: {} as Record<string, number> })

type Entity = { id: string }
type Plain = Record<string, unknown>
const isPlain = (v: unknown): v is Plain => typeof v === 'object' && v !== null && !Array.isArray(v)
const isEntityList = (v: unknown): v is Entity[] => Array.isArray(v) && v.every((x) => isPlain(x) && typeof x.id === 'string')
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Merge a remote state into our own without swapping objects: lists with IDs are reconciled per record
 * so that open popups and forms keep working on the same objects.
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
 * For forms: has the record been changed on another device since opening?
 * reset() after adopting the new state.
 */
export function useChangedElsewhere(id: () => string | undefined) {
  const since = ref(remote.seq)
  const changed = computed(() => {
    const key = id()
    return !!key && (remote.changed[key] ?? 0) > since.value
  })
  return { changed, reset: () => { since.value = remote.seq } }
}
