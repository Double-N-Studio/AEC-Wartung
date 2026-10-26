<script setup lang="ts">
import type { Order } from '../../types'
import AppModal from '../../components/AppModal.vue'
import HistoryList from '../../components/HistoryList.vue'
import OrderSection from './OrderSection.vue'

defineProps<{ order: Order }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <AppModal :title="order.name" kicker="Ohne Artikel-Zuordnung" :width="780" @close="emit('close')">
    <div class="grid">
      <div class="main">
        <section class="block">
          <h3 class="block-title">Details</h3>
          <dl class="facts">
            <dt>Für</dt><dd>{{ order.forWhat === 'Lager' ? 'Lager (allgemein)' : order.forWhat }}</dd>
            <dt>Gemeldet von</dt><dd>{{ order.reportedBy }}</dd>
          </dl>
        </section>
        <section class="block">
          <h3 class="block-title">Bestellung</h3>
          <OrderSection :order="order" @delivered="emit('close')" />
        </section>
      </div>
      <HistoryList :entries="order.history" />
    </div>
  </AppModal>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 24px; align-items: start; }
.main { display: flex; flex-direction: column; }
.block { display: flex; flex-direction: column; gap: 14px; padding: 18px 0; border-top: 1px solid var(--border); }
.block:first-child { padding-top: 0; border-top: 0; }
.block-title { font-size: 11.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.facts { display: grid; grid-template-columns: 120px minmax(0, 1fr); row-gap: 8px; column-gap: 16px; margin: 0; font-size: 14px; }
.facts dt { color: var(--muted); }
.facts dd { margin: 0; font-weight: 600; }
@media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
</style>
