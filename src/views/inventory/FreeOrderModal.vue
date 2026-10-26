<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { can, linkOrderToItem, openOrderFor, state, userName } from '../../store'
import type { Order } from '../../types'
import { fmtDate, fmtDay } from '../../utils/date'
import AppIcon from '../../components/AppIcon.vue'
import AppModal from '../../components/AppModal.vue'
import HistoryList from '../../components/HistoryList.vue'
import OrderActions, { type OrderStep } from './OrderActions.vue'
import OrderSection from './OrderSection.vue'

const props = defineProps<{ order: Order }>()
const emit = defineEmits<{ close: []; linked: [itemId: string]; createItem: [] }>()
const step = reactive<OrderStep>({ step: null, qty: 1, date: '' })

// Nachträglich einem Inventur-Artikel zuordnen; Artikel mit eigener offener Bestellung scheiden aus.
const linkable = computed(() => state.inventory
  .filter((i) => !openOrderFor(i.id))
  .sort((a, b) => a.name.localeCompare(b.name, 'de')))
const linkId = ref('')
function link() {
  const item = state.inventory.find((i) => i.id === linkId.value)
  if (!item) return
  linkOrderToItem(props.order, item)
  emit('linked', item.id)
}
</script>

<template>
  <AppModal
    :title="order.name" icon="box" :width="560" @close="emit('close')"
    :subtitle="`Ohne Artikel-Zuordnung · für ${order.forWhat === 'Lager' ? 'Lager (allgemein)' : order.forWhat}`"
  >
    <template #status>
      <span v-if="order.state === 'list'" class="pill pill-orange">Auf Bestellliste</span>
      <span v-else class="pill pill-green">Bestellt · Lieferung ca. {{ fmtDay(order.delivery!) }}</span>
    </template>

    <OrderSection :order="order" :step="step" />

    <div v-if="can('edit') && !step.step" class="field link">
      <label for="fo-link">Artikel aus der Inventur zuordnen</label>
      <div class="link-row">
        <select id="fo-link" v-model="linkId" class="select">
          <option value="">Artikel wählen …</option>
          <option v-for="i in linkable" :key="i.id" :value="i.id">{{ i.name }} · {{ i.kind === 'et' ? 'Ersatzteil' : 'Verbrauchsstoff' }}</option>
        </select>
        <button type="button" class="btn" :disabled="!linkId" @click="link">Zuordnen</button>
      </div>
      <button type="button" class="link-btn" @click="emit('createItem')"><AppIcon name="plus" :size="14" :stroke="2.4" />Neuen Artikel anlegen und zuordnen</button>
    </div>

    <HistoryList :entries="order.history" />

    <template #meta>Gemeldet von {{ userName(order.reportedBy) }} · {{ fmtDate(order.reportedAt) }}</template>
    <template #footer>
      <OrderActions v-if="can('edit')" :order="order" :step="step" @delivered="emit('close')" />
      <button v-else type="button" class="btn" @click="emit('close')">Schließen</button>
    </template>
  </AppModal>
</template>

<style scoped>
.link { padding-top: 14px; border-top: 1px solid var(--border-soft); }
.link-row { display: flex; gap: 8px; }
.link-row .select { flex: 1; min-width: 0; }
.link-btn { align-self: flex-start; }
</style>
