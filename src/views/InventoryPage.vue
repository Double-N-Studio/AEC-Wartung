<script setup lang="ts">
import { state } from '../store'
import InventoryWorkspace from '../components/inventory/InventoryWorkspace.vue'
</script>

<template>
  <div class="page">
    <header>
      <h1 class="page-title">Inventur</h1>
      <p class="page-sub">Direkt in der Liste zählen. Was leer ist, steht oben.</p>
    </header>

    <InventoryWorkspace :items="state.inventory" :orders="state.orders" />
  </div>
</template>
