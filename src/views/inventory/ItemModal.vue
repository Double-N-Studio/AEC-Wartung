<script setup lang="ts">
import { computed, reactive } from 'vue'
import { addItemToOrders, logCount, openOrderFor, setQty } from '../../store'
import type { InventoryItem } from '../../types'
import { fmtDate, fmtDay } from '../../utils/date'
import AppModal from '../../components/AppModal.vue'
import HistoryList from '../../components/HistoryList.vue'
import QtyStepper from '../../components/QtyStepper.vue'
import OrderActions, { type Delivery } from './OrderActions.vue'
import OrderSection from './OrderSection.vue'

const props = defineProps<{ item: InventoryItem; forWhat?: string }>()
const emit = defineEmits<{ close: [] }>()

const order = computed(() => openOrderFor(props.item.id))
const delivery = reactive<Delivery>({ active: false, qty: 1 })
const unit = (n: number) => (n === 1 ? props.item.unit[0] : props.item.unit[1])
const qty = computed({
  get: () => props.item.qty,
  set: (v: number) => { setQty(props.item, v); logCount(props.item) },
})
const setFlag = (full: boolean) => { setQty(props.item, full ? 1 : 0); logCount(props.item) }
const history = computed(() => [...(order.value?.history ?? []), ...props.item.history])
</script>

<template>
  <AppModal
    :title="item.name" icon="box" :width="600" @close="emit('close')"
    :subtitle="`${item.kind === 'et' ? 'Ersatzteil' : 'Verbrauchsstoff'} · ${item.location}`"
  >
    <template v-if="order" #status>
      <span v-if="order.state === 'list'" class="pill pill-orange">Auf Bestellliste</span>
      <span v-else class="pill pill-green">Bestellt · Lieferung ca. {{ fmtDay(order.delivery!) }}</span>
    </template>

    <div class="stock">
      <span class="field-label">Bestand</span>
      <QtyStepper v-if="item.mode === 'count'" v-model="qty" :label="`${item.qty} ${unit(item.qty)}`" big />
      <div v-else class="segmented" role="group" aria-label="Bestand">
        <button type="button" class="seg-lg" :aria-pressed="item.qty > 0" @click="setFlag(true)">Genug vorhanden</button>
        <button type="button" class="seg-lg" :aria-pressed="item.qty === 0" @click="setFlag(false)">Leer</button>
      </div>
    </div>

    <dl v-if="item.kind === 'et'" class="facts">
      <dt>Passt für</dt><dd>{{ item.fits }}</dd>
    </dl>

    <OrderSection v-if="order" :order="order" :item="item" :delivery="delivery" />
    <p v-else class="muted none">Nicht auf der Bestellliste.</p>

    <HistoryList :entries="history" />

    <template v-if="order" #meta>Gemeldet von {{ order.reportedBy }} · {{ fmtDate(order.reportedAt) }}</template>
    <template #footer>
      <OrderActions v-if="order" :order="order" :item="item" :delivery="delivery" />
      <button v-else type="button" class="btn" @click="addItemToOrders(item, props.forWhat)">Auf Bestellliste</button>
    </template>
  </AppModal>
</template>

<style scoped>
.stock {
  display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  padding: 14px 16px; border-radius: 12px; border: 1px solid var(--border);
}
.seg-lg { height: 40px !important; padding: 0 16px !important; font-size: 14px !important; }
.facts { display: grid; grid-template-columns: 120px minmax(0, 1fr); row-gap: 8px; column-gap: 16px; margin: 0; font-size: 14px; }
.facts dt { color: var(--muted); }
.facts dd { margin: 0; font-weight: 600; }
.none { font-size: 14px; }
</style>
