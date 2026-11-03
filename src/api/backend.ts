import type { AppState, FileRef, User, UserId } from '../types'
import type { Change } from './records'
import { httpBackend } from './http'
import { mockBackend } from './mock'

/**
 * Interface to the server. Without VITE_API_URL the demo runs against a mock server in the browser (mock.ts),
 * with VITE_API_URL against the real backend (http.ts, contract in docs/backend.md).
 * Network errors throw an exception; the server's answers come back as the result.
 */

/** All changes of one action, as they leave the device. */
export interface Batch {
  /** Unique, so the server recognises a repeated batch */
  id: string
  /** Device or browser tab the changes come from */
  clientId: string
  /** Server revision (rev) the changes were made on */
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
  /** conflict: someone else changed the record in the meantime · rejected: no permission or invalid */
  | { ok: false; reason: 'conflict' | 'rejected'; message: string }

export interface SessionInfo {
  userId: UserId | null
  /** name: member without password · password: special account */
  auth: 'name' | 'password' | null
}

export interface Backend {
  load(): Promise<Snapshot>
  push(batch: Batch): Promise<PushResult>
  /** Reports the new server revision as soon as another device has changed something. */
  subscribe(onRev: (rev: number) => void): void

  session(): Promise<SessionInfo>
  /** Member by first and last name; the server creates the account if the name does not exist yet. */
  enterName(name: string): Promise<{ ok: true; user: User } | { ok: false; reason: 'login' }>
  login(email: string, password: string): Promise<{ ok: true; user: User } | { ok: false }>
  logout(): Promise<void>
  /**
   * Send the set-password link by e-mail to a special account (admin). New special accounts get it
   * from the server automatically. Passwords are never part of the state.
   */
  sendPasswordLink(userId: UserId): Promise<void>
  /** Set the password via the link from the e-mail (#/passwort?token=…); false if the link has expired. */
  setPassword(token: string, password: string): Promise<boolean>

  putFile(ref: FileRef, blob: Blob): Promise<void>
  /** Address of the file on the server; null if there is none there (demo). */
  fileUrl(ref: FileRef): string | null

  /** Trigger the sync with Vereinsflieger; the result ends up in the `vereinsflieger` record. */
  vereinsfliegerSync(): Promise<void>

  /** Where the device stores the queue and the last state. */
  local: Storage
  /** Demo only: restore the initial data */
  reset?(): Promise<void>
}

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '')

/** Demo without server: test accounts, "Demo zurücksetzen", "Offline testen". */
export const DEMO = !API_URL

export const backend: Backend = API_URL ? httpBackend(API_URL) : mockBackend()
