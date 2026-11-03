<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { aircraftTypes, cancelOrder, can, orderDetails, setOrderComment, setOrderDelivery, setOrderDetails, setOrderFor, userName } from '../../store'
import type { InventoryItem, Order } from '../../types'
import { fmtDate } from '../../utils/date'
import { fmtPrice } from '../../utils/stock'
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

// Bestelldaten ebenfalls beim Verlassen des Felds speichern.
const details = reactive(orderDetails(props.order))
watch(() => orderDetails(props.order), (d) => Object.assign(details, d))
const saveDetails = () => setOrderDetails(props.order, details)
const priceText = computed({
  get: () => (details.price === null ? '' : details.price.toFixed(2).replace('.', ',')),
  set: (v: string) => { details.price = v === '' ? null : Number(v.replace(',', '.')) },
})
const isUrl = (s: string) => /^https?:\/\//.test(s)

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
            <option v-for="t in aircraftTypes()" :key="t" :value="t">{{ t }}</option>
            <option v-if="order.forWhat !== 'Lager' && !aircraftTypes().includes(order.forWhat)" :value="order.forWhat">{{ order.forWhat }}</option>
          </select>
        </div>
        <div v-if="order.state === 'ordered' && step.step !== 'deliver'" class="field">
          <label :for="`eta-${order.id}`">Lieferung ca.</label>
          <input :id="`eta-${order.id}`" :value="order.delivery" type="date" class="input" @change="setOrderDelivery(order, ($event.target as HTMLInputElement).value)">
        </div>
      </div>
      <div class="two">
        <div class="field">
          <label :for="`supplier-${order.id}`">Händler</label>
          <input :id="`supplier-${order.id}`" v-model="details.supplier" class="input" placeholder="optional" @change="saveDetails">
        </div>
        <div class="field">
          <label :for="`artno-${order.id}`">Artikelnummer</label>
          <input :id="`artno-${order.id}`" v-model="details.articleNo" class="input" placeholder="optional" @change="saveDetails">
        </div>
        <div class="field">
          <label :for="`link-${order.id}`">Link zum Artikel</label>
          <input :id="`link-${order.id}`" v-model="details.link" type="url" class="input" placeholder="https://…" @change="saveDetails">
        </div>
        <div class="field">
          <label :for="`price-${order.id}`">Preis gesamt (€)</label>
          <input :id="`price-${order.id}`" v-model="priceText" inputmode="decimal" class="input" placeholder="optional" @change="saveDetails">
        </div>
      </div>
      <p v-if="order.orderedBy" class="muted small">Bestellt von {{ userName(order.orderedBy) }} am {{ fmtDate(order.orderedAt!) }}</p>
      <div class="field">
        <label :for="`comment-${order.id}`">Kommentar zur Bestellung</label>
        <textarea :id="`comment-${order.id}`" v-model="comment" rows="2" class="textarea" placeholder="z. B. Menge, Händler oder Hinweise" @change="setOrderComment(order, comment)" />
      </div>
      <button type="button" class="link-btn danger" @click="cancelling = true"><AppIcon name="x" :size="14" :stroke="2.4" />{{ cancelText }}</button>
    </template>
    <dl v-else class="facts">
      <dt>Für</dt><dd>{{ forLabel(order.forWhat) }}</dd>
      <template v-if="order.delivery && order.state === 'ordered'"><dt>Lieferung ca.</dt><dd>{{ fmtDate(order.delivery) }}</dd></template>
      <template v-if="order.supplier"><dt>Händler</dt><dd>{{ order.supplier }}</dd></template>
      <template v-if="order.articleNo"><dt>Artikelnummer</dt><dd>{{ order.articleNo }}</dd></template>
      <template v-if="order.link"><dt>Link</dt><dd class="plain"><a v-if="isUrl(order.link)" :href="order.link" target="_blank" rel="noopener">{{ order.link }}</a><template v-else>{{ order.link }}</template></dd></template>
      <template v-if="order.price !== undefined"><dt>Preis</dt><dd>{{ fmtPrice(order.price) }}</dd></template>
      <template v-if="order.orderedBy"><dt>Bestellt von</dt><dd>{{ userName(order.orderedBy) }} · {{ fmtDate(order.orderedAt!) }}</dd></template>
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
.facts dd.plain { font-weight: 400; white-space: pre-line; overflow-wrap: anywhere; }
.small { font-size: 12.5px; }
@media (max-width: 640px) {
  .two { grid-template-columns: 1fr; }
}
</style>
