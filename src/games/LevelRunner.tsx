// Chains levels like a game: title card → 3-2-1 → play → score → next, automatically.
// Space / Enter skips a waiting screen, R retries the level, P pauses the run.

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/icons'
import { Backdrop, Btn, CountUp, ease, MaskText, Pulse, Ring, setFocusMode, spring } from '../components/ui'
import { navigate } from '../lib/router'
import { LEVELS, rankFor } from './levels'
import type { LevelResult } from './types'

type Phase = 'intro' | 'countdown' | 'play' | 'result' | 'summary'

const INTRO_MS = 2600
const RESULT_MS = 3800

const screen = {
  initial: { opacity: 0, filter: 'blur(10px)', scale: 0.985 },
  animate: { opacity: 1, filter: 'blur(0px)', scale: 1, transition: { duration: 0.45, ease } },
  exit: { opacity: 0, filter: 'blur(10px)', scale: 1.01, transition: { duration: 0.28, ease } },
}

const pad = (n: number) => String(n).padStart(2, '0')

export function LevelRunner({ levels, mode }: { levels: typeof LEVELS; mode: 'run' | 'single' }) {
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('intro')
  const [attempt, setAttempt] = useState(0)
  const [results, setResults] = useState<LevelResult[]>([])
  const [paused, setPaused] = useState(false)
  const level = levels[idx]
  const isRun = mode === 'run'
  const last = idx === levels.length - 1

  const next = () => {
    if (last) {
      if (isRun) setPhase('summary')
      else {
        const i = LEVELS.findIndex((l) => l.kind === level.kind)
        const nxt = LEVELS[i + 1]
        navigate(nxt ? `/jouer/${nxt.kind}` : '/reglages')
      }
      return
    }
    setIdx(idx + 1)
    setPhase('intro')
    setPaused(false)
  }
  const startLevel = () => setPhase(level.countdown ? 'countdown' : 'play')
  const retry = () => {
    setResults((r) => r.slice(0, idx))
    setAttempt((a) => a + 1)
    startLevel()
  }

  useEffect(() => setFocusMode(phase === 'countdown' || phase === 'play'), [phase])
  useEffect(() => () => setFocusMode(false), [])

  useEffect(() => {
    if (!isRun || paused) return
    if (phase === 'intro') {
      const id = setTimeout(startLevel, INTRO_MS)
      return () => clearTimeout(id)
    }
    if (phase === 'result' && !results[idx]?.failed) {
      const id = setTimeout(next, RESULT_MS)
      return () => clearTimeout(id)
    }
  }, [phase, idx, paused, isRun])

  const handlers = useRef({ startLevel, next, retry })
  handlers.current = { startLevel, next, retry }
  useEffect(() => {
    if (phase !== 'intro' && phase !== 'result') return
    const armed = performance.now() + 350
    const onKey = (e: KeyboardEvent) => {
      if (performance.now() < armed || e.repeat) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (phase === 'intro') handlers.current.startLevel()
        else handlers.current.next()
      } else if (phase === 'result' && (e.key === 'r' || e.key === 'R')) handlers.current.retry()
      else if (e.key === 'p' || e.key === 'P') setPaused((p) => !p)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  const onComplete = (r: LevelResult) => {
    setResults((prev) => {
      const out = prev.slice(0, idx)
      out[idx] = r
      return out
    })
    setPhase('result')
  }

  const totalXp = results.reduce((s, r) => s + (r?.score ?? 0), 0)

  return (
    <div className="col" style={{ gap: 14 }}>
      {isRun && (
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="label-mono">
            {phase === 'summary' ? 'Parcours terminé' : `${pad(idx + 1)} / ${pad(levels.length)} — ${level.name}`}
          </span>
          <div className="run-dots" style={{ flex: 1, maxWidth: 420, margin: '0 18px' }}>
            {levels.map((l, i) => {
              const done = i < idx || (i === idx && (phase === 'result' || phase === 'summary'))
              return (
                <div key={l.kind} className="run-dot" style={{ flex: 1, overflow: 'hidden' }}>
                  <motion.div
                    style={{ height: '100%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent-glow)' }}
                    initial={false}
                    animate={{ width: done ? '100%' : i === idx && phase === 'play' ? '45%' : '0%' }}
                    transition={{ duration: 0.6, ease }}
                  />
                </div>
              )
            })}
          </div>
          <motion.span key={totalXp} className="num" initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} style={{ fontSize: 12, color: 'var(--accent)', minWidth: 70, textAlign: 'right' }}>
            {totalXp} XP
          </motion.span>
        </div>
      )}

      <div className="card stage" style={{ minHeight: 540 }}>
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div key={`intro-${idx}`} {...screen} className="col" style={{ alignItems: 'center', gap: 16, width: '100%' }}>
              <Backdrop />
              <motion.div
                className="level-icon"
                style={{ position: 'relative' }}
                initial={{ opacity: 0, scale: 0.6, filter: 'blur(8px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ ...spring, delay: 0.05 }}
              >
                <Icon name={level.icon} size={28} />
              </motion.div>
              <span className="label-mono" style={{ position: 'relative' }}>
                {isRun ? `Niveau ${pad(idx + 1)}` : 'Exercice'}
              </span>
              <MaskText text={level.name} className="level-title" delay={0.1} style={{ position: 'relative' }} />
              <motion.p
                className="muted"
                style={{ fontSize: 17, maxWidth: 520, position: 'relative' }}
                initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.6, ease, delay: 0.3 }}
              >
                {level.tagline()}
              </motion.p>
              <motion.div className="col" style={{ alignItems: 'center', marginTop: 14, position: 'relative', gap: 12 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                {isRun && !paused ? (
                  <>
                    <div className="progress" style={{ width: 160 }}>
                      <motion.div initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: INTRO_MS / 1000, ease: 'linear' }} />
                    </div>
                    <span className="hint-key">
                      <span className="kbd">espace</span> lancer · <span className="kbd">P</span> pause
                    </span>
                  </>
                ) : (
                  <Btn className="primary big" onClick={startLevel}>
                    Lancer <Icon name="arrow" size={16} />
                  </Btn>
                )}
              </motion.div>
            </motion.div>
          )}

          {phase === 'countdown' && <Countdown key={`cd-${idx}-${attempt}`} onDone={() => setPhase('play')} />}

          {phase === 'play' && (
            <motion.div key={`play-${idx}-${attempt}`} {...screen} style={{ width: '100%', position: 'relative' }}>
              <level.Game quick={isRun} onComplete={onComplete} />
            </motion.div>
          )}

          {phase === 'result' && results[idx] && (
            <ResultCard
              key={`res-${idx}-${attempt}`}
              result={results[idx]}
              auto={isRun && !paused && !results[idx].failed}
              last={last}
              isRun={isRun}
              onNext={next}
              onRetry={retry}
            />
          )}

          {phase === 'summary' && <Summary key="summary" results={results} levels={levels} onReplay={() => (setResults([]), setIdx(0), setPhase('intro'))} />}
        </AnimatePresence>
      </div>
    </div>
  )
}

function Countdown({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3)
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    if (n < 0) {
      done.current()
      return
    }
    const id = setTimeout(() => setN(n - 1), n === 0 ? 360 : 520)
    return () => clearTimeout(id)
  }, [n])
  return (
    <motion.div key="cd" {...screen} style={{ position: 'relative', display: 'grid', placeItems: 'center', width: '100%', minHeight: 300 }}>
      <Backdrop />
      <AnimatePresence mode="popLayout">
        <motion.div
          key={n}
          className="big-count"
          style={{ color: n <= 0 ? 'var(--accent)' : 'var(--ink)', position: 'relative', textShadow: n <= 0 ? '0 0 40px var(--accent-glow)' : 'none' }}
          initial={{ opacity: 0, scale: 1.5, filter: 'blur(14px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.7, filter: 'blur(10px)' }}
          transition={{ duration: 0.32, ease }}
        >
          {n > 0 ? n : 'GO'}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

function ResultCard({
  result,
  auto,
  last,
  isRun,
  onNext,
  onRetry,
}: {
  result: LevelResult
  auto: boolean
  last: boolean
  isRun: boolean
  onNext: () => void
  onRetry: () => void
}) {
  return (
    <motion.div key="res" {...screen} className="col" style={{ alignItems: 'center', gap: 20, width: '100%', position: 'relative' }}>
      <div className="dotgrid" />
      {!result.failed && result.score >= 700 && <Pulse />}
      <div className="col" style={{ alignItems: 'center', gap: 4, position: 'relative' }}>
        <span className="label-mono">{result.failed ? 'Essai non valide' : 'Score'}</span>
        <div className="xp" style={{ color: result.failed ? 'var(--ink-3)' : 'var(--ink)' }}>
          {result.failed ? '—' : (
            <>
              <span style={{ color: 'var(--accent)' }}>+</span>
              <CountUp value={result.score} duration={0.9} />
              <span className="num" style={{ fontSize: 18, color: 'var(--ink-3)', marginLeft: 8, letterSpacing: 0 }}>
                XP
              </span>
            </>
          )}
        </div>
      </div>
      <motion.p
        style={{ fontSize: 17, maxWidth: 600, position: 'relative', color: 'var(--ink)' }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease }}
      >
        {result.headline}
      </motion.p>
      {result.stats.length > 0 && (
        <div className="row" style={{ justifyContent: 'center', gap: 10, position: 'relative' }}>
          {result.stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="tile stat"
              style={{ minWidth: 150 }}
              initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.5, ease, delay: 0.2 + i * 0.06 }}
            >
              <span className="label">{s.label}</span>
              <span className="value" style={{ fontSize: 26 }}>
                {s.value}
                {s.unit && <small>{s.unit}</small>}
              </span>
            </motion.div>
          ))}
        </div>
      )}
      {result.extra && (
        <motion.div style={{ width: '100%', display: 'flex', justifyContent: 'center', position: 'relative' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
          {result.extra}
        </motion.div>
      )}
      <div className="row" style={{ marginTop: 4, position: 'relative' }}>
        <Btn onClick={onRetry}>
          <Icon name="replay" size={15} /> Refaire
        </Btn>
        <Btn className="primary" onClick={onNext}>
          {auto && <Ring ms={RESULT_MS - 50} color="var(--accent-ink)" size={18} />}
          {last ? (isRun ? 'Voir le bilan' : 'Exercice suivant') : 'Niveau suivant'} <Icon name="arrow" size={15} />
        </Btn>
      </div>
      <span className="hint-key" style={{ position: 'relative' }}>
        <span className="kbd">espace</span> continuer · <span className="kbd">R</span> refaire
      </span>
    </motion.div>
  )
}

function Summary({ results, levels, onReplay }: { results: LevelResult[]; levels: typeof LEVELS; onReplay: () => void }) {
  const xp = results.reduce((s, r) => s + (r?.score ?? 0), 0)
  const rank = rankFor(xp)
  return (
    <motion.div key="sum" {...screen} className="col" style={{ alignItems: 'center', gap: 22, width: '100%', position: 'relative' }}>
      <Backdrop />
      <Pulse rings={4} />
      <motion.div
        style={{ fontFamily: 'var(--title)', fontWeight: 900, fontSize: 150, lineHeight: 1, color: 'var(--accent)', textShadow: '0 0 60px var(--accent-glow)', position: 'relative' }}
        initial={{ opacity: 0, scale: 2, filter: 'blur(20px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {rank.name}
      </motion.div>
      <div className="col" style={{ alignItems: 'center', gap: 2, position: 'relative' }}>
        <span className="label-mono">Score total</span>
        <span className="xp" style={{ fontSize: 56 }}>
          <CountUp value={xp} duration={1.4} />
          <span className="num" style={{ fontSize: 16, color: 'var(--ink-3)', marginLeft: 8, letterSpacing: 0 }}>
            / {levels.length * 1000} XP
          </span>
        </span>
      </div>
      <div className="col" style={{ width: '100%', maxWidth: 520, gap: 10, position: 'relative' }}>
        {levels.map((l, i) => {
          const sc = results[i]?.score ?? 0
          return (
            <motion.div
              key={l.kind}
              className="row"
              style={{ gap: 12, flexWrap: 'nowrap' }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, ease, delay: 0.4 + i * 0.06 }}
            >
              <span className="label-mono" style={{ width: 22 }}>
                {pad(i + 1)}
              </span>
              <span style={{ width: 100, textAlign: 'left', fontSize: 13.5 }}>{l.name}</span>
              <div className="bar-track" style={{ flex: 1 }}>
                <motion.div
                  className="bar-fill"
                  style={{ background: 'var(--accent)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${sc / 10}%` }}
                  transition={{ duration: 0.9, ease, delay: 0.5 + i * 0.06 }}
                />
              </div>
              <span className="num" style={{ width: 44, textAlign: 'right', fontSize: 12.5 }}>
                {sc}
              </span>
            </motion.div>
          )
        })}
      </div>
      <div className="row" style={{ marginTop: 6, position: 'relative' }}>
        <Btn onClick={onReplay}>
          <Icon name="replay" size={15} /> Rejouer
        </Btn>
        <Btn className="primary big" onClick={() => navigate('/reglages')}>
          Voir mes réglages <Icon name="arrow" size={16} />
        </Btn>
      </div>
    </motion.div>
  )
}
