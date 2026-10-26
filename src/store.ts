import { reactive, watch } from 'vue'
import type { Aircraft, AppState, Defect, DocumentItem, HistoryEntry, InventoryItem, Order, Role, Season, Task, User, UserId } from './types'
import { initialState } from './mock/data'
import { AVATAR_COLORS, SYSTEM, TABLET } from './mock/people'
import { addDays, fmtDate, fmtDay, NOW, TODAY } from './utils/date'
import { FLAG, stockText, unitOf } from './utils/stock'

const STORAGE_KEY = 'aec-winterwartung-demo-v9'
const SESSION_KEY = 'aec-winterwartung-konto'

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as AppState
  } catch {
    // Kein Zugriff auf localStorage (z. B. privater Modus) – mit Ausgangsdaten starten.
  }
  return initialState()
}

export const state = reactive<AppState>(load())

watch(state, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Speichern ist optional.
  }
}, { deep: true })

export function resetDemo() {
  Object.assign(state, initialState())
}

/* ---------- Konto und Rechte ---------- */

function loadSession(): UserId | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw !== null) return JSON.parse(raw) as UserId | null
  } catch {
    // Ohne localStorage startet die Demo am Werkstatt-Tablet.
  }
  return TABLET
}

/** Angemeldetes Konto dieses Browsers; null = nicht angemeldet. Im Mockup frei umschaltbar. */
export const session = reactive<{ userId: UserId | null }>({ userId: loadSession() })

watch(() => session.userId, (id) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(id))
  } catch {
    // Speichern ist optional.
  }
})

export function switchUser(id: UserId | null) {
  session.userId = id
}

export const userById = (id: UserId | null | undefined) => state.users.find((u) => u.id === id)

export function userName(id: UserId | null | undefined) {
  if (id === SYSTEM) return 'Vereinsflieger'
  return userById(id)?.name ?? 'Unbekannt'
}

/** Angemeldetes Konto, solange es nicht entfernt wurde. */
export function currentUser(): User | undefined {
  const u = userById(session.userId)
  return u && !u.removed ? u : undefined
}

/** Personen zur Auswahl (ohne Geräte und entfernte Konten). */
export const people = () => state.users.filter((u) => !u.device && !u.removed)

/** Wer Werkstattleitung übernehmen kann. */
export const leaders = () => people().filter((u) => u.role === 'wl')

/**
 * edit: Daten pflegen (alle Angemeldeten) · lead: Werkstattleitung (abzeichnen, Tage planen)
 * admin: Konten, Saison, Werkstattzeiträume. Admin und Werkstattleiter sind vorerst gleich.
 */
export type Permission = 'edit' | 'lead' | 'admin'

const PERMISSIONS: Record<Role, Permission[]> = {
  admin: ['edit', 'lead', 'admin'],
  wl: ['edit', 'lead', 'admin'],
  user: ['edit'],
}

export function can(permission: Permission) {
  const u = currentUser()
  return !!u && PERMISSIONS[u.role].includes(permission)
}

const actor = () => session.userId ?? TABLET

/* ---------- Allgemein ---------- */

export function aircraftLabel(id: string) {
  const a = state.aircraft.find((x) => x.id === id)
  return a ? `${a.type} · ${a.reg}` : ''
}

/** Ersatzteil passt zu diesem Flugzeugtyp? */
export function fitsAircraft(item: InventoryItem, type: string) {
  return item.kind === 'et' && (item.fits === 'alle Flugzeuge' || (item.fits ?? '').split(', ').includes(type))
}

function nextId(prefix: string) {
  state.counter += 1
  return `${prefix}${state.counter}`
}

const log = (list: HistoryEntry[], text: string, at: string = TODAY, who: UserId = actor()) => {
  list.unshift({ text, who, at })
}

function remove<T>(list: T[], item: T) {
  const i = list.indexOf(item)
  if (i >= 0) list.splice(i, 1)
}

/* ---------- Saison und Zeitplan ---------- */

export function setSeason(input: Season) {
  Object.assign(state.season, { label: input.label.trim(), start: input.start, end: input.end })
}

/** Werkstattzeitraum eines Flugzeugs, jeweils von Samstag bis Samstag. */
export function setAircraftPeriod(aircraft: Aircraft, start: string, end: string) {
  aircraft.start = start
  aircraft.end = end
}

/** Flugzeuge, die an diesem Tag in der Werkstatt sind – aus den Zeiträumen, nicht von Hand gepflegt. */
export function planesOn(date: string) {
  return state.aircraft
    .filter((a) => a.start <= date && date <= a.end)
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((a) => a.type)
    .join(' · ')
}

const scheduleDay = (date: string) => state.schedule[date] ?? (state.schedule[date] = {})
const dayLog = (date: string, text: string) => log(scheduleDay(date).history ??= [], text, NOW)

export function setLeader(date: string, leader: UserId | null) {
  if ((scheduleDay(date).leader ?? null) === leader) return
  scheduleDay(date).leader = leader
  dayLog(date, leader ? `Werkstattleitung: ${userName(leader)}` : 'Werkstattleitung offen')
}

export function setDayComment(date: string, comment: string) {
  const text = comment.trim()
  if ((scheduleDay(date).comment ?? '') === text) return
  scheduleDay(date).comment = text
  dayLog(date, text ? 'Kommentar geändert' : 'Kommentar gelöscht')
}

export function setDayClosed(date: string, closed: boolean, reason = '') {
  const day = scheduleDay(date)
  day.closed = closed
  day.reason = closed ? reason.trim() || 'geschlossen' : undefined
  dayLog(date, closed ? `Werkstatt geschlossen: ${day.reason}` : 'Werkstatt wieder geöffnet')
}

/* ---------- Konten ---------- */

export function createUser(name: string, role: Role) {
  const [bg, fg] = AVATAR_COLORS[state.users.length % AVATAR_COLORS.length]
  state.users.push({ id: nextId('u'), name: name.trim(), role, bg, fg })
}

export function updateUser(user: User, name: string, role: Role) {
  user.name = name.trim()
  user.role = role
}

/** Entfernte Konten bleiben gespeichert, damit Namen im Verlauf erhalten bleiben. */
export function removeUser(user: User) {
  user.removed = true
  for (const day of Object.values(state.schedule)) if (day.leader === user.id) day.leader = null
}

/* ---------- Kanban ---------- */

/** Wer gestartet hat, ergibt sich aus dem angemeldeten Konto. */
export function startTask(task: Task) {
  task.status = 'arbeit'
  log(task.history, 'Arbeit gestartet', NOW)
}

export function finishTask(task: Task) {
  const starter = task.history.find((h) => h.text === 'Arbeit gestartet')
  task.status = 'erledigt'
  task.doneBy = starter?.who ?? actor()
  task.doneAt = NOW
  delete task.signedBy
  delete task.signedAt
  log(task.history, 'Als erledigt gemeldet', NOW, task.doneBy)
}

/** Rücknahme von „Erledigt“, solange noch nicht abgezeichnet. */
export function reopenTask(task: Task) {
  if (task.signedBy) return
  task.status = 'arbeit'
  delete task.doneBy
  delete task.doneAt
  log(task.history, 'Wieder in Arbeit', NOW)
}

/** Zurück auf „Offen“, z. B. wenn versehentlich gestartet. Die Checkliste beginnt von vorn. */
export function resetTaskToOpen(task: Task) {
  task.status = 'offen'
  task.checklist.forEach((c) => { c.done = false })
  log(task.history, 'Zurück auf Offen', NOW)
}

/**
 * Checkliste steuert den Status: erster Haken startet, alle Haken melden erledigt,
 * ein entfernter Haken nimmt „Erledigt“ zurück. Abgezeichnete Karten bleiben unverändert.
 */
export function setChecklistItem(task: Task, index: number, done: boolean) {
  if (task.signedBy) return
  task.checklist[index].done = done
  const all = task.checklist.every((c) => c.done)
  if (done && task.status === 'offen') startTask(task)
  if (all && task.status === 'arbeit') finishTask(task)
  else if (!done && task.status === 'erledigt') reopenTask(task)
}

/** Wer abzeichnet: das angemeldete Konto, am Werkstatt-Tablet die Werkstattleitung des Tages. */
export function signer(): UserId {
  const u = currentUser()
  if (u?.device) return state.schedule[TODAY]?.leader ?? u.id
  return u?.id ?? TABLET
}

export function signTask(task: Task) {
  task.signedBy = signer()
  task.signedAt = TODAY
  log(task.history, 'Abgezeichnet', TODAY, task.signedBy)
}

export function unsignTask(task: Task) {
  delete task.signedBy
  delete task.signedAt
  log(task.history, 'Abzeichnung zurückgenommen', NOW)
}

export interface TaskInput {
  title: string
  level: Task['level']
  duration: string
  desc: string
  /** Ein Schritt pro Zeile */
  checklist: string
  deadline: string
  defectId: string
  docId: string
}

export const taskInput = (task?: Task): TaskInput => ({
  title: task?.title ?? '',
  level: task?.level ?? 'ein',
  duration: task?.duration ?? '~1 h',
  desc: task?.desc === '–' ? '' : task?.desc ?? '',
  checklist: task?.checklist.map((c) => c.text).join('\n') ?? '',
  deadline: task?.deadline ?? '',
  defectId: task?.defectId ?? '',
  docId: task?.docId ?? '',
})

/** Verknüpfung Kanban-Karte ↔ Mangel/Befund auf beiden Seiten setzen oder lösen. */
function linkDefect(task: Task, defectId: string) {
  if ((task.defectId ?? '') === defectId) return
  const old = state.defects.find((d) => d.id === task.defectId)
  if (old?.taskId === task.id) {
    delete old.taskId
    log(old.history, 'Verknüpfung zur Kanban-Karte gelöst.')
  }
  const defect = state.defects.find((d) => d.id === defectId && !d.taskId)
  if (defect) {
    task.defectId = defect.id
    defect.taskId = task.id
    log(defect.history, 'Kanban-Karte angelegt.')
  } else {
    delete task.defectId
  }
}

function applyTaskInput(task: Task, input: TaskInput) {
  const before = new Map(task.checklist.map((c) => [c.text, c.done]))
  task.title = input.title.trim()
  task.level = input.level
  task.duration = input.duration
  task.desc = input.desc.trim() || '–'
  task.checklist = input.checklist.split('\n').map((t) => t.trim()).filter(Boolean).map((text) => ({ text, done: before.get(text) ?? false }))
  task.deadline = input.deadline || undefined
  task.docId = input.docId || undefined
  linkDefect(task, input.defectId)
}

export function createTask(aircraftId: string, input: TaskInput): Task {
  const task: Task = {
    id: nextId('t'), aircraftId, status: 'offen', level: input.level, title: '', desc: '', duration: '', checklist: [],
    history: [{ text: 'Angelegt', who: actor(), at: TODAY }],
  }
  applyTaskInput(task, input)
  state.tasks.push(task)
  return task
}

export function updateTask(task: Task, input: TaskInput) {
  applyTaskInput(task, input)
  log(task.history, 'Bearbeitet', NOW)
}

export function deleteTask(task: Task) {
  linkDefect(task, '')
  remove(state.tasks, task)
}

/* ---------- Mängel / Befunde ---------- */

export function setDefectStatus(defect: Defect, status: Defect['status']) {
  defect.status = status
  if (status === 'done') {
    defect.doneAt = TODAY
    defect.doneBy = actor()
    log(defect.history, 'Als erledigt markiert.')
  } else {
    log(defect.history, 'Wieder geöffnet.')
  }
}

export function setDefectOwner(defect: Defect, owner: UserId | null) {
  defect.owner = owner
  log(defect.history, `Zuständig: ${owner ? userName(owner) : 'noch niemand'}`)
}

export function addDefectNote(defect: Defect, text: string) {
  log(defect.history, text)
}

export function createTaskFromDefect(defect: Defect) {
  createTask(defect.aircraftId, { ...taskInput(), title: defect.title, level: 'erf', desc: defect.desc, defectId: defect.id })
}

export function unlinkDefectTask(defect: Defect) {
  const task = state.tasks.find((t) => t.id === defect.taskId)
  if (task) {
    linkDefect(task, '')
    log(task.history, 'Verknüpfung zum Mangel/Befund gelöst', NOW)
  } else {
    delete defect.taskId
  }
}

export interface DefectInput {
  title: string
  desc: string
  priority: Defect['priority']
  photos: number
}

export function createDefect(aircraftId: string, input: DefectInput) {
  const photoText = input.photos ? `Befund mit ${input.photos} ${input.photos === 1 ? 'Foto' : 'Fotos'} erfasst.` : 'Befund erfasst.'
  state.defects.push({
    id: nextId('m'),
    aircraftId,
    title: input.title.trim(),
    desc: input.desc.trim() || '–',
    source: 'befund',
    photos: input.photos,
    reportedAt: TODAY,
    reportedBy: actor(),
    priority: input.priority,
    owner: null,
    status: 'open',
    history: [{ text: photoText, who: actor(), at: TODAY }],
  })
}

export function updateDefect(defect: Defect, input: DefectInput) {
  defect.title = input.title.trim()
  defect.desc = input.desc.trim() || '–'
  defect.priority = input.priority
  defect.photos = input.photos
  log(defect.history, 'Bearbeitet.')
}

/** Nur eigene Befunde – Mängel kommen aus Vereinsflieger. */
export function deleteDefect(defect: Defect) {
  if (defect.source !== 'befund') return
  unlinkDefectTask(defect)
  remove(state.defects, defect)
}

/* ---------- Dokumente ---------- */

export function addDocument(aircraftId: string, title: string, kind: string) {
  state.documents.push({ id: nextId('d'), aircraftId, title: title.trim(), meta: `PDF · ${kind} · hinzugefügt ${fmtDate(TODAY)}` })
}

/** replaced: neue Datei hochgeladen (im Mockup simuliert). */
export function updateDocument(doc: DocumentItem, title: string, replaced: boolean) {
  doc.title = title.trim()
  if (replaced) {
    doc.meta = `PDF · neue Version vom ${fmtDate(TODAY)}`
    delete doc.image
  }
}

export function deleteDocument(doc: DocumentItem) {
  for (const t of state.tasks) if (t.docId === doc.id) delete t.docId
  remove(state.documents, doc)
}

/* ---------- Inventur ---------- */

export const openOrderFor = (itemId: string) =>
  state.orders.find((o) => o.itemId === itemId && o.state !== 'delivered')

export function setQty(item: InventoryItem, qty: number) {
  item.qty = Math.max(0, qty)
}

/** Bestand setzen und als Zählung im Verlauf festhalten (eine Zählung pro Tag, spätere überschreiben). */
export function countItem(item: InventoryItem, qty: number) {
  setQty(item, qty)
  logCount(item)
}

export function logCount(item: InventoryItem) {
  const text = `Gezählt: ${stockText(item)}`
  const last = item.history[0]
  if (last && last.at === TODAY && last.who === actor() && last.text.startsWith('Gezählt')) last.text = text
  else log(item.history, text)
}

export interface ItemInput {
  name: string
  kind: InventoryItem['kind']
  location: string
  mode: InventoryItem['mode']
  qty: number
  unit: [string, string]
  /** Flugzeugtypen, durch ", " getrennt, oder "alle Flugzeuge" (nur Ersatzteile) */
  fits: string
}

export const itemInput = (item?: InventoryItem): ItemInput => ({
  name: item?.name ?? '',
  kind: item?.kind ?? 'vs',
  location: item?.location ?? '',
  mode: item?.mode ?? 'count',
  qty: item?.qty ?? 0,
  unit: item ? [...item.unit] : ['Stk.', 'Stk.'],
  fits: item?.fits ?? '',
})

function applyItemInput(item: InventoryItem, input: ItemInput) {
  item.name = input.name.trim()
  item.kind = input.kind
  item.location = input.location.trim() || '–'
  item.mode = input.mode
  item.qty = Math.max(0, input.qty)
  item.unit = input.mode === 'count' ? [input.unit[0].trim(), input.unit[1].trim() || input.unit[0].trim()] : ['', '']
  item.fits = input.kind === 'et' ? input.fits || undefined : undefined
}

export function createItem(input: ItemInput): InventoryItem {
  const item: InventoryItem = { id: nextId('i'), kind: 'vs', name: '', location: '', mode: 'count', qty: 0, unit: ['', ''], history: [] }
  applyItemInput(item, input)
  log(item.history, `Angelegt · ${stockText(item)}`)
  state.inventory.push(item)
  return item
}

export function updateItem(item: InventoryItem, input: ItemInput) {
  const before = stockText(item)
  applyItemInput(item, input)
  for (const o of state.orders) if (o.itemId === item.id) o.name = item.name
  log(item.history, 'Bearbeitet')
  if (stockText(item) !== before) logCount(item)
}

/** Offene Bestellungen bleiben als Bestellungen ohne Artikel stehen. */
export function deleteItem(item: InventoryItem) {
  for (const o of state.orders) {
    if (o.itemId !== item.id) continue
    delete o.itemId
    log(o.history, 'Artikel aus der Inventur gelöscht')
  }
  remove(state.inventory, item)
}

export function addItemToOrders(item: InventoryItem, forWhat?: string, comment = '') {
  if (openOrderFor(item.id)) return
  state.orders.push({
    id: nextId('o'),
    itemId: item.id,
    name: item.name,
    forWhat: forWhat ?? (item.kind === 'et' ? item.fits ?? 'Lager' : 'Lager'),
    state: 'list',
    reportedBy: actor(),
    reportedAt: TODAY,
    comment: comment.trim(),
    history: [{ text: 'Auf Bestellliste gesetzt', who: actor(), at: TODAY }],
  })
}

export function addFreeOrder(name: string, forWhat: string, comment: string) {
  state.orders.push({
    id: nextId('o'),
    name: name.trim(),
    forWhat,
    state: 'list',
    reportedBy: actor(),
    reportedAt: TODAY,
    comment: comment.trim(),
    history: [{ text: 'Auf Bestellliste gesetzt', who: actor(), at: TODAY }],
  })
}

/** Vorschlag für die erwartete Lieferung beim Bestellen. */
export const defaultDelivery = () => addDays(TODAY, 14)

export function markOrdered(order: Order, delivery: string) {
  order.state = 'ordered'
  order.delivery = delivery
  log(order.history, `Bestellt · Lieferung ca. ${fmtDay(delivery)}`)
}

export function setOrderDelivery(order: Order, delivery: string) {
  if (!delivery || order.delivery === delivery) return
  order.delivery = delivery
  log(order.history, `Lieferung ca. ${fmtDay(delivery)}`)
}

export function setOrderComment(order: Order, comment: string) {
  const text = comment.trim()
  if (order.comment === text) return
  order.comment = text
  log(order.history, text ? 'Kommentar geändert' : 'Kommentar gelöscht')
}

export function setOrderFor(order: Order, forWhat: string) {
  order.forWhat = forWhat
  log(order.history, `Für: ${forWhat === 'Lager' ? 'Lager (allgemein)' : forWhat}`)
}

/** Bestellung ohne Artikel nachträglich einem Inventur-Artikel zuordnen. */
export function linkOrderToItem(order: Order, item: InventoryItem) {
  if (openOrderFor(item.id)) return
  order.itemId = item.id
  order.name = item.name
  log(order.history, `Artikel zugeordnet: ${item.name}`)
}

/** Von der Bestellliste nehmen bzw. Bestellung stornieren. */
export function cancelOrder(order: Order) {
  const item = state.inventory.find((i) => i.id === order.itemId)
  if (item) log(item.history, order.state === 'ordered' ? 'Bestellung storniert' : 'Von der Bestellliste genommen')
  remove(state.orders, order)
}

export function markDelivered(order: Order, qty: number) {
  order.state = 'delivered'
  const item = order.itemId ? state.inventory.find((i) => i.id === order.itemId) : undefined
  if (item) {
    item.qty = item.mode === 'flag' ? FLAG.full : item.qty + qty
    const text = item.mode === 'flag' ? 'Geliefert' : `Geliefert: ${qty} ${unitOf(item, qty)}`
    log(item.history, text)
  }
  log(order.history, 'Geliefert')
}
