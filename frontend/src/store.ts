import { reactive, watch } from 'vue'
import type { Aircraft, AppState, Defect, DocumentItem, FaqEntry, FileRef, HistoryEntry, InventoryItem, Order, Role, Season, Task, TaskNote, TaskTemplate, User, UserId } from './types'
import { backend } from './api/backend'
import { emptyState } from './api/records'
import { needsPassword, SYSTEM, TABLET } from './mock/people'
import { addDays, daysBetween, fmtDay, now, today } from './utils/date'
import { FLAG, stockText, unitOf } from './utils/stock'
import { newId } from './utils/id'
import { connect, discardQueue, isOffline, refresh, whenSaved } from './sync'

/**
 * Shared state. Actions only change it synchronously; sync.ts works out what changed
 * and sends it to the server. Until the first revision is loaded (sync.ready), it is empty.
 */
export const state = reactive<AppState>(emptyState())

const SESSION_KEY = 'aec-winterwartung-konto'

/** On startup: first ask who is signed in on this device, then load the state. */
export async function boot() {
  try {
    const info = await backend.session()
    Object.assign(session, info, info.userId ? { chosen: true } : {})
  } catch {
    // Offline, the last known session is kept.
  }
  await connect(state)
}

/** Demo only: restore the initial data. */
export async function resetDemo() {
  await backend.reset?.()
  discardQueue()
  await refresh()
}

/* ---------- Account and permissions ---------- */

/**
 * Members only enter first and last name (no password); special accounts (workshop lead, admin, tablet) sign in.
 * The session itself is held by the server (cookie); the last known one is kept here so the app knows who you are even offline.
 * chosen: a choice has been made before – otherwise the app asks "Wer bist du?" on opening.
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
    // Without localStorage the app asks for the name on every opening.
  }
  return { userId: null, auth: null, chosen: false }
}

/** Who is entered or signed in in this browser. */
export const session = reactive<Session>(loadSession())

watch(session, (value) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(value))
  } catch {
    // Saving is optional.
  }
}, { deep: true })

export { needsPassword }

/** For calls that only work with the server (signing in, Vereinsflieger). */
function requireOnline() {
  if (isOffline()) throw new Error('Keine Verbindung')
}

/**
 * Member enters first and last name (no name list). Same name = same account, otherwise the server creates one.
 * 'login': the name belongs to a special account that must sign in with a password. Throws without a connection.
 */
export async function enterName(first: string, last: string): Promise<'ok' | 'login'> {
  requireOnline()
  const name = `${first.trim()} ${last.trim()}`.replace(/\s+/g, ' ')
  const result = await backend.enterName(name)
  if (!result.ok) return 'login'
  await refresh()
  Object.assign(session, { userId: result.user.id, auth: 'name', chosen: true })
  return 'ok'
}

/** Sign-in for special accounts. Throws without a connection. */
export async function login(email: string, password: string) {
  requireOnline()
  const result = await backend.login(email.trim(), password)
  if (!result.ok) return false
  Object.assign(session, { userId: result.user.id, auth: 'password', chosen: true })
  return true
}

/** Sign out or forget the name – afterwards view only. */
export function logout() {
  Object.assign(session, { userId: null, auth: null, chosen: true })
  backend.logout().catch(() => {
    // Offline: the server forgets the session at the latest when it expires.
  })
}

/**
 * Admin creates the link with which a special account sets its password, to pass on (no e-mails);
 * earlier links of the account stop working. Throws without a connection.
 */
export async function passwordLink(user: User) {
  requireOnline()
  // The server must know the account first – e.g. right after creating it.
  if (!(await whenSaved())) throw new Error('Konto noch nicht gespeichert')
  const token = await backend.passwordToken(user.id)
  return `${location.origin}${location.pathname}#/passwort?token=${encodeURIComponent(token)}`
}

/** Set the password via the link from the admin. false: link expired or already used. Throws without a connection. */
export async function setPassword(token: string, password: string) {
  requireOnline()
  return backend.setPassword(token, password)
}

export const userById = (id: UserId | null | undefined) => state.users.find((u) => u.id === id)

export function userName(id: UserId | null | undefined) {
  if (id === SYSTEM) return 'Vereinsflieger'
  return userById(id)?.name ?? 'Unbekannt'
}

/** The entered account, as long as it has not been removed. Special accounts only count after signing in. */
export function currentUser(): User | undefined {
  const u = userById(session.userId)
  if (!u || u.removed) return undefined
  return needsPassword(u) && session.auth !== 'password' ? undefined : u
}

/** People available for selection (without devices and removed accounts). */
export const people = () => state.users.filter((u) => !u.device && !u.removed)

/** Who can take over workshop lead duty (workshop leads and admins). */
export const leaders = () => people().filter((u) => u.role !== 'user')

/**
 * edit: maintain data (everyone signed in) · lead: workshop lead (sign off, plan days; on the
 * aircraft pages workshop leads and admins have the same rights) · admin: administration (accounts, season,
 * aircraft, templates) and workshop periods, admins only.
 */
export type Permission = 'edit' | 'lead' | 'admin'

const PERMISSIONS: Record<Role, Permission[]> = {
  admin: ['edit', 'lead', 'admin'],
  wl: ['edit', 'lead'],
  user: ['edit'],
}

export function can(permission: Permission) {
  const u = currentUser()
  return !!u && PERMISSIONS[u.role].includes(permission)
}

const actor = () => currentUser()?.id ?? TABLET

/* ---------- General ---------- */

export function aircraftLabel(id: string) {
  const a = state.aircraft.find((x) => x.id === id)
  return a ? `${a.type} · ${a.reg}` : ''
}

/** Aircraft types in the club, once per type – for spare parts, orders and templates. */
export const aircraftTypes = () => [...new Set(state.aircraft.map((a) => a.type))]

/** Does the spare part fit this aircraft type? */
export function fitsAircraft(item: InventoryItem, type: string) {
  return item.kind === 'et' && (item.fits === 'alle Flugzeuge' || (item.fits ?? '').split(', ').includes(type))
}

const log = (list: HistoryEntry[], text: string, at: string = today(), who: UserId = actor()) => {
  list.unshift({ text, who, at })
}

function remove<T>(list: T[], item: T) {
  const i = list.indexOf(item)
  if (i >= 0) list.splice(i, 1)
}

/* ---------- Season and schedule ---------- */

export function setSeason(input: Season) {
  Object.assign(state.season, { label: input.label.trim(), start: input.start, end: input.end })
}

/** Workshop period of an aircraft, always from Saturday to Saturday. */
export function setAircraftPeriod(aircraft: Aircraft, start: string, end: string) {
  aircraft.start = start
  aircraft.end = end
}

/** Aircraft that are in the workshop on this day – derived from the periods, not maintained by hand. */
export function planesOn(date: string) {
  return state.aircraft
    .filter((a) => a.start <= date && date <= a.end)
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((a) => a.type)
    .join(' · ')
}

const scheduleDay = (date: string) => state.schedule[date] ?? (state.schedule[date] = {})
const dayLog = (date: string, text: string) => log(scheduleDay(date).history ??= [], text, now())

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

/** New season: archive the current one, recreate cards from the templates, shift periods by the same number of weeks. */
export function startSeason(input: Season, carryOver: boolean) {
  const oldStart = state.season.start
  state.archive.unshift(JSON.parse(JSON.stringify({
    id: newId(),
    ...state.season,
    aircraft: state.aircraft.map(({ id, type, reg, start, end }) => ({ id, type, reg, start, end })),
    tasks: state.tasks,
    schedule: state.schedule,
    closedAt: today(),
    closedBy: actor(),
  })))
  // Custom cards (e.g. from defects) that are not yet done carry over into the new season.
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
  for (const a of state.aircraft) {
    const len = daysBetween(a.start, a.end)
    a.start = addDays(a.start, weeks * 7)
    if (a.start < state.season.start || a.start > state.season.end) a.start = state.season.start
    a.end = addDays(a.start, len)
    if (a.end > state.season.end) a.end = state.season.end
    cardsFromTemplates(a)
  }
}

/* ---------- Kanban templates ---------- */

export const templatesFor = (type: string) => state.templates.filter((v) => !v.aircraftTypes.length || v.aircraftTypes.includes(type))

/** Create cards from all templates that are still missing for this aircraft. */
export function cardsFromTemplates(a: Aircraft) {
  const used = new Set(state.tasks.filter((t) => t.aircraftId === a.id).map((t) => t.templateId))
  for (const v of templatesFor(a.type)) {
    if (used.has(v.id)) continue
    state.tasks.push({
      id: newId(), aircraftId: a.id, templateId: v.id, status: 'offen', level: v.level, title: v.title, desc: v.desc || '–',
      duration: v.duration, checklist: v.checklist.map((text) => ({ text, done: false })),
      history: [{ text: 'Aus Vorlage angelegt', who: actor(), at: today() }],
    })
  }
}

export interface TemplateInput {
  /** Empty = all aircraft */
  aircraftTypes: string[]
  level: TaskTemplate['level']
  title: string
  desc: string
  duration: string
  /** One step per line */
  checklist: string
}

export const templateInput = (v?: TaskTemplate): TemplateInput => ({
  aircraftTypes: [...(v?.aircraftTypes ?? [])],
  level: v?.level ?? 'ein',
  title: v?.title ?? '',
  desc: v?.desc ?? '',
  duration: v?.duration ?? '~1 h',
  checklist: v?.checklist.join('\n') ?? '',
})

function applyTemplateInput(v: TaskTemplate, input: TemplateInput) {
  Object.assign(v, {
    aircraftTypes: [...input.aircraftTypes],
    level: input.level,
    title: input.title.trim(),
    desc: input.desc.trim(),
    duration: input.duration,
    checklist: input.checklist.split('\n').map((t) => t.trim()).filter(Boolean),
  })
}

/** Templates only take effect at the next season start or for a new aircraft; existing cards stay as they are. */
export function createTemplate(input: TemplateInput) {
  const v: TaskTemplate = { id: newId(), aircraftTypes: [], level: 'ein', title: '', desc: '', duration: '', checklist: [] }
  applyTemplateInput(v, input)
  state.templates.push(v)
}

export function updateTemplate(v: TaskTemplate, input: TemplateInput) {
  applyTemplateInput(v, input)
}

export function deleteTemplate(v: TaskTemplate) {
  remove(state.templates, v)
}

/* ---------- FAQ ---------- */

export interface FaqInput {
  q: string
  a: string
}

export const faqInput = (f?: FaqEntry): FaqInput => ({ q: f?.q ?? '', a: f?.a ?? '' })

export function createFaq(input: FaqInput) {
  state.faq.push({ id: newId(), q: input.q.trim(), a: input.a.trim() })
}

export function updateFaq(f: FaqEntry, input: FaqInput) {
  Object.assign(f, { q: input.q.trim(), a: input.a.trim() })
}

export function deleteFaq(f: FaqEntry) {
  remove(state.faq, f)
}

/* ---------- Aircraft ---------- */

export interface AircraftInput {
  type: string
  reg: string
  /** Workshop period, each a Saturday */
  start: string
  end: string
}

export const aircraftInput = (a?: Aircraft): AircraftInput => ({
  type: a?.type ?? '',
  reg: a?.reg ?? '',
  start: a?.start ?? state.season.start,
  end: a?.end ?? addDays(state.season.start, 21),
})

function applyAircraftInput(a: Aircraft, input: AircraftInput) {
  a.type = input.type.trim()
  a.reg = input.reg.trim().toUpperCase()
  a.start = input.start
  a.end = input.end
}

/** withCards: create the Kanban cards from the templates right away. */
export function createAircraft(input: AircraftInput, withCards = false): Aircraft {
  const a: Aircraft = { id: newId(), type: '', reg: '', start: '', end: '' }
  applyAircraftInput(a, input)
  state.aircraft.push(a)
  if (withCards) cardsFromTemplates(state.aircraft[state.aircraft.length - 1])
  return a
}

/** A new type name also applies to spare parts and orders, as long as no other aircraft has the old type. */
export function updateAircraft(a: Aircraft, input: AircraftInput) {
  const oldType = a.type
  applyAircraftInput(a, input)
  if (a.type === oldType || state.aircraft.some((x) => x !== a && x.type === oldType)) return
  for (const i of state.inventory) {
    if (i.fits && i.fits !== 'alle Flugzeuge') i.fits = i.fits.split(', ').map((t) => (t === oldType ? a.type : t)).join(', ')
  }
  for (const o of state.orders) if (o.forWhat === oldType) o.forWhat = a.type
}

/**
 * For aircraft created by mistake: also deletes Kanban cards and documents. Otherwise retire.
 * Defects and deadlines are deleted by the server (partly from Vereinsflieger, which stays untouched); the device reloads.
 */
export function deleteAircraft(a: Aircraft) {
  state.tasks = state.tasks.filter((t) => t.aircraftId !== a.id)
  state.documents = state.documents.filter((d) => d.aircraftId !== a.id)
  remove(state.aircraft, a)
}

/* ---------- Accounts ---------- */

/** email: sign-in name of the special accounts; members do not need one. */
export function createUser(name: string, role: Role, email = ''): User {
  const user: User = { id: newId(), name: name.trim(), role }
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

/** Removed accounts stay stored so that names in the history are preserved. */
export function removeUser(user: User) {
  user.removed = true
  for (const day of Object.values(state.schedule)) if (day.leader === user.id) day.leader = null
}

/* ---------- Kanban ---------- */

/** Who started follows from the signed-in account. */
export function startTask(task: Task) {
  task.status = 'arbeit'
  log(task.history, 'Arbeit gestartet', now())
}

export function finishTask(task: Task) {
  const starter = task.history.find((h) => h.text === 'Arbeit gestartet')
  task.status = 'erledigt'
  task.doneBy = starter?.who ?? actor()
  task.doneAt = now()
  delete task.signedBy
  delete task.signedAt
  log(task.history, 'Als erledigt gemeldet', now(), task.doneBy)
}

/** Take back "Erledigt" as long as it has not been signed off yet. */
export function reopenTask(task: Task) {
  if (task.signedBy) return
  task.status = 'arbeit'
  delete task.doneBy
  delete task.doneAt
  log(task.history, 'Wieder in Arbeit', now())
}

/** Back to "Offen", e.g. when started by mistake. The checklist starts over. */
export function resetTaskToOpen(task: Task) {
  task.status = 'offen'
  task.checklist.forEach((c) => { c.done = false })
  log(task.history, 'Zurück auf Offen', now())
}

/**
 * The checklist drives the status: the first tick starts, all ticks report done,
 * a removed tick takes back "Erledigt". Signed-off cards remain unchanged.
 */
export function setChecklistItem(task: Task, index: number, done: boolean) {
  if (task.signedBy) return
  task.checklist[index].done = done
  const all = task.checklist.every((c) => c.done)
  if (done && task.status === 'offen') startTask(task)
  if (all && task.status === 'arbeit') finishTask(task)
  else if (!done && task.status === 'erledigt') reopenTask(task)
}

/** Who signs off: the signed-in account, on the workshop tablet the workshop lead of the day. */
export function signer(): UserId {
  const u = currentUser()
  if (u?.device) return state.schedule[today()]?.leader ?? u.id
  return u?.id ?? TABLET
}

export function signTask(task: Task) {
  task.signedBy = signer()
  task.signedAt = today()
  log(task.history, 'Abgezeichnet', today(), task.signedBy)
}

export function unsignTask(task: Task) {
  delete task.signedBy
  delete task.signedAt
  log(task.history, 'Abzeichnung zurückgenommen', now())
}

const photoCount = (n: number) => (n === 1 ? '1 Foto' : `${n} Fotos`)

export function addTaskNote(task: Task, text: string, photos: FileRef[]) {
  if (!text.trim() && !photos.length) return
  task.notes ??= []
  task.notes.push({ id: newId(), text: text.trim(), photos, who: actor(), at: now() })
  log(task.history, photos.length ? `Notiz mit ${photoCount(photos.length)}` : 'Notiz hinzugefügt', now())
}

export function deleteTaskNote(task: Task, note: TaskNote) {
  if (task.notes) remove(task.notes, note)
  log(task.history, 'Notiz gelöscht', now())
}

export interface TaskInput {
  title: string
  level: Task['level']
  duration: string
  desc: string
  /** One step per line */
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

/** Set or remove the link Kanban card ↔ defect/finding on both sides. */
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
    id: newId(), aircraftId, status: 'offen', level: input.level, title: '', desc: '', duration: '', checklist: [],
    history: [{ text: 'Angelegt', who: actor(), at: today() }],
  }
  applyTaskInput(task, input)
  state.tasks.push(task)
  return task
}

export function updateTask(task: Task, input: TaskInput) {
  applyTaskInput(task, input)
  log(task.history, 'Bearbeitet', now())
}

export function deleteTask(task: Task) {
  linkDefect(task, '')
  remove(state.tasks, task)
}

/* ---------- Defects / findings ---------- */

export function setDefectStatus(defect: Defect, status: Defect['status']) {
  defect.status = status
  if (status === 'done') {
    defect.doneAt = today()
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

export function unlinkDefectTask(defect: Defect) {
  const task = state.tasks.find((t) => t.id === defect.taskId)
  if (task) {
    linkDefect(task, '')
    log(task.history, 'Verknüpfung zum Mangel/Befund gelöst', now())
  } else {
    delete defect.taskId
  }
}

export interface DefectInput {
  title: string
  desc: string
  priority: Defect['priority']
  photos: FileRef[]
}

export function createDefect(aircraftId: string, input: DefectInput) {
  const photoText = input.photos.length ? `Befund mit ${photoCount(input.photos.length)} erfasst.` : 'Befund erfasst.'
  state.defects.push({
    id: newId(),
    aircraftId,
    title: input.title.trim(),
    desc: input.desc.trim() || '–',
    source: 'befund',
    photos: [...input.photos],
    reportedAt: today(),
    reportedBy: actor(),
    priority: input.priority,
    owner: null,
    status: 'open',
    history: [{ text: photoText, who: actor(), at: today() }],
  })
}

export function updateDefect(defect: Defect, input: DefectInput) {
  defect.title = input.title.trim()
  defect.desc = input.desc.trim() || '–'
  defect.priority = input.priority
  defect.photos = [...input.photos]
  log(defect.history, 'Bearbeitet.')
}

/** Only own findings – defects come from Vereinsflieger. */
export function deleteDefect(defect: Defect) {
  if (defect.source !== 'befund') return
  unlinkDefectTask(defect)
  remove(state.defects, defect)
}

/* ---------- Vereinsflieger ---------- */

/** Trigger the sync. Defects, deadlines and `vereinsflieger` are written only by the server; afterwards fetch the new state. Throws without a connection. */
export async function syncVereinsflieger() {
  requireOnline()
  await backend.vereinsfliegerSync()
  await refresh()
}

/* ---------- Documents ---------- */

/** Documents that apply to this aircraft: its own, those of its type and those of the club. */
export function docsFor(aircraftId: string) {
  const type = state.aircraft.find((a) => a.id === aircraftId)?.type
  return state.documents.filter((d) => d.aircraftId ? d.aircraftId === aircraftId : !d.aircraftType || d.aircraftType === type)
}

export type DocScope = 'aircraft' | 'type' | 'club'
export const docScope = (d: DocumentItem): DocScope => (d.aircraftId ? 'aircraft' : d.aircraftType ? 'type' : 'club')

export interface DocInput {
  title: string
  kind: DocumentItem['kind']
  version: string
  scope: DocScope
  file: FileRef | null
}

export const docInput = (d?: DocumentItem): DocInput => ({
  title: d?.title ?? '',
  kind: d?.kind ?? 'Handbuch',
  version: d?.version ?? '',
  scope: d ? docScope(d) : 'aircraft',
  file: d?.file ?? null,
})

/** aircraftId: from which aircraft it was created or edited – determines aircraft and type for the scope. */
function applyDocInput(d: DocumentItem, aircraftId: string, input: DocInput) {
  const type = state.aircraft.find((a) => a.id === aircraftId)?.type
  d.title = input.title.trim()
  d.kind = input.kind
  d.version = input.version.trim()
  d.aircraftId = input.scope === 'aircraft' ? aircraftId : undefined
  d.aircraftType = input.scope === 'type' ? type : undefined
  if (input.file?.id !== d.file?.id) {
    d.file = input.file ?? undefined
    // The sample data preview no longer matches the new file.
    delete d.image
  }
}

export function addDocument(aircraftId: string, input: DocInput) {
  const d: DocumentItem = { id: newId(), title: '', kind: 'Handbuch', version: '', addedAt: today(), addedBy: actor() }
  applyDocInput(d, aircraftId, input)
  state.documents.push(d)
}

export function updateDocument(d: DocumentItem, aircraftId: string, input: DocInput) {
  applyDocInput(d, aircraftId, input)
}

export function deleteDocument(doc: DocumentItem) {
  for (const t of state.tasks) if (t.docId === doc.id) delete t.docId
  remove(state.documents, doc)
}

/* ---------- Inventory ---------- */

export const openOrderFor = (itemId: string) =>
  state.orders.find((o) => o.itemId === itemId && o.state !== 'delivered')

export function setQty(item: InventoryItem, qty: number) {
  item.qty = Math.max(0, qty)
}

/** Set the stock and record it as a count in the history (one count per day, later ones overwrite). */
export function countItem(item: InventoryItem, qty: number) {
  setQty(item, qty)
  logCount(item)
}

export function logCount(item: InventoryItem) {
  const text = `Gezählt: ${stockText(item)}`
  const last = item.history[0]
  if (last && last.at === today() && last.who === actor() && last.text.startsWith('Gezählt')) last.text = text
  else log(item.history, text)
}

export interface ItemInput {
  name: string
  kind: InventoryItem['kind']
  location: string
  mode: InventoryItem['mode']
  qty: number
  unit: [string, string]
  /** Aircraft types, separated by ", ", or "alle Flugzeuge" (spare parts only) */
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
  const item: InventoryItem = { id: newId(), kind: 'vs', name: '', location: '', mode: 'count', qty: 0, unit: ['', ''], history: [] }
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

/** Comment on an item, workshop leads and admins only (`can('lead')`). */
export function setItemComment(item: InventoryItem, comment: string) {
  const text = comment.trim()
  if ((item.comment ?? '') === text) return
  if (text) item.comment = text
  else delete item.comment
  log(item.history, text ? 'Kommentar geändert' : 'Kommentar gelöscht')
}

/** Open orders remain as orders without an item. */
export function deleteItem(item: InventoryItem) {
  for (const o of state.orders) {
    if (o.itemId !== item.id) continue
    delete o.itemId
    log(o.history, 'Artikel aus der Inventur gelöscht')
  }
  remove(state.inventory, item)
}

/** Take over supplier, article number and link from the last order of this item. */
function lastOrderDetails(itemId: string) {
  const last = state.orders.filter((o) => o.itemId === itemId && o.state === 'delivered').sort((a, b) => (b.deliveredAt ?? '').localeCompare(a.deliveredAt ?? ''))[0]
  return last ? { supplier: last.supplier, articleNo: last.articleNo, link: last.link } : {}
}

export function addItemToOrders(item: InventoryItem, forWhat?: string, comment = '') {
  if (openOrderFor(item.id)) return
  state.orders.push({
    ...lastOrderDetails(item.id),
    id: newId(),
    itemId: item.id,
    name: item.name,
    forWhat: forWhat ?? (item.kind === 'et' ? item.fits ?? 'Lager' : 'Lager'),
    state: 'list',
    reportedBy: actor(),
    reportedAt: today(),
    comment: comment.trim(),
    history: [{ text: 'Auf Bestellliste gesetzt', who: actor(), at: today() }],
  })
}

export function addFreeOrder(name: string, forWhat: string, comment: string) {
  state.orders.push({
    id: newId(),
    name: name.trim(),
    forWhat,
    state: 'list',
    reportedBy: actor(),
    reportedAt: today(),
    comment: comment.trim(),
    history: [{ text: 'Auf Bestellliste gesetzt', who: actor(), at: today() }],
  })
}

/** Suggestion for the expected delivery when ordering. */
export const defaultDelivery = () => addDays(today(), 14)

export function markOrdered(order: Order, delivery: string) {
  order.state = 'ordered'
  order.delivery = delivery
  order.orderedBy = actor()
  order.orderedAt = today()
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

export interface OrderDetails {
  supplier: string
  articleNo: string
  link: string
  /** Empty = no price */
  price: number | null
}

export const orderDetails = (o: Order): OrderDetails => ({
  supplier: o.supplier ?? '', articleNo: o.articleNo ?? '', link: o.link ?? '', price: o.price ?? null,
})

export function setOrderDetails(order: Order, input: OrderDetails) {
  const next = {
    supplier: input.supplier.trim() || undefined,
    articleNo: input.articleNo.trim() || undefined,
    link: input.link.trim() || undefined,
    price: input.price === null || Number.isNaN(input.price) ? undefined : Math.max(0, input.price),
  }
  if (Object.entries(next).every(([k, v]) => order[k as keyof typeof next] === v)) return
  Object.assign(order, next)
  log(order.history, 'Bestelldaten geändert')
}

/** Assign an order without an item to an inventory item afterwards. */
export function linkOrderToItem(order: Order, item: InventoryItem) {
  if (openOrderFor(item.id)) return
  order.itemId = item.id
  order.name = item.name
  log(order.history, `Artikel zugeordnet: ${item.name}`)
}

/** Remove from the order list or cancel the order. */
export function cancelOrder(order: Order) {
  const item = state.inventory.find((i) => i.id === order.itemId)
  if (item) log(item.history, order.state === 'ordered' ? 'Bestellung storniert' : 'Von der Bestellliste genommen')
  remove(state.orders, order)
}

export function markDelivered(order: Order, qty: number) {
  order.state = 'delivered'
  order.deliveredAt = today()
  const item = order.itemId ? state.inventory.find((i) => i.id === order.itemId) : undefined
  if (item) {
    item.qty = item.mode === 'flag' ? FLAG.full : item.qty + qty
    if (item.mode === 'count') order.deliveredQty = qty
    const text = item.mode === 'flag' ? 'Geliefert' : `Geliefert: ${qty} ${unitOf(item, qty)}`
    log(item.history, text)
  }
  log(order.history, 'Geliefert')
}
