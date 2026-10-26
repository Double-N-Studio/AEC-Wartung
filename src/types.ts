export type PersonKey = 'MA' | 'HE' | 'JO' | 'LE' | 'SO' | 'FE' | 'TI' | 'LO' | 'NU'

export interface Person {
  key: PersonKey
  name: string
  bg: string
  fg: string
}

/** at: ISO-Datum (YYYY-MM-DD) oder Datum mit Uhrzeit (YYYY-MM-DDTHH:mm) */
export interface HistoryEntry {
  text: string
  who: string
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
  /** Werkstattzeitraum */
  start: string
  end: string
}

export interface ScheduleDay {
  leader?: PersonKey | null
  planes?: string
  closed?: boolean
  reason?: string
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
  doc?: string
  defectId?: string
  doneBy?: string
  doneAt?: string
  signedBy?: string
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
  reportedBy: string
  priority: Priority
  owner: string
  status: 'open' | 'done'
  doneAt?: string
  doneBy?: string
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
  reportedBy: string
  reportedAt: string
  delivery?: string
  comment: string
  history: HistoryEntry[]
}

export interface AppState {
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
