<script setup lang="ts">
import { computed, ref } from 'vue'
import { can, state, userName } from '../../store'
import type { Order } from '../../types'
import { fmtDay } from '../../utils/date'
import { fmtPrice } from '../../utils/stock'
import AppIcon from '../AppIcon.vue'

/**
 * Order list as a full-width table ("Bestellliste" tab).
 * Open: "Muss bestellt werden" and "Bestellt", with the next step per row; delivered: order history with the season total.
 * If the card is narrower than the table (container query, not window width), the rows become cards.
 */
const props = defineProps<{ orders: Order[] }>()
const emit = defineEmits<{ open: [order: Order, start?: 'order' | 'deliver']; add: [] }>()

const view = ref<'open' | 'delivered'>('open')

const toOrder = computed(() => props.orders.filter((o) => o.state === 'list').sort((a, b) => a.name.localeCompare(b.name, 'de')))
const ordered = computed(() => props.orders.filter((o) => o.state === 'ordered').sort((a, b) => (a.delivery ?? '').localeCompare(b.delivery ?? '')))
const delivered = computed(() => props.orders
  .filter((o) => o.state === 'delivered')
  .sort((a, b) => (b.deliveredAt ?? '').localeCompare(a.deliveredAt ?? '')))
const seasonTotal = computed(() => delivered.value
  .filter((o) => (o.deliveredAt ?? '') >= state.season.start)
  .reduce((sum, o) => sum + (o.price ?? 0), 0))

const groups = computed(() => [
  { key: 'list', title: 'Muss bestellt werden', dot: 'var(--today)', list: toOrder.value, canAdd: true },
  { key: 'ordered', title: 'Bestellt', dot: 'var(--green)', list: ordered.value, canAdd: false },
])

const who = (o: Order) => (o.orderedBy
  ? `${userName(o.orderedBy)} · ${fmtDay(o.orderedAt!)}`
  : `${userName(o.reportedBy)} · ${fmtDay(o.reportedAt)}`)
const details = (o: Order) => [o.supplier, o.articleNo && `Art.-Nr. ${o.articleNo}`, o.price !== undefined && fmtPrice(o.price)]
  .filter(Boolean).join(' · ')
</script>

<template>
  <section class="card orders" aria-labelledby="orders-h">
    <div class="toolbar">
      <h2 id="orders-h" class="sr-only">Bestellliste</h2>
      <div class="segmented" role="group" aria-label="Status">
        <button type="button" :aria-pressed="view === 'open'" @click="view = 'open'">Offen · {{ toOrder.length + ordered.length }}</button>
        <button type="button" :aria-pressed="view === 'delivered'" @click="view = 'delivered'">Geliefert · {{ delivered.length }}</button>
      </div>
      <span v-if="view === 'delivered'" class="muted total">Saison {{ state.season.label }}: {{ fmtPrice(seasonTotal) }}</span>
    </div>

    <template v-if="view === 'open'">
      <div class="row head open-cols" aria-hidden="true">
        <span>Artikel</span><span>Für</span><span>Gemeldet / bestellt</span><span>Notiz</span><span>Status</span><span />
      </div>
      <div v-for="g in groups" :key="g.key">
        <h3 class="group-head">
          <span class="dot" :style="{ background: g.dot }" />{{ g.title }}<span class="count">{{ g.list.length }}</span>
          <button v-if="g.canAdd && can('edit')" type="button" class="add" aria-label="Neue Bestellung" title="Neue Bestellung" @click="emit('add')">
            <AppIcon name="plus" :stroke="2.2" />
          </button>
        </h3>
        <ul class="rows">
          <li v-for="o in g.list" :key="o.id" class="row open-cols">
            <button type="button" class="c-name name" @click="emit('open', o)">{{ o.name }}</button>
            <span class="c-for"><span class="pill pill-gray">{{ o.forWhat }}</span></span>
            <span class="c-who">{{ who(o) }}</span>
            <span class="c-note">
              <span v-if="o.comment" class="comment">{{ o.comment }}</span>
              <span v-if="details(o)" class="muted">{{ details(o) }}</span>
            </span>
            <span class="c-status">
              <span v-if="o.state === 'list'" class="pill pill-orange">Auf Bestellliste</span>
              <span v-else class="pill pill-green">Lieferung ca. {{ fmtDay(o.delivery!) }}</span>
            </span>
            <span class="c-action">
              <template v-if="can('edit')">
                <button v-if="o.state === 'list'" type="button" class="btn btn-sm" @click="emit('open', o, 'order')">Als bestellt markieren</button>
                <button v-else type="button" class="btn btn-sm" @click="emit('open', o, 'deliver')">Geliefert</button>
              </template>
            </span>
          </li>
        </ul>
        <p v-if="!g.list.length" class="muted empty">Nichts offen.</p>
      </div>
    </template>

    <template v-else>
      <div class="row head done-cols" aria-hidden="true">
        <span>Artikel</span><span>Für</span><span>Bestellt von</span><span>Händler</span><span>Geliefert</span><span class="right">Preis</span>
      </div>
      <ul class="rows">
        <li v-for="o in delivered" :key="o.id" class="row done-cols">
          <span class="c-name">
            <strong>{{ o.name }}</strong><span v-if="o.deliveredQty" class="muted"> · {{ o.deliveredQty }} geliefert</span>
          </span>
          <span class="c-for"><span class="pill pill-gray">{{ o.forWhat }}</span></span>
          <span class="c-who">{{ o.orderedBy ? userName(o.orderedBy) : '–' }}</span>
          <span class="c-note">
            <span>{{ o.supplier || '–' }}</span>
            <span v-if="o.articleNo" class="muted">Art.-Nr. {{ o.articleNo }}</span>
            <a v-if="o.link && /^https?:\/\//.test(o.link)" :href="o.link" target="_blank" rel="noopener">Link</a>
          </span>
          <span class="c-status">{{ o.deliveredAt ? fmtDay(o.deliveredAt) : '–' }}</span>
          <span class="c-action price">{{ o.price !== undefined ? fmtPrice(o.price) : '–' }}</span>
        </li>
      </ul>
      <p v-if="!delivered.length" class="muted empty">Noch nichts geliefert.</p>
    </template>
  </section>
</template>

<style scoped>
.orders { overflow: hidden; container-type: inline-size; }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 14px 16px; }
.total { font-size: 13.5px; font-weight: 600; }
.rows { list-style: none; margin: 0; padding: 0; }
.row { display: grid; gap: 16px; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--border-soft); font-size: 13.5px; }
.rows .row:last-child { border-bottom: 0; }
.open-cols { grid-template-columns: minmax(150px, 1.3fr) minmax(70px, 0.5fr) minmax(130px, 1fr) minmax(180px, 2fr) 160px 180px; }
.done-cols { grid-template-columns: minmax(150px, 1.3fr) minmax(70px, 0.5fr) minmax(120px, 1fr) minmax(180px, 2fr) 90px 100px; }
.head {
  padding-top: 9px; padding-bottom: 9px; background: var(--subtle); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
  font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.03em;
}
.group-head {
  display: flex; align-items: center; gap: 8px; min-height: 36px; padding: 8px 16px; font-size: 14px; font-weight: 700;
  border-bottom: 1px solid var(--border); background: var(--accent-tint);
}
.group-head .count { background: var(--gray-soft); }
.dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.add {
  margin-left: auto; width: 36px; height: 36px; border-radius: 9px; border: 1px solid var(--border-strong);
  background: var(--surface); color: var(--accent-ink); display: inline-flex; align-items: center; justify-content: center;
}
.name { justify-self: start; padding: 2px 0; border: 0; background: transparent; font-size: 14.5px; font-weight: 600; color: var(--accent-ink); text-align: left; }
.name:hover { text-decoration: underline; }
.c-who { color: var(--text-2); }
.c-note { display: flex; flex-direction: column; gap: 2px; min-width: 0; color: var(--text-2); }
.c-note .muted { font-size: 12.5px; }
.comment { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.c-action { display: flex; justify-content: flex-end; }
.right, .price { text-align: right; justify-content: flex-end; }
.price { font-weight: 600; }
.empty { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid var(--border-soft); }
@container (max-width: 960px) {
  .head { display: none; }
  .row {
    grid-template-columns: minmax(0, 1fr) auto; row-gap: 6px; column-gap: 12px;
    grid-template-areas: 'name for' 'who who' 'note note' 'status action';
  }
  .c-name { grid-area: name; }
  .c-for { grid-area: for; justify-self: end; }
  .c-who { grid-area: who; font-size: 12.5px; color: var(--muted); }
  .c-note { grid-area: note; }
  .c-note:empty { display: none; }
  .c-status { grid-area: status; }
  .c-action { grid-area: action; }
}
</style>
