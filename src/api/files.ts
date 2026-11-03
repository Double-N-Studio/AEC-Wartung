import type { FileRef } from '../types'

/**
 * Dateien (Fotos, PDFs). Datensätze speichern nur die FileRef, nie den Inhalt.
 * Im Mockup liegen die Dateien in IndexedDB dieses Browsers. Mit Backend lädt `uploadFile` zum Server hoch
 * (z. B. POST /files) und `fileUrl` liefert die Server-URL – sonst ändert sich in den Komponenten nichts.
 */

const DB_NAME = 'aec-winterwartung-dateien'
const STORE = 'files'
let dbPromise: Promise<IDBDatabase> | null = null

function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>) {
  const store = (await db()).transaction(STORE, mode).objectStore(STORE)
  return new Promise<T>((resolve, reject) => {
    const req = fn(store)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function uploadFile(blob: Blob, name: string): Promise<FileRef> {
  const ref: FileRef = { id: `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, name, type: blob.type, size: blob.size }
  await run('readwrite', (s) => s.put(blob, ref.id))
  return ref
}

const urls = new Map<string, string>()

/** Adresse zum Anzeigen oder Herunterladen; null, wenn die Datei fehlt (z. B. Beispieldaten ohne Datei). */
export async function fileUrl(ref: FileRef): Promise<string | null> {
  if (urls.has(ref.id)) return urls.get(ref.id)!
  try {
    const blob = await run<Blob | undefined>('readonly', (s) => s.get(ref.id))
    if (!blob) return null
    const url = URL.createObjectURL(blob)
    urls.set(ref.id, url)
    return url
  } catch {
    return null
  }
}

export async function downloadFile(ref: FileRef) {
  const url = await fileUrl(ref)
  if (!url) return false
  const a = document.createElement('a')
  a.href = url
  a.download = ref.name
  a.click()
  return true
}

/** Fotos vor dem Hochladen verkleinern (längste Seite max. 1600 px, JPEG), damit sie auch im Hangar-WLAN schnell durchgehen. */
export async function compressImage(file: File, max = 1600, quality = 0.8): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', quality))
  } catch {
    return file
  }
}

/** 2,4 MB */
export function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}
