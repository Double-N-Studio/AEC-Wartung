<script setup lang="ts">
/** Drei Balken, gefüllt je nach Eignungsstufe (1–3). */
defineProps<{ bars: number }>()
</script>

<template>
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <rect x="1" y="7" width="2.5" height="4" rx="1" fill="currentColor" />
    <rect x="4.75" y="4" width="2.5" height="7" rx="1" fill="currentColor" :opacity="bars >= 2 ? 1 : 0.3" />
    <rect x="8.5" y="1" width="2.5" height="10" rx="1" fill="currentColor" :opacity="bars >= 3 ? 1 : 0.3" />
  </svg>
</template>
