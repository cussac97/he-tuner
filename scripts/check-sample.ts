import { generateSampleSession } from '../src/lib/sample'
import { buildProfile } from '../src/analysis/recommend'
import { analyzeTyping } from '../src/analysis/typing'
import { quantile } from '../src/analysis/core'

const ex = generateSampleSession('iso', 'en', Number((globalThis as any).process.argv[2] ?? 42))
const typ = ex[0] as any
const cls: Record<string, number> = {}
for (const k of typ.meta.keys) cls[k.cls] = (cls[k.cls] ?? 0) + 1
console.log('wpm', typ.meta.wpm.toFixed(1), 'acc', typ.meta.accuracy.toFixed(3), 'classes', JSON.stringify(cls))
const ta = analyzeTyping(typ, 'iso')
console.log('lag', ta.lag, 'counts', JSON.stringify(ta.counts))
const byF: Record<string, { I: number[]; U: number[] }> = {}
for (const e of ta.excursions) {
  const g = (byF[e.finger] ??= { I: [], U: [] })
  if (e.expected > 0) g.I.push(...e.peaks); else g.U.push(e.peak)
}
for (const [f, g] of Object.entries(byF)) console.log(f, 'I', g.I.length, 'minI', Math.min(...g.I).toFixed(2), 'U', g.U.length, 'U max', g.U.length ? Math.max(...g.U).toFixed(2) : '-', 'U p90', g.U.length ? quantile(g.U, 0.9).toFixed(2) : '-')
const p = buildProfile(ex, { travel: 4, layout: 'iso', duration: 60, safety: 0.5, refActuation: 1.5 })
console.log('current', p.current.actuation, JSON.stringify(p.current.rt))
console.log('typing A', p.typing?.actuation, 'cur', JSON.stringify(p.typing?.current), 'rec', JSON.stringify(p.typing?.recommended))
for (const o of p.typing?.overrides ?? []) console.log('  override', o.label, o.value, o.reason)
console.log('rt', p.typing?.rt.reason)
console.log('gaming', JSON.stringify({ a: p.gaming?.actuation, p: p.gaming?.rtPress, r: p.gaming?.rtRelease, c: p.gaming?.continuous, socd: p.gaming?.socd }))
for (const r of p.gaming?.reasons ?? []) console.log('  -', r)
console.log('analog', p.analog?.curve, p.analog?.innerDeadzone, p.analog?.outerDeadzone, p.analog?.reasons)

// --- protocol V2 decoding (layout from wooting-analog-sdk device.rs) ---
import { decodeV2 } from '../src/lib/hid'
const buf = new Uint8Array(64)
buf.set([(2 << 5) | 1, 0x04, (3 << 6) | (0 << 2) | 1, 0xff], 0) // KeyA, row 2 col 1, actuated, 1023
buf.set([(4 << 5) | 12, 0x01, (0 << 6) | (4 << 2) | 0, 0x80], 4) // custom function (Fn), 512
buf.set([0x22, 0x2c, (1 << 6) | 0, 0x19], 12) // Space after an empty slot, (0x19<<2|1)=101
const dec = decodeV2(buf)
console.log('decodeV2', JSON.stringify(dec.map((k) => ({ code: k.code, v: +k.value.toFixed(3), act: k.actuated, row: k.row, col: k.col }))))
const ok =
  dec.length === 3 &&
  dec[0].code === 'KeyA' && dec[0].value === 1 && dec[0].actuated && dec[0].row === 2 && dec[0].col === 1 &&
  dec[1].code === 'Fn' && Math.abs(dec[1].value - 512 / 1023) < 1e-9 && !dec[1].actuated &&
  dec[2].code === 'Space' && Math.abs(dec[2].value - 101 / 1023) < 1e-9
console.log(ok ? 'decodeV2 OK' : 'decodeV2 FAILED')
if (!ok) (globalThis as any).process.exitCode = 1
console.log('current measured by hardware:', p.current.measured, 'actuation', p.current.actuation)

// --- dead keys: "même" typed as m, ^ (Dead), e, m, e must be all correct ---
import { composeDead, TypingEngine } from '../src/lib/typing'
{
  const eng = new TypingEngine(['même', 'fête', 'été'], () => null, 0)
  let dead = false
  let t = 1
  const type = (seq: Array<[string, string]>) => {
    for (const [code, key] of seq) {
      if (key === 'Dead') {
        dead = true
        eng.press(t++, code, key)
        continue
      }
      const k = dead && key.length === 1 ? composeDead(key, eng.expectedChar()) : key
      dead = false
      eng.press(t++, code, k)
    }
  }
  // Chrome without a focused text field: dead key, then the plain letter
  type([['KeyM', 'm'], ['BracketLeft', 'Dead'], ['KeyE', 'e'], ['KeyM', 'm'], ['KeyE', 'e'], ['Space', ' ']])
  // a browser that composes itself: dead key, then 'ê'
  type([['KeyF', 'f'], ['BracketLeft', 'Dead'], ['KeyE', 'ê'], ['KeyT', 't'], ['KeyE', 'e'], ['Space', ' ']])
  // a mistake must stay a mistake: plain 'e' where 'é' is expected (é is its own key on AZERTY)
  type([['KeyE', 'e']])
  const cls = eng.keys.map((k) => k.cls)
  const ok = eng.results.every((r) => r.typed === r.word) && cls.filter((c) => c === 'wrong').length === 1 && cls[cls.length - 1] === 'wrong'
  console.log('dead keys', JSON.stringify(eng.results), cls.join(','), ok ? 'OK' : 'FAILED')
  if (!ok) (globalThis as any).process.exitCode = 1
}

// --- German / Spanish: ´ then a → á, ¨ then u → ü, ñ and ä as direct keys; ß folds to ss ---
import { stripAccents, WORDS } from '../src/lib/typing'
{
  const eng = new TypingEngine(['está', 'über', 'año', 'mädchen'], () => null, 0)
  let t = 1
  const type = (word: string, deadBefore = new Set<number>()) => {
    ;[...word].forEach((ch, i) => {
      const plain = ch.normalize('NFD')[0]
      if (deadBefore.has(i)) {
        eng.press(t++, 'Quote', 'Dead')
        eng.press(t++, 'KeyX', composeDead(plain, eng.expectedChar()))
      } else eng.press(t++, 'KeyX', ch)
    })
    eng.press(t++, 'Space', ' ')
  }
  type('está', new Set([3]))
  type('über', new Set([0]))
  type('año') // ñ is its own key on a Spanish layout
  type('mädchen') // ä is its own key on a German layout
  const folded = stripAccents('straße') === 'strasse' && stripAccents('mañana') === 'manana'
  const lists = (['en', 'fr', 'de', 'es'] as const).every((l) => WORDS[l].length > 150 && WORDS[l].every((w) => /^[a-z]+$/.test(stripAccents(w))))
  const ok = eng.results.every((r) => r.typed === r.word) && eng.wrong === 0 && folded && lists
  console.log('de/es accents', JSON.stringify(eng.results), { folded, lists }, ok ? 'OK' : 'FAILED')
  if (!ok) (globalThis as any).process.exitCode = 1
}
