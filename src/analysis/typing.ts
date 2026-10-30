// Labels every analog excursion of a typing test with what the user meant to do,
// using the target text as ground truth:
//   intended   — produced a correct keystroke (or backspace / space)
//   typo       — produced a wrong character the finger really aimed for
//   missed     — the expected key was pressed but not deep enough, then retried
//   accidental — produced a wrong character by brushing a neighbor / chattering
//   brush      — touched a key without actuating it and without meaning to
//   rest       — a finger resting on a key

import type { LayoutKind } from '../lib/layout'
import { areNeighbors, fingerFor, type Finger } from '../lib/layout'
import type { HwEvent, KeyEventRec, TraceData } from '../lib/recorder'
import type { ExerciseRecord, TypingKey } from '../lib/types'
import { excursions, indexAt, maxBetween, median, minBetween, quantile, valueAt, type Excursion } from './core'

export type ExLabel = 'intended' | 'typo' | 'missed' | 'accidental' | 'brush' | 'rest'

export interface LabeledEx extends Excursion {
  finger: Finger
  label: ExLabel
  /** number of keystrokes the user wanted from this excursion */
  expected: number
  /** keystrokes the keyboard actually produced */
  produced: number
  /** depths reached by each wanted press (the miss risk) or the touch peak (the accidental risk) */
  peaks: number[]
  tr: TraceData
}

export interface TypingAnalysis {
  lag: number
  excursions: LabeledEx[]
  /** current actuation point per key, inferred from where the keyboard emitted keydowns */
  actPerKey: Record<string, { a: number; n: number }>
  /** true when read from the keyboard's own actuation bit rather than inferred */
  measured: boolean
  /** depth at keyup relative to the deepest point before it (RT detection) */
  releaseDrops: number[]
  releaseDepths: number[]
  orphanDowns: number
  totalDowns: number
  bottomOutRate: number
  pressSpeed: number // mm/s, median
  counts: Record<ExLabel, number>
}

// Modifiers and dead keys (^ before ê) are deliberate presses too: never count them as brushes.
const INTENDED_CLS = new Set(['correct', 'back', 'space', 'other'])

function aliasCode(code: string, traces: Record<string, TraceData>): string {
  if (traces[code]) return code
  // macOS + ISO boards swap these two codes in browsers.
  if (code === 'Backquote' && traces.IntlBackslash) return 'IntlBackslash'
  if (code === 'IntlBackslash' && traces.Backquote) return 'Backquote'
  return code
}

/** With analog protocol V2 the keyboard tells us itself when each key actuates and
 *  releases, in the same report as the depth: current settings are read, not guessed. */
export function fromHardware(
  hw: HwEvent[] | undefined,
  downs: Array<{ t: number; code: string }>,
  traces: Record<string, TraceData>,
): { lag: number; perKey: Record<string, { a: number; n: number }>; releaseDepths: number[]; releaseDrops: number[] } | null {
  if (!hw) return null
  const hwDowns = hw.filter((e) => e.down && e.depth > 0)
  if (hwDowns.length < 10) return null
  // The flip report is the first at or past the actuation point; the threshold lies
  // between it and the last shallower report before it.
  const crossing = (e: HwEvent) => {
    const tr = traces[e.code]
    if (!tr) return e.depth
    let i = indexAt(tr, e.t)
    while (i > 0 && tr.d[i] >= e.depth) i--
    return i >= 0 && tr.d[i] < e.depth ? (tr.d[i] + e.depth) / 2 : e.depth
  }
  const byCode = new Map<string, number[]>()
  for (const e of hwDowns) {
    if (!byCode.has(e.code)) byCode.set(e.code, [])
    byCode.get(e.code)!.push(crossing(e))
  }
  const perKey: Record<string, { a: number; n: number }> = {}
  for (const [code, ds] of byCode) perKey[code] = { a: median(ds), n: ds.length }
  // OS keydown vs HID report offset, from matched pairs
  const offsets: number[] = []
  for (const kd of downs) {
    let best: number | null = null
    for (const e of hwDowns) {
      if (e.code !== kd.code) continue
      const d = kd.t - e.t
      if (Math.abs(d) < 60 && (best === null || Math.abs(d) < Math.abs(best))) best = d
    }
    if (best !== null) offsets.push(best)
  }
  const releaseDepths: number[] = []
  const releaseDrops: number[] = []
  const lastDown = new Map<string, HwEvent>()
  for (const e of hw) {
    if (e.down) lastDown.set(e.code, e)
    else if (lastDown.has(e.code) && e.depth > 0) {
      const tr = traces[e.code]
      releaseDepths.push(e.depth)
      if (tr) releaseDrops.push(maxBetween(tr, lastDown.get(e.code)!.t, e.t) - e.depth)
      lastDown.delete(e.code)
    }
  }
  return { lag: offsets.length >= 5 ? median(offsets) : 0, perKey, releaseDepths, releaseDrops }
}

/** Max number of intervals sharing a common point, and that point. */
function stab(intervals: Array<[number, number]>): { count: number; at: number } {
  const ev: Array<[number, number]> = []
  for (const [a, b] of intervals) ev.push([a, 1], [b, -1])
  ev.sort((x, y) => x[0] - y[0] || y[1] - x[1])
  let c = 0
  let best = 0
  let at = NaN
  for (let k = 0; k < ev.length; k++) {
    c += ev[k][1]
    if (c > best) {
      best = c
      at = (ev[k][0] + (ev[k + 1]?.[0] ?? ev[k][0])) / 2
    }
  }
  return { count: best, at }
}

/** Keyboard events and HID reports travel different paths with a fixed offset. At the
 *  right offset, each keydown falls on the report where the depth crossed the
 *  actuation point: the [previous depth, depth] intervals of a key all share that
 *  point. We pick the offset where they agree the most and read the point off. */
export function estimateActuation(
  downs: Array<{ t: number; code: string }>,
  traces: Record<string, TraceData>,
): { lag: number; perKey: Record<string, { a: number; n: number }> } {
  const byCode = new Map<string, number[]>()
  for (const kd of downs) {
    if (!traces[kd.code]) continue
    if (!byCode.has(kd.code)) byCode.set(kd.code, [])
    byCode.get(kd.code)!.push(kd.t)
  }
  const evalLag = (L: number) => {
    let hit = 0
    let total = 0
    const perKey: Record<string, { a: number; n: number }> = {}
    for (const [code, ts] of byCode) {
      if (ts.length < 3) continue
      const tr = traces[code]
      const iv: Array<[number, number]> = []
      for (const t of ts) {
        const i = indexAt(tr, t - L)
        if (i < 1) continue
        const lo = Math.min(tr.d[i - 1], tr.d[i])
        const hi = Math.max(tr.d[i - 1], tr.d[i])
        if (hi <= 0.05) continue
        iv.push([lo, hi])
      }
      total += ts.length
      if (!iv.length) continue
      const s = stab(iv)
      hit += s.count
      perKey[code] = { a: s.at, n: s.count }
    }
    return { score: total ? hit / total : 0, perKey }
  }
  const scores: Array<{ L: number; score: number }> = []
  for (let L = -10; L <= 30; L += 0.5) scores.push({ L, score: evalLag(L).score })
  const best = Math.max(...scores.map((s) => s.score))
  const plateau = scores.filter((s) => s.score >= best - 0.02).map((s) => s.L)
  const lag = plateau.length ? median(plateau) : 0
  return { lag, perKey: evalLag(lag).perKey }
}

export function analyzeTyping(rec: ExerciseRecord<'typing'>, layout: LayoutKind): TypingAnalysis {
  const { traces } = rec
  const meta = rec.meta
  const typingKeys: TypingKey[] = meta.keys.map((k) => ({ ...k, code: aliasCode(k.code, traces) }))
  const downEvents = rec.keys.filter((k) => k.type === 'down' && !k.repeat)
  const upEvents = rec.keys.filter((k) => k.type === 'up').map((k) => ({ ...k, code: aliasCode(k.code, traces) }))

  const intendedKeys = typingKeys.filter((k) => INTENDED_CLS.has(k.cls))
  const hwInfo = fromHardware(rec.hw, intendedKeys, traces)
  const { lag, perKey: actPerKey } = hwInfo ?? estimateActuation(intendedKeys, traces)

  // Segment every key, within the span where keystrokes were actually being scored
  const first = typingKeys.length ? typingKeys[0].t - lag - 300 : rec.t0
  const last = typingKeys.length ? typingKeys[typingKeys.length - 1].t - lag + 60 : rec.t1
  const all: LabeledEx[] = []
  const byCode = new Map<string, LabeledEx[]>()
  for (const [code, tr] of Object.entries(traces)) {
    const list = excursions(code, tr)
      .filter((e) => e.tEnd >= first && e.tStart <= last)
      .map((e) => ({ ...e, finger: fingerFor(code), label: 'brush' as ExLabel, expected: 0, produced: 0, peaks: [], tr }))
    byCode.set(code, list)
    all.push(...list)
  }

  const findEx = (code: string, t: number): LabeledEx | null => {
    const list = byCode.get(code)
    if (!list) return null
    let nearest: LabeledEx | null = null
    let nd = 40
    for (const e of list) {
      if (t >= e.tStart - 2 && t <= e.tEnd + 2) return e
      const d = Math.abs(e.tStart - t)
      if (d < nd) {
        nd = d
        nearest = e
      }
    }
    return nearest
  }

  const nextUp = (code: string, t: number): number => {
    for (const u of upEvents) if (u.code === code && u.t > t) return u.t
    return t + 400
  }

  // Attach keystrokes to excursions
  interface Link {
    k: TypingKey
    ex: LabeledEx
    localPeak: number
  }
  const links: Link[] = []
  let orphan = 0
  for (const k of typingKeys) {
    const tk = k.t - lag
    const ex = findEx(k.code, tk)
    if (!ex) {
      orphan++
      continue
    }
    const tUp = Math.min(nextUp(k.code, k.t) - lag, ex.tEnd)
    links.push({ k, ex, localPeak: maxBetween(ex.tr, tk, Math.max(tk, tUp)) })
  }

  // Reference depth of real presses, per finger, to judge whether a wrong press was shallow
  const intendedPeaksByFinger = new Map<Finger, number[]>()
  for (const l of links) {
    if (!INTENDED_CLS.has(l.k.cls)) continue
    const f = l.ex.finger
    if (!intendedPeaksByFinger.has(f)) intendedPeaksByFinger.set(f, [])
    intendedPeaksByFinger.get(f)!.push(l.localPeak)
  }
  const allIntended = [...intendedPeaksByFinger.values()].flat()
  const refLow = (f: Finger) => {
    const list = intendedPeaksByFinger.get(f)
    return quantile(list && list.length >= 8 ? list : allIntended, 0.2)
  }

  const expectedAt = (t: number): string[] => {
    let codes: string[] = []
    for (const e of meta.timeline) {
      if (e.t <= t) codes = e.codes
      else break
    }
    return codes
  }

  const linksByEx = new Map<LabeledEx, Link[]>()
  for (const l of links) {
    if (!linksByEx.has(l.ex)) linksByEx.set(l.ex, [])
    linksByEx.get(l.ex)!.push(l)
  }

  const isAccidental = (l: Link, siblings: Link[]): boolean => {
    const { k, ex } = l
    // Chatter: a second keystroke inside an excursion that already typed this key, without a real lift
    const prev = siblings.filter((s) => s !== l && s.k.t < k.t && INTENDED_CLS.has(s.k.cls))
    if (prev.length) {
      const p = prev[prev.length - 1]
      const lift = minBetween(ex.tr, p.k.t - lag, k.t - lag)
      if (lift > p.localPeak * 0.5) return true
    }
    const shallow = l.localPeak < refLow(ex.finger) * 0.85
    if (k.cls === 'spaceEmpty') return shallow || l.localPeak < 1.5
    // The physical signature of a brush: a neighbor pressed at the same time, and deeper.
    const concurrentNeighbor = all.some(
      (o) =>
        o !== ex &&
        o.tStart < ex.tEnd &&
        o.tEnd > ex.tStart &&
        o.peak > l.localPeak + 0.3 &&
        areNeighbors(layout, ex.code, o.code),
    )
    const around = [...expectedAt(ex.tStart - 1), ...expectedAt(k.t - 1)]
    const neighborOfExpected = around.some((c) => areNeighbors(layout, k.code, c))
    const score = (concurrentNeighbor ? 0.5 : 0) + (neighborOfExpected ? 0.25 : 0) + (shallow ? 0.35 : 0)
    return score >= 0.5
  }

  const downsAfter = (code: string, t: number, within: number) =>
    downEvents.some((d) => aliasCode(d.code, traces) === code && d.t - lag > t && d.t - lag < t + within)

  for (const ex of all) {
    const ls = linksByEx.get(ex) ?? []
    ex.produced = ls.length
    if (ls.length) {
      let wanted = 0
      let accidental = 0
      let anyIntended = false
      for (const l of ls) {
        if (INTENDED_CLS.has(l.k.cls)) {
          anyIntended = true
          wanted++
          ex.peaks.push(l.localPeak)
        } else if (isAccidental(l, ls)) {
          accidental++
        } else {
          wanted++
          ex.peaks.push(l.localPeak)
        }
      }
      ex.expected = wanted
      if (anyIntended) ex.label = 'intended'
      else if (accidental === ls.length) {
        ex.label = 'accidental'
        ex.peaks = [ex.peak]
      } else ex.label = 'typo'
    } else {
      const expected = expectedAt(ex.tStart)
      const duration = ex.tEnd - ex.tStart
      if (ex.peak >= 0.35 && expected.slice(0, 2).includes(ex.code) && downsAfter(ex.code, ex.tEnd, 700)) {
        ex.label = 'missed'
        ex.expected = 1
      } else if (duration > 350 && ex.peak < 1.2) {
        ex.label = 'rest'
      } else {
        ex.label = 'brush'
      }
      ex.peaks = [ex.peak]
    }
  }

  // Current settings evidence
  const releaseDrops: number[] = []
  const releaseDepths: number[] = []
  for (const l of links) {
    if (!INTENDED_CLS.has(l.k.cls)) continue
    const tUp = nextUp(l.k.code, l.k.t) - lag
    if (tUp > l.ex.tEnd + 5) continue
    const dUp = valueAt(l.ex.tr, tUp)
    const before = maxBetween(l.ex.tr, l.k.t - lag, tUp)
    releaseDrops.push(before - dUp)
    releaseDepths.push(dUp)
  }

  const intendedEx = all.filter((e) => e.label === 'intended')
  const travel = rec.travel
  const bottomOutRate = intendedEx.length
    ? intendedEx.filter((e) => e.peak >= travel * 0.94).length / intendedEx.length
    : 0
  const speeds: number[] = []
  for (const e of intendedEx) {
    const a = travel * 0.2
    const b = Math.min(e.peak * 0.8, travel * 0.7)
    if (b <= a) continue
    let ta: number | null = null
    let tb: number | null = null
    for (let i = e.i0; i <= e.iEnd; i++) {
      if (ta === null && e.tr.d[i] >= a) ta = e.tr.t[i]
      if (tb === null && e.tr.d[i] >= b) {
        tb = e.tr.t[i]
        break
      }
    }
    if (ta !== null && tb !== null && tb > ta) speeds.push(((b - a) / (tb - ta)) * 1000)
  }

  const counts = { intended: 0, typo: 0, missed: 0, accidental: 0, brush: 0, rest: 0 } as Record<ExLabel, number>
  for (const e of all) counts[e.label]++

  return {
    lag,
    excursions: all,
    actPerKey,
    measured: !!hwInfo,
    releaseDrops: hwInfo ? hwInfo.releaseDrops : releaseDrops,
    releaseDepths: hwInfo ? hwInfo.releaseDepths : releaseDepths,
    orphanDowns: orphan,
    totalDowns: links.length + orphan,
    bottomOutRate,
    pressSpeed: median(speeds),
    counts,
  }
}

export function keyEventsDowns(keys: KeyEventRec[]) {
  return keys.filter((k) => k.type === 'down' && !k.repeat)
}
