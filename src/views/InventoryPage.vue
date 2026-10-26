<script setup lang="ts">
import { computed, ref } from 'vue'
import { addItemToOrders, openOrderFor, state } from '../store'
import type { InventoryItem, Order } from '../types'
import { fmtDay } from '../utils/date'
import AppIcon from '../components/AppIcon.vue'
import DropdownSelect from '../components/DropdownSelect.vue'
import ItemModal from './inventory/ItemModal.vue'
import FreeOrderModal from './inventory/FreeOrderModal.vue'
import NewOrderModal from './inventory/NewOrderModal.vue'

const kind = ref<'vs' | 'et'>('vs')
const query = ref('')
const stock = ref('alle')
const plane = ref('Alle')
const STOCK = [{ value: 'alle', label: 'Alle' }, { value: 'vorhanden', label: 'Vorhanden' }, { value: 'leer', label: 'Leer' }]
const PLANES = computed(() => [{ value: 'Alle', label: 'Alle' }, ...state.aircraft.map((a) => ({ value: a.type, label: a.type }))])

const countOf = (k: 'vs' | 'et') => state.inventory.filter((i) => i.kind === k).length
const stockText = (i: InventoryItem) => i.mode === 'flag' ? (i.qty ? 'genug vorhanden' : 'leer') : `${i.qty} ${i.qty === 1 ? i.unit[0] : i.unit[1]}`

const rows = computed(() => {
  const q = query.value.trim().toLowerCase()
  return state.inventory.filter((i) => {
    if (i.kind !== kind.value) return false
    if (q && !i.name.toLowerCase().includes(q)) return false
    if (stock.value === 'leer' && i.qty > 0) return false
    if (stock.value === 'vorhanden' && i.qty === 0) return false
    if (kind.value === 'et' && plane.value !== 'Alle' && i.fits !== 'alle Flugzeuge' && !(i.fits ?? '').split(', ').includes(plane.value)) return false
    return true
  })
})

const listOrders = computed(() => state.orders.filter((o) => o.state === 'list'))
const orderedOrders = computed(() => state.orders.filter((o) => o.state === 'ordered'))
const orderMeta = (o: Order) => o.state === 'ordered' ? `${o.forWhat} · Lieferung ca. ${fmtDay(o.delivery!)}` : `${o.forWhat} · gemeldet von ${o.reportedBy}`

const openItemId = ref<string | null>(null)
const openItem = computed(() => state.inventory.find((i) => i.id === openItemId.value) ?? null)
const openFreeId = ref<string | null>(null)
const openFree = computed(() => state.orders.find((o) => o.id === openFreeId.value) ?? null)
const creating = ref(false)

function openOrder(o: Order) {
  if (o.itemId) openItemId.value = o.itemId
  else openFreeId.value = o.id
}
</script>

<template>
  <div class="page">
    <header class="head">
      <div>
        <h1 class="page-title">Inventur</h1>
        <p class="page-sub">Verbrauchsstoffe aus dem Lager und Ersatzteile der Flugzeuge</p>
      </div>
      <button type="button" class="btn" @click="creating = true"><AppIcon name="plus" :stroke="2.2" />Auf Bestellliste</button>
    </header>

    <section class="orders" aria-label="Bestellliste">
      <div v-for="group in [{ title: 'Muss bestellt werden', dot: 'var(--today)', list: listOrders }, { title: 'Bestellt', dot: 'var(--green)', list: orderedOrders }]" :key="group.title" class="card order-card">
        <h2 class="order-title"><span class="dot" :style="{ background: group.dot }" />{{ group.title }}</h2>
        <button v-for="o in group.list" :key="o.id" type="button" class="order" @click="openOrder(o)">
          <span class="order-text">
            <strong>{{ o.name }}</strong>
            <span class="muted">{{ orderMeta(o) }}</span>
            <span v-if="o.comment" class="comment">{{ o.comment }}</span>
          </span>
          <AppIcon name="chevronRight" :size="16" class="muted" />
        </button>
        <p v-if="!group.list.length" class="muted empty">Nichts offen.</p>
      </div>
    </section>

    <section class="card stock" aria-labelledby="stock-h">
      <div class="toolbar">
        <div class="left">
          <h2 id="stock-h" class="section-title">Bestand</h2>
          <div class="segmented" role="group" aria-label="Art">
            <button type="button" :aria-pressed="kind === 'vs'" @click="kind = 'vs'">Verbrauchsstoffe · {{ countOf('vs') }}</button>
            <button type="button" :aria-pressed="kind === 'et'" @click="kind = 'et'">Ersatzteile · {{ countOf('et') }}</button>
          </div>
        </div>
        <div class="right">
          <label class="search">
            <span class="sr-only">Inventur durchsuchen</span>
            <AppIcon name="search" :size="16" class="search-icon" />
            <input v-model="query" type="search" placeholder="Artikel suchen" class="input">
          </label>
          <DropdownSelect v-if="kind === 'et'" v-model="plane" label="Flugzeug" :options="PLANES" />
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
          <span role="cell"><button type="button" class="name" @click="openItemId = i.id">{{ i.name }}</button></span>
          <span v-if="kind === 'et'" role="cell" class="c-fits">{{ i.fits }}</span>
          <span role="cell" class="c-loc">{{ i.location }}</span>
          <span role="cell" class="c-qty">{{ stockText(i) }}</span>
          <span role="cell" class="c-order">
            <span v-if="openOrderFor(i.id)?.state === 'list'" class="state list"><AppIcon name="check" :size="14" :stroke="2.6" />Auf Bestellliste</span>
            <span v-else-if="openOrderFor(i.id)?.state === 'ordered'" class="state ordered">Bestellt · {{ fmtDay(openOrderFor(i.id)!.delivery!) }}</span>
            <button v-else type="button" class="btn btn-sm" @click="addItemToOrders(i)">Auf Bestellliste</button>
          </span>
        </div>
        <p v-if="!rows.length" class="muted empty">Keine Artikel gefunden.</p>
      </div>
    </section>

    <ItemModal v-if="openItem" :item="openItem" @close="openItemId = null" />
    <FreeOrderModal v-if="openFree" :order="openFree" @close="openFreeId = null" />
    <NewOrderModal v-if="creating" @close="creating = false" />
  </div>
</template>

<style scoped>
.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.orders { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; align-items: start; }
.order-card { min-width: 0; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.order-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.order {
  width: 100%; min-height: 48px; display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 7px 10px; border-radius: 9px; border: 1px solid var(--border-soft); background: var(--subtle); text-align: left;
}
.order:hover { border-color: var(--border-strong); }
.order-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; font-size: 13.5px; }
.order-text .muted { font-size: 12px; }
.comment { margin-top: 2px; font-size: 12px; font-style: italic; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.empty { font-size: 13px; padding: 6px 2px; }

.stock { overflow: visible; }
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
.state { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; font-size: 12.5px; font-weight: 600; }
.state.list { color: var(--orange-ink); }
.state.ordered { color: var(--green-ink); }
.empty { padding: 32px 16px; text-align: center; }

@media (max-width: 900px) {
  .orders { grid-template-columns: minmax(0, 1fr); }
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
