// Analyses for the non-typing exercises.

import type { TraceData } from '../lib/recorder'
import type { ExerciseRecord } from '../lib/types'
import {
  excursions,
  indexAt,
  mean,
  median,
  pressedIntervals,
  quantile,
  simulate,
  timeToDepth,
  valueAt,
  type ActSettings,
  type Excursion,
} from './core'

// ---------- Rest ----------

export interface RestKeyStat {
  p99: number
  max: number
  mean: number
  pressed: boolean
}

export interface RestAnalysis {
  phases: Array<{ name: 'typing' | 'gaming'; keys: Record<string, RestKeyStat> }>
}

function sampleWindow(tr: TraceData, t0: number, t1: number, step = 5): number[] {
  const out: number[] = []
  for (let t = t0; t <= t1; t += step) out.push(valueAt(tr, t))
  return out
}

export function analyzeRest(rec: ExerciseRecord<'rest'>): RestAnalysis {
  return {
    phases: rec.meta.phases.map((p) => {
      const keys: Record<string, RestKeyStat> = {}
      // Skip the first second: fingers are still settling
      const t0 = p.t0 + 1000
      for (const [code, tr] of Object.entries(rec.traces)) {
        const xs = sampleWindow(tr, t0, p.t1)
        const max = Math.max(...xs)
        if (max <= 0.02) continue
        keys[code] = { p99: quantile(xs, 0.99), max, mean: mean(xs), pressed: max > rec.travel * 0.6 }
      }
      return { name: p.name, keys }
    }),
  }
}

// ---------- Hold / plateau stability ----------

export interface PlateauStat {
  code: string
  duration: number
  level: number
  drawdown: number // deepest dip below the running max — a RT release below this is spurious
  wobble: number
}

export function plateauStats(code: string, tr: TraceData, minDuration: number, t0 = -Infinity, t1 = Infinity): PlateauStat[] {
  const out: PlateauStat[] = []
  for (const ex of excursions(code, tr)) {
    if (ex.tStart < t0 || ex.tEnd > t1) continue
    if (ex.tEnd - ex.tStart < minDuration) continue
    const hi = ex.peak * 0.9
    let tA: number | null = null
    let tB: number | null = null
    for (let i = ex.i0; i <= ex.iEnd; i++) {
      if (tr.d[i] >= hi) {
        if (tA === null) tA = tr.t[i]
        tB = tr.t[i]
      }
    }
    if (tA === null || tB === null) continue
    const a = tA + 120
    const b = tB - 120
    if (b - a < 200) continue
    let runMax = valueAt(tr, a)
    let dd = 0
    const vals: number[] = [runMax]
    for (let i = Math.max(0, indexAt(tr, a)); i < tr.t.length && tr.t[i] <= b; i++) {
      const d = tr.d[i]
      vals.push(d)
      if (d > runMax) runMax = d
      if (runMax - d > dd) dd = runMax - d
    }
    const m = median(vals)
    out.push({ code, duration: b - a, level: m, drawdown: dd, wobble: quantile(vals.map((v) => Math.abs(v - m)), 0.95) })
  }
  return out
}

export function analyzeHold(rec: ExerciseRecord<'hold'>): PlateauStat[] {
  const tr = rec.traces[rec.meta.code]
  return tr ? plateauStats(rec.meta.code, tr, 600, rec.t0, rec.t1) : []
}

// ---------- Fast repeat ----------

export interface Tap {
  tPeak: number
  peak: number
  tTroughBefore: number
  troughBefore: number
}

export interface RepeatScenarioResult {
  name: string
  registered: number
  extra: number
  latency: number
}

export interface RepeatAnalysis {
  code: string
  taps: Tap[]
  freq: number
  minima: number[]
  lifts: number[]
  observedDowns: number
  results: RepeatScenarioResult[]
}

/** Zig-zag turning points: a tap is any rise of at least `r` mm followed by a fall of `r`. */
export function detectTaps(tr: TraceData, t0: number, t1: number, r = 0.2, minPeak = 0.5): Tap[] {
  const i0 = Math.max(0, indexAt(tr, t0))
  let up = true
  let ext = tr.d[i0] ?? 0
  let tExt = tr.t[i0] ?? t0
  let lastTrough = { t: tExt, d: ext }
  const taps: Tap[] = []
  for (let i = i0; i < tr.t.length && tr.t[i] <= t1; i++) {
    const d = tr.d[i]
    const t = tr.t[i]
    if (up) {
      if (d > ext) {
        ext = d
        tExt = t
      } else if (ext - d >= r) {
        if (ext >= minPeak) taps.push({ tPeak: tExt, peak: ext, tTroughBefore: lastTrough.t, troughBefore: lastTrough.d })
        up = false
        ext = d
        tExt = t
      }
    } else {
      if (d < ext) {
        ext = d
        tExt = t
      } else if (d - ext >= r) {
        lastTrough = { t: tExt, d: ext }
        up = true
        ext = d
        tExt = t
      }
    }
  }
  if (up && ext >= minPeak) taps.push({ tPeak: tExt, peak: ext, tTroughBefore: lastTrough.t, troughBefore: lastTrough.d })
  return taps
}

export function analyzeRepeat(rec: ExerciseRecord<'repeat'>, scenarios: Array<{ name: string; s: ActSettings }>): RepeatAnalysis | null {
  const { code, t0, t1 } = rec.meta
  const tr = rec.traces[code]
  if (!tr) return null
  const taps = detectTaps(tr, t0, t1)
  if (taps.length < 3) return null
  const minima = taps.slice(1).map((tp) => tp.troughBefore)
  const lifts = taps.slice(0, -1).map((tp, i) => tp.peak - taps[i + 1].troughBefore)
  const span = taps[taps.length - 1].tPeak - taps[0].tPeak
  const observedDowns = rec.keys.filter((k) => k.type === 'down' && !k.repeat && k.code === code && k.t >= t0 && k.t <= t1).length

  const i0 = Math.max(0, indexAt(tr, t0 - 200))
  const i1 = tr.t.length - 1
  const results = scenarios.map(({ name, s }) => {
    const downs = simulate(tr, i0, i1, s).filter((e) => e.down && e.t <= t1 + 200)
    let registered = 0
    const lat: number[] = []
    let used = 0
    for (let k = 0; k < taps.length; k++) {
      const from = taps[k].tTroughBefore
      const to = k + 1 < taps.length ? taps[k + 1].tTroughBefore : Infinity
      const hit = downs.find((e) => e.t >= from && e.t < to)
      const n = downs.filter((e) => e.t >= from && e.t < to).length
      used += n
      if (hit) {
        registered++
        lat.push(hit.t - from)
      }
    }
    return { name, registered, extra: Math.max(0, used - registered), latency: median(lat) }
  })

  return { code, taps, freq: span > 0 ? ((taps.length - 1) / span) * 1000 : 0, minima, lifts, observedDowns, results }
}

// ---------- Counter-strafe ----------

export type SocdMode = 'none' | 'last' | 'deeper'

export interface StrafeScenario {
  name: string
  s: ActSettings
  socd: SocdMode
}

export interface StrafeScenarioResult {
  name: string
  socd: SocdMode
  switchDelay: number
  stopDelay: number
  neutral: number
}

export interface StrafeAnalysis {
  transitions: number
  stops: number
  overlapRate: number
  overlapMedian: number
  results: StrafeScenarioResult[]
  plateaus: PlateauStat[]
}

function inIntervals(iv: Array<[number, number]>, t: number): [number, number] | null {
  for (const x of iv) if (t >= x[0] && t < x[1]) return x
  return null
}

function releaseStart(tr: TraceData, ex: Excursion): number {
  for (let i = ex.iEnd; i >= ex.i0; i--) if (tr.d[i] >= ex.peak - 0.15) return tr.t[i]
  return ex.tPeak
}

export function analyzeStrafe(rec: ExerciseRecord<'strafe'>, scenarios: StrafeScenario[]): StrafeAnalysis | null {
  const { left, right } = rec.meta
  const L = rec.traces[left]
  const R = rec.traces[right]
  if (!L || !R) return null
  const presses = [
    ...excursions(left, L).map((e) => ({ e, tr: L, dir: -1 as const })),
    ...excursions(right, R).map((e) => ({ e, tr: R, dir: 1 as const })),
  ]
    .filter((p) => p.e.peak >= 1.0 && p.e.tStart >= rec.t0 && p.e.tStart <= rec.t1)
    .sort((a, b) => a.e.tStart - b.e.tStart)

  interface Tr {
    x: (typeof presses)[number]
    y: (typeof presses)[number]
    tIntent: number
    tRel: number
  }
  const trans: Tr[] = []
  const stops: Array<{ x: (typeof presses)[number]; tRel: number }> = []
  for (let i = 0; i < presses.length; i++) {
    const x = presses[i]
    const y = presses[i + 1]
    const tRel = releaseStart(x.tr, x.e)
    if (y && y.dir !== x.dir && y.e.tStart < x.e.tEnd + 250) {
      const tIntent = timeToDepth(y.tr, y.e, 0.3) ?? y.e.tStart
      trans.push({ x, y, tIntent, tRel })
    } else if (!y || y.e.tStart > x.e.tEnd + 250) {
      stops.push({ x, tRel })
    }
  }

  const overlaps = trans.map((t) => t.tRel - t.tIntent)

  const results = scenarios.map(({ name, s, socd }) => {
    const ivL = pressedIntervals(L, s)
    const ivR = pressedIntervals(R, s)
    const dirAt = (t: number): number => {
      const l = inIntervals(ivL, t)
      const r = inIntervals(ivR, t)
      if (l && r) {
        if (socd === 'none') return 0
        if (socd === 'last') return l[0] > r[0] ? -1 : 1
        return valueAt(L, t) >= valueAt(R, t) ? -1 : 1
      }
      return l ? -1 : r ? 1 : 0
    }
    const bounds = [...ivL.flat(), ...ivR.flat()].filter(Number.isFinite).sort((a, b) => a - b)
    const switchDelays: number[] = []
    const neutrals: number[] = []
    for (const tr of trans) {
      const from = tr.tIntent - 100
      const times = [tr.tIntent, ...bounds.filter((b) => b >= from && b <= tr.tIntent + 600)].sort((a, b) => a - b)
      let eff: number | null = null
      for (const t of times) {
        if (t >= from && dirAt(t + 0.01) === tr.y.dir) {
          eff = Math.max(t, from)
          break
        }
      }
      if (eff === null) continue
      switchDelays.push(eff - tr.tIntent)
      // time spent neutral while switching
      let neutral = 0
      const pts = [from, ...times.filter((t) => t > from && t < eff!), eff]
      for (let k = 0; k + 1 < pts.length; k++) if (dirAt(pts[k] + 0.01) === 0) neutral += pts[k + 1] - pts[k]
      neutrals.push(neutral)
    }
    const stopDelays: number[] = []
    for (const st of stops) {
      const iv = (st.x.dir < 0 ? ivL : ivR).find((x) => x[0] <= st.x.e.tPeak + 1 && x[1] >= st.x.e.tPeak - 1)
      if (iv && Number.isFinite(iv[1])) stopDelays.push(iv[1] - st.tRel)
    }
    return { name, socd, switchDelay: median(switchDelays), stopDelay: median(stopDelays), neutral: median(neutrals) }
  })

  const plateaus = [...plateauStats(left, L, 300, rec.t0, rec.t1), ...plateauStats(right, R, 300, rec.t0, rec.t1)]

  return {
    transitions: trans.length,
    stops: stops.length,
    overlapRate: overlaps.length ? overlaps.filter((o) => o > 10).length / overlaps.length : 0,
    overlapMedian: median(overlaps.filter((o) => o > 0)),
    results,
    plateaus,
  }
}

// ---------- Analog control ----------

export interface AnalogAnalysis {
  lag: number
  rms: number
  inBand: number
  bands: Array<{ from: number; to: number; rms: number; bias: number; n: number }>
}

export function analyzeAnalog(rec: ExerciseRecord<'analog'>): AnalogAnalysis | null {
  const tr = rec.traces[rec.meta.code]
  const path = rec.meta.path.filter((p) => p.t > rec.meta.t0 + 1500)
  if (!tr || path.length < 50) return null
  let bestLag = 0
  let best = Infinity
  for (let lag = 0; lag <= 450; lag += 10) {
    let s = 0
    for (const p of path) {
      const e = valueAt(tr, p.t + lag) - p.target
      s += e * e
    }
    if (s < best) {
      best = s
      bestLag = lag
    }
  }
  const errs = path.map((p) => ({ target: p.target, e: valueAt(tr, p.t + bestLag) - p.target }))
  const travel = rec.travel
  const step = travel / 4
  const bands = [0, 1, 2, 3].map((k) => {
    const from = k * step
    const to = (k + 1) * step
    const xs = errs.filter((x) => x.target >= from && x.target < to + (k === 3 ? 1 : 0))
    return {
      from,
      to,
      n: xs.length,
      rms: Math.sqrt(mean(xs.map((x) => x.e * x.e))),
      bias: mean(xs.map((x) => x.e)),
    }
  })
  return {
    lag: bestLag,
    rms: Math.sqrt(mean(errs.map((x) => x.e * x.e))),
    inBand: errs.filter((x) => Math.abs(x.e) <= 0.3).length / errs.length,
    bands,
  }
}
