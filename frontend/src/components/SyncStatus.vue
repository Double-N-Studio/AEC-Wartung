<script setup lang="ts">
import { computed } from 'vue'
import { isOffline, sync } from '../sync'
import AppIcon from './AppIcon.vue'

/** Save status: saving right now, or offline with pending changes; nothing once everything is saved. */
const status = computed(() => {
  if (isOffline()) {
    const n = sync.pending
    return { kind: 'offline', icon: 'alert', text: n ? `Offline · ${n} ${n === 1 ? 'Änderung wartet' : 'Änderungen warten'}` : 'Offline' }
  }
  if (sync.saving) return { kind: 'saving', icon: 'refresh', text: 'Speichert …' }
  return null
})
</script>

<template>
  <span v-if="status" class="sync" :class="status.kind" role="status" aria-live="polite">
    <AppIcon :name="status.icon" :size="14" :stroke="2" />{{ status.text }}
  </span>
</template>

<style scoped>
.sync { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--muted); white-space: nowrap; }
.sync.offline { color: var(--orange-ink); }
.sync.saving { color: var(--accent-ink); }
</style>
