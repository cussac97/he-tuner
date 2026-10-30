// Shared primitives: trace helpers, excursion segmentation and a model of the
// on-board actuation logic (fixed actuation, Rapid Trigger, continuous RT).

import type { TraceData } from '../lib/recorder'

export const ON_THRESHOLD = 0.1 // mm — below this a key is considered untouched

export interface Excursion {
  code: string
  i0: number // first sample above threshold
  iEnd: number // closing sample (<= threshold), or last sample if still open
  tStart: number
  tEnd: number
  peak: number
  tPeak: number
}

export function indexAt(tr: TraceData, t: number): number {
  let lo = 0
  let hi = tr.t.length - 1
  if (hi < 0 || tr.t[0] > t) return -1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (tr.t[mid] <= t) lo = mid
    else hi = mid - 1
  }
  return lo
}

export function valueAt(tr: TraceData | undefined, t: number): number {
  if (!tr) return 0
  const i = indexAt(tr, t)
  return i < 0 ? 0 : tr.d[i]
}

export function maxBetween(tr: TraceData, t0: number, t1: number): number {
  let i = Math.max(0, indexAt(tr, t0))
  let m = valueAt(tr, t0)
  for (; i < tr.t.length && tr.t[i] <= t1; i++) if (tr.d[i] > m) m = tr.d[i]
  return m
}

export function minBetween(tr: TraceData, t0: number, t1: number): number {
  let i = Math.max(0, indexAt(tr, t0))
  let m = valueAt(tr, t0)
  for (; i < tr.t.length && tr.t[i] <= t1; i++) if (tr.d[i] < m) m = tr.d[i]
  return m
}

export function excursions(code: string, tr: TraceData, on = ON_THRESHOLD): Excursion[] {
  const out: Excursion[] = []
  let cur: Excursion | null = null
  for (let i = 0; i < tr.t.length; i++) {
    const d = tr.d[i]
    if (!cur) {
      if (d > on) cur = { code, i0: i, iEnd: i, tStart: tr.t[i], tEnd: tr.t[i], peak: d, tPeak: tr.t[i] }
    } else if (d <= on) {
      cur.iEnd = i
      cur.tEnd = tr.t[i]
      out.push(cur)
      cur = null
    } else if (d > cur.peak) {
      cur.peak = d
      cur.tPeak = tr.t[i]
    }
  }
  if (cur) {
    cur.iEnd = tr.t.length - 1
    cur.tEnd = tr.t[cur.iEnd]
    out.push(cur)
  }
  return out
}

/** first time within the excursion the depth reaches x */
export function timeToDepth(tr: TraceData, ex: Excursion, x: number): number | null {
  for (let i = ex.i0; i <= ex.iEnd; i++) if (tr.d[i] >= x) return tr.t[i]
  return null
}

export interface ActSettings {
  actuation: number
  hysteresis: number
  rt: boolean
  rtPress: number
  rtRelease: number
  continuous: boolean
}

export const DEFAULT_HYST = 0.1

export function fixed(actuation: number): ActSettings {
  return { actuation, hysteresis: DEFAULT_HYST, rt: false, rtPress: 0, rtRelease: 0, continuous: false }
}

export function rapid(actuation: number, press: number, release = press, continuous = false): ActSettings {
  return { actuation, hysteresis: DEFAULT_HYST, rt: true, rtPress: press, rtRelease: release, continuous }
}

export interface SimEvent {
  t: number
  down: boolean
}

/** Runs the actuation state machine over samples [i0, i1] (the key starts released). */
export function simulate(tr: TraceData, i0: number, i1: number, s: ActSettings): SimEvent[] {
  const out: SimEvent[] = []
  const A = s.actuation
  const releaseLevel = Math.max(0, A - s.hysteresis)
  const topLevel = Math.min(ON_THRESHOLD, releaseLevel)
  let pressed = false
  let rtActive = false
  let extreme = 0
  for (let i = i0; i <= i1 && i < tr.t.length; i++) {
    const d = tr.d[i]
    const t = tr.t[i]
    if (!s.rt) {
      if (!pressed && d >= A) {
        pressed = true
        out.push({ t, down: true })
      } else if (pressed && d < releaseLevel) {
        pressed = false
        out.push({ t, down: false })
      }
      continue
    }
    if (!rtActive) {
      if (d >= A) {
        rtActive = true
        pressed = true
        extreme = d
        out.push({ t, down: true })
      }
      continue
    }
    const reset = s.continuous ? d <= topLevel : d < releaseLevel
    if (reset) {
      if (pressed) out.push({ t, down: false })
      pressed = false
      rtActive = false
      continue
    }
    if (pressed) {
      if (d > extreme) extreme = d
      else if (extreme - d >= s.rtRelease - 1e-6) {
        pressed = false
        extreme = d
        out.push({ t, down: false })
      }
    } else {
      if (d < extreme) extreme = d
      else if (d - extreme >= s.rtPress - 1e-6) {
        pressed = true
        extreme = d
        out.push({ t, down: true })
      }
    }
  }
  return out
}

export function simulateExcursion(tr: TraceData, ex: Excursion, s: ActSettings): SimEvent[] {
  return simulate(tr, ex.i0, ex.iEnd, s)
}

/** Digital pressed intervals for a whole trace. */
export function pressedIntervals(tr: TraceData, s: ActSettings): Array<[number, number]> {
  const ev = simulate(tr, 0, tr.t.length - 1, s)
  const out: Array<[number, number]> = []
  let start: number | null = null
  for (const e of ev) {
    if (e.down) start = e.t
    else if (start !== null) {
      out.push([start, e.t])
      start = null
    }
  }
  if (start !== null) out.push([start, Infinity])
  return out
}

// --- small stats helpers ---

export function quantile(xs: number[], q: number): number {
  if (!xs.length) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const pos = (s.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return s[lo] + (s[hi] - s[lo]) * (pos - lo)
}

export const median = (xs: number[]) => quantile(xs, 0.5)

export function mean(xs: number[]): number {
  if (!xs.length) return NaN
  let s = 0
  for (const x of xs) s += x
  return s / xs.length
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

export const round1 = (x: number) => Math.round(x * 10) / 10
export const round05 = (x: number) => Math.round(x * 20) / 20
export const ceil05 = (x: number) => Math.ceil(x * 20 - 1e-6) / 20
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))

/** Range of actuation candidates (mm). */
export function grid(from: number, to: number, step = 0.1): number[] {
  const out: number[] = []
  for (let x = from; x <= to + 1e-9; x += step) out.push(Math.round(x * 100) / 100)
  return out
}
