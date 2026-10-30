// Central time-series store. Every key keeps a step function of its depth (mm):
// a sample is only stored when the value changes, the value holds until the next one.
// Times are performance.now() milliseconds, shared by HID reports and keyboard events.

export interface KeyEventRec {
  t: number
  type: 'down' | 'up'
  code: string
  key: string
  repeat: boolean
  synthetic?: boolean
}

export interface TraceData {
  t: number[]
  d: number[]
}

/** The keyboard's own actuation state changes (analog protocol V2 "actuated" bit),
 *  stamped with the depth of the report that carried them. */
export interface HwEvent {
  t: number
  code: string
  down: boolean
  depth: number
}

/** [code, depth mm, actuated bit if the protocol provides it] */
export type SnapshotEntry = [string, number, (boolean | null)?]

export type SourceKind = 'hid' | 'demo' | 'none'

class KeyTrace {
  t = new Float64Array(4096)
  d = new Float32Array(4096)
  n = 0

  push(t: number, d: number) {
    const n = this.n
    if (n > 0) {
      if (this.d[n - 1] === d) return
      if (t <= this.t[n - 1]) t = this.t[n - 1] + 0.001
    }
    if (n === this.t.length) {
      const t2 = new Float64Array(n * 2)
      t2.set(this.t)
      const d2 = new Float32Array(n * 2)
      d2.set(this.d)
      this.t = t2
      this.d = d2
    }
    this.t[n] = t
    this.d[n] = d
    this.n = n + 1
  }

  last(): number {
    return this.n ? this.d[this.n - 1] : 0
  }

  lastTime(): number {
    return this.n ? this.t[this.n - 1] : -Infinity
  }

  /** index of last sample with time <= t, or -1 */
  indexAt(t: number): number {
    let lo = 0
    let hi = this.n - 1
    if (hi < 0 || this.t[0] > t) return -1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (this.t[mid] <= t) lo = mid
      else hi = mid - 1
    }
    return lo
  }

  valueAt(t: number): number {
    const i = this.indexAt(t)
    return i < 0 ? 0 : this.d[i]
  }

  slice(t0: number, t1: number): TraceData {
    let i0 = this.indexAt(t0)
    if (i0 < 0) i0 = 0
    const out: TraceData = { t: [], d: [] }
    for (let i = i0; i < this.n && this.t[i] <= t1; i++) {
      out.t.push(this.t[i])
      out.d.push(this.d[i])
    }
    return out
  }

  dropBefore(t: number) {
    const i = this.indexAt(t)
    if (i <= 0) return
    this.t.copyWithin(0, i, this.n)
    this.d.copyWithin(0, i, this.n)
    this.n -= i
  }
}

type Listener = () => void

export class Recorder {
  traces = new Map<string, KeyTrace>()
  keyEvents: KeyEventRec[] = []
  hwEvents: HwEvent[] = []
  private hwState = new Map<string, boolean>()
  active = new Set<string>()
  source: SourceKind = 'none'
  travel = 4.0

  reportCount = 0
  reportRate = 0
  private rateWindow: number[] = []
  lastRaw: Uint8Array | null = null
  lastRawT = 0

  private keyListeners = new Set<(e: KeyEventRec) => void>()
  private statusListeners = new Set<Listener>()

  trace(code: string): KeyTrace {
    let tr = this.traces.get(code)
    if (!tr) {
      tr = new KeyTrace()
      this.traces.set(code, tr)
    }
    return tr
  }

  depth(code: string): number {
    return this.traces.get(code)?.last() ?? 0
  }

  depthAt(code: string, t: number): number {
    return this.traces.get(code)?.valueAt(t) ?? 0
  }

  /** A full snapshot of pressed keys; keys absent from it are considered at rest. */
  ingestSnapshot(t: number, entries: SnapshotEntry[]) {
    const seen = new Set<string>()
    for (const [code, depth, actuated] of entries) {
      seen.add(code)
      this.trace(code).push(t, depth)
      if (depth > 0) this.active.add(code)
      if (actuated !== undefined && actuated !== null) this.setHw(code, t, actuated, depth)
    }
    for (const code of this.active) {
      if (!seen.has(code)) {
        this.trace(code).push(t, 0)
        this.active.delete(code)
        this.setHw(code, t, false, 0)
      }
    }
    this.countReport(t)
  }

  private setHw(code: string, t: number, down: boolean, depth: number) {
    if ((this.hwState.get(code) ?? false) === down) return
    this.hwState.set(code, down)
    this.hwEvents.push({ t, code, down, depth })
  }

  /** Direct sample injection (demo source; may be slightly back-dated). */
  pushSample(code: string, t: number, depth: number) {
    this.trace(code).push(t, depth)
    if (depth > 0) this.active.add(code)
    else this.active.delete(code)
  }

  countReport(t: number) {
    this.reportCount++
    this.rateWindow.push(t)
    while (this.rateWindow.length && this.rateWindow[0] < t - 1000) this.rateWindow.shift()
    this.reportRate = this.rateWindow.length
  }

  pushKeyEvent(e: KeyEventRec) {
    this.keyEvents.push(e)
    for (const l of this.keyListeners) l(e)
  }

  onKey(l: (e: KeyEventRec) => void) {
    this.keyListeners.add(l)
    return () => { this.keyListeners.delete(l) }
  }

  onStatus(l: Listener) {
    this.statusListeners.add(l)
    return () => { this.statusListeners.delete(l) }
  }

  emitStatus() {
    for (const l of this.statusListeners) l()
  }

  setSource(s: SourceKind) {
    this.source = s
    this.emitStatus()
  }

  clip(t0: number, t1: number): { traces: Record<string, TraceData>; keys: KeyEventRec[]; hw: HwEvent[] } {
    const traces: Record<string, TraceData> = {}
    for (const [code, tr] of this.traces) {
      const s = tr.slice(t0, t1)
      if (s.t.length && s.d.some((v) => v > 0)) traces[code] = s
    }
    const keys = this.keyEvents.filter((e) => e.t >= t0 && e.t <= t1)
    const hw = this.hwEvents.filter((e) => e.t >= t0 && e.t <= t1)
    return { traces, keys, hw }
  }

  /** Keep memory bounded: forget everything older than `keepMs`. */
  prune(now: number, keepMs = 5 * 60_000) {
    const cut = now - keepMs
    for (const tr of this.traces.values()) tr.dropBefore(cut)
    let i = 0
    while (i < this.keyEvents.length && this.keyEvents[i].t < cut) i++
    if (i) this.keyEvents.splice(0, i)
    let j = 0
    while (j < this.hwEvents.length && this.hwEvents[j].t < cut) j++
    if (j) this.hwEvents.splice(0, j)
  }
}

export const recorder = new Recorder()

// Keyboard events are always captured: they tell us what the keyboard actually emitted.
if (typeof window !== 'undefined') {
  const handler = (ev: KeyboardEvent) => {
    recorder.pushKeyEvent({
      t: ev.timeStamp,
      type: ev.type === 'keydown' ? 'down' : 'up',
      code: ev.code,
      key: ev.key,
      repeat: ev.repeat,
      synthetic: !ev.isTrusted || undefined,
    })
  }
  window.addEventListener('keydown', handler, { capture: true })
  window.addEventListener('keyup', handler, { capture: true })
  setInterval(() => recorder.prune(performance.now()), 30_000)
}
