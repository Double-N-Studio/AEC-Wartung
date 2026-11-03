<script setup lang="ts">
import { computed, ref } from 'vue'
import { aircraftTypes, can, state } from '../../store'
import type { TaskTemplate } from '../../types'
import AppIcon from '../../components/AppIcon.vue'
import DropdownSelect from '../../components/DropdownSelect.vue'
import LevelBadge from '../../components/LevelBadge.vue'
import TemplateFormModal from './TemplateFormModal.vue'

/** Kanban-Vorlagen: daraus entstehen zu Saisonbeginn und bei neuen Flugzeugen die Karten. */
const scope = ref('alle')
const scopes = computed(() => [{ value: 'alle', label: 'Alle' }, { value: '', label: 'Alle Flugzeuge' }, ...aircraftTypes().map((t) => ({ value: t, label: t }))])

const groups = computed(() => {
  const keys = scope.value === 'alle' ? ['', ...new Set(state.templates.map((v) => v.aircraftType).filter(Boolean))] : [scope.value]
  return keys
    .map((k) => ({ key: k, title: k ? `Nur ${k}` : 'Alle Flugzeuge', list: state.templates.filter((v) => v.aircraftType === k) }))
    .filter((g) => g.list.length || scope.value !== 'alle')
})

const editing = ref<TaskTemplate | 'new' | null>(null)
</script>

<template>
  <div class="page">
    <header>
      <RouterLink to="/verwaltung" class="back"><AppIcon name="chevronLeft" :size="16" />Verwaltung</RouterLink>
      <h1 class="page-title">Kanban-Vorlagen</h1>
      <p class="page-sub">Zu Beginn jeder Saison und bei neuen Flugzeugen entsteht aus jeder Vorlage eine Kanban-Karte. Bestehende Karten ändern sich nicht.</p>
    </header>

    <p v-if="!can('admin')" class="card denied">Dieser Bereich ist nur für Admins.</p>

    <section v-else class="card list" aria-label="Vorlagen">
      <div class="toolbar">
        <DropdownSelect v-model="scope" label="Gilt für" :options="scopes" />
        <button type="button" class="btn btn-sm tall" @click="editing = 'new'"><AppIcon name="plus" :size="16" :stroke="2.2" />Vorlage anlegen</button>
      </div>
      <div v-for="g in groups" :key="g.key" class="group">
        <h2 class="group-head">{{ g.title }}<span class="count">{{ g.list.length }}</span></h2>
        <ul class="rows">
          <li v-for="v in g.list" :key="v.id">
            <button type="button" class="row" @click="editing = v">
              <span class="what">
                <strong>{{ v.title }}</strong>
                <span class="muted">{{ v.duration }}{{ v.checklist.length ? ` · ${v.checklist.length} Schritte` : '' }}{{ v.docTitle ? ` · ${v.docTitle}` : '' }}</span>
              </span>
              <LevelBadge :level="v.level" />
              <AppIcon name="chevronRight" :size="16" class="muted" />
            </button>
          </li>
        </ul>
        <p v-if="!g.list.length" class="muted empty">Keine Vorlagen.</p>
      </div>
    </section>

    <TemplateFormModal
      v-if="editing" :template="editing === 'new' ? undefined : editing"
      :preset="{ aircraftType: scope === 'alle' ? '' : scope }" @close="editing = null"
    />
  </div>
</template>

<style scoped>
.back { display: inline-flex; align-items: center; gap: 4px; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: var(--accent-ink); text-decoration: none; }
.denied { padding: 24px; font-size: 14px; color: var(--text-2); }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 14px 16px; border-bottom: 1px solid var(--border); }
.tall { height: 40px; }
.group-head { display: flex; align-items: center; gap: 8px; padding: 14px 16px 6px; font-size: 13px; font-weight: 700; color: var(--text-2); }
.group-head .count { background: var(--gray-soft); }
.rows { list-style: none; margin: 0; padding: 0; }
.row {
  width: 100%; display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 8px 16px;
  border: 0; border-bottom: 1px solid var(--border-soft); background: transparent; text-align: left;
}
.row:hover { background: var(--subtle); }
.what { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.what strong { font-size: 14.5px; }
.what .muted { font-size: 12.5px; }
.empty { padding: 8px 16px 16px; font-size: 14px; }
</style>
