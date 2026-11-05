/** Account ID (e.g. 'MA', 'tablet') or SYSTEM for entries from Vereinsflieger. */
export type UserId = string

/** Admins may do everything a workshop lead can, plus administration. Without login there is no account. */
export type Role = 'admin' | 'wl' | 'user'

export interface User {
  id: UserId
  name: string
  role: Role
  /** Sign-in name of the special accounts (workshop lead, admin, tablet); members only enter their name. */
  email?: string
  /** Shared device such as the workshop tablet, not a person. */
  device?: boolean
  /** Removed accounts are kept for the history but no longer appear in any selection. */
  removed?: boolean
}

/** Reference to an uploaded file (photo, PDF); the content is provided by src/api/files.ts. */
export interface FileRef {
  id: string
  name: string
  /** MIME type, e.g. image/jpeg or application/pdf */
  type: string
  size: number
}

/** at: ISO date (YYYY-MM-DD) or date with time (YYYY-MM-DDTHH:mm) */
export interface HistoryEntry {
  text: string
  who: UserId
  at: string
}

export interface Aircraft {
  id: string
  type: string
  reg: string
  /** Workshop period, each a Saturday */
  start: string
  end: string
}

export interface Season {
  label: string
  /** First and last workshop Saturday */
  start: string
  end: string
}

/** Which aircraft are in the workshop on a day follows from the aircraft periods. */
export interface ScheduleDay {
  leader?: UserId | null
  closed?: boolean
  reason?: string
  comment?: string
  history?: HistoryEntry[]
}

export type Level = 'ein' | 'erf' | 'wl'
export type TaskStatus = 'offen' | 'arbeit' | 'erledigt'

export interface ChecklistItem {
  text: string
  done: boolean
}

/** Note on a Kanban card, e.g. what was noticed while working. */
export interface TaskNote {
  id: string
  text: string
  photos: FileRef[]
  who: UserId
  at: string
}

export interface Task {
  id: string
  aircraftId: string
  status: TaskStatus
  level: Level
  title: string
  desc: string
  duration: string
  checklist: ChecklistItem[]
  notes?: TaskNote[]
  deadline?: string
  docId?: string
  defectId?: string
  /** Created from this template (season start or new aircraft). */
  templateId?: string
  doneBy?: UserId
  doneAt?: string
  signedBy?: UserId
  signedAt?: string
  history: HistoryEntry[]
}

/** Template for Kanban cards; at season start the cards of every aircraft are created from it. */
export interface TaskTemplate {
  id: string
  /** Aircraft types the template applies to, empty = all aircraft */
  aircraftTypes: string[]
  level: Level
  title: string
  desc: string
  duration: string
  checklist: string[]
}

/** Completed season, read-only for reference. */
export interface ArchivedSeason extends Season {
  id: string
  aircraft: Pick<Aircraft, 'id' | 'type' | 'reg' | 'start' | 'end'>[]
  tasks: Task[]
  schedule: Record<string, ScheduleDay>
  closedAt: string
  closedBy: UserId
}

export type Priority = 'Sehr niedrig' | 'Niedrig' | 'Normal' | 'Hoch'

export interface Defect {
  id: string
  aircraftId: string
  title: string
  desc: string
  source: 'vf' | 'befund'
  photos: FileRef[]
  reportedAt: string
  reportedBy: UserId
  priority: Priority
  owner: UserId | null
  status: 'open' | 'done'
  doneAt?: string
  doneBy?: UserId
  taskId?: string
  history: HistoryEntry[]
}

export interface Deadline {
  id: string
  aircraftId: string
  title: string
  device: string
  deviceInfo: string
  contact: string
  delegate?: string
  due?: string
  startsLeft?: number
}

export type DocKind = 'Flughandbuch' | 'Wartungshandbuch' | 'Anleitung' | 'Prüfbericht' | 'Sonstiges'

/**
 * Document of one aircraft (aircraftId), of all aircraft of a type (aircraftType)
 * or of the whole club (both empty, e.g. workshop rules).
 */
export interface DocumentItem {
  id: string
  aircraftId?: string
  aircraftType?: string
  title: string
  kind: DocKind
  /** Edition or revision, e.g. "Änderung TM 14 vom 11.04.2023" */
  version: string
  file?: FileRef
  /** Preview image of the first page (sample data only) */
  image?: string
  addedAt: string
  addedBy: UserId
}

export interface InventoryItem {
  id: string
  kind: 'vs' | 'et'
  name: string
  location: string
  mode: 'count' | 'flag'
  /** Quantity; for mode 'flag' the fill level (see FLAG in utils/stock.ts) */
  qty: number
  unit: [string, string]
  fits?: string
  /** Note by the workshop lead (e.g. how to use or where to order); only workshop leads and admins edit it */
  comment?: string
  history: HistoryEntry[]
}

export interface Order {
  id: string
  itemId?: string
  name: string
  forWhat: string
  state: 'list' | 'ordered' | 'delivered'
  reportedBy: UserId
  reportedAt: string
  delivery?: string
  comment: string
  /** Order details so the next order goes faster */
  supplier?: string
  articleNo?: string
  link?: string
  /** Total price in euros */
  price?: number
  orderedBy?: UserId
  orderedAt?: string
  deliveredAt?: string
  /** Delivered quantity (only for items with a quantity) */
  deliveredQty?: number
  history: HistoryEntry[]
}

/** Question and answer on the FAQ page; admins maintain them. */
export interface FaqEntry {
  id: string
  q: string
  a: string
}

export interface AppState {
  users: User[]
  season: Season
  aircraft: Aircraft[]
  schedule: Record<string, ScheduleDay>
  tasks: Task[]
  templates: TaskTemplate[]
  /** Previous seasons */
  archive: ArchivedSeason[]
  defects: Defect[]
  deadlines: Deadline[]
  documents: DocumentItem[]
  inventory: InventoryItem[]
  orders: Order[]
  faq: FaqEntry[]
  /** Last sync with Vereinsflieger; error if it failed */
  vereinsflieger: { lastSync: string; error?: string }
}
