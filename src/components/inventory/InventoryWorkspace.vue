<script setup lang="ts">
import { computed, ref } from 'vue'
import { state } from '../../store'
import type { InventoryItem, Order } from '../../types'
import OrderBoard from './OrderBoard.vue'
import StockTable from './StockTable.vue'
import ItemModal from '../../views/inventory/ItemModal.vue'
import ItemFormModal from '../../views/inventory/ItemFormModal.vue'
import FreeOrderModal from '../../views/inventory/FreeOrderModal.vue'
import NewOrderModal from '../../views/inventory/NewOrderModal.vue'

/**
 * Bestellliste + Bestand mit allen Popups. Inventur und Material-Reiter zeigen dieselben Daten,
 * der Material-Reiter nur gefiltert (forWhat = Flugzeugtyp).
 */
const props = withDefaults(defineProps<{ items: InventoryItem[]; orders: Order[]; kinds?: ('vs' | 'et')[]; planeFilter?: boolean; forWhat?: string }>(), {
  kinds: () => ['vs', 'et'],
  planeFilter: true,
})

const openItemId = ref<string | null>(null)
const openItem = computed(() => state.inventory.find((i) => i.id === openItemId.value) ?? null)
const openFreeId = ref<string | null>(null)
const openFree = computed(() => state.orders.find((o) => o.id === openFreeId.value && !o.itemId) ?? null)
const creatingOrder = ref(false)

/** Artikel-Formular: neu, bearbeiten oder neu für eine Bestellung ohne Artikel. Die Detailansicht ist solange ausgeblendet. */
const itemForm = ref<{ item?: InventoryItem; order?: Order } | null>(null)
const preset = computed(() => ({
  name: itemForm.value?.order?.name,
  kind: props.kinds.length === 1 ? props.kinds[0] : undefined,
  fits: props.forWhat && props.forWhat !== 'Lager' ? props.forWhat : undefined,
}))

function openOrder(o: Order) {
  if (o.itemId) openItemId.value = o.itemId
  else openFreeId.value = o.id
}

function showItem(id: string) {
  openFreeId.value = null
  openItemId.value = id
}

function saved(item: InventoryItem) {
  itemForm.value = null
  showItem(item.id)
}
</script>

<template>
  <div class="with-aside">
    <OrderBoard class="aside" :orders="props.orders" @open="openOrder" @add="creatingOrder = true" />
    <StockTable
      class="main" :items="props.items" :kinds="props.kinds" :plane-filter="props.planeFilter" :for-what="props.forWhat"
      @open="openItemId = $event.id" @add="itemForm = {}"
    />
  </div>

  <template v-if="!itemForm">
    <ItemModal v-if="openItem" :item="openItem" :for-what="props.forWhat" @close="openItemId = null" @edit="itemForm = { item: openItem }" />
    <FreeOrderModal
      v-if="openFree" :order="openFree" @close="openFreeId = null"
      @linked="showItem" @create-item="itemForm = { order: openFree }"
    />
  </template>
  <ItemFormModal v-else :item="itemForm.item" :order="itemForm.order" :preset="preset" @close="itemForm = null" @saved="saved" />
  <NewOrderModal v-if="creatingOrder" :for-what="props.forWhat" @close="creatingOrder = false" />
</template>
