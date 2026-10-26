<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { state } from '../../store'
import type { Defect } from '../../types'
import { fmtDate } from '../../utils/date'
import AppIcon from '../../components/AppIcon.vue'
import DropdownSelect from '../../components/DropdownSelect.vue'
import PriorityBadge from '../../components/PriorityBadge.vue'
import DefectModal from './DefectModal.vue'
import NewDefectModal from './NewDefectModal.vue'

const route = useRoute()
const aircraftId = computed(() => String(route.params.id))

const tab = ref<'open' | 'done'>('open')
const source = ref('alle')
const SOURCES = [{ value: 'alle', label: 'Alle' }, { value: 'vf', label: 'Vereinsflieger' }, { value: 'befund', label: 'Befunde' }]

const mine = computed(() => state.defects.filter((d) => d.aircraftId === aircraftId.value))
const openCount = computed(() => mine.value.filter((d) => d.status === 'open').length)
const doneCount = computed(() => mine.value.filter((d) => d.status === 'done').length)
const rows = computed(() => mine.value.filter((d) => d.status === tab.value && (source.value === 'alle' || d.source === source.value)))

const STATUS_TEXT = { offen: 'Offen', arbeit: 'In Arbeit', erledigt: 'Erledigt' }
const taskOf = (d: Defect) => (d.taskId ? state.tasks.find((t) => t.id === d.taskId) : undefined)

// ?befund=<id> öffnet einen Mangel/Befund direkt (Link aus dem Arbeitspaket).
const router = useRouter()
const openId = ref<string | null>(null)
watch(() => route.query.befund, (id) => { if (typeof id === 'string') openId.value = id }, { immediate: true })
const closeDefect = () => {
  openId.value = null
  if (route.query.befund) router.replace({ query: {} })
}
const openDefect = computed(() => state.defects.find((d) => d.id === openId.value) ?? null)
const creating = ref(false)
</script>

<template>
  <section class="card list" aria-label="Mängel und Befunde">
    <div class="toolbar">
      <div class="left">
        <div class="segmented" role="group" aria-label="Status">
          <button type="button" :aria-pressed="tab === 'open'" @click="tab = 'open'">Offen · {{ openCount }}</button>
          <button type="button" :aria-pressed="tab === 'done'" @click="tab = 'done'">Erledigt · {{ doneCount }}</button>
        </div>
        <span class="muted note">Mängel werden automatisch aus Vereinsflieger übernommen.</span>
      </div>
      <div class="right">
        <DropdownSelect v-model="source" label="Quelle" :options="SOURCES" />
        <button type="button" class="btn btn-primary btn-sm tall" @click="creating = true"><AppIcon name="camera" :size="17" :stroke="1.9" />Befund erfassen</button>
      </div>
    </div>

    <div class="table" role="table" aria-label="Mängel und Befunde">
      <div class="row table-head" role="row">
        <span role="columnheader">Mangel / Befund</span>
        <span role="columnheader">Quelle</span>
        <span role="columnheader">Gemeldet</span>
        <span role="columnheader">{{ tab === 'open' ? 'Zuständig' : 'Erledigt' }}</span>
        <span role="columnheader">Priorität</span>
        <span role="columnheader" aria-label="Öffnen" />
      </div>
      <button v-for="d in rows" :key="d.id" type="button" class="row table-row item" role="row" @click="openId = d.id">
        <span role="cell" class="c-title">
          <strong>{{ d.title }}</strong><span class="desc">{{ d.desc }}</span>
          <span v-if="taskOf(d)" class="linked"><AppIcon name="wrench" :size="13" />Arbeitspaket · {{ STATUS_TEXT[taskOf(d)!.status] }}</span>
        </span>
        <span role="cell" class="c-src">
          <AppIcon :name="d.source === 'vf' ? 'cloud' : 'camera'" :size="15" :stroke="1.9" />
          {{ d.source === 'vf' ? 'Vereinsflieger' : `Befund · ${d.photos === 1 ? '1 Foto' : `${d.photos} Fotos`}` }}
        </span>
        <span role="cell" class="c-stack"><strong>{{ fmtDate(d.reportedAt) }}</strong><span class="muted">{{ d.reportedBy }}</span></span>
        <span role="cell" class="c-stack">
          <template v-if="d.status === 'open'"><strong>{{ d.owner }}</strong></template>
          <template v-else><strong>{{ fmtDate(d.doneAt!) }}</strong><span class="muted">{{ d.doneBy }}</span></template>
        </span>
        <span role="cell"><PriorityBadge :priority="d.priority" /></span>
        <span role="cell" class="c-chev"><AppIcon name="chevronRight" /></span>
      </button>
      <p v-if="!rows.length" class="empty">Keine Einträge.</p>
    </div>
  </section>

  <DefectModal v-if="openDefect" :defect="openDefect" @close="closeDefect" />
  <NewDefectModal v-if="creating" :aircraft-id="aircraftId" @close="creating = false; tab = 'open'" />
</template>

<style scoped>
.list { overflow: hidden; }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; flex-wrap: wrap; }
.left, .right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.note { font-size: 12.5px; }
.tall { height: 40px; }
.table { border-top: 1px solid var(--border); }
.row {
  display: grid; grid-template-columns: minmax(0, 42fr) minmax(0, 14fr) minmax(0, 15fr) minmax(0, 15fr) minmax(0, 11fr) 44px;
  align-items: center;
}
.table-head { height: 38px; position: static; }
.table-head > span { padding: 0 12px; }
.table-head > span:first-child { padding-left: 16px; }
.item { width: 100%; min-height: 76px; padding: 0; border: 0; border-bottom: 1px solid var(--border-soft); background: var(--surface); text-align: left; }
.item:hover { background: var(--subtle); }
.item > span { padding: 10px 12px; }
.c-title { display: flex; flex-direction: column; gap: 3px; padding-left: 16px !important; min-width: 0; }
.c-title strong { font-size: 14px; }
.linked { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--accent-ink); }
.desc { font-size: 12.5px; color: var(--muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.c-src { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-2); }
.c-stack { display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
.c-stack .muted { font-size: 12px; }
.c-chev { display: flex; justify-content: center; color: var(--muted); }
.empty { padding: 32px 16px; text-align: center; color: var(--muted); font-size: 14px; }

@media (max-width: 900px) {
  .table-head { display: none; }
  .row { grid-template-columns: 1fr auto; grid-template-areas: 'title prio' 'src src' 'rep rep'; }
  .item { padding: 10px 0; }
  .item > span { padding: 2px 16px; }
  .c-title { grid-area: title; }
  .c-src { grid-area: src; }
  .item > span:nth-child(3) { grid-area: rep; flex-direction: row; gap: 6px; }
  .item > span:nth-child(4) { display: none; }
  .item > span:nth-child(5) { grid-area: prio; }
  .c-chev { display: none; }
}
</style>
