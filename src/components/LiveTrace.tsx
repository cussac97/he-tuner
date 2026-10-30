// Scrolling depth chart of the last seconds. Depth grows downward, like the key itself.
// Optionally replays the focused key through a candidate setting and draws, under the
// chart, when the keyboard would consider it pressed.

import { useEffect, useRef } from 'react'
import { simulate, type ActSettings } from '../analysis/core'
import { keyLabel } from '../lib/layout'
import { recorder } from '../lib/recorder'

const COLORS = ['#c8ff2e', '#ededef', '#8f8fff', '#ff7a3d', '#5fd4ff', '#ff5a6a', '#a0a0a8', '#ffd84a']

export interface LiveTraceProps {
  windowMs?: number
  height?: number
  travel?: number
  sims?: Array<{ name: string; s: ActSettings; color: string }>
  onlyCodes?: string[]
}

export function LiveTrace({ windowMs = 2500, height = 260, travel = 4, sims = [], onlyCodes }: LiveTraceProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const simsRef = useRef(sims)
  simsRef.current = sims
  const onlyRef = useRef(onlyCodes)
  onlyRef.current = onlyCodes

  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    let raf = 0
    const colorOf = new Map<string, string>()
    let ci = 0
    let focus: string | null = null
    let focusT = 0

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const W = cv.clientWidth
      const H = cv.clientHeight
      if (cv.width !== W * dpr || cv.height !== H * dpr) {
        cv.width = W * dpr
        cv.height = H * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      const simRows = simsRef.current.length
      const laneH = 16
      const padL = 36
      const padR = 64
      const plotH = H - simRows * (laneH + 4) - 22
      const now = performance.now()
      const t0 = now - windowMs
      const x = (t: number) => padL + ((t - t0) / windowMs) * (W - padL - padR)
      const y = (d: number) => 8 + (d / travel) * (plotH - 8)

      // grid
      ctx.font = '600 11px JetBrains Mono, ui-monospace, monospace'
      ctx.fillStyle = '#5f5f68'
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      for (let mm = 0; mm <= travel; mm += 1) {
        ctx.beginPath()
        ctx.moveTo(padL, y(mm))
        ctx.lineTo(W - padR, y(mm))
        ctx.stroke()
        ctx.fillText(`${mm}`, 8, y(mm) + 4)
      }
      ctx.fillText('mm', 8, plotH + 16)

      // traces
      const only = onlyRef.current
      for (const [code, tr] of recorder.traces) {
        if (only && !only.includes(code)) continue
        if (tr.n === 0 || tr.lastTime() < t0 - 2000) continue
        let i = tr.indexAt(t0)
        if (i < 0) i = 0
        let any = false
        for (let k = i; k < tr.n; k++) if (tr.d[k] > 0.02) any = true
        if (!any && tr.d[i] <= 0.02) continue
        if (!colorOf.has(code)) colorOf.set(code, COLORS[ci++ % COLORS.length])
        const col = colorOf.get(code)!
        if (tr.lastTime() > focusT && tr.last() > 0.3) {
          focus = code
          focusT = tr.lastTime()
        }
        ctx.strokeStyle = col
        ctx.lineWidth = code === focus ? 2 : 1.4
        ctx.beginPath()
        let prevD = tr.d[i]
        ctx.moveTo(x(Math.max(t0, tr.t[i])), y(prevD))
        for (let k = i + 1; k < tr.n; k++) {
          const xx = x(tr.t[k])
          ctx.lineTo(xx, y(prevD))
          ctx.lineTo(xx, y(tr.d[k]))
          prevD = tr.d[k]
        }
        ctx.lineTo(x(now), y(prevD))
        ctx.stroke()
        if (prevD > 0.02) {
          ctx.fillStyle = col
          ctx.fillText(`${keyLabel(code) || '␣'} ${prevD.toFixed(2)}`, W - padR + 6, y(prevD) + 4)
        }
      }

      // simulated digital output for the focused key
      if (focus && simRows) {
        const tr = recorder.traces.get(focus)!
        const i0 = Math.max(0, tr.indexAt(t0 - 500))
        const slice = { t: Array.from(tr.t.subarray(i0, tr.n)), d: Array.from(tr.d.subarray(i0, tr.n)) }
        simsRef.current.forEach((sim, r) => {
          const ly = plotH + 8 + r * (laneH + 4)
          ctx.fillStyle = '#101012'
          ctx.fillRect(padL, ly, W - padL - padR, laneH)
          const ev = simulate(slice, 0, slice.t.length - 1, sim.s)
          let start: number | null = null
          let downs = 0
          ctx.fillStyle = sim.color
          for (const e of ev) {
            if (e.down) {
              start = e.t
              if (e.t >= t0) downs++
            } else if (start !== null) {
              const a = x(Math.max(start, t0))
              const b = x(e.t)
              if (b > padL) ctx.fillRect(a, ly + 2, Math.max(2, b - a), laneH - 4)
              start = null
            }
          }
          if (start !== null) {
            const a = x(Math.max(start, t0))
            ctx.fillRect(a, ly + 2, Math.max(2, x(now) - a), laneH - 4)
          }
          ctx.fillStyle = '#a0a0a8'
          ctx.fillText(`${sim.name}`, padL + 6, ly + 12)
          ctx.fillText(`${downs}×`, W - padR + 6, ly + 12)
        })
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [windowMs, travel])

  return <canvas ref={ref} style={{ width: '100%', height, display: 'block' }} />
}
