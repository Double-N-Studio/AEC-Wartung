<script setup lang="ts">
import { computed } from 'vue'
import { state, userName } from '../../store'
import type { Order } from '../../types'
import { fmtDate } from '../../utils/date'
import { fmtPrice } from '../../utils/stock'
import AppModal from '../../components/AppModal.vue'

/** Gelieferte Bestellungen, neueste zuerst – was wo gekauft wurde und was es gekostet hat. */
const props = defineProps<{ orders: Order[] }>()
const emit = defineEmits<{ close: [] }>()

const delivered = computed(() => props.orders
  .filter((o) => o.state === 'delivered')
  .sort((a, b) => (b.deliveredAt ?? '').localeCompare(a.deliveredAt ?? '')))
const seasonTotal = computed(() => delivered.value
  .filter((o) => (o.deliveredAt ?? '') >= state.season.start)
  .reduce((sum, o) => sum + (o.price ?? 0), 0))
const isUrl = (s: string) => /^https?:\/\//.test(s)
const forLabel = (f: string) => (f === 'Lager' ? 'Lager' : f)
</script>

<template>
  <AppModal title="Bestellverlauf" icon="box" subtitle="Gelieferte Bestellungen" :width="760" @close="emit('close')">
    <ul class="list">
      <li v-for="o in delivered" :key="o.id" class="entry">
        <div class="main">
          <strong>{{ o.name }}<span v-if="o.deliveredQty" class="muted qty"> · {{ o.deliveredQty }} geliefert</span></strong>
          <span class="muted">
            Für {{ forLabel(o.forWhat) }}
            <template v-if="o.supplier"> · {{ o.supplier }}</template>
            <template v-if="o.articleNo"> · Art.-Nr. {{ o.articleNo }}</template>
          </span>
          <span class="muted">
            <template v-if="o.orderedBy">Bestellt von {{ userName(o.orderedBy) }} · </template>geliefert {{ o.deliveredAt ? fmtDate(o.deliveredAt) : '–' }}
            <template v-if="o.link && isUrl(o.link)"> · <a :href="o.link" target="_blank" rel="noopener">Link</a></template>
          </span>
        </div>
        <span class="price">{{ o.price !== undefined ? fmtPrice(o.price) : '–' }}</span>
      </li>
    </ul>
    <p v-if="!delivered.length" class="muted">Noch nichts geliefert.</p>
    <template #meta>Saison {{ state.season.label }}: {{ fmtPrice(seasonTotal) }}</template>
    <template #footer>
      <button type="button" class="btn" @click="emit('close')">Schließen</button>
    </template>
  </AppModal>
</template>

<style scoped>
.list { list-style: none; margin: 0; padding: 0; border: 1px solid var(--border); border-radius: 12px; }
.entry { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 10px 14px; border-bottom: 1px solid var(--border-soft); }
.entry:last-child { border-bottom: 0; }
.main { min-width: 0; display: flex; flex-direction: column; gap: 2px; font-size: 14px; }
.main .muted { font-size: 12.5px; }
.qty { font-weight: 500; }
.price { font-size: 14px; font-weight: 600; white-space: nowrap; }
</style>
