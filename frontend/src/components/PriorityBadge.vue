<script setup lang="ts">
import { computed } from 'vue'
import type { Priority } from '../types'

const props = defineProps<{ priority: Priority }>()

const COLORS: Record<Priority, [string, string]> = {
  Hoch: ['var(--red-soft)', 'var(--red-ink)'],
  Normal: ['#FBEFC8', '#6E5200'],
  Niedrig: ['var(--green-soft)', 'var(--green-ink)'],
  'Sehr niedrig': ['var(--gray-soft)', 'var(--text-2)'],
}
const colors = computed(() => COLORS[props.priority])
</script>

<template>
  <span class="pill" :style="{ background: colors[0], color: colors[1] }">{{ props.priority }}</span>
</template>
