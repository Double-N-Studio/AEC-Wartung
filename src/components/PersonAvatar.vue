<script setup lang="ts">
import { computed } from 'vue'
import type { PersonKey } from '../types'
import { PEOPLE } from '../mock/people'

const props = withDefaults(defineProps<{ person: PersonKey; size?: number }>(), { size: 28 })
const p = computed(() => PEOPLE[props.person])
</script>

<template>
  <span
    class="avatar"
    :style="{ width: `${props.size}px`, height: `${props.size}px`, background: p.bg, color: p.fg, fontSize: `${Math.round(props.size * 0.38)}px` }"
    aria-hidden="true"
  >{{ p.key }}</span>
</template>

<style scoped>
.avatar {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  border-radius: 50%; font-weight: 700;
}
</style>
