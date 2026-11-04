<script setup lang="ts">
import { ref } from 'vue'
import { LEVEL_KEYS } from '../utils/levels'
import AppIcon from '../components/AppIcon.vue'
import LevelBadge from '../components/LevelBadge.vue'
import PersonAvatar from '../components/PersonAvatar.vue'
import { can, leaders, state } from '../store'
import type { FaqEntry } from '../types'
import FaqFormModal from './FaqFormModal.vue'

/** Questions come from `state.faq`; admins edit them here (pencil per entry, "Frage anlegen" at the end). */
const editing = ref<FaqEntry | 'new' | null>(null)

const LEVEL_TEXT = {
  ein: 'Ohne Vorkenntnisse machbar, z. B. reinigen und polieren.',
  erf: 'Für alle, die schon ein paar Winter dabei sind.',
  wl: 'Nur Werkstattleiter oder Prüfer.',
}
</script>

<template>
  <div class="page">
    <header>
      <h1 class="page-title">Häufige Fragen</h1>
      <p class="page-sub">Alles Wichtige zur Winterwartung, besonders für Neue und Flugschüler.</p>
    </header>
    <div class="layout">
      <section class="faq" aria-label="Fragen und Antworten">
        <details v-for="(f, i) in state.faq" :key="f.id" class="card item" :open="i === 0">
          <summary>
            <span class="q">{{ f.q }}</span>
            <button v-if="can('admin')" type="button" class="icon-btn edit" aria-label="Frage bearbeiten" title="Bearbeiten" @click.prevent="editing = f">
              <AppIcon name="pen" :size="16" />
            </button>
            <span class="chev" aria-hidden="true" />
          </summary>
          <p>{{ f.a }}</p>
        </details>
        <p v-if="!state.faq.length" class="muted empty">Noch keine Fragen.</p>
        <button v-if="can('admin')" type="button" class="btn add" @click="editing = 'new'">
          <AppIcon name="plus" :size="16" :stroke="2.2" />Frage anlegen
        </button>
      </section>
      <aside class="side">
        <section class="card box" aria-labelledby="levels-h">
          <h2 id="levels-h" class="box-title">Wer darf was?</h2>
          <div v-for="k in LEVEL_KEYS" :key="k" class="level">
            <LevelBadge :level="k" />
            <span>{{ LEVEL_TEXT[k] }}</span>
          </div>
        </section>
        <section class="card box note" aria-labelledby="vf-h">
          <h2 id="vf-h" class="box-title"><AppIcon name="alert" :size="18" />Vereinsflieger</h2>
          <p class="note-text">Die Anbindung an Vereinsflieger ist noch nicht fertig. Mängel und Fristen aus Vereinsflieger kommen später automatisch in die App. Bis dahin bitte weiter wie gewohnt in Vereinsflieger eintragen.</p>
        </section>
        <section class="card box" aria-labelledby="contact-h">
          <h2 id="contact-h" class="box-title">Werkstattleitung</h2>
          <div v-for="u in leaders()" :key="u.id" class="person">
            <PersonAvatar :person="u.id" :size="36" />
            <div><strong>{{ u.name }}</strong><span class="muted">Werkstattleiter</span></div>
          </div>
        </section>
      </aside>
    </div>
    <FaqFormModal v-if="editing" :entry="editing === 'new' ? undefined : editing" @close="editing = null" />
  </div>
</template>

<style scoped>
.layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 20px; align-items: start; }
.faq { display: flex; flex-direction: column; gap: 10px; }
.item summary {
  list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  min-height: 56px; padding: 14px 18px; font-size: 15px; font-weight: 600; cursor: pointer;
}
.item summary::-webkit-details-marker { display: none; }
.chev { width: 9px; height: 9px; border-right: 2px solid var(--muted); border-bottom: 2px solid var(--muted); transform: rotate(45deg); flex-shrink: 0; transition: transform 0.15s; }
.item[open] .chev { transform: rotate(-135deg); }
.item p { padding: 0 18px 16px; font-size: 14px; line-height: 1.55; color: var(--text-2); white-space: pre-line; }
.item .q { flex: 1; }
.item .edit { flex-shrink: 0; margin: -8px -4px; color: var(--muted); }
.item .edit:hover { color: var(--text); }
.add { align-self: flex-start; }
.empty { padding: 4px 0; }
.side { display: flex; flex-direction: column; gap: 16px; }
.box { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.box-title { font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.note { background: var(--warn-soft); border-color: var(--warn-soft); color: var(--orange-ink); gap: 8px; }
.note-text { font-size: 13px; line-height: 1.5; }
.level { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; font-size: 13px; color: var(--text-2); line-height: 1.45; }
.person { display: flex; align-items: center; gap: 12px; }
.person div { display: flex; flex-direction: column; gap: 1px; font-size: 14px; }
.person .muted { font-size: 12px; }
@media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
</style>
