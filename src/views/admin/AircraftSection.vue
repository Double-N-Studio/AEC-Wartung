<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { aircraftInput, createAircraft, deleteAircraft, people, state, templatesFor, updateAircraft, userName } from '../../store'
import type { Aircraft } from '../../types'
import { fmtDay, isSaturday } from '../../utils/date'
import AppIcon from '../../components/AppIcon.vue'
import AppModal from '../../components/AppModal.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'

/** Flugzeuge des Vereins anlegen, bearbeiten, ausmustern. Nichts ist fest im Code, damit andere Vereine die App nutzen können. */
const list = computed(() => [...state.aircraft].sort((a, b) => Number(!!a.retired) - Number(!!b.retired) || a.type.localeCompare(b.type, 'de')))

const editing = ref<Aircraft | 'new' | null>(null)
const form = reactive(aircraftInput())
const withCards = ref(true)
function open(a: Aircraft | 'new') {
  Object.assign(form, aircraftInput(a === 'new' ? undefined : a))
  withCards.value = true
  editing.value = a
}

const error = computed(() => {
  if (form.retired) return ''
  if (!isSaturday(form.start) || !isSaturday(form.end)) return 'Beginn und Ende des Werkstattzeitraums müssen Samstage sein.'
  if (form.end < form.start) return 'Das Ende liegt vor dem Beginn.'
  if (form.start < state.season.start || form.end > state.season.end) return 'Der Werkstattzeitraum muss in der Saison liegen.'
  return ''
})
// Ein entferntes Konto bleibt als Pate sichtbar, bis jemand anderes eingetragen wird.
const managers = computed(() => {
  const list = people()
  return form.manager && !list.some((u) => u.id === form.manager) ? [...list, { id: form.manager, name: userName(form.manager) }] : list
})
const duplicateReg = computed(() => state.aircraft.some((a) => a !== editing.value && a.reg === form.reg.trim().toUpperCase()))

function save() {
  if (!form.type.trim() || !form.reg.trim() || error.value || duplicateReg.value) return
  if (editing.value === 'new') createAircraft(form, withCards.value)
  else if (editing.value) updateAircraft(editing.value, form)
  editing.value = null
}

const removing = ref<Aircraft | null>(null)
const removeText = computed(() => {
  const a = removing.value
  if (!a) return ''
  const tasks = state.tasks.filter((t) => t.aircraftId === a.id).length
  const defects = state.defects.filter((d) => d.aircraftId === a.id).length
  return `${a.type} · ${a.reg} wird mit ${tasks} Kanban-Karten, ${defects} Mängeln/Befunden, allen Fristen und Dokumenten gelöscht. Verkaufte Flugzeuge besser ausmustern – dann bleibt alles erhalten.`
})
function confirmRemove() {
  if (removing.value) deleteAircraft(removing.value)
  removing.value = null
  editing.value = null
}
</script>

<template>
  <section class="card list" aria-labelledby="aircraft-h">
    <div class="head">
      <h2 id="aircraft-h" class="section-title">Flugzeuge <span class="count">{{ list.filter((a) => !a.retired).length }}</span></h2>
      <button type="button" class="btn btn-sm" @click="open('new')"><AppIcon name="plus" :size="16" :stroke="2.2" />Flugzeug hinzufügen</button>
    </div>
    <ul class="rows">
      <li v-for="a in list" :key="a.id">
        <button type="button" class="row" :class="{ retired: a.retired }" @click="open(a)">
          <span class="plane"><AppIcon name="plane" :size="18" /></span>
          <span class="what">
            <strong>{{ a.type }}<span class="reg">{{ a.reg }}</span></strong>
            <span class="muted">{{ a.manager ? `Pate: ${userName(a.manager)}` : 'Ohne Paten' }}{{ a.serial ? ` · Werknummer ${a.serial}` : '' }}</span>
          </span>
          <span v-if="a.retired" class="pill pill-gray">Ausgemustert</span>
          <span v-else class="muted when">Werkstatt Sa {{ fmtDay(a.start) }} – Sa {{ fmtDay(a.end) }}</span>
          <AppIcon name="chevronRight" :size="16" class="muted" />
        </button>
      </li>
    </ul>
    <p v-if="!list.length" class="muted empty">Noch keine Flugzeuge. Lege das erste über „Flugzeug hinzufügen“ an.</p>
  </section>

  <AppModal
    v-if="editing" :title="editing === 'new' ? 'Flugzeug hinzufügen' : `${editing.type} · ${editing.reg}`" icon="plane" :width="560"
    :subtitle="editing === 'new' ? 'Neues Flugzeug' : 'Flugzeug'" @close="editing = null"
  >
    <template v-if="editing !== 'new'" #tools>
      <button type="button" class="tool" aria-label="Flugzeug löschen" title="Flugzeug löschen" @click="removing = editing"><AppIcon name="trash" :size="19" /></button>
    </template>
    <form id="aircraft-form" class="form" @submit.prevent="save">
      <div class="two">
        <div class="field">
          <label for="af-type">Typ</label>
          <input id="af-type" v-model="form.type" class="input" required placeholder="z. B. ASK21">
        </div>
        <div class="field">
          <label for="af-reg">Kennzeichen</label>
          <input id="af-reg" v-model="form.reg" class="input" required placeholder="z. B. D-1234">
          <span v-if="duplicateReg" class="error">Dieses Kennzeichen gibt es schon.</span>
        </div>
      </div>
      <div class="two">
        <div class="field">
          <label for="af-serial">Werknummer <span class="muted hint">(optional)</span></label>
          <input id="af-serial" v-model="form.serial" class="input">
        </div>
        <div class="field">
          <label for="af-manager">Flugzeugpate <span class="muted hint">(optional)</span></label>
          <select id="af-manager" v-model="form.manager" class="select">
            <option value="">Kein Pate</option>
            <option v-for="u in managers" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
        </div>
      </div>
      <div class="two">
        <div class="field">
          <label for="af-start">Werkstatt ab</label>
          <input id="af-start" v-model="form.start" type="date" class="input" required>
        </div>
        <div class="field">
          <label for="af-end">Werkstatt bis</label>
          <input id="af-end" v-model="form.end" type="date" class="input" required>
        </div>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <label v-if="editing === 'new'" class="check-row">
        <input v-model="withCards" type="checkbox">
        <span><strong>Kanban-Karten aus den Vorlagen anlegen</strong><span class="muted">{{ templatesFor(form.type.trim()).length }} Vorlagen gelten für {{ form.type.trim() || 'dieses Flugzeug' }}.</span></span>
      </label>
      <label v-else class="check-row">
        <input v-model="form.retired" type="checkbox">
        <span><strong>Ausgemustert</strong><span class="muted">Verkauft o. ä. Kanban, Mängel und Dokumente bleiben erhalten; das Flugzeug verschwindet aus Seitenleiste und Saisonplan.</span></span>
      </label>
    </form>
    <template #meta>Den Werkstattzeitraum kannst du auch im Saisonplan ziehen.</template>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="editing = null">Abbrechen</button>
      <button type="submit" form="aircraft-form" class="btn btn-primary" :disabled="!!error || duplicateReg">{{ editing === 'new' ? 'Hinzufügen' : 'Speichern' }}</button>
    </template>
  </AppModal>

  <ConfirmModal v-if="removing" title="Flugzeug löschen?" :text="removeText" @confirm="confirmRemove" @close="removing = null" />
</template>

<style scoped>
.head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 14px 16px; border-bottom: 1px solid var(--border); }
.section-title { display: flex; align-items: center; gap: 8px; }
.section-title .count { background: var(--gray-soft); }
.rows { list-style: none; margin: 0; padding: 0; }
.row {
  width: 100%; display: flex; align-items: center; gap: 12px; min-height: 60px; padding: 10px 16px;
  border: 0; border-bottom: 1px solid var(--border-soft); background: transparent; text-align: left;
}
.rows li:last-child .row { border-bottom: 0; }
.row:hover { background: var(--subtle); }
.row.retired .what { opacity: 0.6; }
.plane {
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center; background: var(--accent-soft); color: var(--accent-ink);
}
.what { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.what strong { display: flex; align-items: baseline; gap: 8px; font-size: 14.5px; }
.reg { font-size: 13px; font-weight: 500; color: var(--muted); }
.what .muted, .when { font-size: 12.5px; }
.empty { padding: 20px 16px; font-size: 14px; }
.form { display: flex; flex-direction: column; gap: 16px; }
.two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.hint { font-weight: 400; }
.error { font-size: 13px; font-weight: 600; color: var(--red-ink); }
.check-row { display: flex; align-items: flex-start; gap: 12px; font-size: 14px; cursor: pointer; }
.check-row input { width: 18px; height: 18px; margin: 2px 0 0; accent-color: var(--accent); }
.check-row > span { display: flex; flex-direction: column; gap: 2px; }
.check-row .muted { font-size: 12.5px; line-height: 1.4; }
@media (max-width: 640px) {
  .two { grid-template-columns: 1fr; }
  .when { display: none; }
}
</style>
