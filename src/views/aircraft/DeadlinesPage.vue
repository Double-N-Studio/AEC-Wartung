<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { state } from '../../store'
import { daysBetween, fmtDate, TODAY } from '../../utils/date'
import AppIcon from '../../components/AppIcon.vue'

const WARN_DAYS = 30
const route = useRoute()

const rows = computed(() => state.deadlines
  .filter((d) => d.aircraftId === route.params.id)
  .map((d) => {
    const days = d.due ? daysBetween(TODAY, d.due) : null
    const warn = days !== null && days <= WARN_DAYS
    const remaining = days !== null
      ? days < 0 ? `seit ${-days} Tagen überfällig` : `noch ${days} ${days === 1 ? 'Tag' : 'Tage'}`
      : `noch ${d.startsLeft} Starts`
    return { ...d, days, warn, remaining }
  })
  .sort((a, b) => (a.days ?? 99999) - (b.days ?? 99999)))

const upcoming = computed(() => rows.value.filter((r) => r.warn))
</script>

<template>
  <div v-for="u in upcoming" :key="u.id" class="banner">
    <AppIcon name="alert" />
    <span>{{ u.title }} {{ u.device }} läuft in {{ u.days }} Tagen ab ({{ fmtDate(u.due!) }}).</span>
  </div>

  <section class="card list" aria-labelledby="fr-h">
    <div class="toolbar">
      <h2 id="fr-h" class="section-title">Offene Fristen</h2>
      <span class="muted note"><AppIcon name="cloud" :size="15" :stroke="1.9" />Fristen werden automatisch aus Vereinsflieger übernommen.</span>
    </div>
    <div class="table" role="table" aria-label="Offene Fristen">
      <div class="row table-head" role="row">
        <span role="columnheader">Maßnahme</span>
        <span role="columnheader">Gerät</span>
        <span role="columnheader">Ansprechpartner</span>
        <span role="columnheader">Delegiert an</span>
        <span role="columnheader">Fällig</span>
        <span role="columnheader">Verbleibend</span>
      </div>
      <div v-for="r in rows" :key="r.id" class="row table-row item" role="row">
        <span role="cell" class="c-title">{{ r.title }}</span>
        <span role="cell" class="c-stack"><span>{{ r.device }}</span><span class="muted">{{ r.deviceInfo }}</span></span>
        <span role="cell" class="c-contact">{{ r.contact }}</span>
        <span role="cell" class="c-del" :class="{ muted: !r.delegate }">{{ r.delegate ?? '–' }}</span>
        <span role="cell" class="c-due">{{ r.due ? fmtDate(r.due) : 'nach Starts' }}</span>
        <span role="cell"><span class="pill remain" :class="{ warn: r.warn }"><AppIcon :name="r.warn ? 'alert' : 'check'" :size="14" :stroke="r.warn ? 2.2 : 2.6" />{{ r.remaining }}</span></span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.banner {
  display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px;
  background: var(--warn-soft); color: var(--orange-ink); font-size: 14px; font-weight: 600;
}
.list { overflow: hidden; }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; flex-wrap: wrap; }
.note { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; }
.table { border-top: 1px solid var(--border); }
.row {
  display: grid; align-items: center;
  grid-template-columns: minmax(0, 22fr) minmax(0, 22fr) minmax(0, 16fr) minmax(0, 12fr) minmax(0, 11fr) minmax(0, 17fr);
}
.table-head { height: 38px; position: static; }
.row > span { padding: 10px 12px; }
.row > span:first-child { padding-left: 16px; }
.item { min-height: 64px; font-size: 13.5px; }
.item:last-child { border-bottom: 0; }
.c-title { font-size: 14px; font-weight: 600; }
.c-stack { display: flex; flex-direction: column; gap: 2px; }
.c-stack .muted { font-size: 12px; }
.c-due { font-weight: 600; white-space: nowrap; }
.remain { background: var(--green-soft); color: var(--green-ink); font-size: 13px; padding: 4px 10px; }
.remain.warn { background: var(--warn-soft); color: var(--orange-ink); }

@media (max-width: 900px) {
  .table-head { display: none; }
  .row { grid-template-columns: 1fr auto; grid-template-areas: 'title remain' 'dev due'; padding: 8px 0; }
  .row > span { padding: 2px 16px; }
  .c-title { grid-area: title; }
  .c-stack { grid-area: dev; }
  .c-contact, .c-del { display: none; }
  .c-due { grid-area: due; text-align: right; }
  .row > span:last-child { grid-area: remain; text-align: right; }
}
</style>
