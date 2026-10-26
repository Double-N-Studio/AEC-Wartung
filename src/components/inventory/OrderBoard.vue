<script setup lang="ts">
import { computed } from 'vue'
import type { Order } from '../../types'
import { fmtDay } from '../../utils/date'
import AppIcon from '../AppIcon.vue'

const props = defineProps<{ orders: Order[] }>()
const emit = defineEmits<{ open: [order: Order]; add: [] }>()

const groups = computed(() => [
  { title: 'Muss bestellt werden', dot: 'var(--today)', list: props.orders.filter((o) => o.state === 'list'), canAdd: true },
  { title: 'Bestellt', dot: 'var(--green)', list: props.orders.filter((o) => o.state === 'ordered'), canAdd: false },
])
const meta = (o: Order) => (o.state === 'ordered' ? `${o.forWhat} · Lieferung ca. ${fmtDay(o.delivery!)}` : `${o.forWhat} · gemeldet von ${o.reportedBy}`)
</script>

<template>
  <section class="orders" aria-label="Bestellliste">
    <div v-for="g in groups" :key="g.title" class="card group">
      <div class="head">
        <h2 class="title"><span class="dot" :style="{ background: g.dot }" />{{ g.title }}</h2>
        <button v-if="g.canAdd" type="button" class="add" aria-label="Auf Bestellliste" title="Auf Bestellliste" @click="emit('add')">
          <AppIcon name="plus" :stroke="2.2" />
        </button>
      </div>
      <button v-for="o in g.list" :key="o.id" type="button" class="order" @click="emit('open', o)">
        <span class="text">
          <strong>{{ o.name }}</strong>
          <span class="muted">{{ meta(o) }}</span>
          <span v-if="o.comment" class="comment">{{ o.comment }}</span>
        </span>
        <AppIcon name="chevronRight" :size="16" class="muted" />
      </button>
      <p v-if="!g.list.length" class="muted empty">Nichts offen.</p>
    </div>
  </section>
</template>

<style scoped>
.orders { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; align-items: start; }
.group { min-width: 0; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.head { display: flex; align-items: center; gap: 8px; min-height: 36px; }
.title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.add {
  margin-left: auto; width: 36px; height: 36px; border-radius: 9px; border: 1px solid var(--border-strong);
  background: var(--surface); color: var(--accent-ink); display: inline-flex; align-items: center; justify-content: center;
}
.order {
  width: 100%; min-height: 48px; display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 7px 10px; border-radius: 9px; border: 1px solid var(--border-soft); background: var(--subtle); text-align: left;
}
.order:hover { border-color: var(--border-strong); }
.text { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; font-size: 13.5px; }
.text .muted { font-size: 12px; }
.comment { margin-top: 2px; font-size: 12px; font-style: italic; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.empty { font-size: 13px; padding: 6px 2px; }
@media (max-width: 900px) { .orders { grid-template-columns: minmax(0, 1fr); } }
</style>
