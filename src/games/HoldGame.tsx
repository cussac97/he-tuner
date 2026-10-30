import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { ceil05, quantile } from '../analysis/core'
import { analyzeHold } from '../analysis/exercises'
import { spring } from '../components/ui'
import { keyLabel } from '../lib/layout'
import { recorder } from '../lib/recorder'
import { useStore } from '../lib/store'
import type { HoldMeta } from '../lib/types'
import { clampScore, saveExercise, useNow, useSwallowKeys } from './common'
import type { GameProps } from './types'

export const HOLD_CODE = 'KeyW'

type Phase = 'wait' | 'hold' | 'release' | 'pause' | 'saving'

export function HoldGame({ quick, onComplete }: GameProps) {
  const s = useStore()
  const HOLD_MS = quick ? 2500 : 4000
  const REPS = 3
  const [phase, setPhase] = useState<Phase>('wait')
  const meta = useRef<HoldMeta>({ code: HOLD_CODE, windows: [] })
  const t = useRef({ start: 0, holdStart: 0, pauseStart: 0 })
  const now = useNow(phase !== 'saving', 30)
  useSwallowKeys(true)
  const travel = s.settings.travel
  const depth = recorder.depth(HOLD_CODE)
  const label = keyLabel(HOLD_CODE)
  const main = 'var(--accent)'
  const soft = 'var(--accent-soft)'

  useEffect(() => {
    if (phase === 'wait' && depth >= travel * 0.5) {
      t.current.holdStart = performance.now()
      t.current.start = performance.now() - 300
      setPhase('hold')
    } else if (phase === 'hold') {
      if (depth < travel * 0.3) setPhase('wait')
      else if (now - t.current.holdStart >= HOLD_MS) setPhase('release')
    } else if (phase === 'release' && depth < 0.15) {
      meta.current.windows.push({ t0: t.current.start, t1: performance.now() + 100 })
      if (meta.current.windows.length >= REPS) {
        setPhase('saving')
        const w = meta.current.windows
        saveExercise('hold', w[0].t0, w[w.length - 1].t1, meta.current).then((rec) => {
          const res = analyzeHold(rec)
          const dd = res.length ? quantile(res.map((r) => r.drawdown), 0.95) : NaN
          const level = res.length ? res.reduce((a, r) => a + r.level, 0) / res.length : NaN
          const pinned = Number.isFinite(level) && level >= travel * 0.98
          onComplete({
            score: clampScore(Number.isFinite(dd) ? 1000 - dd * 2500 : 400),
            headline: pinned
              ? 'Tu tiens la touche en butée : rien ne bouge (le capteur est au maximum).'
              : dd < 0.08
                ? 'Solide comme un roc, presque aucun tremblement.'
                : `Ton doigt oscille de ${dd.toFixed(2)} mm en maintien.`,
            stats: [
              { label: 'Oscillation max', value: Number.isFinite(dd) ? dd.toFixed(2) : '—', unit: 'mm' },
              { label: 'Profondeur tenue', value: Number.isFinite(level) ? level.toFixed(2) : '—', unit: 'mm' },
              { label: 'RT sûr à partir de', value: Number.isFinite(dd) ? Math.max(0.15, ceil05(dd + 0.05)).toFixed(2) : '—', unit: 'mm' },
            ],
          })
        })
      } else {
        t.current.pauseStart = performance.now()
        setPhase('pause')
      }
    } else if (phase === 'pause' && now - t.current.pauseStart > 600) setPhase('wait')
  }, [now, depth, phase])

  const rep = Math.min(meta.current.windows.length + 1, REPS)
  const fill = phase === 'hold' ? Math.min(1, (now - t.current.holdStart) / HOLD_MS) : phase === 'release' || phase === 'pause' ? 1 : 0
  const R = 92
  const C = 2 * Math.PI * R
  const text = phase === 'wait' ? `Appuie sur ${label}` : phase === 'hold' ? 'Tiens bon…' : phase === 'release' ? 'Lâche !' : phase === 'pause' ? 'Nickel' : '…'

  return (
    <div className="col" style={{ alignItems: 'center', gap: 22 }}>
      <div className="run-dots">
        {Array.from({ length: REPS }, (_, i) => (
          <motion.div
            key={i}
            className="run-dot"
            animate={{ width: i + 1 === rep ? 34 : 12, background: i < meta.current.windows.length ? main : i + 1 === rep ? 'var(--ink)' : 'var(--bg-2)' }}
            transition={spring}
          />
        ))}
      </div>
      <div style={{ position: 'relative', width: 220, height: 220 }}>
        <svg width={220} height={220} className="ring">
          <circle cx={110} cy={110} r={R} fill={soft} stroke="var(--bg-2)" strokeWidth={14} />
          <motion.circle
            cx={110}
            cy={110}
            r={R}
            fill="none"
            stroke={main}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={C}
            animate={{ strokeDashoffset: C * (1 - fill) }}
            transition={{ duration: 0.05 }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <motion.div
            className="kbd"
            animate={{ y: (depth / travel) * 14, scale: phase === 'release' ? [1, 1.1, 1] : 1 }}
            transition={{ y: { duration: 0.03 }, scale: { repeat: Infinity, duration: 0.5 } }}
            style={{ fontSize: 34, padding: '14px 24px', borderRadius: 18 }}
          >
            {label}
          </motion.div>
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={text} className="prompt" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring}>
          {text}
        </motion.div>
      </AnimatePresence>
      <span className="num muted">{depth.toFixed(2)} mm</span>
    </div>
  )
}
