// 60% keyboard drawn in SVG (1 unit = 1u key). In live mode every cap sinks and fills
// as the key travels down, updated imperatively each frame (no React re-render).

import { useEffect, useMemo, useReducer, useRef } from 'react'
import { getLayout, keyLabel, onLabels, type KeyGeom, type LayoutKind } from '../lib/layout'
import { recorder } from '../lib/recorder'

const GAP = 0.07
const SINK = 0.09 // how far a fully pressed cap moves down, in key units

function isoEnterPath(k: KeyGeom, dy = 0): string {
  const g = GAP
  const x0 = k.x + g
  const x1 = k.x + k.w - g
  const xm = k.x + 0.25 + g
  const y0 = k.y + g + dy
  const ym = k.y + 1 - g + dy
  const y1 = k.y + 2 - g + dy
  return `M${x0},${y0} H${x1} V${y1} H${xm} V${ym} H${x0} Z`
}

export interface KeyboardVizProps {
  layout: LayoutKind
  live?: boolean
  /** static heat values per key, 0..1 */
  heat?: Record<string, number>
  heatColor?: string
  /** text shown in each key under the label (static mode) */
  values?: Record<string, string>
  highlight?: string[]
  /** live mode: draw this depth as a threshold tick on each key (mm) */
  threshold?: number
  travel?: number
  dimOthers?: boolean
}

export function KeyboardViz({ layout, live, heat, heatColor = '#c8ff2e', values, highlight, threshold, travel = 4, dimOthers }: KeyboardVizProps) {
  const keys = useMemo(() => getLayout(layout), [layout])
  const [, force] = useReducer((x: number) => x + 1, 0)
  useEffect(() => onLabels(force), [])
  const groups = useRef(new Map<string, SVGGElement>())
  const fills = useRef(new Map<string, SVGRectElement>())
  const valEls = useRef(new Map<string, SVGTextElement>())
  const hl = new Set(highlight ?? [])
  const uid = useMemo(() => Math.random().toString(36).slice(2, 7), [])

  useEffect(() => {
    if (!live) return
    let raf = 0
    const loop = () => {
      for (const k of keys) {
        const d = recorder.depth(k.code)
        const frac = Math.min(1, d / travel)
        groups.current.get(k.code)?.setAttribute('transform', `translate(0 ${(frac * SINK).toFixed(4)})`)
        const el = fills.current.get(k.code)
        if (el) {
          el.setAttribute('height', String((k.h - 2 * GAP) * frac))
          el.setAttribute('opacity', String(frac > 0.005 ? 0.35 + 0.65 * frac : 0))
        }
        const ve = valEls.current.get(k.code)
        if (ve) ve.textContent = d > 0.05 ? d.toFixed(2) : ''
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [live, keys, travel])

  return (
    <svg className="kb" viewBox="-0.05 -0.05 15.1 5.25">
      <defs>
        <linearGradient id={`kbfill-${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#c8ff2e" stopOpacity="0.15" />
          <stop offset="1" stopColor="#c8ff2e" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      {keys.map((k) => {
        const x = k.x + GAP
        const y = k.y + GAP
        const w = k.w - 2 * GAP
        const h = k.h - 2 * GAP
        const hv = heat?.[k.code]
        const dim = dimOthers && hl.size && !hl.has(k.code)
        const clipId = `clip-${uid}-${k.code}`
        const shapeProps = { className: `cap ${hl.has(k.code) ? 'hl' : ''}` }
        const labelX = k.isoEnter ? k.x + 0.25 + GAP + 0.15 : x + 0.15
        const labelY = k.isoEnter ? k.y + 1.32 : y + 0.36
        return (
          <g key={k.code} opacity={dim ? 0.35 : 1}>
            {/* shadow under the cap: the cap sinks onto it */}
            {k.isoEnter ? (
              <path d={isoEnterPath(k, SINK)} className="cap-shadow" />
            ) : (
              <rect x={x} y={y + SINK} width={w} height={h} rx={0.16} className="cap-shadow" />
            )}
            <g
              className="key-g"
              ref={(el) => {
                if (el) groups.current.set(k.code, el)
              }}
            >
              <clipPath id={clipId}>{k.isoEnter ? <path d={isoEnterPath(k)} /> : <rect x={x} y={y} width={w} height={h} rx={0.16} />}</clipPath>
              {k.isoEnter ? <path d={isoEnterPath(k)} {...shapeProps} /> : <rect x={x} y={y} width={w} height={h} rx={0.16} {...shapeProps} />}
              {hv !== undefined && hv > 0 && (
                <g clipPath={`url(#${clipId})`}>
                  <rect x={k.x} y={k.y} width={k.w} height={k.h} fill={heatColor} opacity={0.14 + 0.7 * Math.min(1, hv)} />
                </g>
              )}
              {live && (
                <g clipPath={`url(#${clipId})`}>
                  <rect
                    ref={(el) => {
                      if (el) fills.current.set(k.code, el)
                    }}
                    x={k.x}
                    y={y}
                    width={k.w}
                    height={0}
                    opacity={0}
                    fill={`url(#kbfill-${uid})`}
                  />
                  {threshold !== undefined && (
                    <line
                      x1={k.x}
                      x2={k.x + k.w}
                      y1={y + h * (threshold / travel)}
                      y2={y + h * (threshold / travel)}
                      stroke="#ff7a3d"
                      strokeWidth={0.025}
                      strokeDasharray="0.08 0.06"
                    />
                  )}
                </g>
              )}
              <text x={labelX} y={labelY} className="lbl">
                {keyLabel(k.code)}
              </text>
              {live && (
                <text
                  ref={(el) => {
                    if (el) valEls.current.set(k.code, el)
                  }}
                  x={x + w - 0.1}
                  y={k.isoEnter ? k.y + 1.8 : y + h - 0.12}
                  textAnchor="end"
                  className="val"
                />
              )}
              {!live && values?.[k.code] && (
                <text x={x + w - 0.1} y={k.isoEnter ? k.y + 1.8 : y + h - 0.12} textAnchor="end" className="val">
                  {values[k.code]}
                </text>
              )}
            </g>
          </g>
        )
      })}
    </svg>
  )
}
