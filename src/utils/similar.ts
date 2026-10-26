/** Kleinschreibung, Umlaute als Grundvokal (Tuch ~ Tücher), nur Buchstaben/Ziffern als Wörter. */
function words(s: string) {
  return s.toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4)
}

const commonPrefix = (a: string, b: string) => {
  let i = 0
  while (i < a.length && a[i] === b[i]) i++
  return i
}

function distance(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = row
  }
  return prev[b.length]
}

/** 0 = Wort enthalten, 1 = gleicher Wortstamm, 1–3 = Tippfehler, Infinity = keine Ähnlichkeit. */
function score(query: string, name: string) {
  let best = Infinity
  for (const q of words(query)) {
    for (const n of words(name)) {
      if (n.includes(q) || q.includes(n)) return 0
      if (commonPrefix(q, n) >= 6) best = Math.min(best, 1)
      const d = distance(q, n)
      if (d <= Math.max(1, Math.floor(q.length / 5))) best = Math.min(best, d)
    }
  }
  return best
}

/** Bis zu `limit` Einträge mit ähnlichem Namen, beste zuerst – für „Meinst du …?“. */
export function similarByName<T extends { name: string }>(query: string, list: T[], limit = 3): T[] {
  return list
    .map((x) => ({ x, s: score(query, x.name) }))
    .filter((r) => r.s < Infinity)
    .sort((a, b) => a.s - b.s)
    .slice(0, limit)
    .map((r) => r.x)
}
