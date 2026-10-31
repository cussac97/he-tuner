// Re-runs the app's analysis on the archived real recordings (./data/exercises),
// run by run, plus cross-checks between runs. Usage: npm run analyze
import fs from 'node:fs'
import path from 'node:path'
import { fixed, mean, median, quantile, simulateExcursion } from '../src/analysis/core'
import { buildProfile } from '../src/analysis/recommend'
import { analyzeTyping, type LabeledEx } from '../src/analysis/typing'
import { FINGER_NAMES } from '../src/lib/layout'
import type { AnyExercise, ExerciseRecord } from '../src/lib/types'

const dir = path.resolve('data/exercises')
const all: AnyExercise[] = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
  .filter((e) => e.source === 'hid')
  .sort((a, b) => a.createdAt - b.createdAt)

// runs = groups separated by more than 5 minutes
const runs: AnyExercise[][] = []
for (const e of all) {
  const last = runs[runs.length - 1]
  if (!last || e.createdAt - last[last.length - 1].createdAt > 5 * 60_000) runs.push([e])
  else last.push(e)
}

const settings = { travel: 4, layout: 'iso' as const, duration: 60, safety: 0.5, refActuation: 1.5 }
const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : '—')
const pct = (x: number) => `${(x * 100).toFixed(1)}%`

function errCounts(exs: LabeledEx[], a: number) {
  let acc = 0, miss = 0, dbl = 0, wanted = 0
  for (const e of exs) {
    const downs = simulateExcursion(e.tr, e, fixed(a)).filter((x) => x.down).length
    if (e.expected === 0) acc += downs > 0 ? 1 : 0
    else {
      wanted += e.expected
      miss += Math.max(0, e.expected - downs)
      dbl += Math.max(0, downs - e.expected)
    }
  }
  return { acc, miss, dbl, wanted }
}

const typingByRun: Array<{ rec: ExerciseRecord<'typing'>; a: ReturnType<typeof analyzeTyping> }> = []

runs.forEach((run, ri) => {
  console.log(`\n================ RUN ${ri + 1} — ${new Date(run[0].createdAt).toLocaleTimeString('fr-FR')} (${run.map((e) => e.kind).join(', ')})`)
  const p = buildProfile(run, settings)
  console.log('current:', JSON.stringify({ measured: p.current.measured, a: p.current.actuation, rt: p.current.rt }))
  const perKey = Object.entries(p.current.perKey).sort((a, b) => a[1] - b[1])
  console.log('  per-key current (min/max):', perKey.slice(0, 4).map(([c, v]) => `${c}=${v}`).join(' '), '…', perKey.slice(-4).map(([c, v]) => `${c}=${v}`).join(' '))
  if (p.typingStats) console.log('typingStats:', JSON.stringify({ ...p.typingStats, wpm: f2(p.typingStats.wpm), accuracy: f2(p.typingStats.accuracy), bottomOut: f2(p.typingStats.bottomOut), pressSpeed: f2(p.typingStats.pressSpeed) }))
  if (p.typing) {
    console.log('TYPING rec A =', p.typing.actuation, 'conf', p.typing.confidence, '| RT', p.typing.rt.enabled)
    for (const o of p.typing.overrides) console.log('   override', o.label, o.value, o.codes.join(','), '—', o.reason)
    console.log('   sim current', JSON.stringify(p.typing.current), '\n   sim recommended', JSON.stringify(p.typing.recommended))
    for (const r of p.typing.reasons) console.log('   •', r)
    console.log('   curve:', p.typing.curve.filter((c) => Math.round(c.a * 10) % 2 === 0).map((c) => `${c.a.toFixed(1)}:${c.errors.toFixed(2)}/${c.latency.toFixed(1)}ms`).join(' '))
  }
  if (p.gaming) {
    const g = p.gaming
    console.log('GAMING', JSON.stringify({ a: g.actuation, press: g.rtPress, release: g.rtRelease, cont: g.continuous, socd: g.socd, socdGain: g.socdGain, dd: g.holdDrawdown, conf: g.confidence }))
    for (const r of g.reasons) console.log('   •', r)
    if (g.repeat) console.log('   repeat', JSON.stringify({ taps: g.repeat.taps.length, freq: f2(g.repeat.freq), observed: g.repeat.observedDowns, minimaMed: f2(median(g.repeat.minima)), liftsP05: f2(quantile(g.repeat.lifts, 0.05)) }), g.repeat.results.map((r) => `${r.name}: ${r.registered}/${g.repeat!.taps.length} ${f2(r.latency)}ms`).join(' | '))
    if (g.strafe) console.log('   strafe', JSON.stringify({ tr: g.strafe.transitions, stops: g.strafe.stops, overlap: f2(g.strafe.overlapRate), ovMed: f2(g.strafe.overlapMedian) }), g.strafe.results.map((r) => `${r.name}: sw ${f2(r.switchDelay)} stop ${f2(r.stopDelay)}`).join(' | '))
  }
  if (p.analog) console.log('ANALOG', p.analog.curve, p.analog.innerDeadzone, p.analog.outerDeadzone, JSON.stringify(p.analog.analysis.bands.map((b) => [b.n, f2(b.rms), f2(b.bias)])), 'lag', p.analog.analysis.lag, 'inBand', f2(p.analog.analysis.inBand))
  if (p.rest) for (const ph of p.rest.phases) console.log('REST', ph.name, Object.entries(ph.keys).map(([c, k]) => `${c}:${f2(k.p99)}${k.pressed ? '(pressed)' : ''}`).join(' '))

  for (const rec of run.filter((e): e is ExerciseRecord<'typing'> => e.kind === 'typing')) {
    const a = analyzeTyping(rec, 'iso')
    typingByRun.push({ rec, a })
    const keys = rec.meta.keys
    const cls: Record<string, number> = {}
    for (const k of keys) cls[k.cls] = (cls[k.cls] ?? 0) + 1
    console.log('\n  typing test', rec.id, JSON.stringify({ wpm: f2(rec.meta.wpm), acc: f2(rec.meta.accuracy), lag: a.lag, measured: a.measured, orphans: `${a.orphanDowns}/${a.totalDowns}`, cls }))
    console.log('  labels', JSON.stringify(a.counts), 'bottomOut', pct(a.bottomOutRate), 'speed', f2(a.pressSpeed))
    const intended = a.excursions.filter((e) => e.expected > 0).flatMap((e) => e.peaks)
    const un = a.excursions.filter((e) => e.expected === 0)
    console.log('  intended peaks p05/p25/p50:', f2(quantile(intended, 0.05)), f2(quantile(intended, 0.25)), f2(median(intended)))
    console.log('  unintended peaks (n=%d) p50/p90/max:', un.length, f2(median(un.map((e) => e.peak))), f2(quantile(un.map((e) => e.peak), 0.9)), f2(Math.max(...un.map((e) => e.peak))))
    console.log('  accidental excursions:', un.filter((e) => e.label === 'accidental').map((e) => `${e.code}@${f2(e.peak)}`).join(' '))
    console.log('  missed:', a.excursions.filter((e) => e.label === 'missed').map((e) => `${e.code}@${f2(e.peak)}`).join(' '))
    const byF: Record<string, number> = {}
    for (const e of un) if (e.label !== 'rest') byF[FINGER_NAMES[e.finger]] = (byF[FINGER_NAMES[e.finger]] ?? 0) + 1
    console.log('  unintended by finger', JSON.stringify(byF))
    const typoKeys = keys.filter((k) => k.cls === 'wrong' || k.cls === 'extra' || k.cls === 'spaceEmpty')
    console.log('  wrong/extra/spaceEmpty keystrokes:', typoKeys.length, 'back:', cls.back ?? 0)
  }
})

// ---- cross-run counterfactuals on the typing tests ----
if (typingByRun.length >= 2) {
  console.log('\n================ CROSS-RUN')
  for (const { rec, a } of typingByRun) {
    const row = [1.4, 1.5, 1.6, 1.8, 2.0, 2.2].map((A) => {
      const c = errCounts(a.excursions, A)
      return `${A}: acc ${c.acc} miss ${c.miss} dbl ${c.dbl} (/${c.wanted})`
    })
    console.log(rec.id, 'measured', f2(median(rec.hw?.filter((e) => e.down).map((e) => e.depth) ?? [])), '\n   ', row.join('\n    '))
  }
  // observed accidental rates with Poisson-ish comparison
  const obs = typingByRun.map(({ a }) => ({ acc: a.counts.accidental, wanted: a.excursions.reduce((s, e) => s + e.expected, 0) }))
  const [o1, o2] = obs
  const r1 = o1.acc / o1.wanted
  const r2 = o2.acc / o2.wanted
  const pooled = (o1.acc + o2.acc) / (o1.wanted + o2.wanted)
  const z = (r1 - r2) / Math.sqrt(pooled * (1 - pooled) * (1 / o1.wanted + 1 / o2.wanted))
  console.log(`observed accidental: run1 ${o1.acc}/${o1.wanted} (${pct(r1)}), run2 ${o2.acc}/${o2.wanted} (${pct(r2)}), z=${z.toFixed(2)}`)
  const brush = typingByRun.map(({ a }) => a.excursions.filter((e) => e.expected === 0 && e.label !== 'rest').map((e) => e.peak))
  console.log('brush peak median run1/run2:', f2(median(brush[0])), f2(median(brush[1])), ' mean', f2(mean(brush[0])), f2(mean(brush[1])), ' count', brush[0].length, brush[1].length)
}
