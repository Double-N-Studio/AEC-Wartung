import { reactive, watch } from 'vue'
import type { AppState, Defect, HistoryEntry, InventoryItem, Order, PersonKey, Task } from './types'
import { initialState } from './mock/data'
import { CURRENT_USER, DEVICE_USER, PEOPLE } from './mock/people'
import { addDays, NOW, TODAY } from './utils/date'

const STORAGE_KEY = 'aec-winterwartung-demo-v4'

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

const log = (list: HistoryEntry[], text: string, who = DEVICE_USER, at: string = TODAY) => {
  list.unshift({ text, who, at })
}

/* ---------- Zeitplan ---------- */

const scheduleDay = (date: string) => state.schedule[date] ?? (state.schedule[date] = { planes: '' })

export function setLeader(date: string, leader: PersonKey | null) {
  scheduleDay(date).leader = leader
}

export function setDayComment(date: string, comment: string) {
  scheduleDay(date).comment = comment
}

/* ---------- Arbeitspakete ---------- */

/** Wer gestartet hat, ergibt sich aus dem angemeldeten Konto. */
export function startTask(task: Task) {
  task.status = 'arbeit'
  log(task.history, 'Arbeit gestartet', CURRENT_USER, NOW)
}

export function finishTask(task: Task) {
  const starter = task.history.find((h) => h.text === 'Arbeit gestartet')
  task.status = 'erledigt'
  task.doneBy = starter?.who ?? DEVICE_USER
  task.doneAt = NOW
  delete task.signedBy
  delete task.signedAt
  log(task.history, 'Als erledigt gemeldet', task.doneBy, NOW)
}

/** Rücknahme von „Erledigt“, solange noch nicht abgezeichnet. */
function reopenTask(task: Task) {
  task.status = 'arbeit'
  delete task.doneBy
  delete task.doneAt
  log(task.history, 'Wieder in Arbeit', CURRENT_USER, NOW)
}

/**
 * Checkliste steuert den Status: erster Haken startet, alle Haken melden erledigt,
 * ein entfernter Haken nimmt „Erledigt“ zurück. Abgezeichnete Pakete bleiben unverändert.
 */
export function setChecklistItem(task: Task, index: number, done: boolean) {
  if (task.signedBy) return
  task.checklist[index].done = done
  const all = task.checklist.every((c) => c.done)
  if (done && task.status === 'offen') startTask(task)
  if (all && task.status === 'arbeit') finishTask(task)
  else if (!done && task.status === 'erledigt') reopenTask(task)
}

export function signTask(task: Task, who: PersonKey) {
  task.signedBy = PEOPLE[who].name
  task.signedAt = TODAY
  log(task.history, 'Abgezeichnet', task.signedBy)
}

export interface NewTask {
  title: string
  level: Task['level']
  duration: string
  desc: string
  checklist: string
  defectId: string
  doc: string
}

export function createTask(aircraftId: string, input: NewTask): Task {
  const task: Task = {
    id: nextId('t'),
    aircraftId,
    status: 'offen',
    level: input.level,
    title: input.title.trim(),
    duration: input.duration,
    desc: input.desc.trim() || '–',
    checklist: input.checklist.split('\n').map((t) => t.trim()).filter(Boolean).map((text) => ({ text, done: false })),
    doc: input.doc || undefined,
    defectId: input.defectId || undefined,
    history: [{ text: 'Angelegt', who: DEVICE_USER, at: TODAY }],
  }
  state.tasks.push(task)
  if (task.defectId) {
    const defect = state.defects.find((d) => d.id === task.defectId)
    if (defect && !defect.taskId) {
      defect.taskId = task.id
      log(defect.history, 'Arbeitspaket angelegt.')
    }
  }
  return task
}

/* ---------- Mängel / Befunde ---------- */

export function setDefectStatus(defect: Defect, status: Defect['status']) {
  defect.status = status
  if (status === 'done') {
    defect.doneAt = TODAY
    defect.doneBy = DEVICE_USER
    log(defect.history, 'Als erledigt markiert.')
  } else {
    log(defect.history, 'Wieder geöffnet.')
  }
}

export function setDefectOwner(defect: Defect, owner: string) {
  defect.owner = owner
  log(defect.history, `Zuständig: ${owner}`)
}

export function addDefectNote(defect: Defect, text: string) {
  log(defect.history, text)
}

export function createTaskFromDefect(defect: Defect) {
  createTask(defect.aircraftId, {
    title: defect.title,
    level: 'erf',
    duration: '~1 h',
    desc: defect.desc,
    checklist: '',
    defectId: defect.id,
    doc: '',
  })
}

export function createDefect(aircraftId: string, input: { title: string; desc: string; priority: Defect['priority']; photos: number }) {
  const photoText = input.photos ? `Befund mit ${input.photos} ${input.photos === 1 ? 'Foto' : 'Fotos'} erfasst.` : 'Befund erfasst.'
  state.defects.push({
    id: nextId('m'),
    aircraftId,
    title: input.title.trim(),
    desc: input.desc.trim() || '–',
    source: 'befund',
    photos: input.photos,
    reportedAt: TODAY,
    reportedBy: DEVICE_USER,
    priority: input.priority,
    owner: 'noch niemand',
    status: 'open',
    history: [{ text: photoText, who: DEVICE_USER, at: TODAY }],
  })
}

/* ---------- Dokumente ---------- */

export function addDocument(aircraftId: string, title: string, kind: string) {
  state.documents.push({ id: nextId('d'), aircraftId, title: title.trim(), meta: `PDF · ${kind} · hinzugefügt ${TODAY.split('-').reverse().join('.')}` })
}

/* ---------- Inventur ---------- */

export const openOrderFor = (itemId: string) =>
  state.orders.find((o) => o.itemId === itemId && o.state !== 'delivered')

export function setQty(item: InventoryItem, qty: number) {
  item.qty = Math.max(0, qty)
}

export function logCount(item: InventoryItem) {
  const text = item.mode === 'flag' ? (item.qty ? 'Gezählt: genug vorhanden' : 'Gezählt: leer') : `Gezählt: ${item.qty} ${item.qty === 1 ? item.unit[0] : item.unit[1]}`
  const last = item.history[0]
  if (last && last.at === TODAY && last.text.startsWith('Gezählt')) last.text = text
  else log(item.history, text)
}

export function addItemToOrders(item: InventoryItem, forWhat?: string, comment = '') {
  if (openOrderFor(item.id)) return
  state.orders.push({
    id: nextId('o'),
    itemId: item.id,
    name: item.name,
    forWhat: forWhat ?? (item.kind === 'et' ? item.fits ?? 'Lager' : 'Lager'),
    state: 'list',
    reportedBy: DEVICE_USER,
    reportedAt: TODAY,
    comment: comment.trim(),
    history: [{ text: 'Auf Bestellliste gesetzt', who: DEVICE_USER, at: TODAY }],
  })
}

export function addFreeOrder(name: string, forWhat: string, comment: string) {
  state.orders.push({
    id: nextId('o'),
    name: name.trim(),
    forWhat,
    state: 'list',
    reportedBy: DEVICE_USER,
    reportedAt: TODAY,
    comment: comment.trim(),
    history: [{ text: 'Auf Bestellliste gesetzt', who: DEVICE_USER, at: TODAY }],
  })
}

export function markOrdered(order: Order) {
  order.state = 'ordered'
  order.delivery = addDays(TODAY, 14)
  log(order.history, 'Bestellt')
}

export function markDelivered(order: Order, qty: number) {
  order.state = 'delivered'
  const item = order.itemId ? state.inventory.find((i) => i.id === order.itemId) : undefined
  if (item) {
    item.qty = item.mode === 'flag' ? 1 : item.qty + qty
    const text = item.mode === 'flag' ? 'Geliefert' : `Geliefert: ${qty} ${qty === 1 ? item.unit[0] : item.unit[1]}`
    log(item.history, text)
  }
  log(order.history, 'Geliefert')
}
