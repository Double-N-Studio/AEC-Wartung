<script lang="ts">
/** Zustand von "Geliefert": Menge im Inhalt (OrderSection), Bestätigen in der Fußleiste. */
export interface Delivery {
  active: boolean
  qty: number
}
</script>

<script setup lang="ts">
import { markDelivered, markOrdered } from '../../store'
import type { InventoryItem, Order } from '../../types'

/** Nächster Bestellschritt als Buttons für die Fußleiste der Inventur-Popups. */
const props = defineProps<{ order: Order; item?: InventoryItem; delivery: Delivery }>()
const emit = defineEmits<{ delivered: [] }>()

function start() {
  props.delivery.active = true
  props.delivery.qty = 1
}

function confirm() {
  markDelivered(props.order, props.item?.mode === 'count' ? props.delivery.qty : 0)
  props.delivery.active = false
  emit('delivered')
}
</script>

<template>
  <button v-if="order.state === 'list'" type="button" class="btn btn-primary" @click="markOrdered(order)">Als bestellt markieren</button>
  <template v-else-if="delivery.active">
    <button type="button" class="btn btn-ghost" @click="delivery.active = false">Abbrechen</button>
    <button type="button" class="btn btn-primary" @click="confirm">Lieferung bestätigen</button>
  </template>
  <button v-else type="button" class="btn btn-primary" @click="start">Geliefert</button>
</template>
