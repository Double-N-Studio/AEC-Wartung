<script setup lang="ts">
import { computed, ref } from 'vue'
import { addItemToOrders, openOrderFor, state } from '../../store'
import type { InventoryItem } from '../../types'
import { fmtDay } from '../../utils/date'
import AppIcon from '../AppIcon.vue'
import DropdownSelect from '../DropdownSelect.vue'

/**
 * Bestandstabelle der Inventur.
 * kinds: welche Arten angezeigt werden (mit Umschalter, wenn beide).
 * forWhat: wird bei "Auf Bestellliste" als Verwendungszweck gespeichert (z. B. Flugzeugtyp).
 */
const props = withDefaults(defineProps<{ items: InventoryItem[]; kinds?: ('vs' | 'et')[]; planeFilter?: boolean; forWhat?: string }>(), {
  kinds: () => ['vs', 'et'],
  planeFilter: true,
})
const emit = defineEmits<{ open: [item: InventoryItem] }>()

const kind = ref<'vs' | 'et'>(props.kinds[0])
const query = ref('')
const stock = ref('alle')
const plane = ref('Alle')
const STOCK = [{ value: 'alle', label: 'Alle' }, { value: 'vorhanden', label: 'Vorhanden' }, { value: 'leer', label: 'Leer' }]
const PLANES = computed(() => [{ value: 'Alle', label: 'Alle' }, ...state.aircraft.map((a) => ({ value: a.type, label: a.type }))])

const countOf = (k: 'vs' | 'et') => props.items.filter((i) => i.kind === k).length
const stockText = (i: InventoryItem) => (i.mode === 'flag' ? (i.qty ? 'genug vorhanden' : 'leer') : `${i.qty} ${i.qty === 1 ? i.unit[0] : i.unit[1]}`)

const rows = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.items.filter((i) => {
    if (i.kind !== kind.value) return false
    if (q && !i.name.toLowerCase().includes(q)) return false
    if (stock.value === 'leer' && i.qty > 0) return false
    if (stock.value === 'vorhanden' && i.qty === 0) return false
    if (props.planeFilter && kind.value === 'et' && plane.value !== 'Alle' && i.fits !== 'alle Flugzeuge' && !(i.fits ?? '').split(', ').includes(plane.value)) return false
    return true
  })
})
</script>

<template>
  <section class="card stock" aria-labelledby="stock-h">
    <div class="toolbar">
      <div class="left">
        <h2 id="stock-h" class="section-title">Bestand</h2>
        <div v-if="props.kinds.length > 1" class="segmented" role="group" aria-label="Art">
          <button type="button" :aria-pressed="kind === 'vs'" @click="kind = 'vs'">Verbrauchsstoffe · {{ countOf('vs') }}</button>
          <button type="button" :aria-pressed="kind === 'et'" @click="kind = 'et'">Ersatzteile · {{ countOf('et') }}</button>
        </div>
      </div>
      <div class="right">
        <label class="search">
          <span class="sr-only">Bestand durchsuchen</span>
          <AppIcon name="search" :size="16" class="search-icon" />
          <input v-model="query" type="search" placeholder="Artikel suchen" class="input">
        </label>
        <DropdownSelect v-if="props.planeFilter && kind === 'et'" v-model="plane" label="Flugzeug" :options="PLANES" />
        <DropdownSelect v-model="stock" label="Bestand" :options="STOCK" />
      </div>
    </div>

    <div class="table" role="table" aria-label="Bestand">
      <div class="row table-head" :class="kind" role="row">
        <span role="columnheader">Artikel</span>
        <span v-if="kind === 'et'" role="columnheader">Passt für</span>
        <span role="columnheader">Lagerort</span>
        <span role="columnheader">Bestand</span>
        <span role="columnheader" class="right-align">Bestellung</span>
      </div>
      <div v-for="i in rows" :key="i.id" class="row table-row item" :class="kind" role="row">
        <span role="cell"><button type="button" class="name" @click="emit('open', i)">{{ i.name }}</button></span>
        <span v-if="kind === 'et'" role="cell" class="c-fits">{{ i.fits }}</span>
        <span role="cell" class="c-loc">{{ i.location }}</span>
        <span role="cell" class="c-qty">{{ stockText(i) }}</span>
        <span role="cell" class="c-order">
          <span v-if="openOrderFor(i.id)?.state === 'list'" class="state list"><span class="state-dot" />Auf Bestellliste</span>
          <span v-else-if="openOrderFor(i.id)?.state === 'ordered'" class="state ordered"><span class="state-dot" />Bestellt · {{ fmtDay(openOrderFor(i.id)!.delivery!) }}</span>
          <button v-else type="button" class="btn btn-sm" @click="addItemToOrders(i, props.forWhat)">Auf Bestellliste</button>
        </span>
      </div>
      <p v-if="!rows.length" class="muted empty">Keine Artikel gefunden.</p>
    </div>
  </section>
</template>

<style scoped>
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; flex-wrap: wrap; }
.left, .right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.right { gap: 8px; }
.search { position: relative; }
.search .input { width: 220px; height: 40px; padding-left: 36px; font-size: 13.5px; }
.search-icon { position: absolute; left: 12px; top: 12px; color: var(--muted); pointer-events: none; }
.table { border-top: 1px solid var(--border); }
.row { display: grid; align-items: center; }
.row.vs { grid-template-columns: minmax(0, 32fr) minmax(0, 30fr) minmax(0, 18fr) minmax(0, 20fr); }
.row.et { grid-template-columns: minmax(0, 26fr) minmax(0, 22fr) minmax(0, 22fr) minmax(0, 12fr) minmax(0, 18fr); }
.table-head { height: 38px; position: static; }
.row > span { padding: 8px 12px; }
.row > span:first-child { padding-left: 10px; }
.table-head > span:first-child { padding-left: 16px; }
.right-align { text-align: right; }
.item { min-height: 54px; }
.name { padding: 8px 6px; border: 0; border-radius: 8px; background: transparent; font-size: 14px; font-weight: 600; color: var(--accent-ink); text-align: left; }
.name:hover { background: var(--subtle); }
.c-fits, .c-loc { font-size: 13px; color: var(--text-2); line-height: 1.35; }
.c-qty { font-size: 14px; font-weight: 600; white-space: nowrap; }
.c-order { display: flex; justify-content: flex-end; padding-right: 16px !important; }
.state { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; font-size: 12.5px; font-weight: 600; }
.state-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.state.list { color: var(--orange-ink); }
.state.ordered { color: var(--green-ink); }
.empty { padding: 32px 16px; text-align: center; }
@media (max-width: 900px) {
  .table-head { display: none; }
  .row.vs, .row.et { grid-template-columns: 1fr auto; padding: 6px 0; }
  .row > span { padding: 2px 12px; }
  .c-fits, .c-loc { grid-column: 1 / -1; padding-left: 16px !important; }
  .c-qty { grid-row: 1; grid-column: 2; text-align: right; }
  .c-order { grid-column: 1 / -1; justify-content: flex-start; padding-left: 16px !important; padding-bottom: 8px !important; }
  .search, .search .input { width: 100%; }
  .right { width: 100%; }
}
</style>
