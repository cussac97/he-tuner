// Generates a complete, realistic example session (all six exercises) from a model
// typist/player. It runs every analysis end to end without a keyboard and doubles
// as a regression fixture: the model's habits are known, so the recommendations
// must find them (deep brushes on pinkies, heavy thumb on space, shallow lifts...).

import { fixed, simulate, valueAt } from '../analysis/core'
import { getLang, type Lang } from '../i18n'
import { areNeighbors, fingerFor, getLayout, MODIFIERS, type LayoutKind } from './layout'
import type { HwEvent, KeyEventRec, TraceData } from './recorder'
import { newId } from './store'
import type { AnyExercise, TypingMeta } from './types'
import { randomWords, TypingEngine } from './typing'

const TRAVEL = 4.0
const CURRENT_A = 0.8 // the simulated user's current (too light) setting
const OS_LAG = 3

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

class Gen {
  rnd: () => number
  constructor(seed: number) {
    this.rnd = mulberry32(seed)
  }
  u(a: number, b: number) {
    return a + this.rnd() * (b - a)
  }
  n(mu: number, sd: number) {
    const u = Math.max(1e-9, this.rnd())
    const v = this.rnd()
    return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  pick<T>(xs: T[]): T {
    return xs[Math.floor(this.rnd() * xs.length)]
  }
}

const q = (d: number) => (Math.round((Math.max(0, Math.min(TRAVEL, d)) / TRAVEL) * 255) / 255) * TRAVEL

class TraceBuilder {
  samples = new Map<string, Array<[number, number]>>()
  busyUntil = new Map<string, number>()

  add(code: string, pts: Array<[number, number]>) {
    if (!this.samples.has(code)) this.samples.set(code, [])
    this.samples.get(code)!.push(...pts)
    this.busyUntil.set(code, Math.max(this.busyUntil.get(code) ?? -Infinity, pts[pts.length - 1][0]))
  }

  free(code: string, t: number) {
    return (this.busyUntil.get(code) ?? -Infinity) < t - 2
  }

  build(): Record<string, TraceData> {
    const out: Record<string, TraceData> = {}
    for (const [code, pts] of this.samples) {
      pts.sort((a, b) => a[0] - b[0])
      const tr: TraceData = { t: [], d: [] }
      for (const [t, d] of pts) {
        const v = q(d)
        if (tr.d.length && tr.d[tr.d.length - 1] === v) continue
        if (tr.t.length && t <= tr.t[tr.t.length - 1]) continue
        tr.t.push(t)
        tr.d.push(v)
      }
      out[code] = tr
    }
    return out
  }
}

function smooth(t0: number, from: number, to: number, ms: number): Array<[number, number]> {
  const pts: Array<[number, number]> = []
  const dur = Math.max(1, ms)
  for (let k = 0; k <= dur; k++) {
    const x = k / dur
    pts.push([t0 + k, from + (to - from) * x * x * (3 - 2 * x)])
  }
  return pts
}

/** A full keystroke: travel down, dwell, come back up. */
function press(g: Gen, t0: number, peak: number, vDown: number, hold: number, vUp: number): Array<[number, number]> {
  const down = smooth(t0, 0, peak, (peak / vDown) * 1000)
  const tH = down[down.length - 1][0]
  const pts = [...down]
  for (let k = 1; k < hold; k += 2) pts.push([tH + k, peak - Math.abs(g.n(0, 0.015))])
  const tU = tH + Math.max(1, hold)
  pts.push(...smooth(tU, peak, 0, (peak / vUp) * 1000).slice(1))
  return pts
}

function keyEventsFrom(code: string, pts: Array<[number, number]>, keyChar: string): KeyEventRec[] {
  const tr: TraceData = { t: pts.map((p) => p[0]), d: pts.map((p) => q(p[1])) }
  return simulate(tr, 0, tr.t.length - 1, fixed(CURRENT_A)).map((e) => ({
    t: e.t + OS_LAG,
    type: e.down ? ('down' as const) : ('up' as const),
    code,
    key: keyChar,
    repeat: false,
  }))
}

/** What a protocol-V2 keyboard reports itself: its actuation changes with the depth. */
function hwFromTraces(traces: Record<string, TraceData>): HwEvent[] {
  const out: HwEvent[] = []
  for (const [code, tr] of Object.entries(traces))
    for (const e of simulate(tr, 0, tr.t.length - 1, fixed(CURRENT_A))) out.push({ t: e.t, code, down: e.down, depth: valueAt(tr, e.t) })
  return out.sort((a, b) => a.t - b.t)
}

const US_CHARS: Record<string, string> = {
  Space: ' ', Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']',
  Minus: '-', Equal: '=', Backslash: '\\', Backspace: 'Backspace', Enter: 'Enter',
}
function charFor(code: string): string {
  if (code.startsWith('Key')) return code.slice(3).toLowerCase()
  if (code.startsWith('Digit')) return code.slice(5)
  return US_CHARS[code] ?? code
}
const codeFor = (ch: string) => (ch === ' ' ? 'Space' : /^[a-z]$/.test(ch) ? `Key${ch.toUpperCase()}` : null)

// ---------------------------------------------------------------------------

function typingSample(g: Gen, layout: LayoutKind, t0: number, lang: Lang): AnyExercise {
  const duration = 60_000
  const t1 = t0 + duration
  const words = randomWords(lang, 120, g.rnd, false)
  const tb = new TraceBuilder()
  const engine = new TypingEngine(words, codeFor, t0)
  const keys: KeyEventRec[] = []
  const layoutKeys = getLayout(layout)
  const brushTargets = (code: string) =>
    layoutKeys.filter((k) => areNeighbors(layout, code, k.code) && !MODIFIERS.has(k.code) && k.code !== 'Backspace' && k.code !== 'Enter' && k.code !== 'Tab')

  const brushMu: Record<string, number> = { L5: 0.85, R5: 0.85, L4: 0.5, R4: 0.5, L3: 0.4, R3: 0.4, L2: 0.42, R2: 0.42, T: 0.6 }

  let t = t0 + 400
  const pending: KeyEventRec[] = []

  const doPress = (code: string, at: number, opts: { brushes?: boolean; light?: boolean } = {}) => {
    let start = Math.max(at, (tb.busyUntil.get(code) ?? -Infinity) + 4)
    if (opts.light && g.rnd() < 0.006) {
      // too-light attempt, retried
      const lp = press(g, start, g.u(0.5, 0.75), g.u(60, 100), 5, g.u(80, 120))
      tb.add(code, lp)
      start = lp[lp.length - 1][0] + g.u(40, 90)
    }
    const peak = g.rnd() < 0.82 ? TRAVEL : Math.min(TRAVEL, g.n(3.0, 0.35))
    const pts = press(g, start, peak, Math.max(70, g.n(170, 35)), Math.max(4, g.n(45, 20)), Math.max(70, g.n(150, 30)))
    tb.add(code, pts)
    pending.push(...keyEventsFrom(code, pts, charFor(code)))
    if (opts.brushes) {
      const f = fingerFor(code)
      const p = f === 'L5' || f === 'R5' ? 0.22 : 0.12
      if (g.rnd() < p) {
        const nbs = brushTargets(code)
        if (nbs.length) {
          const nb = g.pick(nbs).code
          const bs = start + g.n(6, 10)
          if (tb.free(nb, bs)) {
            const mu = brushMu[fingerFor(nb)] ?? 0.5
            const bp = Math.min(2.2, Math.exp(g.n(Math.log(mu), 0.42)))
            const bpts = press(g, bs, bp, g.u(50, 100), Math.max(0, g.n(15, 10)), g.u(60, 110))
            tb.add(nb, bpts)
            pending.push(...keyEventsFrom(nb, bpts, charFor(nb)))
          }
        }
      }
    }
    return start
  }

  const flush = () => {
    pending.sort((a, b) => a.t - b.t)
    for (const e of pending) {
      keys.push(e)
      if (e.type === 'down' && e.t <= t1) engine.press(e.t, e.code, e.key)
    }
    pending.length = 0
  }

  while (t < t1 - 300) {
    const word = engine.target
    if (!word) break
    for (const ch of word) {
      const code = codeFor(ch)!
      doPress(code, t, { brushes: true, light: true })
      t += Math.max(55, g.n(150, 45))
    }
    flush()
    // Fix mistakes (the model notices at the end of the word)
    const typed = engine.typed
    if (typed !== word) {
      t += g.u(150, 300)
      let common = 0
      while (common < typed.length && typed[common] === word[common]) common++
      for (let k = typed.length; k > common; k--) {
        doPress('Backspace', t)
        t += Math.max(60, g.n(110, 20))
      }
      flush()
      for (const ch of word.slice(engine.typed.length)) {
        doPress(codeFor(ch)!, t)
        t += Math.max(60, g.n(160, 40))
      }
      flush()
    }
    // Space, thumb sometimes bouncing or resting
    const sStart = doPress('Space', t)
    const sEnd = tb.busyUntil.get('Space')!
    if (g.rnd() < 0.1) {
      const bp = Math.exp(g.n(Math.log(0.65), 0.45))
      const pts = press(g, sEnd + g.u(8, 30), bp, g.u(40, 80), g.u(5, 40), g.u(50, 90))
      tb.add('Space', pts)
      pending.push(...keyEventsFrom('Space', pts, ' '))
    } else if (g.rnd() < 0.12) {
      const rp = g.u(0.25, 0.6)
      const st = sEnd + g.u(10, 40)
      const pts: Array<[number, number]> = [...smooth(st, 0, rp, 40)]
      for (let k = 0; k < g.u(380, 700); k += 10) pts.push([st + 41 + k, rp + g.n(0, 0.03)])
      const last = pts[pts.length - 1][0]
      pts.push(...smooth(last + 1, rp, 0, 30))
      tb.add('Space', pts)
      pending.push(...keyEventsFrom('Space', pts, ' '))
    }
    flush()
    t = Math.max(t, sStart) + Math.max(90, g.n(170, 40))
  }
  flush()

  const elapsed = duration
  const st = engine.stats(elapsed)
  const meta: TypingMeta = {
    lang,
    duration: 60,
    words: words.slice(0, engine.wordIdx + 1),
    keys: engine.keys,
    timeline: engine.timeline,
    wpm: st.wpm,
    rawWpm: st.rawWpm,
    accuracy: st.accuracy,
  }
  const traces = tb.build()
  return { id: newId(), kind: 'typing', createdAt: 0, source: 'sample', travel: TRAVEL, t0, t1, traces, keys: keys.filter((k) => k.t <= t1 + 500), hw: hwFromTraces(traces), meta }
}

function restSample(g: Gen, t0: number): AnyExercise {
  const tb = new TraceBuilder()
  const phases: Array<{ name: 'typing' | 'gaming'; t0: number; t1: number; keys: string[] }> = [
    { name: 'typing', t0, t1: t0 + 9000, keys: ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Space'] },
    { name: 'gaming', t0: t0 + 10000, t1: t0 + 19000, keys: ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ControlLeft', 'Space'] },
  ]
  const base: Record<string, Record<string, number>> = {
    typing: { KeyA: 0.05, KeyS: 0.1, KeyD: 0.15, KeyF: 0.28, KeyJ: 0.32, KeyK: 0.12, KeyL: 0.08, Space: 0.62 },
    gaming: { KeyW: 0.18, KeyA: 0.3, KeyS: 0.12, KeyD: 0.26, ShiftLeft: 0.68, Space: 0.2 },
  }
  for (const p of phases) {
    for (const [code, b] of Object.entries(base[p.name])) {
      const ph = g.u(0, 6)
      const pts: Array<[number, number]> = []
      for (let t = p.t0 + 300; t <= p.t1 - 300; t += 10) pts.push([t, Math.max(0, b + Math.sin(ph + t / 900) * b * 0.35 + g.n(0, 0.015))])
      pts.push([p.t1 - 290, 0])
      tb.add(code, pts)
    }
  }
  return { id: newId(), kind: 'rest', createdAt: 0, source: 'sample', travel: TRAVEL, t0, t1: t0 + 19000, traces: tb.build(), keys: [], meta: { phases } }
}

function repeatSample(g: Gen, t0: number): AnyExercise {
  const code = 'KeyF'
  const pts: Array<[number, number]> = [[t0, 0]]
  let t = t0 + 500
  let d = 0
  const end = t0 + 10_500
  while (t < end) {
    const peak = Math.min(TRAVEL, g.n(3.1, 0.5))
    const downMs = Math.max(25, g.n(55, 10))
    pts.push(...smooth(t, d, peak, downMs).slice(1))
    t += downMs
    const trough = t + 60 > end ? 0 : Math.min(1.6, Math.max(0, g.n(0.55, 0.35)))
    const upMs = Math.max(25, g.n(60, 12))
    pts.push(...smooth(t, peak, trough, upMs).slice(1))
    t += upMs
    d = trough
  }
  pts.push(...smooth(t, d, 0, 30).slice(1))
  const tb = new TraceBuilder()
  tb.add(code, pts)
  const traces = tb.build()
  return {
    id: newId(), kind: 'repeat', createdAt: 0, source: 'sample', travel: TRAVEL, t0, t1: end + 200, traces,
    keys: keyEventsFrom(code, pts, 'f'), meta: { code, t0: t0 + 400, t1: end + 100 },
  }
}

function holdSample(g: Gen, t0: number): AnyExercise {
  const code = 'KeyW'
  const pts: Array<[number, number]> = []
  const windows: Array<{ t0: number; t1: number }> = []
  let t = t0 + 800
  for (let h = 0; h < 3; h++) {
    const level = Math.min(TRAVEL, g.n(3.86, 0.05))
    const down = smooth(t, 0, level, 25)
    pts.push(...down)
    const hs = t + 26
    const dur = 3500
    const dips = [g.u(400, 1200), g.u(1500, 2400), g.u(2600, 3200)]
    let w = 0
    for (let k = 0; k < dur; k += 4) {
      w = w * 0.92 + g.n(0, 0.006)
      let v = level - Math.abs(w) - 0.01
      for (const dp of dips) {
        const x = (k - dp) / 45
        if (Math.abs(x) < 2) v -= 0.12 * Math.exp(-x * x)
      }
      pts.push([hs + k, v])
    }
    pts.push(...smooth(hs + dur, level, 0, 30).slice(1))
    windows.push({ t0: t, t1: hs + dur + 40 })
    t = hs + dur + 1200
  }
  const tb = new TraceBuilder()
  tb.add(code, pts)
  return {
    id: newId(), kind: 'hold', createdAt: 0, source: 'sample', travel: TRAVEL, t0, t1: t, traces: tb.build(),
    keys: keyEventsFrom(code, pts, 'w'), meta: { code, windows },
  }
}

function strafeSample(g: Gen, t0: number): AnyExercise {
  const left = 'KeyA'
  const right = 'KeyD'
  const prompts: Array<{ t: number; dir: -1 | 0 | 1 }> = []
  let t = t0 + 1500
  let dir: -1 | 0 | 1 = 0
  for (let i = 0; i < 40; i++) {
    const opts = ([-1, 0, 1] as const).filter((x) => x !== dir)
    dir = g.pick([...opts, ...opts.filter((x) => x !== 0)])
    prompts.push({ t, dir })
    t += g.u(450, 900)
  }
  const end = t
  const P: Record<string, Array<[number, number]>> = { [left]: [[t0, 0]], [right]: [[t0, 0]] }
  const st: Record<string, { d: number; t: number }> = { [left]: { d: 0, t: t0 }, [right]: { d: 0, t: t0 } }
  const moveTo = (code: string, at: number, target: number, speed: number) => {
    const s = st[code]
    // dwell at the previous level until `at`, with tiny wobble and occasional dips
    for (let k = s.t + 4; k < at; k += 4) {
      const dip = s.d > 2 && g.rnd() < 0.004 ? g.u(0.04, 0.09) : 0
      P[code].push([k, s.d > 0 ? s.d - Math.abs(g.n(0, 0.012)) - dip : 0])
    }
    const ms = (Math.abs(target - s.d) / speed) * 1000
    P[code].push(...smooth(Math.max(at, s.t + 1), s.d, target, ms).slice(1))
    st[code] = { d: target, t: Math.max(at, s.t + 1) + ms }
  }
  let prev: -1 | 0 | 1 = 0
  for (const p of prompts) {
    const react = p.t + Math.max(140, g.n(230, 40))
    const out = prev === -1 ? left : prev === 1 ? right : null
    const inc = p.dir === -1 ? left : p.dir === 1 ? right : null
    if (inc) moveTo(inc, react, Math.min(TRAVEL, g.n(3.85, 0.08)), Math.max(120, g.n(200, 30)))
    if (out) moveTo(out, react + (inc ? g.n(18, 25) : 0), 0, Math.max(110, g.n(180, 30)))
    prev = p.dir
  }
  for (const c of [left, right]) if (st[c].d > 0) moveTo(c, end, 0, 180)
  const tb = new TraceBuilder()
  tb.add(left, P[left])
  tb.add(right, P[right])
  const keys = [...keyEventsFrom(left, P[left], 'q'), ...keyEventsFrom(right, P[right], 'd')].sort((a, b) => a.t - b.t)
  const traces = tb.build()
  return { id: newId(), kind: 'strafe', createdAt: 0, source: 'sample', travel: TRAVEL, t0, t1: end + 300, traces, keys, hw: hwFromTraces(traces), meta: { left, right, prompts } }
}

export function analogTarget(seed: number, t: number, travel = TRAVEL): number {
  const s = (k: number) => Math.sin(t / (1000 * (1.7 + k * 0.9)) + seed * (k + 1))
  const x = Math.min(1, Math.max(0, 0.5 + 0.7 * (0.55 * s(0) + 0.3 * s(1) + 0.15 * s(2))))
  return 0.4 + x * (travel - 0.8)
}

function analogSample(g: Gen, t0: number): AnyExercise {
  const code = 'KeyW'
  const seed = 3.7
  const dur = 20_000
  const path: Array<{ t: number; target: number }> = []
  for (let t = t0; t <= t0 + dur; t += 20) path.push({ t, target: analogTarget(seed, t - t0) })
  const pts: Array<[number, number]> = []
  let noise = 0
  for (let t = t0; t <= t0 + dur + 300; t += 5) {
    const target = analogTarget(seed, t - t0 - 190)
    const shallow = target < 1.1
    noise = noise * 0.9 + g.n(0, shallow ? 0.07 : 0.04)
    const bias = shallow ? 0.28 : target > 3.2 ? -0.12 : 0
    pts.push([t, target + bias + noise])
  }
  pts.push([t0 + dur + 320, 0])
  const tb = new TraceBuilder()
  tb.add(code, pts)
  return { id: newId(), kind: 'analog', createdAt: 0, source: 'sample', travel: TRAVEL, t0, t1: t0 + dur + 400, traces: tb.build(), keys: [], meta: { code, t0, path } }
}

export function generateSampleSession(layout: LayoutKind, lang: Lang = getLang(), seed = 42): AnyExercise[] {
  const g = new Gen(seed)
  const now = Date.now()
  const list: AnyExercise[] = [
    typingSample(g, layout, 100_000, lang),
    restSample(g, 300_000),
    repeatSample(g, 400_000),
    holdSample(g, 500_000),
    strafeSample(g, 600_000),
    analogSample(g, 700_000),
  ]
  list.forEach((e, i) => (e.createdAt = now - (list.length - i) * 60_000))
  return list
}
