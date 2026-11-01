// The recording the home page illustrations are drawn from: 2.4 s of a W key in a game. Fingers resting on the key, one held press,
// a burst of quick taps that never fully come back up, then another held press.
// Pressed state is computed with the same state machine the analysis uses.

import { rapid, simulate } from '../analysis/core'
import type { TraceData } from '../lib/recorder'

export const SPAN = 2400

// [ms, mm] key frames; between them the depth eases like a finger does
const FRAMES: Array<[number, number]> = [
  [0, 0.3], [110, 0.27], [205, 0.31],
  [300, 3.66], [340, 3.74], [430, 3.7], [520, 3.77], [610, 3.72], [690, 3.75],
  [790, 0.36], [870, 0.29], [990, 0.32],
  [1070, 2.95], [1110, 3.05], [1175, 1.55], [1240, 3.1], [1280, 3.2], [1345, 1.6], [1405, 3.25], [1445, 3.3],
  [1565, 0.34], [1650, 0.28], [1790, 0.31],
  [1880, 3.72], [1930, 3.8], [2050, 3.75], [2200, 3.79], [2400, 3.76],
]

function depthAt(t: number): number {
  let i = 0
  while (i < FRAMES.length - 2 && FRAMES[i + 1][0] < t) i++
  const [t0, d0] = FRAMES[i]
  const [t1, d1] = FRAMES[i + 1]
  const k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)))
  const eased = (1 - Math.cos(Math.PI * k)) / 2
  // a little sensor wobble, deterministic so every render draws the same line; well
  // under 0.15 mm, so a held key never releases by mistake at the tuned setting
  const wobble = 0.01 * Math.sin(t * 0.09) + 0.006 * Math.sin(t * 0.23 + 1)
  return Math.max(0, d0 + (d1 - d0) * eased + wobble)
}

// Finer than the keyboard's 2 ms, so a registration point glides along the curve
// as the setting moves instead of hopping from sample to sample
const DT = 0.25
export const TRACE: TraceData = { t: [], d: [] }
for (let i = 0; i <= SPAN / DT; i++) {
  TRACE.t.push(i * DT)
  TRACE.d.push(depthAt(i * DT))
}

/** Where resting fingers hold the key, in mm. */
export const REST = 0.34

export interface Segment {
  from: number
  to: number
  /** depth when it registered */
  at: number
}

/** When the keyboard considers the key pressed, for an actuation point and RT sensitivity. */
export function pressedSegments(actuation: number, sensitivity: number): Segment[] {
  const events = simulate(TRACE, 0, TRACE.t.length - 1, rapid(actuation, sensitivity))
  const out: Segment[] = []
  for (const e of events) {
    if (e.down) out.push({ from: e.t, to: SPAN, at: TRACE.d[Math.round(e.t / DT)] })
    else if (out.length) out[out.length - 1].to = e.t
  }
  return out
}

/** How much sooner, on average, each press registers with `b` than with `a`
 *  (both settings must see the same presses, or there is nothing to compare). */
export function gainMs(a: Segment[], b: Segment[]): number {
  if (!a.length || a.length !== b.length) return 0
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += a[i].from - b[i].from
  return Math.round(sum / a.length)
}
