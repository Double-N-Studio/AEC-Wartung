<script setup lang="ts">
import { computed, ref } from 'vue'
import { state } from '../store'
import type { Order } from '../types'
import OrderBoard from '../components/inventory/OrderBoard.vue'
import StockTable from '../components/inventory/StockTable.vue'
import ItemModal from './inventory/ItemModal.vue'
import FreeOrderModal from './inventory/FreeOrderModal.vue'
import NewOrderModal from './inventory/NewOrderModal.vue'

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
  <div class="page">
    <header>
      <h1 class="page-title">Inventur</h1>
      <p class="page-sub">Direkt in der Liste zählen. Was leer ist, steht oben.</p>
    </header>

    <div class="with-aside">
      <OrderBoard class="aside" :orders="state.orders" @open="openOrder" @add="creating = true" />
      <StockTable class="main" :items="state.inventory" @open="openItemId = $event.id" />
    </div>

    <ItemModal v-if="openItem" :item="openItem" @close="openItemId = null" />
    <FreeOrderModal v-if="openFree" :order="openFree" @close="openFreeId = null" />
    <NewOrderModal v-if="creating" @close="creating = false" />
  </div>
</template>
