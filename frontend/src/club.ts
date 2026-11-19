// Who the app belongs to: club name, app name, public address and logo. Not compiled in, so one build serves
// every club: the app loads club/club.json (next to index.html) at startup. The repo ships the files of
// Aero-Club Bad Nauheim (also used by the demo); on a server the files in DATA_DIR/club/ replace them.
// The last known config is kept on the device, so the right name and logo show offline and before the request ends.
import { reactive } from 'vue'
import qrcode from 'qrcode-generator'

export interface Club {
  /** Club name, e.g. "Aero-Club Bad Nauheim" (logo alt text, page title). */
  name: string
  /** Name of the app in the sidebar and the title bar. */
  app: string
  /** Public address of the app, for the QR code on the workshop tablet and the printable notice. Empty = no QR code. */
  url: string
  /** Logo file inside club/ (or a full URL). */
  logo: string
}

const DIR = 'club/'
const CACHE_KEY = 'winterwartung-verein'

export const club = reactive<Club>({ name: '', app: 'Winterwartung', url: '', logo: 'logo.png' })

/** Logo URL, relative to the page (base './'). */
export function clubLogo() {
  return /^(https?:)?\/\/|^data:/.test(club.logo) ? club.logo : DIR + club.logo
}

/** Address without protocol and trailing slash, for display ("wartung.aecbn.de"). */
export function clubHost() {
  return club.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

/** QR code of the app address as an SVG data URL, or '' without an address. */
export function clubQr() {
  if (!club.url) return ''
  const qr = qrcode(0, 'M')
  qr.addData(club.url)
  qr.make()
  return `data:image/svg+xml,${encodeURIComponent(qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }))}`
}

function apply(data: Partial<Club>) {
  for (const key of ['name', 'app', 'url', 'logo'] as const) {
    if (typeof data[key] === 'string') club[key] = data[key]!
  }
  document.title = club.name ? `${club.app} · ${club.name}` : club.app
  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (icon) icon.href = clubLogo()
}

/** Applies the cached config at once, then the current one from the server. Never throws. */
export async function loadClub() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) apply(JSON.parse(cached) as Partial<Club>)
  } catch { /* no storage or broken entry */ }
  try {
    const res = await fetch(`${DIR}club.json`, { cache: 'no-cache' })
    if (!res.ok) return
    const data = await res.json() as Partial<Club>
    apply(data)
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch { /* storage full or blocked */ }
  } catch { /* offline: the cached config stays */ }
}
