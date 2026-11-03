<script lang="ts">
/** Next order step: inputs in the content (OrderSection), confirm in the footer. */
export interface OrderStep {
  step: null | 'order' | 'deliver'
  /** Delivered quantity */
  qty: number
  /** Expected delivery */
  date: string
}
</script>

<script setup lang="ts">
import { defaultDelivery, markDelivered, markOrdered } from '../../store'
import type { InventoryItem, Order } from '../../types'

/** Next order step as buttons for the footer of the inventory popups. */
const props = defineProps<{ order: Order; item?: InventoryItem; step: OrderStep }>()
const emit = defineEmits<{ delivered: [] }>()

function begin(step: 'order' | 'deliver') {
  Object.assign(props.step, { step, qty: 1, date: defaultDelivery() })
}

function confirmOrder() {
  if (!props.step.date) return
  markOrdered(props.order, props.step.date)
  props.step.step = null
}

function confirmDelivery() {
  markDelivered(props.order, props.item?.mode === 'count' ? props.step.qty : 0)
  props.step.step = null
  emit('delivered')
}
</script>

<template>
  <template v-if="step.step">
    <button type="button" class="btn btn-ghost" @click="step.step = null">Abbrechen</button>
    <button v-if="step.step === 'order'" type="button" class="btn btn-primary" :disabled="!step.date" @click="confirmOrder">Bestellung bestätigen</button>
    <button v-else type="button" class="btn btn-primary" @click="confirmDelivery">Lieferung bestätigen</button>
  </template>
  <button v-else-if="order.state === 'list'" type="button" class="btn btn-primary" @click="begin('order')">Als bestellt markieren</button>
  <button v-else type="button" class="btn btn-primary" @click="begin('deliver')">Geliefert</button>
</template>
