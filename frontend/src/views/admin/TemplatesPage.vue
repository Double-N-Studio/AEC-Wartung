<script setup lang="ts">
import { computed, ref } from 'vue'
import { aircraftTypes, can, state, templatesFor } from '../../store'
import type { TaskTemplate } from '../../types'
import AppIcon from '../../components/AppIcon.vue'
import DropdownSelect from '../../components/DropdownSelect.vue'
import LevelBadge from '../../components/LevelBadge.vue'
import TemplateFormModal from './TemplateFormModal.vue'

/** Kanban templates: the cards are created from them at season start and for new aircraft. */
const scope = ref('alle')
const scopes = computed(() => [{ value: 'alle', label: 'Alle' }, { value: '', label: 'Alle Flugzeuge' }, ...aircraftTypes().map((t) => ({ value: t, label: t }))])

// Filter by one type: the templates for all aircraft plus those that name it. Templates for all aircraft come first.
const list = computed(() => state.templates
  .filter((v) => scope.value === 'alle' || (scope.value ? templatesFor(scope.value).includes(v) : !v.aircraftTypes.length))
  .sort((a, b) => Number(!!a.aircraftTypes.length) - Number(!!b.aircraftTypes.length)))
const appliesTo = (v: TaskTemplate) => (v.aircraftTypes.length ? `Nur ${v.aircraftTypes.join(', ')}` : 'Alle Flugzeuge')

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
      <ul class="rows">
        <li v-for="v in list" :key="v.id">
          <button type="button" class="row" @click="editing = v">
            <span class="what">
              <strong>{{ v.title }}</strong>
              <span class="muted"><span :class="{ only: v.aircraftTypes.length }">{{ appliesTo(v) }}</span> · {{ v.duration }}{{ v.checklist.length ? ` · ${v.checklist.length} Schritte` : '' }}</span>
            </span>
            <LevelBadge :level="v.level" />
            <AppIcon name="chevronRight" :size="16" class="muted" />
          </button>
        </li>
      </ul>
      <p v-if="!list.length" class="muted empty">Keine Vorlagen.</p>
    </section>

    <TemplateFormModal
      v-if="editing" :template="editing === 'new' ? undefined : editing"
      :preset="{ aircraftTypes: scope && scope !== 'alle' ? [scope] : [] }" @close="editing = null"
    />
  </div>
</template>

<style scoped>
.back { display: inline-flex; align-items: center; gap: 4px; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: var(--accent-ink); text-decoration: none; }
.denied { padding: 24px; font-size: 14px; color: var(--text-2); }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 14px 16px; border-bottom: 1px solid var(--border); }
.tall { height: 40px; }
.rows { list-style: none; margin: 0; padding: 0; }
.row {
  width: 100%; display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 8px 16px;
  border: 0; border-bottom: 1px solid var(--border-soft); background: transparent; text-align: left;
}
.row:hover { background: var(--subtle); }
.what { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.what strong { font-size: 14.5px; }
.what .muted { font-size: 12.5px; }
.only { font-weight: 600; color: var(--accent-ink); }
.rows li:last-child .row { border-bottom: 0; }
.empty { padding: 16px; font-size: 14px; }
</style>
