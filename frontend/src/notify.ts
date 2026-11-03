import { reactive } from 'vue'

/** Short messages at the bottom of the screen, e.g. when the server rejected a change. */
export interface Toast {
  id: number
  text: string
  kind: 'error' | 'info'
}

export const toasts = reactive<Toast[]>([])
let seq = 0

export function notify(text: string, kind: Toast['kind'] = 'error') {
  if (toasts.some((t) => t.text === text)) return
  const id = ++seq
  toasts.push({ id, text, kind })
  setTimeout(() => dismiss(id), kind === 'error' ? 9000 : 5000)
}

export function dismiss(id: number) {
  const i = toasts.findIndex((t) => t.id === id)
  if (i >= 0) toasts.splice(i, 1)
}
