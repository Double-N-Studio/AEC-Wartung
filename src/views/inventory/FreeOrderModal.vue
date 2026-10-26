<script setup lang="ts">
import { reactive } from 'vue'
import type { Order } from '../../types'
import { fmtDate, fmtDay } from '../../utils/date'
import AppModal from '../../components/AppModal.vue'
import HistoryList from '../../components/HistoryList.vue'
import OrderActions, { type Delivery } from './OrderActions.vue'
import OrderSection from './OrderSection.vue'

defineProps<{ order: Order }>()
const emit = defineEmits<{ close: [] }>()
const delivery = reactive<Delivery>({ active: false, qty: 1 })
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

    <OrderSection :order="order" :delivery="delivery" />
    <HistoryList :entries="order.history" />

    <template #meta>Gemeldet von {{ order.reportedBy }} · {{ fmtDate(order.reportedAt) }}</template>
    <template #footer>
      <OrderActions :order="order" :delivery="delivery" @delivered="emit('close')" />
    </template>
  </AppModal>
</template>
