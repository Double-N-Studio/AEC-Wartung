import type { InventoryItem } from '../types'

/** Füllstand bei Artikeln ohne Stückzahl (mode 'flag'), gespeichert in qty. */
export const FLAG = { empty: 0, low: 1, full: 2 } as const

export type StockLevel = 'empty' | 'low' | 'ok'

/** "Fast leer" gibt es nur bei Artikeln ohne Stückzahl. */
export function stockLevel(item: InventoryItem): StockLevel {
  if (item.qty === 0) return 'empty'
  return item.mode === 'flag' && item.qty === FLAG.low ? 'low' : 'ok'
}

export const unitOf = (item: InventoryItem, n: number) => (n === 1 ? item.unit[0] : item.unit[1])

/** "4 Dosen" / "genug vorhanden" / "fast leer" / "leer" */
export function stockText(item: InventoryItem): string {
  if (item.mode === 'count') return `${item.qty} ${unitOf(item, item.qty)}`
  return { empty: 'leer', low: 'fast leer', ok: 'genug vorhanden' }[stockLevel(item)]
}
