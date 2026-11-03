import { reactive, watch } from 'vue'
import type { Aircraft, AppState, Defect, DocumentItem, HistoryEntry, InventoryItem, Order, Role, Season, Task, TaskTemplate, User, UserId } from './types'
import { initialState } from './mock/data'
import { AVATAR_COLORS, SYSTEM, TABLET } from './mock/people'
import { addDays, daysBetween, fmtDate, fmtDay, NOW, TODAY } from './utils/date'
import { FLAG, stockText, unitOf } from './utils/stock'

const STORAGE_KEY = 'aec-winterwartung-demo-v14'
const SESSION_KEY = 'aec-winterwartung-sitzung'

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

/**
 * Mitglieder geben nur Vor- und Nachnamen ein (ohne Passwort), Sonderkonten (Werkstattleitung, Admin, Tablet) melden sich an.
 * chosen: Auswahl schon einmal getroffen – sonst fragt die App beim Öffnen „Wer bist du?“.
 */
interface Session {
  userId: UserId | null
  auth: 'name' | 'password' | null
  chosen: boolean
}

function loadSession(): Session {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw !== null) return JSON.parse(raw) as Session
  } catch {
    // Ohne localStorage fragt die App bei jedem Öffnen nach dem Namen.
  }
  return { userId: null, auth: null, chosen: false }
}

/** Wer in diesem Browser eingetragen bzw. angemeldet ist. */
export const session = reactive<Session>(loadSession())

watch(session, (value) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(value))
  } catch {
    // Speichern ist optional.
  }
}, { deep: true })

/** Sonderkonten brauchen ein Passwort, Mitglieder nicht. */
export const needsPassword = (u: User) => !!u.device || u.role !== 'user'

/** Mitglied ohne Passwort im Browser eintragen. */
function chooseName(id: UserId) {
  Object.assign(session, { userId: id, auth: 'name', chosen: true })
}

/**
 * Mitglied gibt Vor- und Nachnamen ein (keine Namensliste). Gleicher Name = dasselbe Konto, sonst wird eines angelegt.
 * 'login': Der Name gehört einem Sonderkonto, das sich mit Passwort anmelden muss.
 */
export function enterName(first: string, last: string): 'ok' | 'login' {
  const name = `${first.trim()} ${last.trim()}`.replace(/\s+/g, ' ')
  const same = state.users.find((u) => !u.removed && u.name.toLowerCase() === name.toLowerCase())
  if (same && needsPassword(same)) return 'login'
  chooseName(same?.id ?? createUser(name, 'user').id)
  return 'ok'
}

/** Anmeldung für Sonderkonten. Im Mockup wird das Passwort nicht geprüft. */
export function login(email: string, password: string) {
  const mail = email.trim().toLowerCase()
  const u = state.users.find((x) => !x.removed && needsPassword(x) && x.email?.toLowerCase() === mail)
  if (!u || !password) return false
  Object.assign(session, { userId: u.id, auth: 'password', chosen: true })
  return true
}

/** Abmelden bzw. Namen vergessen – danach nur ansehen. */
export function logout() {
  Object.assign(session, { userId: null, auth: null, chosen: true })
}

export const userById = (id: UserId | null | undefined) => state.users.find((u) => u.id === id)

export function userName(id: UserId | null | undefined) {
  if (id === SYSTEM) return 'Vereinsflieger'
  return userById(id)?.name ?? 'Unbekannt'
}

/** Eingetragenes Konto, solange es nicht entfernt wurde. Sonderkonten zählen nur nach der Anmeldung. */
export function currentUser(): User | undefined {
  const u = userById(session.userId)
  if (!u || u.removed) return undefined
  return needsPassword(u) && session.auth !== 'password' ? undefined : u
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

const actor = () => currentUser()?.id ?? TABLET

/* ---------- Allgemein ---------- */

export function aircraftLabel(id: string) {
  const a = state.aircraft.find((x) => x.id === id)
  return a ? `${a.type} · ${a.reg}` : ''
}

/** Flugzeuge im Verein (ohne ausgemusterte). */
export const activeAircraft = () => state.aircraft.filter((a) => !a.retired)

/** Flugzeugtypen im Verein, je Typ einmal – für Ersatzteile und Bestellungen. */
export const aircraftTypes = () => [...new Set(activeAircraft().map((a) => a.type))]

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
  return activeAircraft()
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

/** Neue Saison: laufende archivieren, Karten aus den Vorlagen neu anlegen, Zeiträume um dieselbe Wochenzahl verschieben. */
export function startSeason(input: Season, carryOver: boolean) {
  const oldStart = state.season.start
  state.archive.unshift(JSON.parse(JSON.stringify({
    ...state.season,
    aircraft: state.aircraft.map(({ id, type, reg, start, end }) => ({ id, type, reg, start, end })),
    tasks: state.tasks,
    schedule: state.schedule,
    closedAt: TODAY,
    closedBy: actor(),
  })))
  // Eigene Karten (z. B. aus Mängeln), die noch nicht erledigt sind, gehen in die neue Saison mit.
  const keep = (t: Task) => carryOver && !t.templateId && t.status !== 'erledigt'
  for (const t of state.tasks) {
    if (keep(t)) continue
    const defect = state.defects.find((d) => d.taskId === t.id)
    if (defect) delete defect.taskId
  }
  state.tasks = state.tasks.filter(keep)
  state.schedule = {}
  setSeason(input)
  const weeks = Math.round(daysBetween(oldStart, state.season.start) / 7)
  for (const a of activeAircraft()) {
    const len = daysBetween(a.start, a.end)
    a.start = addDays(a.start, weeks * 7)
    if (a.start < state.season.start || a.start > state.season.end) a.start = state.season.start
    a.end = addDays(a.start, len)
    if (a.end > state.season.end) a.end = state.season.end
    cardsFromTemplates(a)
  }
}

/* ---------- Kanban-Vorlagen ---------- */

export const templatesFor = (type: string) => state.templates.filter((v) => !v.aircraftType || v.aircraftType === type)

/** Karten aus allen Vorlagen anlegen, die bei diesem Flugzeug noch fehlen. */
export function cardsFromTemplates(a: Aircraft) {
  const used = new Set(state.tasks.filter((t) => t.aircraftId === a.id).map((t) => t.templateId))
  for (const v of templatesFor(a.type)) {
    if (used.has(v.id)) continue
    state.tasks.push({
      id: nextId('t'), aircraftId: a.id, templateId: v.id, status: 'offen', level: v.level, title: v.title, desc: v.desc || '–',
      duration: v.duration, checklist: v.checklist.map((text) => ({ text, done: false })),
      docId: v.docTitle ? state.documents.find((d) => d.aircraftId === a.id && d.title === v.docTitle)?.id : undefined,
      history: [{ text: 'Aus Vorlage angelegt', who: actor(), at: TODAY }],
    })
  }
}

export interface TemplateInput {
  aircraftType: string
  level: TaskTemplate['level']
  title: string
  desc: string
  duration: string
  /** Ein Schritt pro Zeile */
  checklist: string
  docTitle: string
}

export const templateInput = (v?: TaskTemplate): TemplateInput => ({
  aircraftType: v?.aircraftType ?? '',
  level: v?.level ?? 'ein',
  title: v?.title ?? '',
  desc: v?.desc ?? '',
  duration: v?.duration ?? '~1 h',
  checklist: v?.checklist.join('\n') ?? '',
  docTitle: v?.docTitle ?? '',
})

function applyTemplateInput(v: TaskTemplate, input: TemplateInput) {
  Object.assign(v, {
    aircraftType: input.aircraftType,
    level: input.level,
    title: input.title.trim(),
    desc: input.desc.trim(),
    duration: input.duration,
    checklist: input.checklist.split('\n').map((t) => t.trim()).filter(Boolean),
    docTitle: input.docTitle.trim() || undefined,
  })
}

/** Vorlagen wirken erst beim nächsten Saisonstart oder neuen Flugzeug; bestehende Karten bleiben, wie sie sind. */
export function createTemplate(input: TemplateInput) {
  const v: TaskTemplate = { id: nextId('v'), aircraftType: '', level: 'ein', title: '', desc: '', duration: '', checklist: [] }
  applyTemplateInput(v, input)
  state.templates.push(v)
}

export function updateTemplate(v: TaskTemplate, input: TemplateInput) {
  applyTemplateInput(v, input)
}

export function deleteTemplate(v: TaskTemplate) {
  remove(state.templates, v)
}

/* ---------- Flugzeuge ---------- */

export interface AircraftInput {
  type: string
  reg: string
  serial: string
  /** Flugzeugpate (Konto-ID), leer = keiner */
  manager: UserId | ''
  /** Werkstattzeitraum, jeweils ein Samstag */
  start: string
  end: string
  retired: boolean
}

export const aircraftInput = (a?: Aircraft): AircraftInput => ({
  type: a?.type ?? '',
  reg: a?.reg ?? '',
  serial: a?.serial ?? '',
  manager: a?.manager ?? '',
  start: a?.start ?? state.season.start,
  end: a?.end ?? addDays(state.season.start, 21),
  retired: !!a?.retired,
})

function applyAircraftInput(a: Aircraft, input: AircraftInput) {
  a.type = input.type.trim()
  a.reg = input.reg.trim().toUpperCase()
  a.serial = input.serial.trim() || undefined
  a.manager = input.manager || undefined
  a.start = input.start
  a.end = input.end
  a.retired = input.retired || undefined
}

/** withCards: gleich die Kanban-Karten aus den Vorlagen anlegen. */
export function createAircraft(input: AircraftInput, withCards = false): Aircraft {
  const a: Aircraft = { id: nextId('a'), type: '', reg: '', start: '', end: '' }
  applyAircraftInput(a, input)
  state.aircraft.push(a)
  if (withCards) cardsFromTemplates(state.aircraft[state.aircraft.length - 1])
  return a
}

/** Neuer Typname gilt auch für Ersatzteile und Bestellungen, solange kein anderes Flugzeug den alten Typ hat. */
export function updateAircraft(a: Aircraft, input: AircraftInput) {
  const oldType = a.type
  applyAircraftInput(a, input)
  if (a.type === oldType || state.aircraft.some((x) => x !== a && x.type === oldType)) return
  for (const i of state.inventory) {
    if (i.fits && i.fits !== 'alle Flugzeuge') i.fits = i.fits.split(', ').map((t) => (t === oldType ? a.type : t)).join(', ')
  }
  for (const o of state.orders) if (o.forWhat === oldType) o.forWhat = a.type
}

/** Für versehentlich angelegte Flugzeuge: löscht Kanban-Karten, Mängel, Fristen und Dokumente mit. Sonst ausmustern. */
export function deleteAircraft(a: Aircraft) {
  state.tasks = state.tasks.filter((t) => t.aircraftId !== a.id)
  state.defects = state.defects.filter((d) => d.aircraftId !== a.id)
  state.deadlines = state.deadlines.filter((d) => d.aircraftId !== a.id)
  state.documents = state.documents.filter((d) => d.aircraftId !== a.id)
  remove(state.aircraft, a)
}

/* ---------- Konten ---------- */

/** email: Anmeldename der Sonderkonten; Mitglieder brauchen keine. */
export function createUser(name: string, role: Role, email = ''): User {
  const [bg, fg] = AVATAR_COLORS[state.users.length % AVATAR_COLORS.length]
  const user: User = { id: nextId('u'), name: name.trim(), role, bg, fg }
  if (role !== 'user') user.email = email.trim()
  state.users.push(user)
  return user
}

export function updateUser(user: User, name: string, role: Role, email = '') {
  user.name = name.trim()
  user.role = role
  if (needsPassword(user)) user.email = email.trim()
  else delete user.email
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
