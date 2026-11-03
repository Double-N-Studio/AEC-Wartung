<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ label: string; options: { value: string; label: string }[]; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const current = computed(() => props.options.find((o) => o.value === props.modelValue)?.label ?? '')

const pick = (value: string) => { emit('update:modelValue', value); open.value = false }
const onDoc = (e: MouseEvent) => { if (root.value && !root.value.contains(e.target as Node)) open.value = false }
onMounted(() => document.addEventListener('click', onDoc))
onBeforeUnmount(() => document.removeEventListener('click', onDoc))
</script>

<template>
  <div ref="root" class="dd">
    <button type="button" class="dd-btn" :aria-expanded="open" @click="open = !open">
      {{ props.label }}: {{ current }} <AppIcon name="chevronDown" :size="14" />
    </button>
    <div v-if="open" class="dd-menu" role="listbox">
      <button
        v-for="o in props.options" :key="o.value" type="button" role="option"
        :aria-selected="o.value === props.modelValue" class="dd-item" @click="pick(o.value)"
      >
        {{ o.label }}
        <AppIcon v-if="o.value === props.modelValue" name="check" :size="16" :stroke="2.6" class="dd-check" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.dd { position: relative; }
.dd-btn {
  height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--border-strong);
  background: var(--surface); font-size: 13px; font-weight: 500;
  display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
}
.dd-menu {
  position: absolute; right: 0; top: 46px; z-index: 20; min-width: 200px;
  background: var(--surface); border: 1px solid #D5DCE5; border-radius: 12px; box-shadow: var(--shadow-pop); padding: 6px;
}
.dd-item {
  width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 12px;
  height: 40px; padding: 0 10px; border: 0; border-radius: 8px; background: transparent; font-size: 13.5px; text-align: left;
}
.dd-item:hover { background: var(--subtle); }
.dd-check { color: var(--accent); }
</style>
