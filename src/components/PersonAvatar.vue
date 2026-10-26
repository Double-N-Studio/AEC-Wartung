<script setup lang="ts">
import { computed } from 'vue'
import type { UserId } from '../types'
import { userById } from '../store'

const props = withDefaults(defineProps<{ person: UserId; size?: number }>(), { size: 28 })
const u = computed(() => userById(props.person))
const initials = computed(() => (u.value?.name ?? '?').slice(0, 2).toUpperCase())
</script>

<template>
  <span
    class="avatar"
    :style="{ width: `${props.size}px`, height: `${props.size}px`, background: u?.bg, color: u?.fg, fontSize: `${Math.round(props.size * 0.38)}px` }"
    aria-hidden="true"
  >{{ initials }}</span>
</template>

<style scoped>
.avatar {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  border-radius: 50%; font-weight: 700; background: var(--gray-soft); color: var(--text-2);
}
</style>
