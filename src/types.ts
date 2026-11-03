/** Konto-ID (z. B. 'MA', 'tablet') oder SYSTEM für Einträge aus Vereinsflieger. */
export type UserId = string

/** Admins dürfen alles wie Werkstattleiter, dazu die Verwaltung. Ohne Login gibt es kein Konto. */
export type Role = 'admin' | 'wl' | 'user'

export interface User {
  id: UserId
  name: string
  role: Role
  /** Anmeldename der Sonderkonten (Werkstattleitung, Admin, Tablet); Mitglieder geben nur ihren Namen ein. */
  email?: string
  /** Geteiltes Gerät wie das Werkstatt-Tablet, keine Person. */
  device?: boolean
  /** Entfernte Konten bleiben für den Verlauf erhalten, tauchen aber in keiner Auswahl mehr auf. */
  removed?: boolean
  bg: string
  fg: string
}

/** Verweis auf eine hochgeladene Datei (Foto, PDF); den Inhalt liefert src/api/files.ts. */
export interface FileRef {
  id: string
  name: string
  /** MIME-Typ, z. B. image/jpeg oder application/pdf */
  type: string
  size: number
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
  serial?: string
  /** Verkauft o. ä.: bleibt mit allen Daten erhalten, taucht aber in Seitenleiste, Saisonplan und Auswahllisten nicht mehr auf. */
  retired?: boolean
  /** Flugzeugpate (Konto-ID) */
  manager?: UserId
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

/** Notiz an einer Kanban-Karte, z. B. was beim Arbeiten aufgefallen ist. */
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
  /** Aus dieser Vorlage angelegt (Saisonstart oder neues Flugzeug). */
  templateId?: string
  doneBy?: UserId
  doneAt?: string
  signedBy?: UserId
  signedAt?: string
  history: HistoryEntry[]
}

/** Vorlage für Kanban-Karten; daraus entstehen zu Saisonbeginn die Karten jedes Flugzeugs. */
export interface TaskTemplate {
  id: string
  /** Flugzeugtyp, leer = alle Flugzeuge */
  aircraftType: string
  level: Level
  title: string
  desc: string
  duration: string
  checklist: string[]
  /** Dokumente gehören zum einzelnen Flugzeug; verknüpft wird das Dokument mit diesem Titel. */
  docTitle?: string
}

/** Abgeschlossene Saison, nur noch zum Nachlesen. */
export interface ArchivedSeason extends Season {
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

export type DocKind = 'Handbuch' | 'Anleitung' | 'Prüfbericht' | 'Sonstiges'

/**
 * Dokument eines Flugzeugs (aircraftId), aller Flugzeuge eines Typs (aircraftType)
 * oder des ganzen Vereins (beides leer, z. B. Werkstattordnung).
 */
export interface DocumentItem {
  id: string
  aircraftId?: string
  aircraftType?: string
  title: string
  kind: DocKind
  /** Ausgabe oder Stand, z. B. „Änderung TM 14 vom 11.04.2023“ */
  version: string
  file?: FileRef
  /** Vorschaubild der ersten Seite (nur Beispieldaten) */
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
  /** Bestelldaten, damit die nächste Bestellung schneller geht */
  supplier?: string
  articleNo?: string
  link?: string
  /** Gesamtpreis in Euro */
  price?: number
  orderedBy?: UserId
  orderedAt?: string
  deliveredAt?: string
  /** Gelieferte Stückzahl (nur bei Artikeln mit Stückzahl) */
  deliveredQty?: number
  history: HistoryEntry[]
}

export interface AppState {
  users: User[]
  season: Season
  aircraft: Aircraft[]
  schedule: Record<string, ScheduleDay>
  tasks: Task[]
  templates: TaskTemplate[]
  /** Frühere Saisons, neueste zuerst */
  archive: ArchivedSeason[]
  defects: Defect[]
  deadlines: Deadline[]
  documents: DocumentItem[]
  inventory: InventoryItem[]
  orders: Order[]
  /** Letzter Abgleich mit Vereinsflieger; error, wenn er fehlgeschlagen ist */
  vereinsflieger: { lastSync: string; error?: string }
  counter: number
}
