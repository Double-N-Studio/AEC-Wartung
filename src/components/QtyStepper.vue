<script setup lang="ts">
import AppIcon from './AppIcon.vue'

const props = withDefaults(defineProps<{ modelValue: number; label: string; min?: number; big?: boolean }>(), { min: 0 })
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
const set = (v: number) => emit('update:modelValue', Math.max(props.min, v))
</script>

<template>
  <div class="stepper">
    <button type="button" class="icon-btn" aria-label="Eins weniger" :disabled="props.modelValue <= props.min" @click="set(props.modelValue - 1)"><AppIcon name="minus" /></button>
    <span class="value" :class="{ big: props.big }">{{ props.label }}</span>
    <button type="button" class="icon-btn" aria-label="Eins mehr" @click="set(props.modelValue + 1)"><AppIcon name="plus" /></button>
  </div>
</template>

<style scoped>
.stepper { display: flex; align-items: center; gap: 12px; }
.value { min-width: 90px; text-align: center; font-size: 20px; font-weight: 700; white-space: nowrap; }
.value.big { min-width: 140px; font-size: 30px; letter-spacing: -0.02em; }
</style>
