// Interactive demo source: turns ordinary key presses into plausible analog traces,
// so every screen can be tried without a Hall-effect keyboard. Samples are committed
// with a 50 ms delay, which lets a key release be back-dated to before its keyup
// event — exactly like a real board, where the OS event comes after the travel.

import { areNeighbors, getLayout, GAMING_HOME, TYPING_HOME } from './layout'
import { recorder } from './recorder'
import { store } from './store'

type Pending = Array<[number, number]>

interface KeyState {
  pending: Pending
  held: boolean
  downAt: number
  plateau: number
  lastCommitted: number
  slowDepth: number
}

const COMMIT_DELAY = 50

function rand(a: number, b: number) {
  return a + Math.random() * (b - a)
}

function quant(d: number, travel: number) {
  return (Math.round((d / travel) * 255) / 255) * travel
}

class DemoSource {
  enabled = false
  actuation = 1.2
  hysteresis = 0.1
  restMode: 'typing' | 'gaming' | null = null
  slowCode: string | null = null
  private keys = new Map<string, KeyState>()
  private timer: number | null = null
  private restPhase = Math.random() * 10

  private st(code: string): KeyState {
    let s = this.keys.get(code)
    if (!s) {
      s = { pending: [], held: false, downAt: 0, plateau: 0, lastCommitted: -Infinity, slowDepth: 0 }
      this.keys.set(code, s)
    }
    return s
  }

  start() {
    if (this.enabled) return
    this.enabled = true
    window.addEventListener('keydown', this.onDown, { capture: true })
    window.addEventListener('keyup', this.onUp, { capture: true })
    this.timer = window.setInterval(this.tick, 4)
    recorder.setSource('demo')
  }

  stop() {
    if (!this.enabled) return
    this.enabled = false
    window.removeEventListener('keydown', this.onDown, { capture: true })
    window.removeEventListener('keyup', this.onUp, { capture: true })
    if (this.timer) clearInterval(this.timer)
    const now = performance.now()
    for (const code of this.keys.keys()) recorder.pushSample(code, now, 0)
    this.keys.clear()
    recorder.setSource('none')
  }

  private lastDepth(s: KeyState, code: string): number {
    if (s.pending.length) return s.pending[s.pending.length - 1][1]
    return recorder.depth(code)
  }

  private ramp(s: KeyState, t0: number, from: number, to: number, speed: number) {
    const travel = recorder.travel
    const dur = (Math.abs(to - from) / speed) * 1000
    for (let ms = 0; ms <= dur; ms += 1) {
      const x = dur ? ms / dur : 1
      const e = x * x * (3 - 2 * x)
      s.pending.push([t0 + ms, quant(from + (to - from) * e, travel)])
    }
    s.pending.push([t0 + dur + 1, quant(to, travel)])
  }

  private onDown = (e: KeyboardEvent) => {
    if (e.repeat || !e.isTrusted) return
    const code = e.code
    const s = this.st(code)
    if (code === this.slowCode) {
      s.held = true
      return
    }
    const travel = recorder.travel
    const v = rand(120, 200)
    const peak = Math.random() < 0.85 ? travel : rand(2.4, travel - 0.2)
    let t0 = e.timeStamp - (this.actuation / v) * 1000 * 1.25
    t0 = Math.max(t0, s.lastCommitted + 1, s.pending.length ? s.pending[s.pending.length - 1][0] + 1 : -Infinity)
    s.pending = s.pending.filter((p) => p[0] < t0)
    this.ramp(s, t0, this.lastDepth(s, code), peak, v)
    s.held = true
    s.downAt = e.timeStamp
    s.plateau = peak
    if (Math.random() < 0.18) this.brush(code, t0)
  }

  private onUp = (e: KeyboardEvent) => {
    if (!e.isTrusted) return
    const code = e.code
    const s = this.st(code)
    if (code === this.slowCode) {
      s.held = false
      return
    }
    if (!s.held) return
    s.held = false
    const v = rand(110, 170)
    const top = s.plateau
    let r = e.timeStamp - ((top - (this.actuation - this.hysteresis)) / v) * 1000 * 1.2
    // Very short taps (or synthetic key events): never release before the press got past actuation
    r = Math.max(r, s.lastCommitted + 1, s.downAt + 10)
    s.pending = s.pending.filter((p) => p[0] < r)
    const from = s.pending.length ? s.pending[s.pending.length - 1][1] : top
    this.ramp(s, r, from, 0, v)
  }

  private brush(mainCode: string, t0: number) {
    const layout = getLayout(store.settings.layout)
    const nb = layout.filter((k) => areNeighbors(store.settings.layout, mainCode, k.code) && k.code !== this.slowCode)
    if (!nb.length) return
    const code = nb[Math.floor(Math.random() * nb.length)].code
    const s = this.st(code)
    if (s.held || s.pending.length) return
    const deep = Math.random() < 0.08
    const peak = deep ? rand(this.actuation + 0.1, this.actuation + 0.7) : rand(0.15, this.actuation * 0.85)
    const start = Math.max(t0 + rand(-10, 25), s.lastCommitted + 1)
    const v = rand(60, 120)
    this.ramp(s, start, 0, peak, v)
    const end = s.pending[s.pending.length - 1][0] + rand(10, 40)
    this.ramp(s, end, peak, 0, v)
    if (deep) {
      // The brush went past the actuation point: the "keyboard" emits a real keystroke.
      const downAt = start + ((this.actuation / peak) * (peak / v) * 1000) / 1.2
      const upAt = end + (((peak - this.actuation) / v) * 1000) / 1.2
      const key = code.startsWith('Key') ? code.slice(3).toLowerCase() : ''
      const fire = (type: string, at: number) =>
        setTimeout(() => window.dispatchEvent(new KeyboardEvent(type, { code, key, bubbles: true })), Math.max(0, at - performance.now()))
      if (key) {
        fire('keydown', downAt)
        fire('keyup', upAt)
      }
    }
  }

  private tick = () => {
    const now = performance.now()
    const commitUntil = now - COMMIT_DELAY
    const travel = recorder.travel
    for (const [code, s] of this.keys) {
      if (code === this.slowCode) {
        const target = s.held ? travel : 0
        const step = (3.2 * 4) / 1000
        s.slowDepth = s.held ? Math.min(target, s.slowDepth + step) : Math.max(0, s.slowDepth - step)
        recorder.pushSample(code, now, quant(s.slowDepth, travel))
        continue
      }
      if (s.held) {
        const lastT = s.pending.length ? s.pending[s.pending.length - 1][0] : s.lastCommitted
        for (let t = lastT + 4; t <= now; t += 4) {
          s.pending.push([t, quant(s.plateau - Math.abs(Math.sin(t / 37)) * 0.04 - Math.random() * 0.03, travel)])
        }
      }
      let i = 0
      while (i < s.pending.length && s.pending[i][0] <= commitUntil) {
        recorder.pushSample(code, s.pending[i][0], s.pending[i][1])
        s.lastCommitted = s.pending[i][0]
        i++
      }
      if (i) s.pending.splice(0, i)
    }
    if (this.restMode) this.restTick(commitUntil)
  }

  private restTick(t: number) {
    this.restPhase += 0.004
    const keys = this.restMode === 'typing' ? TYPING_HOME : GAMING_HOME
    const base: Record<string, number> = { Space: 0.45, ShiftLeft: 0.55, KeyF: 0.2, KeyJ: 0.22, KeyD: 0.18, KeyW: 0.12 }
    keys.forEach((code, i) => {
      const s = this.st(code)
      if (s.held || s.pending.length) return
      const b = base[code] ?? 0.08
      const v = Math.max(0, b + Math.sin(this.restPhase * (1 + i * 0.3)) * b * 0.5 + (Math.random() - 0.5) * 0.04)
      recorder.pushSample(code, t, quant(v, recorder.travel))
      s.lastCommitted = t
    })
  }

  clearRest() {
    const t = performance.now()
    for (const code of [...TYPING_HOME, ...GAMING_HOME]) {
      const s = this.keys.get(code)
      if (s && !s.held && !s.pending.length) recorder.pushSample(code, t, 0)
    }
  }
}

export const demo = new DemoSource()
