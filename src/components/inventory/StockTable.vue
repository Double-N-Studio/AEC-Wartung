<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { addItemToOrders, countItem, openOrderFor, state } from '../../store'
import type { InventoryItem } from '../../types'
import { fmtDay } from '../../utils/date'
import { stockLevel, unitOf, type StockLevel } from '../../utils/stock'
import AppIcon from '../AppIcon.vue'
import DropdownSelect from '../DropdownSelect.vue'
import LevelPicker from '../LevelPicker.vue'
import QtyStepper from '../QtyStepper.vue'

/**
 * Bestand als Zählliste: gruppiert nach Leer / Fast leer / Vorhanden, gezählt wird direkt in der Zeile.
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
const plane = ref('Alle')
const PLANES = computed(() => [{ value: 'Alle', label: 'Alle' }, ...state.aircraft.map((a) => ({ value: a.type, label: a.type }))])

const GROUPS: { level: StockLevel; title: string; dot: string }[] = [
  { level: 'empty', title: 'Leer', dot: 'var(--today)' },
  { level: 'low', title: 'Fast leer', dot: 'var(--amber)' },
  { level: 'ok', title: 'Vorhanden', dot: 'var(--green)' },
]

const countOf = (k: 'vs' | 'et') => props.items.filter((i) => i.kind === k).length

const rows = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.items
    .filter((i) => {
      if (i.kind !== kind.value) return false
      if (q && !i.name.toLowerCase().includes(q)) return false
      if (props.planeFilter && kind.value === 'et' && plane.value !== 'Alle' && i.fits !== 'alle Flugzeuge' && !(i.fits ?? '').split(', ').includes(plane.value)) return false
      return true
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
})

// Gruppe pro Artikel nur bei Filterwechsel neu bestimmen, nicht beim Zählen –
// sonst springt die Zeile unter dem Finger in eine andere Gruppe.
const levelOf = ref(new Map<string, StockLevel>())
watch([kind, query, plane, () => props.items.length], () => {
  levelOf.value = new Map(props.items.map((i) => [i.id, stockLevel(i)]))
}, { immediate: true })

const groups = computed(() =>
  GROUPS.map((g) => ({ ...g, list: rows.value.filter((i) => (levelOf.value.get(i.id) ?? stockLevel(i)) === g.level) })).filter((g) => g.list.length),
)
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
      </div>
    </div>

    <div v-for="g in groups" :key="g.level" class="group">
      <h3 class="group-head"><span class="dot" :style="{ background: g.dot }" />{{ g.title }}<span class="count">{{ g.list.length }}</span></h3>
      <ul class="rows">
        <li v-for="i in g.list" :key="i.id" class="row">
          <div class="info">
            <button type="button" class="name" @click="emit('open', i)">{{ i.name }}</button>
            <span class="meta">
              <span class="meta-item"><AppIcon name="pin" :size="13" />{{ i.location }}</span>
              <span v-if="i.kind === 'et' && i.fits" class="meta-item">Passt für {{ i.fits }}</span>
            </span>
          </div>
          <div class="control">
            <QtyStepper v-if="i.mode === 'count'" :model-value="i.qty" :label="`${i.qty} ${unitOf(i, i.qty)}`" boxed @update:model-value="countItem(i, $event)" />
            <LevelPicker v-else :model-value="i.qty" @update:model-value="countItem(i, $event)" />
          </div>
          <div class="order">
            <span v-if="openOrderFor(i.id)?.state === 'list'" class="state list"><span class="state-dot" />Auf Bestellliste</span>
            <span v-else-if="openOrderFor(i.id)?.state === 'ordered'" class="state ordered"><span class="state-dot" />Bestellt · {{ fmtDay(openOrderFor(i.id)!.delivery!) }}</span>
            <button v-else type="button" class="btn btn-sm" @click="addItemToOrders(i, props.forWhat)">Auf Bestellliste</button>
          </div>
        </li>
      </ul>
    </div>
    <p v-if="!rows.length" class="muted empty">Keine Artikel gefunden.</p>
  </section>
</template>

<style scoped>
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; flex-wrap: wrap; }
.left, .right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.right { gap: 8px; }
.search { position: relative; }
.search .input { width: 220px; height: 40px; padding-left: 36px; font-size: 13.5px; }
.search-icon { position: absolute; left: 12px; top: 12px; color: var(--muted); pointer-events: none; }
.group-head {
  display: flex; align-items: center; gap: 8px; padding: 10px 16px; font-size: 14px; font-weight: 700;
  background: var(--subtle); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
}
.dot { width: 10px; height: 10px; border-radius: 50%; }
.rows { list-style: none; margin: 0; padding: 0; }
.row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; min-height: 60px; padding: 9px 16px; border-bottom: 1px solid var(--border-soft); }
.row:last-child { border-bottom: 0; }
.info { flex: 1 1 220px; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.name { align-self: flex-start; padding: 2px 0; border: 0; background: transparent; font-size: 14.5px; font-weight: 600; color: var(--accent-ink); text-align: left; }
.name:hover { text-decoration: underline; }
.meta { display: flex; flex-wrap: wrap; column-gap: 12px; row-gap: 2px; font-size: 12.5px; color: var(--muted); }
.meta-item { display: inline-flex; align-items: center; gap: 5px; }
.control { flex: 0 0 224px; }
.order { flex: 0 0 176px; display: flex; justify-content: flex-end; }
.state { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; font-size: 12.5px; font-weight: 600; }
.state-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.state.list { color: var(--orange-ink); }
.state.ordered { color: var(--green-ink); }
.empty { padding: 32px 16px; text-align: center; border-top: 1px solid var(--border); }
@media (max-width: 900px) {
  .search, .search .input { width: 100%; }
  .right { width: 100%; }
}
@media (max-width: 640px) {
  .row { gap: 10px; }
  /* Zähler/Picker teilt sich die Zeile mit dem Bestellstatus; erst auf sehr schmalen Geräten umbrechen. */
  .control { flex: 0 0 168px; }
  .order { flex: 1 1 auto; }
  .order .btn-sm { padding: 0 10px; }
}
</style>
