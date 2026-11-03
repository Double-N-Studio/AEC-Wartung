import type { AppState, User } from '../types'
import { initialState } from '../mock/data'
import { needsPassword } from '../mock/people'
import { now } from '../utils/date'
import { newId } from '../utils/id'
import type { Backend, Batch, PushResult, SessionInfo } from './backend'
import { applyChanges, MODEL_VERSION } from './records'

/**
 * Mock server of the demo: lives in localStorage and is therefore the same for all tabs of this browser –
 * each tab plays its own device (queue in sessionStorage). Behaves as in the contract
 * (docs/backend.md), just without passwords and permission checks.
 */

const SERVER_KEY = `aec-winterwartung-demo-v${MODEL_VERSION}`
const SESSION_KEY = 'aec-winterwartung-sitzung'

interface Server {
  rev: number
  state: AppState
  /** Per record: at which revision and by which device it was last changed */
  meta: Record<string, { rev: number; clientId: string }>
  /** Most recently accepted batches, so repeats do not count twice */
  seen: string[]
}

const fresh = (rev = 0): Server => ({ rev, state: initialState(), meta: {}, seen: [] })

function read(): Server {
  try {
    const raw = localStorage.getItem(SERVER_KEY)
    if (raw) return JSON.parse(raw) as Server
  } catch {
    // No localStorage – then simply the initial data every time.
  }
  return fresh()
}

function write(server: Server) {
  try {
    localStorage.setItem(SERVER_KEY, JSON.stringify(server))
  } catch {
    // Saving is optional.
  }
}

/** A change by the server itself (account created, Vereinsflieger sync). */
function serverChange(fn: (s: AppState) => void) {
  const server = read()
  fn(server.state)
  server.rev += 1
  write(server)
  return server.rev
}

const latency = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

function readSession(): SessionInfo {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      const { userId, auth } = JSON.parse(raw) as SessionInfo
      return { userId: userId ?? null, auth: auth ?? null }
    }
  } catch {
    // Without localStorage there is no stored session.
  }
  return { userId: null, auth: null }
}
function writeSession(s: SessionInfo) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s))
  } catch {
    // Saving is optional.
  }
}

export function mockBackend(): Backend {
  return {
    local: sessionStorage,

    async load() {
      await latency()
      const server = read()
      if (!localStorage.getItem(SERVER_KEY)) write(server)
      return { rev: server.rev, state: server.state }
    },

    async push(batch: Batch): Promise<PushResult> {
      await latency()
      const server = read()
      if (server.seen.includes(batch.id)) return { ok: true, rev: server.rev }
      // Conflict: another device changed the same record after this one last saw it.
      const clash = batch.changes.find((c) => {
        const m = server.meta[`${c.coll}/${c.id}`]
        return m && m.rev > batch.baseRev && m.clientId !== batch.clientId
      })
      if (clash) return { ok: false, reason: 'conflict', message: `${clash.coll}/${clash.id} wurde inzwischen geändert` }
      applyChanges(server.state, clone(batch.changes))
      server.rev += 1
      for (const c of batch.changes) server.meta[`${c.coll}/${c.id}`] = { rev: server.rev, clientId: batch.clientId }
      server.seen = [batch.id, ...server.seen].slice(0, 200)
      // Deleted aircraft: the server removes their defects and deadlines as a revision of its own.
      const gone = batch.changes.filter((c) => c.coll === 'aircraft' && c.value === null).map((c) => c.id)
      if (gone.length) {
        server.state.defects = server.state.defects.filter((d) => !gone.includes(d.aircraftId))
        server.state.deadlines = server.state.deadlines.filter((d) => !gone.includes(d.aircraftId))
        server.rev += 1
      }
      write(server)
      return { ok: true, rev: server.rev }
    },

    subscribe(onRev) {
      window.addEventListener('storage', (e) => {
        if (e.key !== SERVER_KEY || !e.newValue) return
        try {
          onRev((JSON.parse(e.newValue) as Server).rev)
        } catch {
          // Unreadable state – try again on the next load.
        }
      })
    },

    async session() {
      return readSession()
    },

    async enterName(name) {
      await latency()
      const same = read().state.users.find((u) => !u.removed && u.name.toLowerCase() === name.toLowerCase())
      if (same && needsPassword(same)) return { ok: false, reason: 'login' }
      let user = same
      if (!user) {
        const created: User = { id: newId(), name, role: 'user' }
        serverChange((s) => s.users.push(created))
        user = created
      }
      writeSession({ userId: user.id, auth: 'name' })
      return { ok: true, user }
    },

    async login(email, password) {
      await latency()
      const mail = email.trim().toLowerCase()
      const user = read().state.users.find((u) => !u.removed && needsPassword(u) && u.email?.toLowerCase() === mail)
      // The demo does not check a password.
      if (!user || !password) return { ok: false }
      writeSession({ userId: user.id, auth: 'password' })
      return { ok: true, user }
    },

    async logout() {
      writeSession({ userId: null, auth: null })
    },

    // The demo knows no passwords: every token works.
    async passwordToken() {
      await latency()
      return newId()
    },
    async setPassword() {
      await latency()
      return true
    },

    // In the demo, files live only in this browser's IndexedDB (see files.ts).
    async putFile() {},
    fileUrl: () => null,

    async vereinsfliegerSync() {
      await latency(1200)
      serverChange((s) => { s.vereinsflieger = { lastSync: now() } })
    },

    async reset() {
      write(fresh(read().rev + 1))
    },
  }
}
