<script setup lang="ts">
import { LEVEL_KEYS } from '../utils/levels'
import LevelBadge from '../components/LevelBadge.vue'
import PersonAvatar from '../components/PersonAvatar.vue'
import { LEADERS, PEOPLE } from '../mock/people'

const FAQ = [
  { q: 'Wann ist Werkstatt und wie mache ich mit?', a: 'Gearbeitet wird samstags von 9 bis 17 Uhr. Im Zeitplan siehst du, welches Flugzeug gerade dran ist und wer an dem Tag die Werkstattleitung hat. Komm einfach vorbei. Die Werkstattleitung teilt dich vor Ort einer Aufgabe zu.' },
  { q: 'Welche Aufgaben kann ich als Neuling oder Flugschüler übernehmen?', a: 'Alle Arbeitspakete mit dem grünen Badge „Einsteiger“. Auf dem Board eines Flugzeugs kannst du danach filtern.' },
  { q: 'Wer zeichnet meine Arbeit ab?', a: 'Die Werkstattleitung des Tages. Sie prüft die Arbeit und zeichnet sie am Tablet ab.' },
  { q: 'Wo finde ich Waschbenzin, Fett, Pinsel und Co.?', a: 'In der „Inventur“ einfach suchen – dort steht, in welchem Schrank oder Regal es liegt. Das gilt auch für Ersatzteile der Flugzeuge.' },
  { q: 'Etwas ist leer – was mache ich?', a: 'In der „Inventur“ direkt in der Liste den Bestand auf 0 bzw. „Leer“ oder „Fast leer“ setzen und auf „Auf Bestellliste“ tippen. Dann wird es nachbestellt.' },
  { q: 'Ich habe einen Schaden entdeckt – was nun?', a: 'Sag der Werkstattleitung Bescheid. Sie erfasst den Befund mit Foto im Reiter „Mängel/Befunde“ des Flugzeugs.' },
  { q: 'Wo finde ich Wartungshandbücher und Wägeberichte?', a: 'Beim jeweiligen Flugzeug im Reiter „Dokumente“.' },
  { q: 'Warum kann ich zu Hause nichts bearbeiten?', a: 'Ohne Login kannst du alles ansehen, aber nichts ändern. Bearbeiten geht am Werkstatt-Tablet oder mit einem Werkstattleiter-Zugang.' },
]
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
      <p class="page-sub">Alles Wichtige zur Winterwartung – besonders für Neue und Flugschüler.</p>
    </header>
    <div class="layout">
      <section class="faq" aria-label="Fragen und Antworten">
        <details v-for="(f, i) in FAQ" :key="f.q" class="card item" :open="i === 0">
          <summary>{{ f.q }}<span class="chev" aria-hidden="true" /></summary>
          <p>{{ f.a }}</p>
        </details>
      </section>
      <aside class="side">
        <section class="card box" aria-labelledby="levels-h">
          <h2 id="levels-h" class="box-title">Wer darf was?</h2>
          <div v-for="k in LEVEL_KEYS" :key="k" class="level">
            <LevelBadge :level="k" />
            <span>{{ LEVEL_TEXT[k] }}</span>
          </div>
        </section>
        <section class="card box" aria-labelledby="contact-h">
          <h2 id="contact-h" class="box-title">Werkstattleitung</h2>
          <div v-for="k in LEADERS" :key="k" class="person">
            <PersonAvatar :person="k" :size="36" />
            <div><strong>{{ PEOPLE[k].name }}</strong><span class="muted">Werkstattleiter</span></div>
          </div>
        </section>
      </aside>
    </div>
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
.item p { padding: 0 18px 16px; font-size: 14px; line-height: 1.55; color: var(--text-2); }
.side { display: flex; flex-direction: column; gap: 16px; }
.box { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.box-title { font-size: 16px; font-weight: 700; }
.level { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; font-size: 13px; color: var(--text-2); line-height: 1.45; }
.person { display: flex; align-items: center; gap: 12px; }
.person div { display: flex; flex-direction: column; gap: 1px; font-size: 14px; }
.person .muted { font-size: 12px; }
@media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
</style>
