<script setup lang="ts">
import { computed, ref } from 'vue'
import { addItemToOrders, logCount, markDelivered, markOrdered, openOrderFor, setQty } from '../../store'
import type { InventoryItem } from '../../types'
import { fmtDay } from '../../utils/date'
import AppIcon from '../../components/AppIcon.vue'
import AppModal from '../../components/AppModal.vue'
import HistoryList from '../../components/HistoryList.vue'
import QtyStepper from '../../components/QtyStepper.vue'

const props = defineProps<{ item: InventoryItem }>()
const emit = defineEmits<{ close: [] }>()

const order = computed(() => openOrderFor(props.item.id))
const unit = (n: number) => (n === 1 ? props.item.unit[0] : props.item.unit[1])

const qty = computed({
  get: () => props.item.qty,
  set: (v: number) => { setQty(props.item, v); logCount(props.item) },
})
const setFlag = (full: boolean) => { setQty(props.item, full ? 1 : 0); logCount(props.item) }

const comment = computed({
  get: () => order.value?.comment ?? '',
  set: (v: string) => { if (order.value) order.value.comment = v },
})

const delivering = ref(false)
const deliverQty = ref(1)
function confirmDelivery() {
  if (order.value) markDelivered(order.value, deliverQty.value)
  delivering.value = false
}

const history = computed(() => [...(order.value?.history ?? []), ...props.item.history])
</script>

<template>
  <AppModal :title="item.name" :kicker="item.kind === 'et' ? 'Ersatzteil' : 'Verbrauchsstoff'" :width="800" @close="emit('close')">
    <div class="grid">
      <div class="main">
        <div class="field">
          <span class="field-label">Bestand</span>
          <QtyStepper v-if="item.mode === 'count'" v-model="qty" :label="`${item.qty} ${unit(item.qty)}`" big />
          <div v-else class="segmented" role="group" aria-label="Bestand">
            <button type="button" class="seg-lg" :aria-pressed="item.qty > 0" @click="setFlag(true)">Genug vorhanden</button>
            <button type="button" class="seg-lg" :aria-pressed="item.qty === 0" @click="setFlag(false)">Leer</button>
          </div>
        </div>

        <div class="facts">
          <span class="muted">Lagerort</span><strong>{{ item.location }}</strong>
          <template v-if="item.kind === 'et'"><span class="muted">Passt für</span><strong>{{ item.fits }}</strong></template>
        </div>

        <div class="actions">
          <button v-if="!order" type="button" class="btn" @click="addItemToOrders(item)">Auf Bestellliste</button>
          <template v-else-if="order.state === 'list'">
            <span class="badge warn"><AppIcon name="check" :size="16" :stroke="2.6" />Steht auf der Bestellliste</span>
            <button type="button" class="btn btn-primary" @click="markOrdered(order)">Als bestellt markieren</button>
          </template>
          <template v-else-if="!delivering">
            <span class="badge ok">Bestellt · {{ fmtDay(order.delivery!) }}</span>
            <button type="button" class="btn btn-primary" @click="delivering = true; deliverQty = 1">Geliefert</button>
          </template>
          <div v-else class="deliver">
            <div v-if="item.mode === 'count'" class="deliver-row">
              <span class="field-label">Gelieferte Menge</span>
              <QtyStepper v-model="deliverQty" :min="1" :label="`${deliverQty} ${unit(deliverQty)}`" />
            </div>
            <span v-else>Lieferung bestätigen und von der Bestellliste nehmen?</span>
            <div class="deliver-row">
              <button type="button" class="btn btn-primary" @click="confirmDelivery">Lieferung bestätigen</button>
              <button type="button" class="btn btn-ghost" @click="delivering = false">Abbrechen</button>
            </div>
          </div>
        </div>

        <div v-if="order" class="field">
          <label for="it-comment">Kommentar zur Bestellung</label>
          <textarea id="it-comment" v-model="comment" rows="3" class="textarea" placeholder="z. B. Menge, Händler oder Hinweise" />
        </div>
      </div>
      <HistoryList :entries="history" />
    </div>
  </AppModal>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: minmax(0, 1fr) 270px; gap: 24px; align-items: start; }
.main { display: flex; flex-direction: column; gap: 18px; }
.seg-lg { height: 40px !important; padding: 0 16px !important; font-size: 14px !important; }
.facts { display: grid; grid-template-columns: 140px minmax(0, 1fr); row-gap: 10px; column-gap: 16px; font-size: 14px; }
.actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.badge { display: inline-flex; align-items: center; gap: 6px; padding: 10px 14px; border-radius: 10px; font-size: 14px; font-weight: 600; }
.badge.warn { background: var(--warn-soft); color: var(--orange-ink); }
.badge.ok { background: var(--green-soft); color: var(--green-ink); }
.deliver {
  width: 100%; padding: 14px; border-radius: 12px; background: var(--accent-tint); border: 1px solid #CFE0F6;
  display: flex; flex-direction: column; gap: 12px; font-size: 14px;
}
.deliver-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
@media (max-width: 760px) {
  .grid { grid-template-columns: 1fr; }
  .facts { grid-template-columns: 110px minmax(0, 1fr); }
}
</style>
