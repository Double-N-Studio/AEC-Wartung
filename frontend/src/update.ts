/**
 * New versions of the app reach open pages by themselves: the build writes its id to version.json, an open page
 * compares it with its own id and reloads as soon as nobody is typing or has a popup open. Nothing is lost by
 * that – pending changes and new files live in device storage (sync.ts, api/files.ts).
 */
const CHECK_EVERY = 2 * 60_000
const RETRY_BUSY = 5_000
/** Build we already reloaded for – if the page still is old after that (stale cache), don't reload in a loop. */
const RELOADED_FOR = 'aec-reloaded-for'

let newer: string | null = null
let waiting = false

async function check() {
  if (!newer) {
    try {
      const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) return
      const { build } = await res.json() as { build?: string }
      if (!build || build === __BUILD_ID__ || build === sessionStorage.getItem(RELOADED_FOR)) return
      newer = build
    } catch {
      return // offline: the next check tries again
    }
  }
  reloadWhenIdle()
}

/** Someone is typing or has a popup open – a reload now would throw away what they entered. */
function busy() {
  const el = document.activeElement
  return !!document.querySelector('.modal')
    || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
}

function reloadWhenIdle() {
  if (waiting) return
  if (busy() || !navigator.onLine) {
    waiting = true
    setTimeout(() => { waiting = false; reloadWhenIdle() }, RETRY_BUSY)
    return
  }
  sessionStorage.setItem(RELOADED_FOR, newer!)
  location.reload()
}

export function watchForUpdates() {
  if (import.meta.env.DEV) return // the dev server has no version.json and reloads by itself
  setInterval(() => void check(), CHECK_EVERY)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void check() })
  window.addEventListener('online', () => void check())
}
