<script setup lang="ts">
import type { HistoryEntry } from '../types'
import { fmtWhen } from '../utils/date'
import AppIcon from './AppIcon.vue'

defineProps<{ entries: HistoryEntry[] }>()
</script>

<template>
  <details class="history">
    <summary>Verlauf ({{ entries.length }})<AppIcon name="chevronDown" :size="16" class="history-chev" /></summary>
    <div v-for="(h, i) in entries" :key="i" class="history-entry">
      <span class="history-dot" />
      <div>
        <div class="history-text">{{ h.text }}</div>
        <div class="history-meta">{{ h.who }} · {{ fmtWhen(h.at) }}</div>
      </div>
    </div>
    <p v-if="!entries.length" class="history-meta">Noch keine Einträge.</p>
  </details>
</template>
