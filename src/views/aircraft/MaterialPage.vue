<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { fitsAircraft, state } from '../../store'
import InventoryWorkspace from '../../components/inventory/InventoryWorkspace.vue'

// Gleiche Daten wie die Inventur, gefiltert auf dieses Flugzeug.
const route = useRoute()
const aircraft = computed(() => state.aircraft.find((a) => a.id === route.params.id)!)
const items = computed(() => state.inventory.filter((i) => fitsAircraft(i, aircraft.value.type)))
const orders = computed(() => state.orders.filter((o) => o.forWhat === aircraft.value.type))
</script>

<template>
  <p class="muted note">Ersatzteile und Bestellungen für {{ aircraft.type }} – dieselben Daten wie in der <RouterLink to="/inventur">Inventur</RouterLink>.</p>

  <InventoryWorkspace :items="items" :orders="orders" :kinds="['et']" :plane-filter="false" :for-what="aircraft.type" />
</template>

<style scoped>
.note { font-size: 13.5px; }
</style>
