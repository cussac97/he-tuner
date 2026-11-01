import { useMemo, type ReactNode } from 'react'
// Straight from each part's module, not kit/index: only the parts used, and their CSS, ship
import type { Act } from '../kit/act'
import { bezier } from '../kit/ease'
import { States } from '../kit/motion/States'
import { Stage } from '../kit/stage'
import { Bar, Window } from '../kit/window'
import { useT } from '../i18n'
import { demoText } from '../i18n/app/demos'
import { liveText } from '../i18n/app/live'
import { keyLabel } from '../lib/layout'
import { gainMs, pressedSegments, REST, SPAN, TRACE } from './trace'
import { useWidth } from './useWidth'
import './look.css'
import './replay.css'

// The hero under the home page title: HE Tuner replaying one recorded key through
// candidate settings, the way the analysis does. What the system does, so no cursor.
//
//   Place     The home page, under the hero copy, at the page column's width (1:1).
//   Layout    Fade crop: the window inset top and sides, sinking into the page at its
//             foot over the Visualizer's filler tiles. The page is the ground, no plate.
//   Focal     The depth trace of W and its lime actuation line.
//   Beats     1. The finished screen at the stock 1.5 mm / RT 0.40 mm.
//             2. The replay runs (the counter ticks) and the line rises to 0.6 mm: every
//                registration dot slides up the curve, the strips under it start sooner.
//             3. Resting fingers are named: the line stopped just under them.
//             4. Rapid Trigger tightens to 0.15 mm: the strips end and restart sooner.
//             Payoff: the counter becomes the result, "Registers 24 ms sooner".
//   Plays     Once, when it comes into view; the payoff holds. Poster = the payoff.
//   Left out  The site's own nav, RT mode, other keys: the page around it says those.
//
// The strips are computed with the analysis' own state machine (analysis/core.ts).

type S = { a: number; rt: number; tried: number; rest: boolean; done: boolean }

const FROM = { a: 1.5, rt: 0.4 }
const TO = { a: 0.6, rt: 0.15 }
const TRIED = 240
const initial: S = { ...FROM, tried: 0, rest: false, done: false }
const poster: S = { ...TO, tried: TRIED, rest: true, done: true }

const MAX_DEPTH = 4
const travel = bezier([0.45, 0, 0.1, 1])
// One state update per frame: the line, the dots on the curve and the strips are all
// computed from the same value, so they can't drift apart
const STEP = 16
const lerp = (a: number, b: number, k: number) => a + (b - a) * k

async function tween(a: Act<S>, ms: number, frame: (k: number) => Partial<S>) {
  const n = Math.round(ms / STEP)
  for (let i = 1; i <= n; i++) {
    await a.wait(STEP)
    a.put(frame(travel(i / n)))
  }
}

// The narrow card's height (436, measured in every language): padding, stacked head,
// annotation lane, plot, strip label and strip, two stacked settings (label row and a 4 px
// track each; the knob overhangs into the padding), padding
const COMPACT_CARD_H = 16 + 62 + 34 + 150 + 28 + 18 + 24 + 34 + 18 + 34 + 16 + 2

const SWEEP = 1700
const PAUSE = 450
const TIGHTEN = 1300

async function script(a: Act<S>) {
  await a.wait(1100)
  a.mark('sweep')
  // The counter runs through both sweeps: the replay is what moves the settings
  const total = SWEEP + PAUSE + TIGHTEN
  const counter = (async () => {
    for (let ms = 48; ms <= total; ms += 48) {
      await a.wait(48)
      a.put({ tried: Math.round((ms / total) * TRIED) })
    }
    a.put({ tried: TRIED })
  })()
  await tween(a, SWEEP, (k) => ({ a: lerp(FROM.a, TO.a, k), rest: k > 0.86 }))
  await a.wait(PAUSE)
  a.mark('tighten')
  await tween(a, TIGHTEN, (k) => ({ rt: lerp(FROM.rt, TO.rt, k) }))
  await counter
  await a.wait(200)
  a.mark('done')
  a.put({ done: true })
}

export function ReplayDemo() {
  const [ref, width] = useWidth<HTMLDivElement>(1120)
  const W = Math.max(320, Math.min(1120, width))
  // Narrow: the card alone (a browser window this narrow would read taller than wide),
  // one gutter round it, the two settings stacked, its height known in advance
  const compactH = 16 + COMPACT_CARD_H + 16
  return (
    <div ref={ref} className="replay-host">
      <Stage<S>
        width={W}
        height={600}
        compact={{ below: 860, width: W, height: compactH }}
        theme="dark"
        initial={initial}
        poster={poster}
        play="once"
        script={script}
        className="he-look replay"
      >
        {(s, _rect, layout) => <Scene s={s} W={W} compact={layout === 'compact'} />}
      </Stage>
    </div>
  )
}

function Scene({ s, W, compact }: { s: S; W: number; compact: boolean }) {
  const t = useT(demoText).replay
  const live = useT(liveText)
  const label = (x: string) => x.replace(/[\s ]*:\s*$/, '')

  // Wide, the browser window keeps one gutter on the stage. Narrow, a tall browser
  // window would read squashed: the Visualizer card alone runs off the right instead
  const gutter = compact ? 16 : 56
  const winW = W - gutter * 2
  const bodyPad = 20
  const cardPad = compact ? 16 : 24
  const cardW = compact ? Math.max(540, W + 24) : winW - bodyPad * 2
  const inner = cardW - cardPad * 2

  // Plot geometry, in px inside the card
  const CH = compact ? 150 : 206
  const padL = 44
  const plotW = inner - padL - 4
  const x = (ms: number) => padL + (ms / SPAN) * plotW
  const y = (mm: number) => 4 + (mm / MAX_DEPTH) * (CH - 8)

  const path = useMemo(() => {
    let d = ''
    for (let i = 0; i < TRACE.t.length; i += 8) d += `${i ? 'L' : 'M'}${x(TRACE.t[i]).toFixed(1)} ${y(TRACE.d[i]).toFixed(1)}`
    return d
  }, [inner, CH]) // eslint-disable-line react-hooks/exhaustive-deps

  const segs = pressedSegments(s.a, s.rt)
  const gain = useMemo(() => gainMs(pressedSegments(FROM.a, FROM.rt), pressedSegments(TO.a, TO.rt)), [])
  const pct = (v: number, min: number, max: number) => `${((v - min) / (max - min)) * 100}%`

  return (
    <div className="rp-mask" style={{ padding: compact ? `${gutter}px 0 0 ${gutter}px` : `24px ${gutter}px 0` }}>
      <Frame compact={compact} width={winW} pad={bodyPad}>
          <div className="rp-card" style={{ padding: cardPad, width: cardW }}>
            <div className="rp-head" data-compact={compact || undefined}>
              <span className="rp-title">
                <span className="rp-key">{keyLabel('KeyW')}</span>
                {t.title}
              </span>
              <States
                value={s.done ? 'done' : 'run'}
                align="start"
                className="rp-status"
                states={{
                  run: (
                    <span className="rp-tried">
                      <b data-snap>{s.tried}</b>
                      <span>/ {TRIED}</span> {t.tried}
                    </span>
                  ),
                  done: <span className="rp-gain">{t.gain(gain)}</span>,
                }}
              />
            </div>

            <div className="rp-chart" style={{ height: CH }}>
              <svg width={inner} height={CH} aria-hidden>
                <rect className="rp-rest" x={padL} y={y(0)} width={plotW} height={y(REST) - y(0)} />
                {[0, 1, 2, 3, 4].map((mm) => (
                  <g key={mm}>
                    <line className="rp-grid" x1={padL} x2={padL + plotW} y1={y(mm)} y2={y(mm)} />
                    <text className="rp-axis" x={padL - 10} y={y(mm) + 4}>
                      {mm === MAX_DEPTH ? `${mm} mm` : mm}
                    </text>
                  </g>
                ))}
                <path className="rp-trace" d={path} />
              </svg>
              <span className="rp-line" style={{ left: padL, width: plotW, transform: `translateY(${y(s.a)}px)` }} />
              {segs.map((g, i) => (
                <span key={i} className="rp-dot" style={{ transform: `translate(${x(g.from)}px, ${y(g.at)}px)` }} />
              ))}
              {/* Named above the plot, where nothing else is drawn; the leader ends on the band */}
              <span className="rp-note" data-on={s.rest || undefined} style={{ left: x(930) }}>
                <span className="rp-note__leader" style={{ height: 8 + y(REST / 2) }} />
                <span className="rp-note__text">
                  {t.resting} <b>{REST.toFixed(2)} mm</b>
                </span>
              </span>
            </div>

            <div className="rp-lane-label" style={{ paddingLeft: padL }}>
              {t.registered}
            </div>
            <div className="rp-lane" style={{ marginLeft: padL, width: plotW }}>
              {segs.map((g, i) => (
                <span key={i} className="rp-seg" style={{ left: x(g.from) - padL, width: Math.max(3, x(g.to) - x(g.from)) }} />
              ))}
            </div>

            <div className="rp-fields" data-stacked={compact || undefined}>
              <div className="rp-field">
                <div className="rp-field__label">
                  {label(live.actuation)}
                  <b data-snap>{s.a.toFixed(1)} mm</b>
                </div>
                <div className="rp-track">
                  <span className="rp-track__fill" style={{ width: pct(s.a, 0.1, 3.8) }} />
                  <span className="rp-knob" style={{ left: pct(s.a, 0.1, 3.8) }} />
                </div>
              </div>
              <div className="rp-field">
                <div className="rp-field__label">
                  {label(live.sensitivity)}
                  <b data-snap>{s.rt.toFixed(2)} mm</b>
                </div>
                <div className="rp-track">
                  <span className="rp-track__fill" style={{ width: pct(s.rt, 0.05, 1) }} />
                  <span className="rp-knob" style={{ left: pct(s.rt, 0.05, 1) }} />
                </div>
              </div>
            </div>
          </div>

          {/* The Visualizer's stat tiles: filler, sinking into the page under the fade */}
          {!compact && (
          <div className="rp-tiles" style={{ width: cardW }}>
            {[56, 72, 48, 64].map((w, i) => (
              <div key={i} className="rp-tile">
                <Bar w={w} h={6} tone={2} />
                <Bar w={w * 0.6} h={14} r={4} tone={3} />
              </div>
            ))}
          </div>
          )}
      </Frame>
    </div>
  )
}

function Frame({ compact, width, pad, children }: { compact: boolean; width: number; pad: number; children: ReactNode }) {
  if (compact) return <div className="rp-body">{children}</div>
  return (
    <Window url="cussac97.github.io/he-tuner" urlShape="pill" className="rp-win" style={{ width }}>
      <div className="rp-body" style={{ padding: pad }}>
        {children}
      </div>
    </Window>
  )
}
