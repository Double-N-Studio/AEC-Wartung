<script setup lang="ts">
import { computed, ref } from 'vue'
import { aircraftTypes, state, templatesFor } from '../../store'
import type { TaskTemplate } from '../../types'
import AppIcon from '../../components/AppIcon.vue'
import DropdownSelect from '../../components/DropdownSelect.vue'
import LevelBadge from '../../components/LevelBadge.vue'
import TemplateFormModal from './TemplateFormModal.vue'
import { LEVEL_KEYS } from '../../utils/levels'

/** Kanban templates (admin area): the cards are created from them at season start and for new aircraft. */
const scope = ref('alle')
const scopes = computed(() => [{ value: 'alle', label: 'Alle' }, { value: '', label: 'Alle Flugzeuge' }, ...aircraftTypes().map((t) => ({ value: t, label: t }))])

// Filter by one type: the templates for all aircraft plus those that name it. Sorted by skill level, then by title.
const list = computed(() => state.templates
  .filter((v) => scope.value === 'alle' || (scope.value ? templatesFor(scope.value).includes(v) : !v.aircraftTypes.length))
  .sort((a, b) => LEVEL_KEYS.indexOf(a.level) - LEVEL_KEYS.indexOf(b.level) || a.title.localeCompare(b.title, 'de')))
const appliesTo = (v: TaskTemplate) => (v.aircraftTypes.length ? `Nur ${v.aircraftTypes.join(', ')}` : 'Alle Flugzeuge')

const editing = ref<TaskTemplate | 'new' | null>(null)
</script>

<template>
  <section class="card list" aria-labelledby="templates-h">
    <div class="toolbar">
      <div class="title">
        <h2 id="templates-h" class="section-title">Kanban-Vorlagen <span class="count">{{ state.templates.length }}</span></h2>
        <p class="muted small">Zu Beginn jeder Saison und bei neuen Flugzeugen entsteht aus jeder Vorlage eine Kanban-Karte. Bestehende Karten ändern sich nicht.</p>
      </div>
      <div class="actions">
        <DropdownSelect v-model="scope" label="Gilt für" :options="scopes" />
        <button type="button" class="btn btn-sm tall" @click="editing = 'new'"><AppIcon name="plus" :size="16" :stroke="2.2" />Vorlage anlegen</button>
      </div>
    </div>
    <!-- Same look as an open card on the kanban board, so the template shows what the card will be. -->
    <ul class="grid">
      <li v-for="v in list" :key="v.id">
        <button type="button" class="task" @click="editing = v">
          <span class="task-top">
            <span class="task-title">{{ v.title }}</span>
            <LevelBadge :level="v.level" class="task-tag" />
          </span>
          <span v-if="v.desc" class="task-desc">{{ v.desc }}</span>
          <span class="task-meta">
            <span><AppIcon name="clock" :size="14" />{{ v.duration }}</span>
            <span v-if="v.checklist.length"><AppIcon name="list" :size="14" />{{ v.checklist.length }} Schritte</span>
          </span>
          <span class="applies" :class="{ only: v.aircraftTypes.length }">{{ appliesTo(v) }}</span>
        </button>
      </li>
    </ul>
    <p v-if="!list.length" class="muted empty">Keine Vorlagen.</p>
  </section>

  <TemplateFormModal
    v-if="editing" :template="editing === 'new' ? undefined : editing"
    :preset="{ aircraftTypes: scope && scope !== 'alle' ? [scope] : [] }" @close="editing = null"
  />
</template>

<style scoped>
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 14px 16px; border-bottom: 1px solid var(--border); }
.title { flex: 1 1 320px; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.section-title { display: flex; align-items: center; gap: 8px; }
.section-title .count { background: var(--gray-soft); }
.small { font-size: 12.5px; line-height: 1.4; }
.actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tall { height: 40px; }
.grid {
  list-style: none; margin: 0; padding: 16px; display: grid; gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); background: var(--column); border-radius: 0 0 14px 14px;
}
.grid li { display: flex; min-width: 0; }
.task {
  width: 100%; text-align: left; background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
  padding: 14px; display: flex; flex-direction: column; gap: 8px; min-height: 104px;
}
.task:hover { border-color: var(--border-strong); }
.task-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.task-tag { flex-shrink: 0; }
/* Long German compounds (Seitenrudersteuerseile …) are hyphenated instead of running under the badge; short words stay whole. */
.task-title { font-size: 14.5px; font-weight: 600; line-height: 1.35; min-width: 0; hyphens: auto; hyphenate-limit-chars: 12 5 5; overflow-wrap: anywhere; }
.task-desc {
  font-size: 12.5px; line-height: 1.4; color: var(--text-2);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.task-meta { margin-top: auto; display: flex; flex-wrap: wrap; gap: 12px; font-size: 12.5px; color: var(--muted); }
.task-meta > span { display: inline-flex; align-items: center; gap: 5px; }
.applies { font-size: 12.5px; color: var(--muted); padding-top: 8px; border-top: 1px solid var(--border); }
.only { font-weight: 600; color: var(--accent-ink); }
.empty { padding: 16px; font-size: 14px; }
</style>
