<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { state } from '../../store'
import type { InventoryItem, Order } from '../../types'
import OrderTable from './OrderTable.vue'
import StockTable from './StockTable.vue'
import ItemModal from '../../views/inventory/ItemModal.vue'
import ItemFormModal from '../../views/inventory/ItemFormModal.vue'
import FreeOrderModal from '../../views/inventory/FreeOrderModal.vue'
import NewOrderModal from '../../views/inventory/NewOrderModal.vue'

/**
 * Stock / order list tabs with all popups. Inventory and the material tab show the same data,
 * the material tab only filtered (forWhat = aircraft type).
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
const tab = ref<'stock' | 'orders'>('stock')
/** Next order step the popup starts with when opened from the order list */
const startStep = ref<'order' | 'deliver' | undefined>()
const openCount = computed(() => props.orders.filter((o) => o.state === 'list').length)

/** Item form: new, edit, or new for an order without an item. The detail view is hidden meanwhile. */
const itemForm = ref<{ item?: InventoryItem; order?: Order } | null>(null)
const preset = computed(() => ({
  name: itemForm.value?.order?.name,
  kind: props.kinds.length === 1 ? props.kinds[0] : undefined,
  fits: props.forWhat && props.forWhat !== 'Lager' ? props.forWhat : undefined,
}))

// ?artikel=<id> or ?bestellung=<id> open directly (links from "Meine Sachen").
const route = useRoute()
const router = useRouter()
watch(() => [route.query.artikel, route.query.bestellung], ([itemId, orderId]) => {
  if (typeof itemId === 'string') openItemId.value = itemId
  const order = typeof orderId === 'string' ? state.orders.find((o) => o.id === orderId) : undefined
  if (order) {
    tab.value = 'orders'
    openOrder(order)
  }
}, { immediate: true })
const clearQuery = () => { if (route.query.artikel || route.query.bestellung) router.replace({ query: {} }) }
watch([openItemId, openFreeId], ([item, free]) => {
  if (item || free) return
  startStep.value = undefined
  clearQuery()
})

function openOrder(o: Order, start?: 'order' | 'deliver') {
  startStep.value = start
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
  <div class="workspace">
    <div class="tabs" role="tablist" aria-label="Inventur">
      <button type="button" role="tab" class="tab" :class="{ active: tab === 'stock' }" :aria-selected="tab === 'stock'" @click="tab = 'stock'">
        Bestand<span class="tab-count">{{ props.items.length }}</span>
      </button>
      <button type="button" role="tab" class="tab" :class="{ active: tab === 'orders' }" :aria-selected="tab === 'orders'" @click="tab = 'orders'">
        Bestellliste<span class="tab-count">{{ openCount }} offen</span>
      </button>
    </div>
    <StockTable
      v-if="tab === 'stock'" :items="props.items" :kinds="props.kinds" :plane-filter="props.planeFilter" :for-what="props.forWhat"
      @open="openItemId = $event.id" @add="itemForm = {}"
    />
    <OrderTable v-else :orders="props.orders" @open="openOrder" @add="creatingOrder = true" />
  </div>

  <template v-if="!itemForm">
    <ItemModal v-if="openItem" :item="openItem" :for-what="props.forWhat" :start="startStep" @close="openItemId = null" @edit="itemForm = { item: openItem }" />
    <FreeOrderModal
      v-if="openFree" :order="openFree" :start="startStep" @close="openFreeId = null"
      @linked="showItem" @create-item="itemForm = { order: openFree }"
    />
  </template>
  <ItemFormModal v-else :item="itemForm.item" :order="itemForm.order" :preset="preset" @close="itemForm = null" @saved="saved" />
  <NewOrderModal v-if="creatingOrder" :for-what="props.forWhat" @close="creatingOrder = false" />
</template>

<style scoped>
.workspace { display: flex; flex-direction: column; gap: 16px; }
</style>
