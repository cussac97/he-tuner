// Turns the analysed exercises into concrete settings. The key idea: the raw analog
// traces let us replay every keystroke under any candidate setting (counterfactual
// simulation) and count what would have gone wrong — accidental actuations, missed
// presses, double triggers — and how many milliseconds it would cost.

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

export type Confidence = 'faible' | 'moyenne' | 'bonne'

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
  curve: 'linéaire' | 'progressive' | 'agressive'
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
  return n >= good ? 'bonne' : n >= ok ? 'moyenne' : 'faible'
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

const GROUPS: Array<{ label: string; match: (code: string, f: Finger) => boolean }> = [
  { label: 'Barre espace', match: (c) => c === 'Space' },
  { label: 'Modificateurs', match: (c) => MODIFIERS.has(c) },
]

export function buildProfile(all: AnyExercise[], settings: Settings): Profile {
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
      reasons.push(
        `${unintendedPeaks.length} effleurements involontaires mesurés ; 90 % restent sous ${p90.toFixed(2)} mm. ${
          A > p90 ? `À ${A.toFixed(1)} mm, ils ne déclenchent plus rien.` : `Un réglage plus profond coûterait plus en réactivité qu’il n’éviterait d’erreurs.`
        }`,
      )
    }
    if (intendedPeaks.length) {
      const p5 = quantile(intendedPeaks, 0.05)
      reasons.push(
        `Tes vraies frappes descendent au moins à ${p5.toFixed(2)} mm dans 95 % des cas${
          typingStats.bottomOut > 0.7 ? ` (tu tapes en fond de course ${Math.round(typingStats.bottomOut * 100)} % du temps)` : ''
        } : aucun risque de frappe ratée à ${A.toFixed(1)} mm.`,
      )
    }
    if (mainFloor > 0) reasons.push(`Tes doigts posés appuient jusqu’à ${mainFloor.toFixed(2)} mm : le point d’actuation reste au-dessus avec une marge.`)

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
          label: g.label,
          codes,
          value: r.a,
          reason:
            r.a > A
              ? `${unintended} contacts involontaires${restMax > 0.2 ? `, ${restMax.toFixed(2)} mm de pression au repos` : ''} : plus profond pour éviter les déclenchements parasites.`
              : `Frappes franches et aucun contact parasite : peut être plus réactif.`,
        })
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
          reason: `${un} effleurements sur ${wanted} frappes pour ce doigt : un point plus profond sur ses touches suffit, sans ralentir le reste.`,
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
        reason: `Le RT (${bestRt.s.rtRelease.toFixed(2)} mm) éviterait ${baseErr - (bestRt.c.accidental + bestRt.c.missed + bestRt.c.doubles)} erreurs sur tes données (lettres doublées ratées).`,
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
        reason: `En frappe, le Rapid Trigger n’évite aucune erreur sur tes données${
          minRt > 0 ? ` et ajouterait jusqu’à ${minRt} doubles déclenchements` : ''
        }. Garde-le pour le profil jeu.`,
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
    if (rest) reasons.push(`Doigts posés sur ZQSD/WASD : jusqu’à ${wasdRest.toFixed(2)} mm sans le vouloir → actuation à ${aGame.toFixed(1)} mm, aussi haut que possible sans mouvement parasite.`)
    else reasons.push(`Sans test « repos », valeur prudente de ${aGame.toFixed(1)} mm. Fais l’exercice pour l’affiner.`)

    // RT sensitivity from plateau stability (hold + strafe plateaus)
    const strafeAnalysisPre = strafeRec ? analyzeStrafe(strafeRec, []) : null
    const plats = [...holdPlateaus, ...(strafeAnalysisPre?.plateaus ?? [])]
    const dd = plats.map((p) => p.drawdown)
    const ddMax = dd.length ? quantile(dd, 0.95) : null
    let rtRelease = ddMax !== null ? clamp(ceil05(ddMax + 0.05), 0.1, 1.0) : 0.3
    if (ddMax !== null)
      reasons.push(`En maintien, ta touche oscille jusqu’à ${ddMax.toFixed(2)} mm : une sensibilité RT de ${rtRelease.toFixed(2)} mm ne relâchera jamais par erreur.`)
    let rtPress = rtRelease

    // Fast taps: make sure the press sensitivity catches every tap
    const repeatScen = (a: number) => [
      { name: 'Actuel (estimé)', s: currentA !== null ? fixed(currentA) : fixed(1.5) },
      { name: 'Sans RT · 1.5 mm', s: fixed(1.5) },
      { name: `Sans RT · ${a.toFixed(1)} mm`, s: fixed(a) },
      { name: `RT ${rtRelease.toFixed(2)}`, s: rapid(a, rtPress, rtRelease) },
      { name: `RT ${rtRelease.toFixed(2)} continu`, s: rapid(a, rtPress, rtRelease, true) },
    ]
    let repeat = repeatRec ? analyzeRepeat(repeatRec, repeatScen(aGame)) : null
    let continuous = false
    if (repeat) {
      const minLift = quantile(repeat.lifts, 0.05)
      if (minLift < rtPress * 1.6) {
        rtPress = clamp(ceil05(Math.max(0.1, minLift * 0.6)), 0.1, rtRelease)
        reasons.push(`Tes tapes les plus rapides ne remontent que de ${minLift.toFixed(2)} mm : sensibilité d’appui réduite à ${rtPress.toFixed(2)} mm pour toutes les capter.`)
        repeat = analyzeRepeat(repeatRec!, repeatScen(aGame))
      }
      const nonCont = repeat!.results[3]
      const cont = repeat!.results[4]
      const noRt = repeat!.results[2]
      const missNoRt = repeat!.taps.length - noRt.registered
      if (missNoRt > 0)
        reasons.push(
          `À ${aGame.toFixed(1)} mm sans Rapid Trigger, ${missNoRt} de tes ${repeat!.taps.length} tapes rapides seraient perdues : entre deux tapes tu ne remontes qu’à ${median(repeat!.minima).toFixed(2)} mm en moyenne. Le RT les capte toutes.`,
        )
      if (cont.registered > nonCont.registered || (Number.isFinite(cont.latency) && nonCont.latency - cont.latency > 2)) {
        continuous = true
        reasons.push(`Le RT continu capte ${cont.registered - nonCont.registered > 0 ? `${cont.registered - nonCont.registered} tapes de plus` : `tes tapes ${Math.round(nonCont.latency - cont.latency)} ms plus tôt`} : à activer.`)
      }
    }

    // Counter-strafe scenarios
    const scen: StrafeScenario[] = [
      { name: 'Actuel (estimé)', s: currentA !== null ? (rtDetected?.detected && rtDetected.release ? rapid(currentA, rtDetected.release) : fixed(currentA)) : fixed(1.5), socd: 'none' },
      { name: 'Sans RT · 1.5 mm', s: fixed(1.5), socd: 'none' },
      { name: 'Recommandé', s: rapid(aGame, rtPress, rtRelease, continuous), socd: 'none' },
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
        reasons.push(`Arrêts : ton personnage s’arrête ${Math.round(noRt.stopDelay - recd.stopDelay)} ms plus tôt avec le RT qu’avec un réglage fixe à 1.5 mm.`)
      socdGain = Number.isFinite(recd.switchDelay) && Number.isFinite(snappy.switchDelay) ? recd.switchDelay - snappy.switchDelay : null
      if (strafe.overlapRate > 0.3 && socdGain !== null && socdGain > 8) {
        socd = 'last'
        reasons.push(
          `Dans ${Math.round(strafe.overlapRate * 100)} % de tes changements de direction, tu appuies sur la nouvelle touche avant de lâcher l’ancienne (≈${Math.round(strafe.overlapMedian)} ms). Un mode SOCD te ferait gagner ≈${Math.round(socdGain)} ms par changement.`,
        )
      } else if (strafe.transitions) {
        reasons.push(`Tes changements de direction sont propres (${Math.round(strafe.overlapRate * 100)} % de chevauchement) : pas besoin de SOCD.`)
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
    let curve: AnalogRec['curve'] = 'linéaire'
    const reasons: string[] = []
    if (Number.isFinite(b0.rms) && b0.rms > mid * 1.35) {
      curve = 'progressive'
      reasons.push(`Ton erreur est ${(b0.rms / mid).toFixed(1)}× plus grande dans le premier quart de course : une courbe progressive (plus douce au début) te donnera plus de finesse à faible vitesse.`)
    } else if (Number.isFinite(b3.rms) && b3.rms > mid * 1.35) {
      curve = 'agressive'
      reasons.push(`Tu as du mal à tenir les valeurs proches du fond : une courbe plus agressive atteint 100 % plus tôt.`)
    } else reasons.push(`Ta précision est homogène sur toute la course : une courbe linéaire est idéale.`)
    const inner = Number.isFinite(b0.bias) && b0.bias > 0.15 ? clamp(round1(b0.bias + 0.1), 0.1, 0.8) : 0.1
    const outer = Number.isFinite(b3.bias) && b3.bias < -0.15 ? clamp(round1(-b3.bias + 0.1), 0.1, 0.8) : 0.1
    if (inner > 0.1) reasons.push(`Tu dépasses souvent les petites valeurs : zone morte basse de ${inner.toFixed(1)} mm.`)
    if (outer > 0.1) reasons.push(`Tu restes souvent sous la cible près du fond : zone morte haute de ${outer.toFixed(1)} mm pour atteindre 100 % sans écraser.`)
    reasons.push(`Délai de suivi mesuré : ${aa.lag} ms ; ${Math.round(aa.inBand * 100)} % du temps à ±0,3 mm de la cible.`)
    analog = { curve, innerDeadzone: inner, outerDeadzone: outer, reasons, analysis: aa }
  }

  // ---------- ideas (advanced layers) ----------
  const ideas: Idea[] = []
  if (typing?.overrides.some((o) => o.label === 'Barre espace'))
    ideas.push({
      tag: 'Frappe',
      title: 'Barre espace à part',
      body: 'Tes pouces se posent sur la barre espace. Donne-lui son propre point d’actuation (réglage par touche) plutôt que de durcir tout le clavier.',
    })
  if (gaming && rest) {
    const shiftRest = restFloor(rest, ['ShiftLeft', 'ControlLeft'], 'gaming')
    if (shiftRest > 0.3)
      ideas.push({
        tag: 'Jeu',
        title: 'Shift / Ctrl plus profonds en jeu',
        body: `Ton auriculaire repose à ${shiftRest.toFixed(2)} mm sur Shift/Ctrl. Mets ces touches à ${round1(shiftRest + 0.6).toFixed(1)} mm dans le profil jeu pour éviter les accroupissements / marches involontaires.`,
      })
  }
  if (gaming)
    ideas.push({
      tag: 'Couches',
      title: 'Deux profils, un raccourci',
      body: 'Garde un profil « Frappe » (actuation plus profonde, RT désactivé) et un profil « Jeu » (actuation haute, RT). Assigne un raccourci Fn pour basculer : c’est le meilleur des deux mondes.',
    })
  if (gaming)
    ideas.push({
      tag: 'Jeu',
      title: 'Dynamic Keystroke sur la marche',
      body: 'Dans les jeux sans analogique, un DKS sur Z/W peut envoyer « marcher » à mi-course et « courir » au fond : une seule touche, deux vitesses.',
    })
  if (gaming?.socd !== 'none')
    ideas.push({
      tag: 'Règles',
      title: 'SOCD : vérifie le règlement',
      body: 'Counter-Strike 2 refuse les fonctions de type Snap Tap/SOCD sur les serveurs officiels de Valve depuis 2024, et plusieurs ligues aussi. Garde un profil sans SOCD pour ces jeux.',
    })
  if (typingStats && typingStats.bottomOut > 0.85)
    ideas.push({
      tag: 'Confort',
      title: 'Tu frappes en fond de course',
      body: `${Math.round(typingStats.bottomOut * 100)} % de tes frappes vont jusqu’au fond. Avec un point d’actuation à ${typing?.actuation.toFixed(1)} mm, tu peux t’entraîner à frapper plus léger : moins de fatigue, et le clavier suit.`,
    })
  if (analog)
    ideas.push({
      tag: 'Analogique',
      title: `Courbe ${analog.curve}`,
      body: 'Pour le mode manette (jeux de course, déplacements fins) : applique la courbe et les zones mortes recommandées au profil analogique.',
    })

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
