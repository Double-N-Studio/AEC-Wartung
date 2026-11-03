import { isOffline } from '../sync'

/**
 * Abgleich mit Vereinsflieger (Mängel und Fristen). Läuft mit Backend auf dem Server – regelmäßig und auf Knopfdruck
 * (z. B. POST /vereinsflieger/sync); die Zugangsdaten liegen nur dort. Im Mockup wird der Abruf nur simuliert.
 */
export async function syncNow(): Promise<{ ok: true } | { ok: false; error: string }> {
  await new Promise((resolve) => setTimeout(resolve, 1200))
  if (isOffline()) return { ok: false, error: 'Keine Verbindung' }
  return { ok: true }
}
