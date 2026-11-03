import type { User } from '../types'
import type { Backend, PushResult, SessionInfo, Snapshot } from './backend'

/** Real backend under base (e.g. /api). Endpoints and responses: docs/backend.md. */
export function httpBackend(base: string): Backend {
  /** Network errors and 5xx throw (the device retries later), everything else goes to the caller. */
  async function call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    const json = body !== undefined && !(body instanceof Blob)
    const res = await fetch(`${base}${path}`, {
      method,
      credentials: 'include',
      headers: json ? { 'Content-Type': 'application/json', ...headers } : headers,
      body: json ? JSON.stringify(body) : (body as Blob | undefined),
    })
    if (res.status >= 500) throw new Error(`Server antwortet mit ${res.status}`)
    const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : null
    return { status: res.status, data }
  }
  const message = (data: unknown, fallback: string) =>
    (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : fallback)

  return {
    local: localStorage,

    async load() {
      const { status, data } = await call('GET', '/state')
      if (status !== 200) throw new Error(message(data, `Laden fehlgeschlagen (${status})`))
      return data as Snapshot
    },

    async push(batch): Promise<PushResult> {
      const { status, data } = await call('POST', '/changes', batch)
      if (status === 200) return { ok: true, rev: (data as { rev: number }).rev }
      if (status === 409) return { ok: false, reason: 'conflict', message: message(data, 'Inzwischen geändert') }
      if (status === 401) return { ok: false, reason: 'rejected', message: 'Nicht angemeldet' }
      return { ok: false, reason: 'rejected', message: message(data, `Abgelehnt (${status})`) }
    },

    subscribe(onRev) {
      // EventSource reconnects by itself after interruptions; in addition sync.ts reloads when returning to the tab.
      const events = new EventSource(`${base}/events`, { withCredentials: true })
      events.addEventListener('rev', (e) => onRev(Number((e as MessageEvent).data)))
    },

    async session() {
      const { status, data } = await call('GET', '/session')
      if (status !== 200) return { userId: null, auth: null }
      return data as SessionInfo
    },

    async enterName(name) {
      const { status, data } = await call('POST', '/session/name', { name })
      if (status === 409) return { ok: false, reason: 'login' }
      if (status !== 200) throw new Error(message(data, 'Name konnte nicht gespeichert werden'))
      return { ok: true, user: (data as { user: User }).user }
    },

    async login(email, password) {
      const { status, data } = await call('POST', '/session/login', { email, password })
      if (status !== 200) return { ok: false }
      return { ok: true, user: (data as { user: User }).user }
    },

    async logout() {
      await call('DELETE', '/session')
    },

    async passwordToken(userId) {
      const { status, data } = await call('POST', `/users/${encodeURIComponent(userId)}/password-link`)
      if (status !== 200) throw new Error(message(data, 'Link konnte nicht erstellt werden'))
      return (data as { token: string }).token
    },

    async setPassword(token, password) {
      const { status } = await call('POST', '/password', { token, password })
      return status < 300
    },

    async putFile(ref, blob) {
      const { status, data } = await call('PUT', `/files/${encodeURIComponent(ref.id)}`, blob, {
        'Content-Type': ref.type || 'application/octet-stream',
        'X-File-Name': encodeURIComponent(ref.name),
      })
      // 4xx (too large, not allowed) will not get through on a retry either.
      if (status >= 300) throw Object.assign(new Error(message(data, 'Datei abgelehnt')), { permanent: true })
    },

    fileUrl: (ref) => `${base}/files/${encodeURIComponent(ref.id)}`,

    async vereinsfliegerSync() {
      const { status, data } = await call('POST', '/vereinsflieger/sync')
      if (status >= 300) throw new Error(message(data, 'Abgleich konnte nicht gestartet werden'))
    },
  }
}
