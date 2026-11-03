<script setup lang="ts">
import { computed } from 'vue'
import type { Level } from '../types'
import { LEVELS } from '../utils/levels'
import LevelBars from './LevelBars.vue'

const props = defineProps<{ level: Level; long?: boolean }>()
const meta = computed(() => LEVELS[props.level])
</script>

<template>
  <span class="pill" :style="{ background: meta.bg, color: meta.fg }">
    <LevelBars :bars="meta.bars" />
    {{ props.long ? meta.long : meta.label }}
  </span>
</template>
