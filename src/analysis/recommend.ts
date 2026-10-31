// Turns the analysed exercises into concrete settings. The key idea: the raw analog
// traces let us replay every keystroke under any candidate setting (counterfactual
// simulation) and count what would have gone wrong — accidental actuations, missed
// presses, double triggers — and how many milliseconds it would cost.

import { tr } from '../i18n'
import { recommendText } from '../i18n/results/recommend'
import { FINGER_NAMES, MODIFIERS, WASD, type Finger, type LayoutKind } from '../lib/layout'
import type { Settings } from '../lib/store'
import type { AnyExercise, ExerciseRecord } from '../lib/types'
import {
  ceil05,
  clamp,
  fixed,
  grid,
  mean,
  median,
  quantile,
  rapid,
  round05,
  round1,
  sigmoid,
  simulateExcursion,
  timeToDepth,
  type ActSettings,
} from './core'
import {
  analyzeAnalog,
  analyzeHold,
  analyzeRepeat,
  analyzeRest,
  analyzeStrafe,
  type AnalogAnalysis,
  type PlateauStat,
  type RepeatAnalysis,
  type RestAnalysis,
  type StrafeAnalysis,
  type StrafeScenario,
} from './exercises'
import { analyzeTyping, type LabeledEx, type TypingAnalysis } from './typing'

export type Confidence = 'low' | 'medium' | 'high'
export type AnalogCurve = 'linear' | 'progressive' | 'aggressive'

export interface SimCounts {
  accidental: number
  missed: number
  doubles: number
  wanted: number
  latency: number // ms from first contact to actuation, intended presses
}

export interface Override {
  label: string
  codes: string[]
  value: number
  reason: string
}

export interface CurrentEstimate {
  /** read from the keyboard's actuation bit (protocol V2) rather than inferred */
  measured: boolean
  actuation: number | null
  perKey: Record<string, number>
  rt: { detected: boolean; release: number | null } | null
}

export interface ThresholdChart {
  intended: number[]
  unintended: number[]
  rest: number[]
  chosen: number
  current: number | null
}

export interface TypingRec {
  actuation: number
  overrides: Override[]
  rt: { enabled: boolean; reason: string }
  current: SimCounts | null
  recommended: SimCounts
  chart: ThresholdChart
  curve: Array<{ a: number; errors: number; latency: number }>
  reasons: string[]
  confidence: Confidence
  perKey: Record<string, number>
}

export interface GamingRec {
  actuation: number
  rtPress: number
  rtRelease: number
  continuous: boolean
  socd: 'none' | 'last' | 'deeper'
  socdGain: number | null
  reasons: string[]
  confidence: Confidence
  strafe: StrafeAnalysis | null
  repeat: RepeatAnalysis | null
  holdDrawdown: number | null
}

export interface AnalogRec {
  curve: AnalogCurve
  innerDeadzone: number
  outerDeadzone: number
  reasons: string[]
  analysis: AnalogAnalysis
}

export interface Idea {
  title: string
  body: string
  tag: string
}

export interface Profile {
  hasData: boolean
  typingStats: {
    wpm: number
    accuracy: number
    bottomOut: number
    pressSpeed: number
    keystrokes: number
    counts: TypingAnalysis['counts']
    lag: number
    orphanRate: number
  } | null
  current: CurrentEstimate
  typing: TypingRec | null
  gaming: GamingRec | null
  analog: AnalogRec | null
  ideas: Idea[]
  rest: RestAnalysis | null
  fingerAccidents: Record<string, number>
  keyAccidents: Record<string, number>
  missing: string[]
}

// ----------------------------------------------------------------------------

function scoreGroup(exs: LabeledEx[], a: number, tau: number, lambda: number, s: ActSettings) {
  let softAcc = 0
  let softMiss = 0
  let wanted = 0
  let acc = 0
  let missed = 0
  let doubles = 0
  const lat: number[] = []
  for (const e of exs) {
    if (e.expected === 0) {
      softAcc += sigmoid((e.peak - a) / tau)
    } else {
      wanted += e.expected
      for (const p of e.peaks) softMiss += sigmoid((a - p) / tau)
    }
    const ev = simulateExcursion(e.tr, e, s)
    const downs = ev.filter((x) => x.down)
    if (e.expected === 0) {
      if (downs.length) acc++
    } else {
      missed += Math.max(0, e.expected - downs.length)
      doubles += Math.max(0, downs.length - e.expected)
      if (downs.length) lat.push(downs[0].t - e.tStart)
    }
  }
  const latency = lat.length ? mean(lat) : 0
  const per100 = wanted ? 100 / wanted : 0
  return {
    score: (softAcc + softMiss + doubles) * per100 + lambda * latency,
    counts: { accidental: acc, missed, doubles, wanted, latency } as SimCounts,
  }
}

function bestActuation(
  exs: LabeledEx[],
  floor: number,
  travel: number,
  safety: number,
): { a: number; counts: SimCounts; curve: Array<{ a: number; errors: number; latency: number }> } {
  const tau = 0.05 + 0.1 * safety
  const lambda = 0.08 - 0.065 * safety
  const cands = grid(0.1, Math.min(3.6, travel - 0.3), 0.1)
  let best = { a: 1.5, score: Infinity, counts: null as SimCounts | null }
  const curve: Array<{ a: number; errors: number; latency: number }> = []
  for (const a of cands) {
    const { score, counts } = scoreGroup(exs, a, tau, lambda, fixed(a))
    curve.push({ a, errors: counts.wanted ? ((counts.accidental + counts.missed + counts.doubles) / counts.wanted) * 100 : 0, latency: counts.latency })
    if (a + 1e-9 < floor) continue
    if (score < best.score) best = { a, score, counts }
  }
  if (!best.counts) best.counts = scoreGroup(exs, best.a, tau, lambda, fixed(best.a)).counts
  return { a: best.a, counts: best.counts, curve }
}

function confidenceFor(n: number, good: number, ok: number): Confidence {
  return n >= good ? 'high' : n >= ok ? 'medium' : 'low'
}

function restFloor(rest: RestAnalysis | null, codes: string[], phase: 'typing' | 'gaming' | 'any'): number {
  if (!rest) return 0
  let m = 0
  for (const p of rest.phases) {
    if (phase !== 'any' && p.name !== phase) continue
    for (const c of codes) {
      const k = p.keys[c]
      if (k && !k.pressed) m = Math.max(m, k.p99)
    }
  }
  return m
}

const GROUPS: Array<{ id: 'space' | 'modifiers'; match: (code: string, f: Finger) => boolean }> = [
  { id: 'space', match: (c) => c === 'Space' },
  { id: 'modifiers', match: (c) => MODIFIERS.has(c) },
]

export function buildProfile(all: AnyExercise[], settings: Settings): Profile {
  const tx = tr(recommendText)
  const layout: LayoutKind = settings.layout
  const travel = settings.travel
  const latest = <K extends AnyExercise['kind']>(k: K) =>
    [...all].reverse().find((e) => e.kind === k) as ExerciseRecord<K> | undefined

  const typingRecs = all.filter((e): e is ExerciseRecord<'typing'> => e.kind === 'typing').slice(-3)
  const restRec = latest('rest')
  const holdRecs = all.filter((e): e is ExerciseRecord<'hold'> => e.kind === 'hold').slice(-2)
  const repeatRec = latest('repeat')
  const strafeRec = latest('strafe')
  const analogRec = latest('analog')

  const missing: string[] = []
  if (!typingRecs.length) missing.push('typing')
  if (!restRec) missing.push('rest')
  if (!repeatRec) missing.push('repeat')
  if (!holdRecs.length) missing.push('hold')
  if (!strafeRec) missing.push('strafe')
  if (!analogRec) missing.push('analog')

  const rest = restRec ? analyzeRest(restRec) : null
  const typings = typingRecs.map((r) => ({ r, a: analyzeTyping(r, layout) }))
  const exs = typings.flatMap((t) => t.a.excursions)

  // ---------- current settings, inferred from what the keyboard emitted ----------
  // The latest test reflects what is on the keyboard right now.
  const lastTyping = typings[typings.length - 1]?.a
  const perKeyCurrent: Record<string, number> = {}
  const weighted: number[] = []
  for (const [c, { a, n }] of Object.entries(lastTyping?.actPerKey ?? {})) {
    perKeyCurrent[c] = round05(a)
    for (let k = 0; k < n; k++) weighted.push(a)
  }
  const currentA = weighted.length >= 10 ? round05(median(weighted)) : null
  const drops = lastTyping?.releaseDrops ?? []
  const relDepths = lastTyping?.releaseDepths ?? []
  let rtDetected: CurrentEstimate['rt'] = null
  if (currentA !== null && relDepths.length >= 10) {
    // Without RT a key releases just above its actuation point; with RT it releases
    // much deeper, a fixed distance below the deepest point reached.
    const deeper = median(relDepths) - currentA
    rtDetected = deeper > 0.35 ? { detected: true, release: round05(median(drops)) } : { detected: false, release: null }
  }
  const current: CurrentEstimate = { measured: !!lastTyping?.measured, actuation: currentA, perKey: perKeyCurrent, rt: rtDetected }

  // ---------- typing ----------
  let typing: TypingRec | null = null
  let typingStats: Profile['typingStats'] = null
  const fingerAccidents: Record<string, number> = {}
  const keyAccidents: Record<string, number> = {}
  let spaceOverride = false
  if (typings.length) {
    const sumKeys = typings.reduce((s, t) => s + t.r.meta.keys.length, 0)
    const counts = { intended: 0, typo: 0, missed: 0, accidental: 0, brush: 0, rest: 0 }
    for (const t of typings) for (const k of Object.keys(counts) as Array<keyof typeof counts>) counts[k] += t.a.counts[k]
    const lt = typings[typings.length - 1]
    typingStats = {
      wpm: lt.r.meta.wpm,
      accuracy: lt.r.meta.accuracy,
      bottomOut: mean(typings.map((t) => t.a.bottomOutRate)),
      pressSpeed: median(typings.map((t) => t.a.pressSpeed).filter(Number.isFinite)),
      keystrokes: sumKeys,
      counts,
      lag: lt.a.lag,
      orphanRate: typings.reduce((s, t) => s + t.a.orphanDowns, 0) / Math.max(1, typings.reduce((s, t) => s + t.a.totalDowns, 0)),
    }

    for (const e of exs) {
      if (e.expected === 0 && e.label !== 'rest') {
        fingerAccidents[e.finger] = (fingerAccidents[e.finger] ?? 0) + 1
        keyAccidents[e.code] = (keyAccidents[e.code] ?? 0) + 1
      }
    }

    const safety = settings.safety
    const special = (e: LabeledEx) => GROUPS.some((g) => g.match(e.code, e.finger))
    const mainExs = exs.filter((e) => !special(e))
    const mainFloor = restFloor(rest, Object.keys(perKeyCurrent).filter((c) => c !== 'Space' && !MODIFIERS.has(c)), 'typing')
    const floorMain = Math.max(0.2, mainFloor > 0 ? mainFloor + 0.15 : 0)
    const main = bestActuation(mainExs, floorMain, travel, safety)
    const A = main.a

    const reasons: string[] = []
    const unintendedPeaks = mainExs.filter((e) => e.expected === 0).map((e) => e.peak)
    const intendedPeaks = mainExs.filter((e) => e.expected > 0).flatMap((e) => e.peaks)
    const restPeaks = rest
      ? rest.phases.filter((p) => p.name === 'typing').flatMap((p) => Object.entries(p.keys).filter(([c, k]) => !k.pressed && c !== 'Space').map(([, k]) => k.p99))
      : []

    if (unintendedPeaks.length) {
      const p90 = quantile(unintendedPeaks, 0.9)
      reasons.push(tx.typing.brushes(unintendedPeaks.length, p90.toFixed(2), A.toFixed(1), A > p90))
    }
    if (intendedPeaks.length) {
      const p5 = quantile(intendedPeaks, 0.05)
      reasons.push(tx.typing.presses(p5.toFixed(2), typingStats.bottomOut > 0.7 ? Math.round(typingStats.bottomOut * 100) : null, A.toFixed(1)))
    }
    if (mainFloor > 0) reasons.push(tx.typing.resting(mainFloor.toFixed(2)))

    // Per-group overrides
    const overrides: Override[] = []
    const perKey: Record<string, number> = {}
    for (const g of GROUPS) {
      const gx = exs.filter((e) => g.match(e.code, e.finger))
      const wanted = gx.reduce((s, e) => s + e.expected, 0)
      const unintended = gx.filter((e) => e.expected === 0).length
      if (wanted < 8 && unintended < 3) continue
      const codes = [...new Set(gx.map((e) => e.code))]
      const floor = Math.max(0.2, restFloor(rest, codes, 'any') + 0.15)
      const r = bestActuation(gx, floor, travel, safety)
      if (Math.abs(r.a - A) >= 0.3) {
        const restMax = restFloor(rest, codes, 'any')
        overrides.push({
          label: tx.groups[g.id],
          codes,
          value: r.a,
          reason: r.a > A ? tx.typing.overrideDeeper(unintended, restMax > 0.2 ? restMax.toFixed(2) : null) : tx.typing.overrideLighter,
        })
        if (g.id === 'space') spaceOverride = true
        for (const c of codes) perKey[c] = r.a
      }
    }
    const fingers = [...new Set(mainExs.map((e) => e.finger))]
    for (const f of fingers) {
      const fx = mainExs.filter((e) => e.finger === f)
      const wanted = fx.reduce((s, e) => s + e.expected, 0)
      if (wanted < 25) continue
      const codes = [...new Set(fx.map((e) => e.code))]
      const r = bestActuation(fx, floorMain, travel, safety)
      if (r.a - A >= 0.3) {
        const un = fx.filter((e) => e.expected === 0).length
        overrides.push({
          label: FINGER_NAMES[f],
          codes,
          value: r.a,
          reason: tx.typing.overrideFinger(un, wanted),
        })
        for (const c of codes) perKey[c] ??= r.a
      }
    }

    // Rapid Trigger for typing
    const rtCands = [0.15, 0.25, 0.4, 0.6].map((s) => rapid(A, s))
    const base = scoreGroup(exs, A, 0.1, 0, fixed(A)).counts
    let bestRt: { s: ActSettings; c: SimCounts } | null = null
    for (const s of rtCands) {
      const c = scoreGroup(exs, A, 0.1, 0, s).counts
      const errs = c.accidental + c.missed + c.doubles
      if (!bestRt || errs < bestRt.c.accidental + bestRt.c.missed + bestRt.c.doubles) bestRt = { s, c }
    }
    const baseErr = base.accidental + base.missed + base.doubles
    let rtRec: TypingRec['rt']
    if (bestRt && bestRt.c.accidental + bestRt.c.missed + bestRt.c.doubles + 1 < baseErr) {
      rtRec = {
        enabled: true,
        reason: tx.typing.rtOn(bestRt.s.rtRelease.toFixed(2), baseErr - (bestRt.c.accidental + bestRt.c.missed + bestRt.c.doubles)),
      }
    } else {
      const minRt = rtCands.reduce(
        (m, s) => {
          const c = scoreGroup(exs, A, 0.1, 0, s).counts
          return Math.max(m, c.doubles - base.doubles)
        },
        0,
      )
      rtRec = {
        enabled: false,
        reason: tx.typing.rtOff(minRt),
      }
    }

    const currentCounts = currentA !== null
      ? scoreGroup(exs, currentA, 0.1, 0, rtDetected?.detected && rtDetected.release ? rapid(currentA, rtDetected.release) : fixed(currentA)).counts
      : null
    const recCounts = scoreGroup(exs, A, 0.1, 0, fixed(A)).counts

    const nWanted = exs.reduce((s, e) => s + e.expected, 0)
    typing = {
      actuation: A,
      overrides,
      rt: rtRec,
      current: currentCounts,
      recommended: recCounts,
      chart: { intended: intendedPeaks, unintended: unintendedPeaks, rest: restPeaks, chosen: A, current: currentA },
      curve: main.curve,
      reasons,
      confidence: confidenceFor(nWanted, 400, 150),
      perKey,
    }
  }

  // ---------- gaming ----------
  let gaming: GamingRec | null = null
  const holdPlateaus: PlateauStat[] = holdRecs.flatMap((h) => analyzeHold(h))
  if (strafeRec || holdPlateaus.length || repeatRec || rest) {
    const reasons: string[] = []
    const wasdRest = restFloor(rest, WASD, 'gaming')
    const aGame = rest ? clamp(round1(Math.max(0.3, wasdRest + 0.2)), 0.2, 1.5) : 0.8
    if (rest) reasons.push(tx.gaming.rest(wasdRest.toFixed(2), aGame.toFixed(1)))
    else reasons.push(tx.gaming.noRest(aGame.toFixed(1)))

    // RT sensitivity from plateau stability (hold + strafe plateaus)
    const strafeAnalysisPre = strafeRec ? analyzeStrafe(strafeRec, []) : null
    const plats = [...holdPlateaus, ...(strafeAnalysisPre?.plateaus ?? [])]
    const dd = plats.map((p) => p.drawdown)
    const ddMax = dd.length ? quantile(dd, 0.95) : null
    let rtRelease = ddMax !== null ? clamp(ceil05(ddMax + 0.05), 0.1, 1.0) : 0.3
    if (ddMax !== null)
      reasons.push(tx.gaming.hold(ddMax.toFixed(2), rtRelease.toFixed(2)))
    let rtPress = rtRelease

    // Fast taps: make sure the press sensitivity catches every tap
    const repeatScen = (a: number) => [
      { name: tx.scenarios.current, s: currentA !== null ? fixed(currentA) : fixed(1.5) },
      { name: tx.scenarios.noRt('1.5'), s: fixed(1.5) },
      { name: tx.scenarios.noRt(a.toFixed(1)), s: fixed(a) },
      { name: `RT ${rtRelease.toFixed(2)}`, s: rapid(a, rtPress, rtRelease) },
      { name: tx.scenarios.rtContinuous(rtRelease.toFixed(2)), s: rapid(a, rtPress, rtRelease, true) },
    ]
    let repeat = repeatRec ? analyzeRepeat(repeatRec, repeatScen(aGame)) : null
    let continuous = false
    if (repeat) {
      const minLift = quantile(repeat.lifts, 0.05)
      if (minLift < rtPress * 1.6) {
        rtPress = clamp(ceil05(Math.max(0.1, minLift * 0.6)), 0.1, rtRelease)
        reasons.push(tx.gaming.fastTaps(minLift.toFixed(2), rtPress.toFixed(2)))
        repeat = analyzeRepeat(repeatRec!, repeatScen(aGame))
      }
      const nonCont = repeat!.results[3]
      const cont = repeat!.results[4]
      const noRt = repeat!.results[2]
      const missNoRt = repeat!.taps.length - noRt.registered
      if (missNoRt > 0)
        reasons.push(tx.gaming.lostTaps(aGame.toFixed(1), missNoRt, repeat!.taps.length, median(repeat!.minima).toFixed(2)))
      if (cont.registered > nonCont.registered || (Number.isFinite(cont.latency) && nonCont.latency - cont.latency > 2)) {
        continuous = true
        reasons.push(tx.gaming.continuous(cont.registered - nonCont.registered, Math.round(nonCont.latency - cont.latency)))
      }
    }

    // Counter-strafe scenarios
    const scen: StrafeScenario[] = [
      { name: tx.scenarios.current, s: currentA !== null ? (rtDetected?.detected && rtDetected.release ? rapid(currentA, rtDetected.release) : fixed(currentA)) : fixed(1.5), socd: 'none' },
      { name: tx.scenarios.noRt('1.5'), s: fixed(1.5), socd: 'none' },
      { name: tx.scenarios.recommended, s: rapid(aGame, rtPress, rtRelease, continuous), socd: 'none' },
      { name: '+ Snappy Tappy', s: rapid(aGame, rtPress, rtRelease, continuous), socd: 'last' },
      { name: '+ Rappy Snappy', s: rapid(aGame, rtPress, rtRelease, continuous), socd: 'deeper' },
    ]
    const strafe = strafeRec ? analyzeStrafe(strafeRec, scen) : null
    let socd: GamingRec['socd'] = 'none'
    let socdGain: number | null = null
    if (strafe && strafe.transitions >= 4) {
      const recd = strafe.results[2]
      const snappy = strafe.results[3]
      const noRt = strafe.results[1]
      if (Number.isFinite(noRt.stopDelay) && Number.isFinite(recd.stopDelay))
        reasons.push(tx.gaming.stops(Math.round(noRt.stopDelay - recd.stopDelay)))
      socdGain = Number.isFinite(recd.switchDelay) && Number.isFinite(snappy.switchDelay) ? recd.switchDelay - snappy.switchDelay : null
      if (strafe.overlapRate > 0.3 && socdGain !== null && socdGain > 8) {
        socd = 'last'
        reasons.push(tx.gaming.socdYes(Math.round(strafe.overlapRate * 100), Math.round(strafe.overlapMedian), Math.round(socdGain)))
      } else if (strafe.transitions) {
        reasons.push(tx.gaming.socdNo(Math.round(strafe.overlapRate * 100)))
      }
    }

    const conf = confidenceFor((strafe?.transitions ?? 0) + plats.length * 3 + (repeat?.taps.length ?? 0) / 4, 40, 15)
    gaming = {
      actuation: aGame,
      rtPress,
      rtRelease,
      continuous,
      socd,
      socdGain,
      reasons,
      confidence: conf,
      strafe,
      repeat,
      holdDrawdown: ddMax,
    }
  }

  // ---------- analog ----------
  let analog: AnalogRec | null = null
  const aa = analogRec ? analyzeAnalog(analogRec) : null
  if (aa) {
    const [b0, b1, b2, b3] = aa.bands
    const mid = mean([b1.rms, b2.rms].filter(Number.isFinite))
    let curve: AnalogCurve = 'linear'
    const reasons: string[] = []
    if (Number.isFinite(b0.rms) && b0.rms > mid * 1.35) {
      curve = 'progressive'
      reasons.push(tx.analog.progressive((b0.rms / mid).toFixed(1)))
    } else if (Number.isFinite(b3.rms) && b3.rms > mid * 1.35) {
      curve = 'aggressive'
      reasons.push(tx.analog.aggressive)
    } else reasons.push(tx.analog.linear)
    const inner = Number.isFinite(b0.bias) && b0.bias > 0.15 ? clamp(round1(b0.bias + 0.1), 0.1, 0.8) : 0.1
    const outer = Number.isFinite(b3.bias) && b3.bias < -0.15 ? clamp(round1(-b3.bias + 0.1), 0.1, 0.8) : 0.1
    if (inner > 0.1) reasons.push(tx.analog.inner(inner.toFixed(1)))
    if (outer > 0.1) reasons.push(tx.analog.outer(outer.toFixed(1)))
    reasons.push(tx.analog.lag(aa.lag, Math.round(aa.inBand * 100)))
    analog = { curve, innerDeadzone: inner, outerDeadzone: outer, reasons, analysis: aa }
  }

  // ---------- ideas (advanced layers) ----------
  const ideas: Idea[] = []
  const ti = tx.ideas
  if (spaceOverride) ideas.push({ tag: ti.tags.typing, ...ti.space })
  if (gaming && rest) {
    const shiftRest = restFloor(rest, ['ShiftLeft', 'ControlLeft'], 'gaming')
    if (shiftRest > 0.3)
      ideas.push({
        tag: ti.tags.gaming,
        title: ti.shift.title,
        body: ti.shift.body(shiftRest.toFixed(2), round1(shiftRest + 0.6).toFixed(1)),
      })
  }
  if (gaming) ideas.push({ tag: ti.tags.layers, ...ti.profiles })
  if (gaming) ideas.push({ tag: ti.tags.gaming, ...ti.dks })
  if (gaming?.socd !== 'none') ideas.push({ tag: ti.tags.rules, ...ti.socd })
  if (typingStats && typingStats.bottomOut > 0.85)
    ideas.push({
      tag: ti.tags.comfort,
      title: ti.bottomOut.title,
      body: ti.bottomOut.body(Math.round(typingStats.bottomOut * 100), String(typing?.actuation.toFixed(1))),
    })
  if (analog) ideas.push({ tag: ti.tags.analog, title: ti.analog.title(analog.curve), body: ti.analog.body })

  return {
    hasData: all.length > 0,
    typingStats,
    current,
    typing,
    gaming,
    analog,
    ideas,
    rest,
    fingerAccidents,
    keyAccidents,
    missing,
  }
}

export function timeToReach(e: LabeledEx, a: number): number | null {
  const t = timeToDepth(e.tr, e, a)
  return t === null ? null : t - e.tStart
}
