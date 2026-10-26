<script setup lang="ts">
import { computed } from 'vue'
import { addItemToOrders, logCount, openOrderFor, setQty } from '../../store'
import type { InventoryItem } from '../../types'
import AppModal from '../../components/AppModal.vue'
import HistoryList from '../../components/HistoryList.vue'
import QtyStepper from '../../components/QtyStepper.vue'
import OrderSection from './OrderSection.vue'

const props = defineProps<{ item: InventoryItem; forWhat?: string }>()
const emit = defineEmits<{ close: [] }>()

const order = computed(() => openOrderFor(props.item.id))
const unit = (n: number) => (n === 1 ? props.item.unit[0] : props.item.unit[1])
const qty = computed({
  get: () => props.item.qty,
  set: (v: number) => { setQty(props.item, v); logCount(props.item) },
})
const setFlag = (full: boolean) => { setQty(props.item, full ? 1 : 0); logCount(props.item) }
const history = computed(() => [...(order.value?.history ?? []), ...props.item.history])
</script>

<template>
  <AppModal :title="item.name" :kicker="item.kind === 'et' ? 'Ersatzteil' : 'Verbrauchsstoff'" :width="820" @close="emit('close')">
    <div class="grid">
      <div class="main">
        <section class="block">
          <h3 class="block-title">Bestand</h3>
          <QtyStepper v-if="item.mode === 'count'" v-model="qty" :label="`${item.qty} ${unit(item.qty)}`" big />
          <div v-else class="segmented" role="group" aria-label="Bestand">
            <button type="button" class="seg-lg" :aria-pressed="item.qty > 0" @click="setFlag(true)">Genug vorhanden</button>
            <button type="button" class="seg-lg" :aria-pressed="item.qty === 0" @click="setFlag(false)">Leer</button>
          </div>
          <dl class="facts">
            <dt>Lagerort</dt><dd>{{ item.location }}</dd>
            <template v-if="item.kind === 'et'"><dt>Passt für</dt><dd>{{ item.fits }}</dd></template>
          </dl>
        </section>

        <section class="block">
          <h3 class="block-title">Bestellung</h3>
          <OrderSection v-if="order" :order="order" :item="item" />
          <div v-else class="none">
            <span class="muted">Nicht auf der Bestellliste.</span>
            <button type="button" class="btn" @click="addItemToOrders(item, props.forWhat)">Auf Bestellliste</button>
          </div>
        </section>
      </div>
      <HistoryList :entries="history" />
    </div>
  </AppModal>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: minmax(0, 1fr) 270px; gap: 24px; align-items: start; }
.main { display: flex; flex-direction: column; }
.block { display: flex; flex-direction: column; gap: 14px; padding: 18px 0; border-top: 1px solid var(--border); }
.block:first-child { padding-top: 0; border-top: 0; }
.block-title { font-size: 11.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.seg-lg { height: 40px !important; padding: 0 16px !important; font-size: 14px !important; }
.facts { display: grid; grid-template-columns: 120px minmax(0, 1fr); row-gap: 8px; column-gap: 16px; margin: 0; font-size: 14px; }
.facts dt { color: var(--muted); }
.facts dd { margin: 0; font-weight: 600; }
.none { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; font-size: 14px; }
@media (max-width: 760px) {
  .grid { grid-template-columns: 1fr; }
  .facts { grid-template-columns: 100px minmax(0, 1fr); }
}
</style>
