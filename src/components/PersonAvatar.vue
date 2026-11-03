<script setup lang="ts">
import { computed } from 'vue'
import type { UserId } from '../types'
import { userById } from '../store'

const props = withDefaults(defineProps<{ person: UserId; size?: number }>(), { size: 28 })
const u = computed(() => userById(props.person))

/** Farbe aus der Konto-ID, damit jedes Konto auf allen Geräten gleich aussieht, ohne sie zu speichern. */
const COLORS: [string, string][] = [
  ['#DCE8F7', '#1D4F99'], ['#FDEBD3', '#8A4B00'], ['#DDF0E6', '#17643F'], ['#F8E1E7', '#8E2448'],
  ['#E0F1F4', '#145F6B'], ['#EEE9DC', '#5E4F1F'], ['#E6E8EC', '#3A4452'], ['#E8E2F6', '#4B3592'],
]
const color = computed(() => {
  let h = 0
  for (const c of props.person) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
})
// Vor- und Nachname: je ein Buchstabe, sonst die ersten beiden.
const initials = computed(() => {
  const words = (u.value?.name ?? '?').split(' ').filter(Boolean)
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0].slice(0, 2)).toUpperCase()
})
</script>

<template>
  <span
    class="avatar"
    :style="{ width: `${props.size}px`, height: `${props.size}px`, background: color[0], color: color[1], fontSize: `${Math.round(props.size * 0.38)}px` }"
    aria-hidden="true"
  >{{ initials }}</span>
</template>

<style scoped>
.avatar {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  border-radius: 50%; font-weight: 700; background: var(--gray-soft); color: var(--text-2);
}
</style>
