<script setup lang="ts">
import { computed } from 'vue'
import type { InventoryItem, Order } from '../../types'
import QtyStepper from '../../components/QtyStepper.vue'
import type { Delivery } from './OrderActions.vue'

/** Abschnitt "Bestellung" in den Inventur-Popups: gelieferte Menge und Kommentar. Die Buttons stehen in der Fußleiste (OrderActions). */
const props = defineProps<{ order: Order; item?: InventoryItem; delivery: Delivery }>()

const countable = computed(() => props.item?.mode === 'count')
const unit = (n: number) => (props.item ? (n === 1 ? props.item.unit[0] : props.item.unit[1]) : '')
</script>

<template>
  <div class="order">
    <div v-if="delivery.active" class="deliver">
      <div v-if="countable" class="row">
        <span class="field-label">Gelieferte Menge</span>
        <QtyStepper v-model="delivery.qty" :min="1" :label="`${delivery.qty} ${unit(delivery.qty)}`" />
      </div>
      <span v-else>Lieferung bestätigen und von der Bestellliste nehmen?</span>
    </div>

    <div class="field">
      <label :for="`comment-${order.id}`">Kommentar zur Bestellung</label>
      <textarea :id="`comment-${order.id}`" v-model="order.comment" rows="2" class="textarea" placeholder="z. B. Menge, Händler oder Hinweise" />
    </div>
  </div>
</template>

<style scoped>
.order { display: flex; flex-direction: column; gap: 14px; }
.deliver {
  padding: 14px; border-radius: 12px; background: var(--accent-tint); border: 1px solid #CFE0F6;
  display: flex; flex-direction: column; gap: 12px; font-size: 14px;
}
.row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
</style>
