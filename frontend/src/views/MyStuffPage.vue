<script setup lang="ts">
import { computed } from 'vue'
import { activeAircraft, aircraftLabel, can, currentUser, state, userName } from '../store'
import type { Task } from '../types'
import { fmtDay, fmtWhen } from '../utils/date'
import AppIcon from '../components/AppIcon.vue'
import PriorityBadge from '../components/PriorityBadge.vue'

/** Everything currently assigned to the logged-in person – with links straight into the popups. */
const me = computed(() => currentUser())
const myId = computed(() => me.value?.id)
const active = computed(() => new Set(activeAircraft().map((a) => a.id)))

const startedBy = (t: Task) => t.history.find((h) => h.text === 'Arbeit gestartet')?.who

const myDefects = computed(() => state.defects.filter((d) => d.status === 'open' && d.owner === myId.value && active.value.has(d.aircraftId)))
const myTasks = computed(() => state.tasks.filter((t) => t.status === 'arbeit' && startedBy(t) === myId.value))
const toSign = computed(() => (can('lead') ? state.tasks.filter((t) => t.status === 'erledigt' && !t.signedBy && active.value.has(t.aircraftId)) : []))
const myOrders = computed(() => state.orders.filter((o) => o.state !== 'delivered' && o.reportedBy === myId.value))
const myFindings = computed(() => state.defects.filter((d) => d.status === 'open' && d.source === 'befund' && d.reportedBy === myId.value && d.owner !== myId.value))
const doneCount = computed(() => state.tasks.filter((t) => t.doneBy === myId.value).length)

const checked = (t: Task) => t.checklist.filter((c) => c.done).length
const taskLink = (t: Task) => ({ path: `/flugzeug/${t.aircraftId}/kanban`, query: { paket: t.id } })
const defectLink = (d: { aircraftId: string; id: string }) => ({ path: `/flugzeug/${d.aircraftId}/maengel`, query: { befund: d.id } })
const orderLink = (o: { id: string; itemId?: string }) => ({ path: '/inventur', query: o.itemId ? { artikel: o.itemId } : { bestellung: o.id } })
</script>

<template>
  <div class="page">
    <header>
      <h1 class="page-title">Meine Sachen</h1>
      <p v-if="me && !me.device" class="page-sub">
        Was gerade an dir hängt, {{ me.name.split(' ')[0] }}.
        <template v-if="doneCount"> In dieser Saison hast du {{ doneCount }} {{ doneCount === 1 ? 'Kanban-Karte' : 'Kanban-Karten' }} erledigt.</template>
      </p>
    </header>

    <p v-if="!me || me.device" class="card note">
      {{ me ? 'Am Werkstatt-Tablet gibt es keine eigenen Sachen.' : 'Gib zuerst deinen Namen ein, dann siehst du hier, was an dir hängt.' }}
    </p>

    <template v-else>
      <section v-if="can('lead')" class="card list" aria-labelledby="sign-h">
        <h2 id="sign-h" class="list-head"><AppIcon name="shield" :size="17" />Wartet auf Abzeichnung<span class="count">{{ toSign.length }}</span></h2>
        <RouterLink v-for="t in toSign" :key="t.id" :to="taskLink(t)" class="row">
          <span class="what"><strong>{{ t.title }}</strong><span class="muted">{{ aircraftLabel(t.aircraftId) }} · erledigt von {{ userName(t.doneBy) }}, {{ fmtWhen(t.doneAt!) }}</span></span>
          <AppIcon name="chevronRight" :size="16" class="muted" />
        </RouterLink>
        <p v-if="!toSign.length" class="muted empty">Alles abgezeichnet.</p>
      </section>

      <section class="card list" aria-labelledby="tasks-h">
        <h2 id="tasks-h" class="list-head"><AppIcon name="wrench" :size="17" />Meine Kanban-Karten in Arbeit<span class="count">{{ myTasks.length }}</span></h2>
        <RouterLink v-for="t in myTasks" :key="t.id" :to="taskLink(t)" class="row">
          <span class="what">
            <strong>{{ t.title }}</strong>
            <span class="muted">{{ aircraftLabel(t.aircraftId) }}<template v-if="t.checklist.length"> · {{ checked(t) }}/{{ t.checklist.length }} Schritte</template><template v-if="t.deadline"> · Frist {{ fmtDay(t.deadline) }}</template></span>
          </span>
          <AppIcon name="chevronRight" :size="16" class="muted" />
        </RouterLink>
        <p v-if="!myTasks.length" class="muted empty">Du hast gerade keine Karte in Arbeit.</p>
      </section>

      <section class="card list" aria-labelledby="defects-h">
        <h2 id="defects-h" class="list-head"><AppIcon name="alert" :size="17" />Mir zugewiesene Mängel/Befunde<span class="count">{{ myDefects.length }}</span></h2>
        <RouterLink v-for="d in myDefects" :key="d.id" :to="defectLink(d)" class="row">
          <span class="what"><strong>{{ d.title }}</strong><span class="muted">{{ aircraftLabel(d.aircraftId) }} · {{ d.source === 'vf' ? 'Mangel aus Vereinsflieger' : 'Befund' }}</span></span>
          <PriorityBadge :priority="d.priority" />
          <AppIcon name="chevronRight" :size="16" class="muted" />
        </RouterLink>
        <p v-if="!myDefects.length" class="muted empty">Dir ist nichts zugewiesen.</p>
      </section>

      <section class="card list" aria-labelledby="reported-h">
        <h2 id="reported-h" class="list-head"><AppIcon name="box" :size="17" />Von mir gemeldet<span class="count">{{ myOrders.length + myFindings.length }}</span></h2>
        <RouterLink v-for="o in myOrders" :key="o.id" :to="orderLink(o)" class="row">
          <span class="what"><strong>{{ o.name }}</strong><span class="muted">Bestellung · {{ o.state === 'list' ? 'muss bestellt werden' : `bestellt, Lieferung ca. ${fmtDay(o.delivery!)}` }}</span></span>
          <span class="pill" :class="o.state === 'list' ? 'pill-orange' : 'pill-green'">{{ o.state === 'list' ? 'Auf Bestellliste' : 'Bestellt' }}</span>
          <AppIcon name="chevronRight" :size="16" class="muted" />
        </RouterLink>
        <RouterLink v-for="d in myFindings" :key="d.id" :to="defectLink(d)" class="row">
          <span class="what"><strong>{{ d.title }}</strong><span class="muted">Befund · {{ aircraftLabel(d.aircraftId) }} · zuständig: {{ d.owner ? userName(d.owner) : 'noch niemand' }}</span></span>
          <PriorityBadge :priority="d.priority" />
          <AppIcon name="chevronRight" :size="16" class="muted" />
        </RouterLink>
        <p v-if="!myOrders.length && !myFindings.length" class="muted empty">Keine offenen Bestellungen oder Befunde von dir.</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.note { padding: 24px; font-size: 14px; color: var(--text-2); }
.list { overflow: hidden; }
.list-head { display: flex; align-items: center; gap: 8px; padding: 14px 16px; border-bottom: 1px solid var(--border); font-size: 15px; font-weight: 700; }
.list-head .count { background: var(--gray-soft); }
.row {
  display: flex; align-items: center; gap: 12px; min-height: 58px; padding: 10px 16px;
  border-bottom: 1px solid var(--border-soft); color: var(--text); text-decoration: none;
}
.row:last-of-type { border-bottom: 0; }
.row:hover { background: var(--subtle); }
.what { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.what strong { font-size: 14.5px; }
.what .muted { font-size: 12.5px; }
.empty { padding: 14px 16px; font-size: 13.5px; }
@media (max-width: 640px) {
  .row .pill { display: none; }
}
</style>
