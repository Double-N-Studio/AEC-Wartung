<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { fitsAircraft, state } from '../../store'
import type { Order } from '../../types'
import OrderBoard from '../../components/inventory/OrderBoard.vue'
import StockTable from '../../components/inventory/StockTable.vue'
import ItemModal from '../inventory/ItemModal.vue'
import FreeOrderModal from '../inventory/FreeOrderModal.vue'
import NewOrderModal from '../inventory/NewOrderModal.vue'

// Gleiche Daten wie die Inventur, gefiltert auf dieses Flugzeug.
const route = useRoute()
const aircraft = computed(() => state.aircraft.find((a) => a.id === route.params.id)!)
const items = computed(() => state.inventory.filter((i) => fitsAircraft(i, aircraft.value.type)))
const orders = computed(() => state.orders.filter((o) => o.forWhat === aircraft.value.type))

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
  <p class="muted note">Ersatzteile und Bestellungen für {{ aircraft.type }} – dieselben Daten wie in der <RouterLink to="/inventur">Inventur</RouterLink>.</p>

  <OrderBoard :orders="orders" @open="openOrder" @add="creating = true" />
  <StockTable :items="items" :kinds="['et']" :plane-filter="false" :for-what="aircraft.type" @open="openItemId = $event.id" />

  <ItemModal v-if="openItem" :item="openItem" :for-what="aircraft.type" @close="openItemId = null" />
  <FreeOrderModal v-if="openFree" :order="openFree" @close="openFreeId = null" />
  <NewOrderModal v-if="creating" :for-what="aircraft.type" @close="creating = false" />
</template>

<style scoped>
.note { font-size: 13.5px; }
</style>
