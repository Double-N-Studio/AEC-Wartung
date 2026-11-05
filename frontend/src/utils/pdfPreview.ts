/**
 * Preview image of the first page of a PDF, rendered in the browser with pdf.js.
 * pdf.js is loaded on first use only, so it doesn't weigh on the start of the app.
 */
export async function pdfPreview(src: Blob | string, width = 480): Promise<Blob> {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const data = typeof src === 'string' ? { url: src } : { data: new Uint8Array(await src.arrayBuffer()) }
  const task = pdfjs.getDocument(data)
  try {
    const doc = await task.promise
    const page = await doc.getPage(1)
    const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    await page.render({ canvas, viewport }).promise
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Vorschau fehlgeschlagen'))), 'image/jpeg', 0.8))
  } finally {
    await task.destroy()
  }
}
