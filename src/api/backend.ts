import type { AppState, FileRef, User, UserId } from '../types'
import type { Change } from './records'
import { httpBackend } from './http'
import { mockBackend } from './mock'

/**
 * Schnittstelle zum Server. Ohne VITE_API_URL läuft die Demo gegen einen Schein-Server im Browser (mock.ts),
 * mit VITE_API_URL gegen das echte Backend (http.ts, Vertrag in docs/backend.md).
 * Netzfehler werfen eine Exception; die Antworten des Servers kommen als Ergebnis zurück.
 */

/** Alle Änderungen einer Aktion, so wie sie das Gerät verlassen. */
export interface Batch {
  /** Eindeutig, damit der Server eine wiederholte Sendung erkennt */
  id: string
  /** Gerät bzw. Browser-Tab, von dem die Änderungen stammen */
  clientId: string
  /** Server-Stand (rev), auf dem die Änderungen gemacht wurden */
  baseRev: number
  at: string
  changes: Change[]
}

export interface Snapshot {
  rev: number
  state: AppState
}

export type PushResult =
  | { ok: true; rev: number }
  /** conflict: Datensatz hat inzwischen jemand anderes geändert · rejected: keine Berechtigung oder ungültig */
  | { ok: false; reason: 'conflict' | 'rejected'; message: string }

export interface SessionInfo {
  userId: UserId | null
  /** name: Mitglied ohne Passwort · password: Sonderkonto */
  auth: 'name' | 'password' | null
}

export interface Backend {
  load(): Promise<Snapshot>
  push(batch: Batch): Promise<PushResult>
  /** Meldet den neuen Server-Stand, sobald ein anderes Gerät etwas geändert hat. */
  subscribe(onRev: (rev: number) => void): void

  session(): Promise<SessionInfo>
  /** Mitglied per Vor- und Nachname; der Server legt das Konto an, wenn es den Namen noch nicht gibt. */
  enterName(name: string): Promise<{ ok: true; user: User } | { ok: false; reason: 'login' }>
  login(email: string, password: string): Promise<{ ok: true; user: User } | { ok: false }>
  logout(): Promise<void>
  /**
   * Link zum Passwort-Setzen per E-Mail an ein Sonderkonto schicken (Admin). Neue Sonderkonten bekommen ihn
   * vom Server von selbst. Passwörter stehen nie im Zustand.
   */
  sendPasswordLink(userId: UserId): Promise<void>
  /** Passwort über den Link aus der E-Mail setzen (#/passwort?token=…); false, wenn der Link abgelaufen ist. */
  setPassword(token: string, password: string): Promise<boolean>

  putFile(ref: FileRef, blob: Blob): Promise<void>
  /** Adresse der Datei auf dem Server; null, wenn es dort keine gibt (Demo). */
  fileUrl(ref: FileRef): string | null

  /** Abgleich mit Vereinsflieger anstoßen; das Ergebnis landet im Datensatz `vereinsflieger`. */
  vereinsfliegerSync(): Promise<void>

  /** Wo das Gerät Warteschlange und letzten Stand ablegt. */
  local: Storage
  /** Nur Demo: Ausgangsdaten wiederherstellen */
  reset?(): Promise<void>
}

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '')

/** Demo ohne Server: Testkonten, „Demo zurücksetzen“, „Offline testen“. */
export const DEMO = !API_URL

export const backend: Backend = API_URL ? httpBackend(API_URL) : mockBackend()
