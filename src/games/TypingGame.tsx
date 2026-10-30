// Monkeytype-style typing test: minimal, centred, smooth caret, Tab to restart.
// Every keystroke is also classified (correct / wrong / extra…) for the analog analysis.

import { motion } from 'framer-motion'
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import { median } from '../analysis/core'
import { analyzeTyping } from '../analysis/typing'
import { KeyboardViz } from '../components/KeyboardViz'
import { setFocusMode } from '../components/ui'
import { codeForChar } from '../lib/layout'
import { store, useStore } from '../lib/store'
import type { TypingKey, TypingMeta } from '../lib/types'
import { composeDead, randomWords, TypingEngine } from '../lib/typing'
import { clampScore, saveExercise, useNow } from './common'
import type { GameProps } from './types'

const LINE_H = 30 * 1.7

export function TypingGame({ quick, onComplete }: GameProps) {
  const s = useStore()
  const [lang, setLang] = useState(s.settings.lang)
  const [duration, setDuration] = useState(quick ? 30 : s.settings.duration)
  const [accents, setAccents] = useState(true)
  const [seed, setSeed] = useState(0)
  const words = useMemo(() => randomWords(lang, 300, Math.random, lang === 'fr' && accents), [lang, accents, seed])
  const [phase, setPhase] = useState<'ready' | 'running' | 'saving'>('ready')
  const engine = useRef<TypingEngine | null>(null)
  const startT = useRef(0)
  const learned = useRef(new Map<string, string>())
  const deadKey = useRef(false)
  const [, bump] = useReducer((x: number) => x + 1, 0)
  const [winFocus, setWinFocus] = useState(() => document.hasFocus())
  const now = useNow(phase === 'running', 100)
  const elapsed = phase === 'running' ? now - startT.current : 0
  const remaining = Math.max(0, duration * 1000 - elapsed)
  const main = 'var(--accent)'

  useEffect(() => {
    const f = () => setWinFocus(true)
    const b = () => setWinFocus(false)
    window.addEventListener('focus', f)
    window.addEventListener('blur', b)
    return () => {
      window.removeEventListener('focus', f)
      window.removeEventListener('blur', b)
      setFocusMode(false)
    }
  }, [])

  useEffect(() => setFocusMode(phase === 'running'), [phase])

  const codeFor = (ch: string) => learned.current.get(ch) ?? codeForChar(ch)

  const restart = () => {
    engine.current = null
    setPhase('ready')
    setSeed((x) => x + 1)
  }

  const finish = async () => {
    const eng = engine.current
    if (!eng) return
    setPhase('saving')
    const t1 = performance.now()
    const st = eng.stats(t1 - startT.current)
    const meta: TypingMeta = {
      lang,
      duration,
      words: words.slice(0, eng.wordIdx + 1),
      keys: eng.keys,
      timeline: eng.timeline,
      wpm: st.wpm,
      rawWpm: st.rawWpm,
      accuracy: st.accuracy,
    }
    const rec = await saveExercise('typing', startT.current - 400, t1, meta)
    const a = analyzeTyping(rec, store.settings.layout)
    const acts = Object.values(a.actPerKey).flatMap((x) => new Array(x.n).fill(x.a) as number[])
    const cur = acts.length ? median(acts) : NaN
    onComplete({
      score: clampScore(st.wpm * st.accuracy * st.accuracy * 7.5),
      headline:
        st.wpm >= 100
          ? `${Math.round(st.wpm)} mots/min. Tes doigts vont plus vite que ton ombre.`
          : st.wpm >= 60
            ? `${Math.round(st.wpm)} mots/min, solide !`
            : `${Math.round(st.wpm)} mots/min : on mesure surtout comment tu frappes, pas la vitesse.`,
      stats: [
        { label: 'Vitesse', value: String(Math.round(st.wpm)), unit: 'mots/min' },
        { label: 'Précision', value: String(Math.round(st.accuracy * 100)), unit: '%' },
        { label: a.measured ? 'Actuation lue' : 'Actuation estimée', value: Number.isFinite(cur) ? cur.toFixed(2) : '—', unit: 'mm' },
        { label: 'Caractères parasites', value: String(a.counts.accidental) },
      ],
      extra: <WpmChart keys={eng.keys} t0={startT.current} seconds={duration} color={main} />,
    })
  }

  useEffect(() => {
    if (phase === 'running' && remaining <= 0) finish()
  })

  useEffect(() => {
    if (phase === 'saving') return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey) return
      if (e.key === 'Tab') {
        e.preventDefault()
        restart()
        return
      }
      if (e.repeat) return
      const printable = e.key.length === 1
      if (e.key === 'Dead') deadKey.current = true
      else if (!printable && !['Shift', 'CapsLock', 'Alt', 'AltGraph'].includes(e.key)) deadKey.current = false
      if (!printable && e.key !== 'Backspace') {
        // modifiers, dead keys (^ for ê): recorded as deliberate presses
        if (phase === 'running') engine.current?.press(e.timeStamp, e.code, e.key)
        return
      }
      if (e.ctrlKey && e.key !== 'Backspace') return
      e.preventDefault()
      if (printable) learned.current.set(e.key.toLowerCase(), e.code)
      if (phase === 'ready') {
        if (!printable || e.key === ' ') return
        startT.current = e.timeStamp
        engine.current = new TypingEngine(words, codeFor, e.timeStamp - 1)
        setPhase('running')
      }
      let key = e.key
      if (deadKey.current && printable) {
        key = composeDead(key, engine.current!.expectedChar())
        deadKey.current = false
      }
      engine.current!.press(e.timeStamp, e.code, key, e.altKey || e.ctrlKey)
      bump()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, words])

  // caret position + line scrolling
  const inner = useRef<HTMLDivElement>(null)
  const cur = useRef<HTMLSpanElement>(null)
  const [caret, setCaret] = useState({ x: 0, y: 0 })
  const [offset, setOffset] = useState(0)
  useLayoutEffect(() => {
    const w = cur.current
    if (!w) return
    const typedLen = engine.current?.typed.length ?? 0
    const chars = w.querySelectorAll<HTMLSpanElement>('.ch')
    let x = w.offsetLeft
    if (typedLen < chars.length) x += chars[typedLen].offsetLeft
    else x += w.offsetWidth
    const y = w.offsetTop
    setCaret((c) => (c.x === x && c.y === y ? c : { x, y }))
    const line = Math.round(y / LINE_H)
    setOffset(Math.max(0, line - 1) * LINE_H)
  })

  const eng = engine.current
  const wordIdx = eng?.wordIdx ?? 0
  const liveWpm = eng && elapsed > 1500 ? Math.round(eng.stats(elapsed).wpm) : 0

  return (
    <div className="type-wrap">
      <motion.div className="type-bar" animate={{ opacity: phase === 'ready' && !quick ? 1 : 0 }} style={{ pointerEvents: phase === 'ready' && !quick ? 'auto' : 'none' }}>
        <div className="seg">
          {[15, 30, 60].map((d) => (
            <button key={d} className={duration === d ? 'on' : ''} onClick={() => (setDuration(d), store.updateSettings({ duration: d }))}>
              {d}s
            </button>
          ))}
        </div>
        <div className="seg">
          {(['fr', 'en'] as const).map((l) => (
            <button key={l} className={lang === l ? 'on' : ''} onClick={() => (setLang(l), store.updateSettings({ lang: l }))}>
              {l === 'fr' ? 'français' : 'english'}
            </button>
          ))}
        </div>
        {lang === 'fr' && (
          <div className="seg">
            <button className={accents ? 'on' : ''} onClick={() => setAccents((a) => !a)}>
              accents {accents ? 'é' : 'e'}
            </button>
          </div>
        )}
      </motion.div>

      <div className="type-live" style={{ color: main }}>
        <span>{phase === 'running' ? Math.ceil(remaining / 1000) : duration}</span>
        {phase === 'running' && (
          <span>
            {liveWpm}
            <small> mots/min</small>
          </span>
        )}
        {phase === 'saving' && <small>analyse de tes frappes…</small>}
      </div>

      <div className={`words ${!winFocus ? 'blur' : ''}`}>
        <div className="words-inner" ref={inner} style={{ transform: `translateY(${-offset}px)`, position: 'relative' }}>
          {words.map((w, i) => {
            if (i < wordIdx && eng) {
              const r = eng.results[i]
              return (
                <span key={i} className={`word ${r.typed !== r.word ? 'err' : ''}`}>
                  {w.split('').map((c, k) => (
                    <span key={k} className={`ch ${k < r.typed.length ? (r.typed[k] === c ? 'ok' : 'bad') : ''}`}>
                      {c}
                    </span>
                  ))}
                  {r.typed.length > w.length && <span className="ch extra">{r.typed.slice(w.length)}</span>}
                </span>
              )
            }
            if (i === wordIdx) {
              const typed = eng?.typed ?? ''
              return (
                <span key={i} className="word" ref={cur}>
                  {w.split('').map((c, k) => (
                    <span key={k} className={`ch ${k < typed.length ? (typed[k] === c ? 'ok' : 'bad') : ''}`}>
                      {c}
                    </span>
                  ))}
                  {typed.length > w.length && <span className="ch extra">{typed.slice(w.length)}</span>}
                </span>
              )
            }
            if (i > wordIdx + 60) return null
            return (
              <span key={i} className="word">
                {w}
              </span>
            )
          })}
          <motion.div
            className={`caret ${phase === 'ready' ? 'idle' : ''}`}
            style={{ background: main, top: (LINE_H - 36) / 2 }}
            animate={{ x: caret.x - 1, y: caret.y }}
            transition={{ type: 'tween', ease: 'easeOut', duration: phase === 'running' ? 0.09 : 0 }}
          />
        </div>
        {!winFocus && <div className="focus-hint">Clique ici ou appuie sur une touche pour reprendre</div>}
      </div>

      <div className="type-foot">
        <span>
          <span className="kbd">tab</span> recommencer
        </span>
        <span>{phase === 'ready' ? 'commence à taper quand tu veux' : `${eng?.keys.filter((k) => k.cls !== 'other').length ?? 0} frappes`}</span>
      </div>

      <motion.div animate={{ opacity: phase === 'running' ? 0.35 : 0.8 }} style={{ maxWidth: 560, margin: '34px auto 0' }}>
        <KeyboardViz layout={s.settings.layout} live travel={s.settings.travel} />
      </motion.div>
    </div>
  )
}

/** Speed over the test, monkeytype-style: wpm, raw and errors per second. */
function WpmChart({ keys, t0, seconds, color }: { keys: TypingKey[]; t0: number; seconds: number; color: string }) {
  const pts = useMemo(() => {
    const out: Array<{ s: number; wpm: number; raw: number; err: number }> = []
    for (let s = 1; s <= seconds; s++) {
      const until = t0 + s * 1000
      const upto = keys.filter((k) => k.t <= until)
      const ok = upto.filter((k) => k.cls === 'correct' || k.cls === 'space').length
      const all = upto.filter((k) => k.cls !== 'other' && k.cls !== 'back').length
      const err = keys.filter((k) => k.t > until - 1000 && k.t <= until && (k.cls === 'wrong' || k.cls === 'extra')).length
      out.push({ s, wpm: ok / 5 / (s / 60), raw: all / 5 / (s / 60), err })
    }
    return out.slice(1)
  }, [keys, t0, seconds])
  if (pts.length < 2) return null
  const W = 640
  const H = 180
  const pad = 30
  const max = Math.max(...pts.map((p) => Math.max(p.wpm, p.raw))) * 1.1 || 1
  const x = (s: number) => pad + ((s - pts[0].s) / (pts[pts.length - 1].s - pts[0].s)) * (W - 2 * pad)
  const y = (v: number) => H - pad - (v / max) * (H - 2 * pad)
  const line = (k: 'wpm' | 'raw') => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.s)},${y(p[k])}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 640, height: 'auto' }}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={pad} x2={W - pad} y1={y(max * f * 0.9)} y2={y(max * f * 0.9)} stroke="var(--line)" />
          <text x={4} y={y(max * f * 0.9) + 4} fontSize="11" fill="var(--ink-3)" fontFamily="var(--mono)">
            {Math.round(max * f * 0.9)}
          </text>
        </g>
      ))}
      <motion.path d={line('raw')} fill="none" stroke="var(--ink-3)" strokeWidth={2} strokeDasharray="4 5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: 'easeOut' }} />
      <motion.path d={line('wpm')} fill="none" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: 'easeOut' }} />
      {pts
        .filter((p) => p.err > 0)
        .map((p) => (
          <motion.text key={p.s} x={x(p.s)} y={pad - 6} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--red)" initial={{ opacity: 0, y: pad - 16 }} animate={{ opacity: 1, y: pad - 6 }} transition={{ delay: 1 + p.s * 0.01 }}>
            ×
          </motion.text>
        ))}
      <text x={W - pad} y={H - 8} textAnchor="end" fontSize="11" fill="var(--ink-3)">
        secondes · ━ mots/min · ┅ brut · × fautes
      </text>
    </svg>
  )
}
