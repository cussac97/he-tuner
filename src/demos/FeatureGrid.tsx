import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from '../components/icons'
import { LEVELS } from '../games/levels'
import { useLang, useT } from '../i18n'
import { demoText } from '../i18n/app/demos'
import { resultsText } from '../i18n/results/page'
// Straight from each part's module, not kit/index: only the parts used, and their CSS, ship
import type { Act } from '../kit/act'
import { Segmented } from '../kit/controls/Segmented'
import { Count } from '../kit/motion/Count'
import { Check } from '../kit/parts/Check'
import { useReducedMotion } from '../kit/reduced-motion'
import { Stage } from '../kit/stage'
import { keyLabel } from '../lib/layout'
import { useWidth } from './useWidth'
import './look.css'
import './grid.css'

// The features under the replay hero: a ruled grid on the page's dark ground, after
// the skill's ruled-bento. One rounded container, 1px rules, mixed spans.
//
//   Tile      Span   Kind       The one thing                           Moves
//   Tests     2 × 1  Component  the six tests, each with what it measured  checks tick in turn
//   Polling   1 × 1  Stat       "8,000 Hz"                                counts up
//   Per key   1 × 1  Diagram    keycaps filled to their actuation depth  the fills sink in
//   Strafe    2 × 1  Component  A and D held together, the SOCD verdict  the overlap shows, the mode slides
//   Local     3 × 1  Statement  "Nothing leaves your browser."           holds still
//
// Two of five tiles are UI, none is a window (the hero above has the only one). Each
// picture is its own Stage at 1:1, measured from its cell; the copy is page text.
// Each cell plays one beat, once, 110 ms after the one before it in reading order.

const LEAD = 450
const STEP = 110

type Beat = { on: boolean; n?: number }
const before: Beat = { on: false, n: 0 }
const after: Beat = { on: true, n: 6 }
const beat = (i: number) => async (a: Act<Beat>) => {
  await a.wait(LEAD + i * STEP)
  await a.set({ on: true })
}

function Tile({ area, title, body, picture, children }: { area: string; title?: string; body?: string; picture?: ReactNode; children?: ReactNode }) {
  return (
    <section className={`fg-cell fg-cell--${area}`} data-crop>
      {title && (
        <p className="fg-copy">
          <b>{title}</b> {body}
        </p>
      )}
      {children}
      {picture}
    </section>
  )
}

/* ---------------- Tests ---------------- */

const tests = async (a: Act<Beat>) => {
  await a.wait(LEAD)
  for (let n = 1; n <= 6; n++) {
    a.put({ on: true, n })
    await a.wait(170)
  }
}

function Tests() {
  const t = useT(demoText).grid.tests
  const [ref, width] = useWidth<HTMLDivElement>(680)
  // Wide, a 3 × 2 grid of the Play page's cards; narrow, the same six as one list
  const list = width < 520
  const height = 8 + (list ? 6 * 46 + 5 * 1 + 4 : 2 * 104 + 1 + 2) + 28
  return (
    <Tile
      area="tests"
      title={t.title}
      body={t.body}
      picture={
        <div ref={ref} className="fg-picture">
          <Stage<Beat> width={width} height={height} theme="dark" initial={before} poster={after} play="once" script={tests} className="he-look fg-stage">
            {(s) => (
              <div className={list ? 'fg-tests fg-tests--list' : 'fg-tests'}>
                {LEVELS.map((l, i) => {
                  const done = (s.n ?? 0) > i
                  return (
                    <div key={l.kind} className="fg-test" data-done={done || undefined}>
                      <span className="fg-test__icon">
                        <Icon name={l.icon} size={list ? 15 : 17} />
                      </span>
                      <div className="fg-test__name">{l.name}</div>
                      <div className="fg-test__value">{t.measured[l.kind]}</div>
                      <Check on={done} size={16} className="fg-check" />
                    </div>
                  )
                })}
              </div>
            )}
          </Stage>
        </div>
      }
    />
  )
}

/* ---------------- Polling (stat) ---------------- */

function useInView<T extends Element>(delay: number) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let timer = 0
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        timer = window.setTimeout(() => setSeen(true), delay)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      clearTimeout(timer)
    }
  }, [delay])
  return [ref, seen] as const
}

function Polling() {
  const t = useT(demoText).grid.polling
  const lang = useLang()
  const reduced = useReducedMotion()
  const [ref, seen] = useInView<HTMLDivElement>(LEAD + STEP)
  return (
    <Tile area="stat">
      <div ref={ref} className="fg-stat">
        <span className="fg-stat__lead">
          <Icon name="bolt" size={16} />
          {t.lead}
        </span>
        <span className="fg-stat__number">
          <Count value={seen || reduced ? 8000 : 0} duration={1300} format={(n) => Math.round(n).toLocaleString(lang)} />
          <span className="fg-stat__unit">Hz</span>
        </span>
        <span className="fg-stat__label">{t.label}</span>
      </div>
    </Tile>
  )
}

/* ---------------- Per key (diagram) ---------------- */

// The left of a keyboard: [code, width in units]. Each key is filled to its actuation
// depth, the way the Visualizer fills a key to the depth it is pressed.
const ROWS: Array<Array<[string, number]>> = [
  [['Tab', 1.5], ['KeyQ', 1], ['KeyW', 1], ['KeyE', 1], ['KeyR', 1], ['KeyT', 1]],
  [['CapsLock', 1.75], ['KeyA', 1], ['KeyS', 1], ['KeyD', 1], ['KeyF', 1], ['KeyG', 1]],
  [['ShiftLeft', 2.25], ['KeyZ', 1], ['KeyX', 1], ['KeyC', 1], ['KeyV', 1], ['KeyB', 1]],
  [['ControlLeft', 1.25], ['MetaLeft', 1.25], ['AltLeft', 1.25], ['Space', 6.25]],
]
// The keys the story names carry their depth; the rest keep the default, unlit
const DEPTH: Record<string, number> = { KeyW: 0.6, KeyA: 0.6, KeyS: 0.6, KeyD: 0.6, ShiftLeft: 1.8, Space: 2.0 }
const UNIT = 48
const GAP = 6
// four rows and a full gutter under them
const KEYS_H = 4 * UNIT + 3 * GAP + 28

function PerKey() {
  const t = useT(demoText).grid.perKey
  const [ref, width] = useWidth<HTMLDivElement>(360)
  // the keys start on the copy's gutter, which the grid sets by its own width
  const pad = (ref.current && parseFloat(getComputedStyle(ref.current).getPropertyValue('--pad'))) || 28
  let order = 0
  return (
    <Tile
      area="keys"
      title={t.title}
      body={t.body(['KeyW', 'KeyA', 'KeyS', 'KeyD'].map(keyLabel).join(''))}
      picture={
        <div ref={ref} className="fg-picture">
          <Stage<Beat> width={width} height={KEYS_H} theme="dark" initial={before} poster={after} play="once" script={beat(2)} className="he-look fg-stage">
            {(s) => (
              <div className="fg-keys" data-on={s.on || undefined}>
                {ROWS.map((row, r) => {
                  let x = 0
                  return row.map(([code, u]) => {
                    let w = u * UNIT + (u - 1) * GAP
                    const left = x
                    // a key ending a hair inside the stage edge reads as an accident: let it bleed
                    const room = width - pad - (left + w)
                    if (room >= 0 && room < 14) w += 24
                    x += w + GAP
                    const depth = DEPTH[code] ?? 1.2
                    const i = order++
                    return (
                      <div key={code} className="fg-key" data-lit={code in DEPTH || undefined} style={{ left, top: r * (UNIT + GAP), width: w, height: UNIT, ['--i' as string]: i }}>
                        <span className="fg-key__fill" style={{ height: `${(depth / 4) * 100}%` }} />
                        {/* the depth follows the name, so a key cut by the crop keeps both */}
                        <span className="fg-key__label">
                          {keyLabel(code)}
                          {code in DEPTH && <b>{depth.toFixed(1)}</b>}
                        </span>
                      </div>
                    )
                  })
                })}
              </div>
            )}
          </Stage>
        </div>
      }
    />
  )
}

/* ---------------- Strafe (component) ---------------- */

// One direction change, on a 400 ms timeline: A released at 248 ms, D pressed at 210 ms
const A = { from: 20, to: 248 }
const D = { from: 210, to: 392 }
const SPAN = 400
// the label lane, two lanes, the control and a full gutter: the picture hugs its content
const SOCD_H = 30 + 2 * 28 + 12 + 24 + 38 + 28

function Strafe() {
  const t = useT(demoText).grid.socd
  const r = useT(resultsText)
  const [ref, width] = useWidth<HTMLDivElement>(680)
  const narrow = width < 520
  const pad = narrow ? 24 : 28
  const trackX = pad + 40
  const trackW = width - trackX - pad
  const x = (ms: number) => (ms / SPAN) * trackW
  const items = [r.socd.none, r.socd.last, r.socd.deeper]
  return (
    <Tile
      area="socd"
      title={t.title}
      body={t.body(keyLabel('KeyA'), keyLabel('KeyD'))}
      picture={
        <div ref={ref} className="fg-picture">
          <Stage<Beat> width={width} height={SOCD_H} theme="dark" initial={before} poster={after} play="once" script={beat(3)} className="he-look fg-stage">
            {(s) => (
              <div className="fg-socd" data-on={s.on || undefined} style={{ padding: `0 ${pad}px 28px` }}>
                <div className="fg-lanes" style={{ ['--track-x' as string]: `${trackX - pad}px` }}>
                  <span className="fg-overlap" style={{ left: trackX - pad + x(D.from), width: x(A.to) - x(D.from) }}>
                    <span className="fg-overlap__label">
                      <b>{A.to - D.from} ms</b> {t.overlap}
                    </span>
                  </span>
                  {[
                    { code: 'KeyA', ...A },
                    { code: 'KeyD', ...D },
                  ].map((k, i) => (
                    <div key={k.code} className="fg-lane">
                      <span className="fg-lane__key">{keyLabel(k.code)}</span>
                      <span className="fg-lane__track">
                        {/* Snappy Tappy: the newer key wins, so the first is cut where the second goes down */}
                        <span className="fg-lane__held" data-cut={(s.on && k.code === 'KeyA') || undefined} style={{ left: x(k.from), width: x(s.on && k.code === 'KeyA' ? D.from : k.to) - x(k.from), ['--i' as string]: i }} />
                      </span>
                    </div>
                  ))}
                </div>
                <Segmented items={items} value={s.on ? 1 : 0} className="fg-seg" />
              </div>
            )}
          </Stage>
        </div>
      }
    />
  )
}

/* ---------------- Local (statement) ---------------- */

function Local() {
  const t = useT(demoText).grid.local
  return (
    <Tile area="local">
      <div className="fg-statement">
        <p>
          <b>{t.title}</b> {t.body}
        </p>
        <a href="https://github.com/cussac97/he-tuner" target="_blank" rel="noreferrer">
          <Icon name="github" size={15} />
          {t.link}
          <Icon name="external" size={13} />
        </a>
      </div>
    </Tile>
  )
}

export function FeatureGrid() {
  return (
    <div className="feature-grid">
      <div className="fg-grid">
        <Tests />
        <Polling />
        <PerKey />
        <Strafe />
        <Local />
      </div>
    </div>
  )
}
