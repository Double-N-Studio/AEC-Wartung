<script setup lang="ts">
import type { HistoryEntry } from '../types'
import { fmtWhen } from '../utils/date'

defineProps<{ entries: HistoryEntry[] }>()
</script>

<template>
  <section class="history">
    <h3>Verlauf</h3>
    <div v-for="(h, i) in entries" :key="i" class="history-entry">
      <span class="history-dot" />
      <div>
        <div class="history-text">{{ h.text }}</div>
        <div class="history-meta">{{ h.who }} · {{ fmtWhen(h.at) }}</div>
      </div>
    </div>
  </section>
</template>
