import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { analyzeRest } from '../analysis/exercises'
import { KeyboardViz } from '../components/KeyboardViz'
import { spring } from '../components/ui'
import { demo } from '../lib/demo'
import { CODE_NAMES } from '../lib/hidCodes'
import { GAMING_HOME, keyLabel, TYPING_HOME } from '../lib/layout'
import { recorder } from '../lib/recorder'
import { useStore } from '../lib/store'
import type { RestMeta } from '../lib/types'
import { clampScore, saveExercise, useNow, useSwallowKeys } from './common'
import type { GameProps } from './types'

type Phase = 'typing' | 'switch' | 'gaming' | 'saving'

const name = (c: string) => CODE_NAMES[c] ?? keyLabel(c)

export function RestGame({ quick, onComplete }: GameProps) {
  const s = useStore()
  const PHASE_MS = quick ? 5000 : 8000
  const [phase, setPhase] = useState<Phase>('typing')
  const start = useRef(performance.now())
  const meta = useRef<RestMeta>({ phases: [] })
  const now = useNow(phase !== 'saving', 50)
  useSwallowKeys(true)

  useEffect(() => {
    if (demo.enabled) demo.restMode = 'typing'
    return () => {
      demo.restMode = null
      demo.clearRest()
    }
  }, [])

  useEffect(() => {
    const el = now - start.current
    if (phase === 'typing' && el >= PHASE_MS) {
      meta.current.phases.push({ name: 'typing', t0: start.current, t1: performance.now(), keys: TYPING_HOME })
      demo.restMode = null
      demo.clearRest()
      start.current = performance.now()
      setPhase('switch')
    } else if (phase === 'switch' && el >= 1800) {
      start.current = performance.now()
      if (demo.enabled) demo.restMode = 'gaming'
      setPhase('gaming')
    } else if (phase === 'gaming' && el >= PHASE_MS) {
      meta.current.phases.push({ name: 'gaming', t0: start.current, t1: performance.now(), keys: GAMING_HOME })
      demo.restMode = null
      demo.clearRest()
      setPhase('saving')
      const first = meta.current.phases[0]
      saveExercise('rest', first.t0, performance.now(), meta.current).then((rec) => {
        const a = analyzeRest(rec)
        const all = a.phases.flatMap((p) => Object.entries(p.keys).filter(([, k]) => !k.pressed).map(([c, k]) => ({ c, v: k.p99, p: p.name })))
        all.sort((x, y) => y.v - x.v)
        const top = all[0]
        const max = top?.v ?? 0
        onComplete({
          score: clampScore(1000 - max * 900),
          headline: max < 0.2 ? 'Main de velours. Tes doigts posés ne pèsent presque rien.' : max < 0.6 ? 'Doigts posés légers, avec un appui sur une touche.' : 'Tu poses du poids sur certaines touches : on en tiendra compte.',
          stats: [
            { label: 'Appui max au repos', value: max.toFixed(2), unit: 'mm' },
            { label: 'Touche la plus chargée', value: top ? name(top.c) : '—' },
            { label: 'Touches posées', value: String(new Set(all.map((x) => x.c)).size) },
          ],
        })
      })
    }
  }, [now, phase])

  const keys = phase === 'typing' ? TYPING_HOME : GAMING_HOME
  const progress = phase === 'typing' || phase === 'gaming' ? Math.min(1, (now - start.current) / PHASE_MS) : 0
  const live = Math.max(0, ...keys.map((c) => recorder.depth(c)))
  const main = 'var(--accent)'

  return (
    <div className="col" style={{ alignItems: 'center', gap: 20, width: '100%' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={phase === 'saving' ? 'gaming' : phase}
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={spring}
          className="col"
          style={{ alignItems: 'center', gap: 6 }}
        >
          <span className="label-mono" style={{ color: main }}>
            {phase === 'typing' ? 'Position 1/2 · frappe' : 'Position 2/2 · jeu'}
          </span>
          <div className="prompt">{phase === 'switch' ? 'Change de position !' : 'Ne bouge plus…'}</div>
          <span className="muted">
            Pose tes doigts sur : <b>{keys.map(name).join(' · ')}</b>
          </span>
        </motion.div>
      </AnimatePresence>
      <div className="progress" style={{ maxWidth: 420 }}>
        <motion.div style={{ background: main }} animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.1 }} />
      </div>
      <span className="num muted">appui : {live.toFixed(2)} mm</span>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <KeyboardViz layout={s.settings.layout} live travel={s.settings.travel} highlight={keys} />
      </div>
    </div>
  )
}
