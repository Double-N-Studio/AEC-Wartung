<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { addItemToOrders, can, countItem, deleteItem, openOrderFor, userName } from '../../store'
import type { InventoryItem } from '../../types'
import { fmtDate, fmtDay } from '../../utils/date'
import { stockText, unitOf } from '../../utils/stock'
import AppIcon from '../../components/AppIcon.vue'
import AppModal from '../../components/AppModal.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'
import HistoryList from '../../components/HistoryList.vue'
import LevelPicker from '../../components/LevelPicker.vue'
import QtyStepper from '../../components/QtyStepper.vue'
import OrderActions, { type OrderStep } from './OrderActions.vue'
import OrderSection from './OrderSection.vue'

const props = defineProps<{ item: InventoryItem; forWhat?: string }>()
const emit = defineEmits<{ close: []; edit: [] }>()

const order = computed(() => openOrderFor(props.item.id))
const step = reactive<OrderStep>({ step: null, qty: 1, date: '' })
const unit = (n: number) => unitOf(props.item, n)
const qty = computed({
  get: () => props.item.qty,
  set: (v: number) => countItem(props.item, v),
})
const history = computed(() => [...(order.value?.history ?? []), ...props.item.history])

const confirming = ref(false)
function remove() {
  deleteItem(props.item)
  emit('close')
}
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
    <template v-if="can('edit')" #tools>
      <button type="button" class="tool" aria-label="Bearbeiten" title="Bearbeiten" @click="emit('edit')"><AppIcon name="pen" :size="19" /></button>
      <button type="button" class="tool" aria-label="Löschen" title="Löschen" @click="confirming = true"><AppIcon name="trash" :size="19" /></button>
    </template>

    <div class="stock">
      <span class="field-label">Bestand</span>
      <template v-if="can('edit')">
        <QtyStepper v-if="item.mode === 'count'" v-model="qty" :label="`${item.qty} ${unit(item.qty)}`" big />
        <LevelPicker v-else :model-value="item.qty" big @update:model-value="countItem(item, $event)" />
      </template>
      <strong v-else class="stock-text">{{ stockText(item) }}</strong>
    </div>

    <dl v-if="item.kind === 'et'" class="facts">
      <dt>Passt für</dt><dd>{{ item.fits ?? '–' }}</dd>
    </dl>

    <OrderSection v-if="order" :order="order" :item="item" :step="step" />
    <p v-else class="muted none">Nicht auf der Bestellliste.</p>

    <HistoryList :entries="history" />

    <template v-if="order" #meta>Gemeldet von {{ userName(order.reportedBy) }} · {{ fmtDate(order.reportedAt) }}</template>
    <template #footer>
      <template v-if="can('edit')">
        <OrderActions v-if="order" :order="order" :item="item" :step="step" />
        <button v-else type="button" class="btn" @click="addItemToOrders(item, props.forWhat)">Auf Bestellliste</button>
      </template>
      <button v-else type="button" class="btn" @click="emit('close')">Schließen</button>
    </template>
  </AppModal>

  <ConfirmModal
    v-if="confirming" title="Artikel löschen?" @confirm="remove" @close="confirming = false"
    :text="`„${item.name}“ wird aus der Inventur gelöscht.${order ? ' Die offene Bestellung bleibt als Bestellung ohne Artikel stehen.' : ''}`"
  />
</template>

<style scoped>
.stock {
  display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  padding: 14px 16px; border-radius: 12px; border: 1px solid var(--border);
}
.facts { display: grid; grid-template-columns: 120px minmax(0, 1fr); row-gap: 8px; column-gap: 16px; margin: 0; font-size: 14px; }
.facts dt { color: var(--muted); }
.facts dd { margin: 0; font-weight: 600; }
.none { font-size: 14px; }
.stock-text { font-size: 18px; }
</style>
