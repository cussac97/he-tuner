import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { fixed, rapid, round05 } from '../analysis/core'
import { analyzeStrafe } from '../analysis/exercises'
import { estimateActuation, fromHardware } from '../analysis/typing'
import { Bars } from '../components/Charts'
import { spring } from '../components/ui'
import { tr, useT } from '../i18n'
import { scenariosText } from '../i18n/games/scenarios'
import { strafeText } from '../i18n/games/strafe'
import { keyLabel } from '../lib/layout'
import { recorder } from '../lib/recorder'
import type { StrafeMeta } from '../lib/types'
import { clampScore, saveExercise, useSwallowKeys } from './common'
import type { GameProps } from './types'

export const LEFT = 'KeyA'
export const RIGHT = 'KeyD'

function makePrompts(t0: number, n: number, quick: boolean): StrafeMeta['prompts'] {
  const out: StrafeMeta['prompts'] = []
  let t = t0 + 500
  let dir: -1 | 0 | 1 = 0
  for (let i = 0; i < n; i++) {
    const opts = ([-1, 0, 1] as const).filter((x) => x !== dir)
    const weighted = [...opts, ...opts.filter((x) => x !== 0)]
    dir = weighted[Math.floor(Math.random() * weighted.length)]
    out.push({ t, dir })
    t += (quick ? 380 : 450) + Math.random() * (quick ? 380 : 450)
  }
  out.push({ t, dir: 0 })
  return out
}

export function StrafeGame({ quick, onComplete }: GameProps) {
  const N = quick ? 24 : 36
  const prompts = useRef(makePrompts(performance.now(), N, quick))
  const [idx, setIdx] = useState(-1)
  const [saving, setSaving] = useState(false)
  const player = useRef<HTMLDivElement>(null)
  const score = useRef({ ok: 0, total: 0 })
  const held = useRef({ l: false, r: false })
  useSwallowKeys(true)
  const t = useT(strafeText)
  const main = 'var(--accent)'
  const soft = 'var(--accent-soft)'
  const L = keyLabel(LEFT)
  const R = keyLabel(RIGHT)

  useEffect(
    () =>
      recorder.onKey((e) => {
        if (e.code === LEFT) held.current.l = e.type === 'down'
        if (e.code === RIGHT) held.current.r = e.type === 'down'
      }),
    [],
  )

  useEffect(() => {
    let raf = 0
    let x = 0.5
    let last = performance.now()
    const loop = () => {
      const now = performance.now()
      const dt = (now - last) / 1000
      last = now
      const { l, r } = held.current
      const dir = l && !r ? -1 : r && !l ? 1 : 0
      x = Math.min(0.96, Math.max(0.04, x + dir * 0.6 * dt))
      const ps = prompts.current
      let i = -1
      while (i + 1 < ps.length && ps[i + 1].t <= now) i++
      const p = ps[Math.max(0, i)]
      if (i >= 0 && now - p.t > 160) {
        score.current.total += dt
        if (dir === p.dir) score.current.ok += dt
      }
      if (player.current) {
        player.current.style.left = `${x * 100}%`
        player.current.style.background = i >= 0 && dir === p.dir ? main : 'var(--ink)'
        player.current.style.transform = `scale(${dir ? 1.12 : 1})`
      }
      setIdx((cur) => (cur !== i ? i : cur))
      if (now > ps[ps.length - 1].t + 450) {
        finish()
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const finish = async () => {
    setSaving(true)
    const ps = prompts.current
    const rec = await saveExercise('strafe', ps[0].t - 500, ps[ps.length - 1].t + 400, { left: LEFT, right: RIGHT, prompts: ps })
    const downs = rec.keys.filter((k) => k.type === 'down' && !k.repeat && (k.code === LEFT || k.code === RIGHT))
    const hwInfo = fromHardware(rec.hw, downs, rec.traces)
    const est = hwInfo ?? estimateActuation(downs, rec.traces)
    const vals = Object.values(est.perKey)
    const current = vals.length && (hwInfo || downs.length >= 10) ? round05(vals.reduce((s, v) => s + v.a * v.n, 0) / vals.reduce((s, v) => s + v.n, 0)) : null
    const cur = current ?? 1.5
    // chart labels are rebuilt on each read so they follow a language change
    const names = () => [tr(scenariosText).current(cur.toFixed(1)), tr(scenariosText).fixed('1.5'), 'Rapid Trigger 0.3', 'Rapid Trigger 0.15']
    const [n0, n1, n2, n3] = names()
    const a = analyzeStrafe(rec, [
      { name: n0, s: fixed(cur), socd: 'none' },
      { name: n1, s: fixed(1.5), socd: 'none' },
      { name: n2, s: rapid(0.5, 0.3), socd: 'none' },
      { name: n3, s: rapid(0.5, 0.15), socd: 'none' },
    ])
    const pct = score.current.total ? score.current.ok / score.current.total : 0
    const stops = a?.results.map((r) => r.stopDelay).filter(Number.isFinite) ?? []
    const gain = a && stops.length >= 2 ? a.results[0].stopDelay - Math.min(...stops) : NaN
    // getters: the score screen follows a language change
    onComplete({
      score: clampScore(pct * 1000),
      get headline() {
        const m = tr(strafeText)
        return a && a.overlapRate > 0.3
          ? m.headlineOverlap(Math.round(a.overlapRate * 100))
          : Number.isFinite(gain) && gain > 3
            ? m.headlineGain(Math.round(gain))
            : m.headlineClean
      },
      get stats() {
        const m = tr(strafeText)
        return [
          { label: m.rightDir, value: String(Math.round(pct * 100)), unit: '%' },
          { label: m.switches, value: String(a?.transitions ?? 0) },
          { label: m.overlaps, value: String(a ? Math.round(a.overlapRate * 100) : 0), unit: '%' },
        ]
      },
      get extra() {
        if (!a) return undefined
        const labels = names()
        return (
          <div style={{ width: '100%', maxWidth: 560, textAlign: 'left' }}>
            <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
              {tr(strafeText).chartTitle}
            </p>
            <Bars rows={a.results.map((r, i) => ({ label: labels[i] ?? r.name, value: r.stopDelay }))} unit="ms" />
          </div>
        )
      },
    })
  }

  const p = idx >= 0 ? prompts.current[idx] : null
  const text = saving ? '…' : !p ? t.ready : p.dir === -1 ? `◀ ${L}` : p.dir === 1 ? `${R} ▶` : 'STOP'

  return (
    <div className="col" style={{ alignItems: 'center', gap: 22, width: '100%' }}>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={`${idx}-${text}`}
          className="big-count"
          style={{ fontSize: 96, color: p?.dir === 0 ? 'var(--ink)' : main }}
          initial={{ scale: 0.5, opacity: 0, x: p?.dir === -1 ? 40 : p?.dir === 1 ? -40 : 0 }}
          animate={{ scale: 1, opacity: 1, x: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 700, damping: 26 }}
        >
          {text}
        </motion.div>
      </AnimatePresence>
      <div className="track">
        <motion.div
          className="zone"
          style={{ background: soft }}
          animate={{ left: p?.dir === 1 ? '50%' : '0%', width: !p || p.dir === 0 ? '0%' : '50%' }}
          transition={spring}
        />
        <div className="player" ref={player} style={{ left: '50%', transition: 'transform .12s, background .12s' }} />
      </div>
      <div className="run-dots">
        {prompts.current.slice(0, N).map((_, i) => (
          <div key={i} className="run-dot" style={{ width: 8, height: 8, background: i <= idx ? main : 'var(--bg-2)' }} />
        ))}
      </div>
    </div>
  )
}
