// Server-Sent Events: every connected device learns about new revisions and reloads the state.
import type { Context } from 'hono'
import { streamSSE } from 'hono/streaming'

type Listener = (rev: number) => void

export interface Events {
  /** Tell all connected devices about a new revision. */
  publish(rev: number): void
  /** GET /events: sends the current revision on connect, then every new one; `: ping` every 30 s for proxies. */
  stream(c: Context, currentRev: () => number): Response
  readonly size: number
}

export function createEvents(pingMs = 30_000): Events {
  const listeners = new Set<Listener>()
  return {
    publish(rev) {
      for (const l of listeners) l(rev)
    },
    stream(c, currentRev) {
      c.header('X-Accel-Buffering', 'no')
      c.header('Cache-Control', 'no-cache')
      return streamSSE(c, async (stream) => {
        let queue = Promise.resolve()
        const send: Listener = (rev) => {
          queue = queue.then(() => stream.writeSSE({ event: 'rev', data: String(rev) })).catch(() => {})
        }
        const ping = setInterval(() => {
          queue = queue.then(() => stream.write(': ping\n\n')).then(() => {}).catch(() => {})
        }, pingMs)
        listeners.add(send)
        send(currentRev())
        await new Promise<void>((resolve) => stream.onAbort(resolve))
        clearInterval(ping)
        listeners.delete(send)
      })
    },
    get size() {
      return listeners.size
    },
  }
}
