/** Konto-ID (z. B. 'MA', 'tablet') oder SYSTEM für Einträge aus Vereinsflieger. */
export type UserId = string

/** Admin und Werkstattleiter haben vorerst dieselben Rechte. Ohne Login gibt es kein Konto. */
export type Role = 'admin' | 'wl' | 'user'

export interface User {
  id: UserId
  name: string
  role: Role
  /** Geteiltes Gerät wie das Werkstatt-Tablet, keine Person. */
  device?: boolean
  /** Entfernte Konten bleiben für den Verlauf erhalten, tauchen aber in keiner Auswahl mehr auf. */
  removed?: boolean
  bg: string
  fg: string
}

/** at: ISO-Datum (YYYY-MM-DD) oder Datum mit Uhrzeit (YYYY-MM-DDTHH:mm) */
export interface HistoryEntry {
  text: string
  who: UserId
  at: string
}

export interface Aircraft {
  id: string
  type: string
  reg: string
  /** Nur Flugzeuge mit Detailseiten sind verlinkt. */
  hasDetails: boolean
  serial?: string
  sponsor?: string
  /** Werkstattzeitraum, jeweils ein Samstag */
  start: string
  end: string
}

export interface Season {
  label: string
  /** Erster und letzter Werkstatt-Samstag */
  start: string
  end: string
}

/** Welche Flugzeuge an einem Tag in der Werkstatt sind, ergibt sich aus den Zeiträumen der Flugzeuge. */
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

export interface Task {
  id: string
  aircraftId: string
  status: TaskStatus
  level: Level
  title: string
  desc: string
  duration: string
  checklist: ChecklistItem[]
  deadline?: string
  docId?: string
  defectId?: string
  doneBy?: UserId
  doneAt?: string
  signedBy?: UserId
  signedAt?: string
  history: HistoryEntry[]
}

export type Priority = 'Sehr niedrig' | 'Niedrig' | 'Normal' | 'Hoch'

export interface Defect {
  id: string
  aircraftId: string
  title: string
  desc: string
  source: 'vf' | 'befund'
  photos: number
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

export interface DocumentItem {
  id: string
  aircraftId: string
  title: string
  meta: string
  image?: string
}

export interface InventoryItem {
  id: string
  kind: 'vs' | 'et'
  name: string
  location: string
  mode: 'count' | 'flag'
  /** Stückzahl; bei mode 'flag' der Füllstand (siehe FLAG in utils/stock.ts) */
  qty: number
  unit: [string, string]
  fits?: string
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
  history: HistoryEntry[]
}

export interface AppState {
  users: User[]
  season: Season
  aircraft: Aircraft[]
  schedule: Record<string, ScheduleDay>
  tasks: Task[]
  defects: Defect[]
  deadlines: Deadline[]
  documents: DocumentItem[]
  inventory: InventoryItem[]
  orders: Order[]
  counter: number
}
