<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { activeAircraft, setSeason, startSeason, state, templatesFor } from '../../store'
import type { ArchivedSeason } from '../../types'
import { addDays, fmtDate, isSaturday } from '../../utils/date'
import AppIcon from '../../components/AppIcon.vue'
import AppModal from '../../components/AppModal.vue'
import ArchiveModal from './ArchiveModal.vue'

/** Edit the season, start a new season (from the templates) and look up earlier seasons. */
const mode = ref<'edit' | 'new' | null>(null)
const form = reactive({ label: '', start: '', end: '', carryOver: true })

/** "2026/27" → "2027/28"; other labels are left in place to be overwritten. */
function nextLabel(label: string) {
  const m = label.match(/^(\d{4})\/(\d{2})$/)
  return m ? `${Number(m[1]) + 1}/${String((Number(m[2]) + 1) % 100).padStart(2, '0')}` : label
}

function open(m: 'edit' | 'new') {
  const s = state.season
  // 52 weeks later: Saturdays again, roughly the same calendar days.
  Object.assign(form, m === 'edit' ? { ...s, carryOver: true } : { label: nextLabel(s.label), start: addDays(s.start, 364), end: addDays(s.end, 364), carryOver: true })
  mode.value = m
}

const error = computed(() => {
  if (!isSaturday(form.start) || !isSaturday(form.end)) return 'Beginn und Ende müssen Samstage sein.'
  if (form.end < form.start) return 'Das Ende liegt vor dem Beginn.'
  if (mode.value === 'new' && form.start <= state.season.end) return 'Die neue Saison muss nach der laufenden beginnen.'
  return ''
})

const carried = computed(() => state.tasks.filter((t) => !t.templateId && t.status !== 'erledigt').length)
const newCards = computed(() => activeAircraft().reduce((n, a) => n + templatesFor(a.type).length, 0))

function save() {
  if (error.value || !form.label.trim()) return
  const input = { label: form.label, start: form.start, end: form.end }
  if (mode.value === 'new') startSeason(input, form.carryOver)
  else setSeason(input)
  mode.value = null
}

const viewing = ref<ArchivedSeason | null>(null)
/** Newest first – the order of the list itself is set by the server. */
const archive = computed(() => [...state.archive].sort((a, b) => b.start.localeCompare(a.start)))
</script>

<template>
  <section class="card box" aria-labelledby="season-h">
    <div class="box-head">
      <h2 id="season-h" class="section-title">Saison {{ state.season.label }}</h2>
      <div class="actions">
        <button type="button" class="btn btn-sm" @click="open('edit')"><AppIcon name="pen" :size="15" />Bearbeiten</button>
        <button type="button" class="btn btn-sm" @click="open('new')"><AppIcon name="refresh" :size="15" />Neue Saison starten</button>
      </div>
    </div>
    <dl class="facts">
      <dt>Erster Werkstatttag</dt><dd>Sa {{ fmtDate(state.season.start) }}</dd>
      <dt>Letzter Werkstatttag</dt><dd>Sa {{ fmtDate(state.season.end) }}</dd>
      <dt>Kanban-Vorlagen</dt>
      <dd><RouterLink to="/verwaltung/vorlagen" class="link">{{ state.templates.length }} Vorlagen bearbeiten</RouterLink></dd>
      <template v-if="state.archive.length">
        <dt>Frühere Saisons</dt>
        <dd class="archive">
          <button v-for="a in archive" :key="a.id" type="button" class="link-btn" @click="viewing = a">{{ a.label }}</button>
        </dd>
      </template>
    </dl>
  </section>

  <AppModal
    v-if="mode" :title="mode === 'new' ? 'Neue Saison starten' : 'Saison bearbeiten'" :icon="mode === 'new' ? 'refresh' : 'calendar'" :width="560"
    :subtitle="mode === 'new' ? `Saison ${state.season.label} wird archiviert` : undefined" @close="mode = null"
  >
    <form id="season-form" class="form" @submit.prevent="save">
      <div class="field">
        <label for="sf-label">Bezeichnung</label>
        <input id="sf-label" v-model="form.label" class="input" required placeholder="z. B. 2027/28">
      </div>
      <div class="two">
        <div class="field">
          <label for="sf-start">Erster Werkstatttag</label>
          <input id="sf-start" v-model="form.start" type="date" class="input" required>
        </div>
        <div class="field">
          <label for="sf-end">Letzter Werkstatttag</label>
          <input id="sf-end" v-model="form.end" type="date" class="input" required>
        </div>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <template v-if="mode === 'new'">
        <ul class="summary">
          <li>Kanban-Karten, Werkstatt-Termine und Werkstattleitungen der Saison {{ state.season.label }} werden archiviert und bleiben hier nachlesbar.</li>
          <li>Für {{ activeAircraft().length }} Flugzeuge entstehen {{ newCards }} neue Kanban-Karten aus den Vorlagen.</li>
          <li>Die Werkstattzeiträume rücken um dieselbe Wochenzahl mit; im Saisonplan kannst du sie danach anpassen.</li>
          <li>Mängel, Inventur, Bestellungen, Dokumente und Fristen bleiben, wie sie sind.</li>
        </ul>
        <label v-if="carried" class="check-row">
          <input v-model="form.carryOver" type="checkbox">
          <span><strong>{{ carried }} offene eigene {{ carried === 1 ? 'Karte' : 'Karten' }} übernehmen</strong><span class="muted">Karten, die nicht aus einer Vorlage stammen (z. B. aus Mängeln) und noch nicht erledigt sind.</span></span>
        </label>
      </template>
    </form>
    <template #meta>{{ mode === 'new' ? 'Lässt sich nicht rückgängig machen.' : 'Bestimmt den Saisonplan und die Monate im Kalender.' }}</template>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="mode = null">Abbrechen</button>
      <button type="submit" form="season-form" class="btn btn-primary" :disabled="!!error">{{ mode === 'new' ? 'Saison starten' : 'Speichern' }}</button>
    </template>
  </AppModal>

  <ArchiveModal v-if="viewing" :season="viewing" @close="viewing = null" />
</template>

<style scoped>
.box { padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
.box-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.facts { display: grid; grid-template-columns: 180px minmax(0, 1fr); row-gap: 8px; column-gap: 16px; margin: 0; font-size: 14px; }
.facts dt { color: var(--muted); }
.facts dd { margin: 0; font-weight: 600; }
.link { color: var(--accent-ink); }
.archive { display: flex; gap: 12px; flex-wrap: wrap; }
.archive .link-btn { padding: 0; font-size: 14px; }
.form { display: flex; flex-direction: column; gap: 16px; }
.two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.error { font-size: 13px; font-weight: 600; color: var(--red-ink); }
.summary { margin: 0; padding: 12px 14px 12px 30px; border-radius: 12px; background: var(--subtle); font-size: 13.5px; line-height: 1.5; color: var(--text-2); display: flex; flex-direction: column; gap: 4px; }
.check-row { display: flex; align-items: flex-start; gap: 12px; font-size: 14px; cursor: pointer; }
.check-row input { width: 18px; height: 18px; margin: 2px 0 0; accent-color: var(--accent); }
.check-row > span { display: flex; flex-direction: column; gap: 2px; }
.check-row .muted { font-size: 12.5px; line-height: 1.4; }
@media (max-width: 640px) {
  .facts { grid-template-columns: 1fr; row-gap: 2px; }
  .facts dd { margin-bottom: 8px; }
  .two { grid-template-columns: 1fr; }
}
</style>
