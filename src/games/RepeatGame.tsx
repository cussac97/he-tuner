import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { fixed, median, rapid } from '../analysis/core'
import { analyzeRepeat, detectTaps } from '../analysis/exercises'
import { Bars } from '../components/Charts'
import { LiveTrace } from '../components/LiveTrace'
import { tr, useT } from '../i18n'
import { repeatText } from '../i18n/games/repeat'
import { scenariosText } from '../i18n/games/scenarios'
import { keyLabel } from '../lib/layout'
import { recorder } from '../lib/recorder'
import { useStore } from '../lib/store'
import { clampScore, saveExercise, useNow, useSwallowKeys } from './common'
import type { GameProps } from './types'

export const REPEAT_CODE = 'KeyF'

const SCENARIOS = [
  { name: () => tr(scenariosText).fixed('1.5'), s: fixed(1.5) },
  { name: () => tr(scenariosText).fixed('0.5'), s: fixed(0.5) },
  { name: () => 'Rapid Trigger 0.3', s: rapid(0.5, 0.3) },
  { name: () => 'Rapid Trigger 0.15', s: rapid(0.5, 0.15) },
]

export function RepeatGame({ quick, onComplete }: GameProps) {
  const s = useStore()
  const t = useT(repeatText)
  const DURATION = quick ? 7000 : 10000
  const code = REPEAT_CODE
  const t0 = useRef(performance.now())
  const [saving, setSaving] = useState(false)
  const now = useNow(!saving, 60)
  useSwallowKeys(true)
  const main = 'var(--accent)'
  const soft = 'var(--accent-soft)'

  const trace = recorder.traces.get(code)
  const taps = trace ? detectTaps({ t: Array.from(trace.t.subarray(0, trace.n)), d: Array.from(trace.d.subarray(0, trace.n)) }, t0.current, now).length : 0
  const downs = recorder.keyEvents.filter((e) => e.type === 'down' && !e.repeat && e.code === code && e.t >= t0.current).length
  const left = Math.max(0, DURATION - (now - t0.current))

  useEffect(() => {
    if (saving || left > 0) return
    setSaving(true)
    const t1 = performance.now()
    saveExercise('repeat', t0.current, t1, { code, t0: t0.current, t1 }).then((rec) => {
      const a = analyzeRepeat(rec, SCENARIOS.map((x) => ({ name: x.name(), s: x.s })))
      // getters: the score screen follows a language change
      if (!a) {
        onComplete({
          score: 0,
          get headline() {
            return tr(repeatText).failed
          },
          stats: [],
          failed: true,
        })
        return
      }
      const lost = Math.max(0, a.taps.length - a.observedDowns)
      onComplete({
        score: clampScore(a.freq * 115),
        get headline() {
          const m = tr(repeatText)
          return lost > 0 ? m.headlineLost(lost) : a.freq > 8 ? m.headlineFast : m.headlineOk
        },
        get stats() {
          const m = tr(repeatText)
          return [
            { label: m.realTaps, value: String(a.taps.length) },
            { label: m.rate, value: a.freq.toFixed(1), unit: m.tapsPerSec },
            { label: m.received, value: String(a.observedDowns) },
            { label: m.lift, value: median(a.lifts).toFixed(1), unit: 'mm' },
          ]
        },
        get extra() {
          return (
            <div style={{ width: '100%', maxWidth: 560, textAlign: 'left' }}>
              <Bars rows={a.results.map((r, i) => ({ label: SCENARIOS[i].name(), value: (r.registered / a.taps.length) * 100 }))} unit="%" lowerIsBetter={false} />
            </div>
          )
        },
      })
    })
  }, [left, saving])

  return (
    <div className="col" style={{ alignItems: 'center', gap: 18, width: '100%' }}>
      <div className="row" style={{ gap: 40, justifyContent: 'center' }}>
        <div className="col" style={{ alignItems: 'center', gap: 0 }}>
          <span className="eyebrow">{t.liveTaps}</span>
          <AnimatePresence mode="popLayout">
            <motion.span
              key={taps}
              className="xp"
              style={{ color: main }}
              initial={{ scale: 1.5, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 600, damping: 20 }}
            >
              {taps}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="col" style={{ alignItems: 'center', gap: 0 }}>
          <span className="eyebrow">{t.liveReceived}</span>
          <span className="xp" style={{ color: 'var(--ink-3)' }}>
            {downs}
          </span>
        </div>
        <div className="col" style={{ alignItems: 'center', gap: 0 }}>
          <span className="eyebrow">{t.liveTime}</span>
          <span className="xp num" style={{ fontSize: 56 }}>
            {(left / 1000).toFixed(1)}
          </span>
        </div>
      </div>
      <motion.div
        key={taps}
        initial={{ y: 6, scale: 0.94 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 700, damping: 18 }}
        className="kbd"
        style={{ fontSize: 30, padding: '14px 26px', borderRadius: 18, background: soft, boxShadow: `0 6px 0 ${main}` }}
      >
        {keyLabel(code)}
      </motion.div>
      <div style={{ width: '100%' }}>
        <LiveTrace onlyCodes={[code]} travel={s.settings.travel} height={170} windowMs={2000} />
      </div>
    </div>
  )
}
