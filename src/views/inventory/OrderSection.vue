<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { cancelOrder, can, setOrderComment, setOrderDelivery, setOrderFor, state } from '../../store'
import type { InventoryItem, Order } from '../../types'
import { fmtDate } from '../../utils/date'
import AppIcon from '../../components/AppIcon.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'
import QtyStepper from '../../components/QtyStepper.vue'
import type { OrderStep } from './OrderActions.vue'

/**
 * Abschnitt "Bestellung" in den Inventur-Popups: Verwendungszweck, Lieferdatum, Kommentar, Stornieren
 * und die Eingaben zum nächsten Schritt. Die Buttons zum Bestätigen stehen in der Fußleiste (OrderActions).
 */
const props = defineProps<{ order: Order; item?: InventoryItem; step: OrderStep }>()

const countable = computed(() => props.item?.mode === 'count')
const unit = (n: number) => (props.item ? (n === 1 ? props.item.unit[0] : props.item.unit[1]) : '')
const forLabel = (f: string) => (f === 'Lager' ? 'Lager (allgemein)' : f)

const forWhat = computed({
  get: () => props.order.forWhat,
  set: (v: string) => setOrderFor(props.order, v),
})

// Kommentar wird beim Verlassen des Felds gespeichert, nicht bei jedem Tastendruck.
const comment = ref(props.order.comment)
watch(() => props.order.comment, (c) => { comment.value = c })

const cancelling = ref(false)
const cancelText = computed(() => props.order.state === 'ordered' ? 'Bestellung stornieren' : 'Von der Bestellliste nehmen')
</script>

<template>
  <div class="order">
    <div v-if="step.step === 'order'" class="next">
      <label :for="`delivery-${order.id}`" class="field-label">Lieferung ungefähr am</label>
      <input :id="`delivery-${order.id}`" v-model="step.date" type="date" class="input date">
    </div>
    <div v-else-if="step.step === 'deliver'" class="next">
      <div v-if="countable" class="row">
        <span class="field-label">Gelieferte Menge</span>
        <QtyStepper v-model="step.qty" :min="1" :label="`${step.qty} ${unit(step.qty)}`" />
      </div>
      <span v-else>Lieferung bestätigen und von der Bestellliste nehmen?</span>
    </div>

    <template v-if="can('edit')">
      <div class="two">
        <div class="field">
          <label :for="`for-${order.id}`">Für</label>
          <select :id="`for-${order.id}`" v-model="forWhat" class="select">
            <option value="Lager">Lager (allgemein)</option>
            <option v-for="a in state.aircraft" :key="a.id" :value="a.type">{{ a.type }}</option>
          </select>
        </div>
        <div v-if="order.state === 'ordered' && step.step !== 'deliver'" class="field">
          <label :for="`eta-${order.id}`">Lieferung ca.</label>
          <input :id="`eta-${order.id}`" :value="order.delivery" type="date" class="input" @change="setOrderDelivery(order, ($event.target as HTMLInputElement).value)">
        </div>
      </div>
      <div class="field">
        <label :for="`comment-${order.id}`">Kommentar zur Bestellung</label>
        <textarea :id="`comment-${order.id}`" v-model="comment" rows="2" class="textarea" placeholder="z. B. Menge, Händler oder Hinweise" @change="setOrderComment(order, comment)" />
      </div>
      <button type="button" class="link-btn danger" @click="cancelling = true"><AppIcon name="x" :size="14" :stroke="2.4" />{{ cancelText }}</button>
    </template>
    <dl v-else class="facts">
      <dt>Für</dt><dd>{{ forLabel(order.forWhat) }}</dd>
      <template v-if="order.delivery && order.state === 'ordered'"><dt>Lieferung ca.</dt><dd>{{ fmtDate(order.delivery) }}</dd></template>
      <template v-if="order.comment"><dt>Kommentar</dt><dd class="plain">{{ order.comment }}</dd></template>
    </dl>
  </div>

  <ConfirmModal
    v-if="cancelling" :title="`${cancelText}?`" :confirm="order.state === 'ordered' ? 'Stornieren' : 'Entfernen'" icon="box"
    :text="`„${order.name}“ wird von der Bestellliste entfernt.${order.state === 'ordered' ? ' Die Bestellung beim Händler musst du selbst stornieren.' : ''}`"
    @confirm="cancelOrder(order); cancelling = false" @close="cancelling = false"
  />
</template>

<style scoped>
.order { display: flex; flex-direction: column; gap: 14px; }
.next {
  padding: 14px; border-radius: 12px; background: var(--accent-tint); border: 1px solid var(--accent-soft);
  display: flex; flex-direction: column; gap: 8px; font-size: 14px;
}
.date { max-width: 220px; }
.row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.link-btn { align-self: flex-start; }
.facts { display: grid; grid-template-columns: 120px minmax(0, 1fr); row-gap: 8px; column-gap: 16px; margin: 0; font-size: 14px; }
.facts dt { color: var(--muted); }
.facts dd { margin: 0; font-weight: 600; }
.facts dd.plain { font-weight: 400; white-space: pre-line; }
@media (max-width: 640px) {
  .two { grid-template-columns: 1fr; }
}
</style>
