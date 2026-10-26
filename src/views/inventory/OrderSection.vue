<script setup lang="ts">
import { computed, ref } from 'vue'
import { markDelivered, markOrdered } from '../../store'
import type { InventoryItem, Order } from '../../types'
import { fmtDay } from '../../utils/date'
import QtyStepper from '../../components/QtyStepper.vue'

/** Abschnitt "Bestellung" in den Inventur-Popups: Status, nächster Schritt, Kommentar. */
const props = defineProps<{ order: Order; item?: InventoryItem }>()
const emit = defineEmits<{ delivered: [] }>()

const delivering = ref(false)
const qty = ref(1)
const countable = computed(() => props.item?.mode === 'count')
const unit = (n: number) => (props.item ? (n === 1 ? props.item.unit[0] : props.item.unit[1]) : '')

function confirm() {
  markDelivered(props.order, countable.value ? qty.value : 0)
  delivering.value = false
  emit('delivered')
}
</script>

<template>
  <div class="order">
    <div class="status-row">
      <span v-if="order.state === 'list'" class="status list"><span class="dot" />Steht auf der Bestellliste</span>
      <span v-else class="status ordered"><span class="dot" />Bestellt · Lieferung ca. {{ fmtDay(order.delivery!) }}</span>
      <button v-if="order.state === 'list'" type="button" class="btn btn-primary" @click="markOrdered(order)">Als bestellt markieren</button>
      <button v-else-if="!delivering" type="button" class="btn btn-primary" @click="delivering = true; qty = 1">Geliefert</button>
    </div>

    <div v-if="delivering" class="deliver">
      <div v-if="countable" class="row">
        <span class="field-label">Gelieferte Menge</span>
        <QtyStepper v-model="qty" :min="1" :label="`${qty} ${unit(qty)}`" />
      </div>
      <span v-else>Lieferung bestätigen und von der Bestellliste nehmen?</span>
      <div class="row">
        <button type="button" class="btn btn-primary" @click="confirm">Lieferung bestätigen</button>
        <button type="button" class="btn btn-ghost" @click="delivering = false">Abbrechen</button>
      </div>
    </div>

    <div class="field">
      <label :for="`comment-${order.id}`">Kommentar zur Bestellung</label>
      <textarea :id="`comment-${order.id}`" v-model="order.comment" rows="2" class="textarea" placeholder="z. B. Menge, Händler oder Hinweise" />
    </div>
  </div>
</template>

<style scoped>
.order { display: flex; flex-direction: column; gap: 14px; }
.status-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.status { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; }
.dot { width: 9px; height: 9px; border-radius: 50%; background: currentColor; }
.status.list { color: var(--orange-ink); }
.status.ordered { color: var(--green-ink); }
.deliver {
  padding: 14px; border-radius: 12px; background: var(--accent-tint); border: 1px solid #CFE0F6;
  display: flex; flex-direction: column; gap: 12px; font-size: 14px;
}
.row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
</style>
