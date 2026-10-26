<script setup lang="ts">
import { ref } from 'vue'
import { markDelivered, markOrdered } from '../../store'
import type { Order } from '../../types'
import { fmtDay } from '../../utils/date'
import AppIcon from '../../components/AppIcon.vue'
import AppModal from '../../components/AppModal.vue'
import HistoryList from '../../components/HistoryList.vue'

const props = defineProps<{ order: Order }>()
const emit = defineEmits<{ close: [] }>()

const confirming = ref(false)
function confirmDelivery() {
  markDelivered(props.order, 0)
  emit('close')
}
</script>

<template>
  <AppModal :title="order.name" kicker="Ohne Artikel-Zuordnung" :width="760" @close="emit('close')">
    <div class="grid">
      <div class="main">
        <div class="facts">
          <span class="muted">Für</span><strong>{{ order.forWhat === 'Lager' ? 'Lager (allgemein)' : order.forWhat }}</strong>
          <span class="muted">Gemeldet</span><strong>{{ order.reportedBy }}</strong>
        </div>
        <div class="actions">
          <template v-if="order.state === 'list'">
            <span class="badge warn"><AppIcon name="check" :size="16" :stroke="2.6" />Steht auf der Bestellliste</span>
            <button type="button" class="btn btn-primary" @click="markOrdered(order)">Als bestellt markieren</button>
          </template>
          <template v-else-if="!confirming">
            <span class="badge ok">Bestellt · {{ fmtDay(order.delivery!) }}</span>
            <button type="button" class="btn btn-primary" @click="confirming = true">Geliefert</button>
          </template>
          <div v-else class="deliver">
            <span>Lieferung bestätigen und von der Bestellliste nehmen?</span>
            <div class="row">
              <button type="button" class="btn btn-primary" @click="confirmDelivery">Lieferung bestätigen</button>
              <button type="button" class="btn btn-ghost" @click="confirming = false">Abbrechen</button>
            </div>
          </div>
        </div>
        <div class="field">
          <label for="fo-comment">Kommentar zur Bestellung</label>
          <textarea id="fo-comment" v-model="order.comment" rows="3" class="textarea" placeholder="z. B. Menge, Händler oder Hinweise" />
        </div>
      </div>
      <HistoryList :entries="order.history" />
    </div>
  </AppModal>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 24px; align-items: start; }
.main { display: flex; flex-direction: column; gap: 18px; }
.facts { display: grid; grid-template-columns: 110px minmax(0, 1fr); row-gap: 10px; column-gap: 16px; font-size: 14px; }
.actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.badge { display: inline-flex; align-items: center; gap: 6px; padding: 10px 14px; border-radius: 10px; font-size: 14px; font-weight: 600; }
.badge.warn { background: var(--warn-soft); color: var(--orange-ink); }
.badge.ok { background: var(--green-soft); color: var(--green-ink); }
.deliver { width: 100%; padding: 14px; border-radius: 12px; background: var(--accent-tint); border: 1px solid #CFE0F6; display: flex; flex-direction: column; gap: 12px; font-size: 14px; }
.row { display: flex; gap: 10px; flex-wrap: wrap; }
@media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
</style>
