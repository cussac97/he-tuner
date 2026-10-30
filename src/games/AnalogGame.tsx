import { useEffect, useRef } from 'react'
import { analyzeAnalog } from '../analysis/exercises'

import { demo } from '../lib/demo'
import { keyLabel } from '../lib/layout'
import { recorder } from '../lib/recorder'
import { analogTarget } from '../lib/sample'
import { useStore } from '../lib/store'
import type { AnalogMeta } from '../lib/types'
import { clampScore, saveExercise, useSwallowKeys } from './common'
import type { GameProps } from './types'

export const ANALOG_CODE = 'KeyW'
const BAND = 0.3

export function AnalogGame({ quick, onComplete }: GameProps) {
  const s = useStore()
  const travel = s.settings.travel
  const DURATION = quick ? 14000 : 20000
  const meta = useRef<AnalogMeta>({ code: ANALOG_CODE, t0: performance.now(), path: [] })
  const seed = useRef(Math.random() * 10)
  const band = useRef<HTMLDivElement>(null)
  const marker = useRef<HTMLDivElement>(null)
  const fill = useRef<HTMLDivElement>(null)
  const timeEl = useRef<HTMLSpanElement>(null)
  const scoreEl = useRef<HTMLSpanElement>(null)
  const main = 'var(--accent)'
  useSwallowKeys(true)

  useEffect(() => {
    if (demo.enabled) demo.slowCode = ANALOG_CODE
    return () => {
      demo.slowCode = null
    }
  }, [])

  useEffect(() => {
    let raf = 0
    let lastSample = 0
    let inBand = 0
    let n = 0
    let done = false
    const t0 = meta.current.t0
    const loop = () => {
      const now = performance.now()
      const el = now - t0
      const target = analogTarget(seed.current, el, travel)
      const d = recorder.depth(ANALOG_CODE)
      if (now - lastSample >= 20) {
        meta.current.path.push({ t: now, target })
        lastSample = now
        if (el > 1500) {
          n++
          if (Math.abs(d - target) <= BAND) inBand++
        }
      }
      const pct = (v: number) => `${(v / travel) * 100}%`
      const ok = Math.abs(d - target) <= BAND
      if (band.current) {
        band.current.style.top = pct(target - BAND)
        band.current.style.height = pct(2 * BAND)
        band.current.style.transform = `scaleX(${ok ? 1.04 : 1})`
      }
      if (marker.current) {
        marker.current.style.top = pct(d)
        marker.current.style.background = ok ? main : 'var(--ink)'
      }
      if (fill.current) fill.current.style.height = pct(d)
      if (timeEl.current) timeEl.current.textContent = Math.max(0, (DURATION - el) / 1000).toFixed(1)
      if (scoreEl.current) scoreEl.current.textContent = n ? `${Math.round((inBand / n) * 100)}%` : '—'
      if (el >= DURATION && !done) {
        done = true
        demo.slowCode = null
        saveExercise('analog', t0, performance.now(), meta.current).then((rec) => {
          const a = analyzeAnalog(rec)
          onComplete(
            a
              ? {
                  score: clampScore(a.inBand * 1000),
                  headline: a.inBand > 0.85 ? 'Contrôle chirurgical de la course.' : a.inBand > 0.6 ? 'Bon contrôle, quelques écarts.' : 'Le dosage à mi-course est difficile pour toi : on adaptera la courbe.',
                  stats: [
                    { label: 'Dans la zone', value: String(Math.round(a.inBand * 100)), unit: '%' },
                    { label: 'Erreur moyenne', value: a.rms.toFixed(2), unit: 'mm' },
                    { label: 'Délai de suivi', value: String(a.lag), unit: 'ms' },
                  ],
                }
              : { score: 0, headline: 'Pas assez de données : garde la touche active pendant le chrono.', stats: [], failed: true },
          )
        })
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [travel])

  return (
    <div className="row" style={{ gap: 48, alignItems: 'center', justifyContent: 'center' }}>
      <div className="gauge">
        <div className="fill" ref={fill} />
        <div className="band" ref={band} style={{ transition: 'transform .15s' }} />
        <div className="marker" ref={marker} />
      </div>
      <div className="col" style={{ textAlign: 'left', gap: 18 }}>
        <div className="stat">
          <span className="label">Temps</span>
          <span className="value num" ref={timeEl}>
            {(DURATION / 1000).toFixed(1)}
          </span>
        </div>
        <div className="stat">
          <span className="label">Dans la zone</span>
          <span className="value" ref={scoreEl} style={{ color: main }}>
            —
          </span>
        </div>
        <span className="muted">
          Touche <span className="kbd">{keyLabel(ANALOG_CODE)}</span> — enfonce plus ou moins
          {demo.enabled && <><br />(démo : maintenir = descendre)</>}
        </span>
      </div>
    </div>
  )
}
