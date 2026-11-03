import type { FileRef } from '../types'
import { newId } from '../utils/id'
import { backend } from './backend'

/**
 * Files (photos, PDFs). Records store only the FileRef, never the content.
 * New files first land in this device's IndexedDB and in an outbox; `flushFiles` uploads them to the server
 * (sync.ts calls it before every batch, so the server knows a file before a record points to it).
 * This way a photo works offline too. In the demo, IndexedDB itself is "the server".
 */

/** Largest file that is accepted (the server should check the same limit). */
export const MAX_FILE_SIZE = 25 * 1024 * 1024

const DB_NAME = 'aec-winterwartung-dateien'
const FILES = 'files'
const OUTBOX = 'outbox'
let dbPromise: Promise<IDBDatabase> | null = null

function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(FILES)) req.result.createObjectStore(FILES)
      if (!req.result.objectStoreNames.contains(OUTBOX)) req.result.createObjectStore(OUTBOX)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function run<T>(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>) {
  const store = (await db()).transaction(storeName, mode).objectStore(storeName)
  return new Promise<T>((resolve, reject) => {
    const req = fn(store)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Store the file on the device and mark it for upload. Throws only if it is too large or the device cannot store it. */
export async function uploadFile(blob: Blob, name: string): Promise<FileRef> {
  if (blob.size > MAX_FILE_SIZE) throw new Error(`Die Datei ist größer als ${fmtSize(MAX_FILE_SIZE)}.`)
  const ref: FileRef = { id: newId(), name, type: blob.type, size: blob.size }
  await run(FILES, 'readwrite', (s) => s.put(blob, ref.id))
  await run(OUTBOX, 'readwrite', (s) => s.put(ref, ref.id))
  return ref
}

let flushing: Promise<void> | null = null

/** Upload the marked files. Network errors throw (retry later); files rejected by the server drop out of the outbox. */
export function flushFiles(): Promise<void> {
  flushing ??= (async () => {
    try {
      const refs = await run<FileRef[]>(OUTBOX, 'readonly', (s) => s.getAll())
      for (const ref of refs) {
        const blob = await run<Blob | undefined>(FILES, 'readonly', (s) => s.get(ref.id))
        try {
          if (blob) await backend.putFile(ref, blob)
        } catch (e) {
          if (!(e as { permanent?: boolean }).permanent) throw e
        }
        await run(OUTBOX, 'readwrite', (s) => s.delete(ref.id))
      }
    } finally {
      flushing = null
    }
  })()
  return flushing
}

const urls = new Map<string, string>()

/** Address for viewing or downloading; null if the file is missing (e.g. sample data without a file). */
export async function fileUrl(ref: FileRef): Promise<string | null> {
  if (urls.has(ref.id)) return urls.get(ref.id)!
  try {
    const blob = await run<Blob | undefined>(FILES, 'readonly', (s) => s.get(ref.id))
    if (blob) {
      const url = URL.createObjectURL(blob)
      urls.set(ref.id, url)
      return url
    }
  } catch {
    // No IndexedDB – then from the server.
  }
  return backend.fileUrl(ref)
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

/** Shrink photos before uploading (longest side max. 1600 px, JPEG), so they go through quickly even on the hangar Wi-Fi. */
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

/** e.g. "2,4 MB" */
export function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}
