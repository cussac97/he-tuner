import type { ReactNode } from 'react'
import { useT } from '../i18n'
import { chartsText } from '../i18n/results/charts'

const C = {
  intended: '#c8ff2e',
  unintended: '#ff7a3d',
  rest: '#8f8fff',
  grid: 'rgba(255,255,255,0.06)',
  axis: '#5f5f68',
  text: '#a0a0a8',
  ink: '#ededef',
}

/** Mirror histogram: involuntary contacts above the axis, real presses below. */
export function DepthHistogram({
  intended,
  unintended,
  rest,
  chosen,
  current,
  travel = 4,
}: {
  intended: number[]
  unintended: number[]
  rest: number[]
  chosen: number
  current: number | null
  travel?: number
}) {
  const t = useT(chartsText)
  const W = 720
  const H = 260
  const padL = 84
  const padR = 16
  const mid = 130
  const half = 100
  const bins = Math.round(travel / 0.1)
  const bin = (xs: number[]) => {
    const b = new Array(bins).fill(0)
    for (const x of xs) b[Math.min(bins - 1, Math.max(0, Math.floor(x / 0.1)))]++
    return b
  }
  const bi = bin(intended)
  const bu = bin(unintended)
  const br = bin(rest)
  // square-root scale: a single deep brush must stay visible next to hundreds of bottom-outs
  const sq = Math.sqrt
  const maxTop = sq(Math.max(1, ...bu.map((v, i) => v + br[i])))
  const maxBot = sq(Math.max(1, ...bi))
  const x = (mm: number) => padL + (mm / travel) * (W - padL - padR)
  const bw = (W - padL - padR) / bins
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {[0, 1, 2, 3, 4].filter((m) => m <= travel).map((m) => (
        <g key={m}>
          <line x1={x(m)} x2={x(m)} y1={20} y2={H - 20} stroke={C.grid} />
          <text x={x(m)} y={H - 4} fill={C.axis} fontSize="11" textAnchor="middle" fontFamily="ui-monospace, monospace">
            {m} mm
          </text>
        </g>
      ))}
      {bu.map((v, i) => {
        const hr = (sq(br[i]) / maxTop) * half
        const h = (sq(v + br[i]) / maxTop) * half - hr
        return (
          <g key={i}>
            {br[i] > 0 && <rect x={x(i * 0.1) + 1} y={mid - hr} width={bw - 2} height={hr} fill={C.rest} rx={1.5} />}
            {v > 0 && <rect x={x(i * 0.1) + 1} y={mid - hr - h} width={bw - 2} height={h} fill={C.unintended} rx={1.5} />}
          </g>
        )
      })}
      {bi.map((v, i) =>
        v > 0 ? <rect key={i} x={x(i * 0.1) + 1} y={mid + 1} width={bw - 2} height={(sq(v) / maxBot) * half} fill={C.intended} opacity={0.85} rx={1.5} /> : null,
      )}
      <line x1={padL} x2={W - padR} y1={mid} y2={mid} stroke={C.axis} />
      <text x={padL - 8} y={mid - 8} fill={C.unintended} fontSize="11" textAnchor="end">
        {t.unintended}
      </text>
      <text x={padL - 8} y={mid + 16} fill={C.intended} fontSize="11" textAnchor="end">
        {t.intended}
      </text>
      {current !== null && (
        <g>
          <line x1={x(current)} x2={x(current)} y1={14} y2={H - 22} stroke="#5f5f68" strokeDasharray="4 4" />
          <text x={x(current) + 5} y={24} fill="#a0a0a8" fontSize="11" fontFamily="JetBrains Mono, monospace">
            {t.current(current.toFixed(1))}
          </text>
        </g>
      )}
      <line x1={x(chosen)} x2={x(chosen)} y1={14} y2={H - 22} stroke={C.ink} strokeWidth={2} />
      <text x={x(chosen) + 5} y={current !== null && Math.abs(current - chosen) < 0.6 ? 40 : 24} fill={C.ink} fontSize="11" fontWeight={700}>
        {t.recommended(chosen.toFixed(1))}
      </text>
    </svg>
  )
}

/** Errors per 100 keystrokes and actuation latency as functions of the actuation point. */
export function ErrorCurve({ curve, chosen }: { curve: Array<{ a: number; errors: number; latency: number }>; chosen: number }) {
  const W = 720
  const H = 200
  const padL = 44
  const padR = 48
  const top = 14
  const bot = H - 26
  if (!curve.length) return null
  const maxE = Math.max(1, ...curve.map((c) => c.errors))
  const maxL = Math.max(5, ...curve.map((c) => c.latency))
  const minA = curve[0].a
  const maxA = curve[curve.length - 1].a
  const x = (a: number) => padL + ((a - minA) / (maxA - minA)) * (W - padL - padR)
  const yE = (e: number) => bot - (e / maxE) * (bot - top)
  const yL = (l: number) => bot - (l / maxL) * (bot - top)
  const pe = curve.map((c, i) => `${i ? 'L' : 'M'}${x(c.a)},${yE(c.errors)}`).join(' ')
  const pl = curve.map((c, i) => `${i ? 'L' : 'M'}${x(c.a)},${yL(c.latency)}`).join(' ')
  const sel = curve.reduce((b, c) => (Math.abs(c.a - chosen) < Math.abs(b.a - chosen) ? c : b), curve[0])
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {[0, 1, 2, 3].map((m) => (
        <g key={m}>
          <line x1={x(m || minA)} x2={x(m || minA)} y1={top} y2={bot} stroke={C.grid} />
          <text x={x(m || minA)} y={H - 6} fill={C.axis} fontSize="11" textAnchor="middle" fontFamily="ui-monospace, monospace">
            {m || minA} mm
          </text>
        </g>
      ))}
      <path d={pl} fill="none" stroke="#8f8fff" strokeWidth={1.5} strokeDasharray="5 4" />
      <path d={pe} fill="none" stroke={C.unintended} strokeWidth={2} />
      <line x1={x(sel.a)} x2={x(sel.a)} y1={top} y2={bot} stroke={C.ink} strokeWidth={1.5} />
      <circle cx={x(sel.a)} cy={yE(sel.errors)} r={4} fill={C.unintended} stroke="#0b0b0c" strokeWidth={2} />
      <text x={padL - 6} y={top + 8} fill={C.unintended} fontSize="11" textAnchor="end" fontFamily="ui-monospace, monospace">
        {maxE.toFixed(1)}
      </text>
      <text x={padL - 6} y={bot} fill={C.unintended} fontSize="11" textAnchor="end" fontFamily="ui-monospace, monospace">
        0
      </text>
      <text x={W - padR + 6} y={top + 8} fill="#8f8fff" fontSize="11" fontFamily="ui-monospace, monospace">
        {Math.round(maxL)} ms
      </text>
    </svg>
  )
}

export function Bars({
  rows,
  unit,
  lowerIsBetter = true,
}: {
  rows: Array<{ label: ReactNode; value: number; note?: string }>
  unit: string
  lowerIsBetter?: boolean
}) {
  const valid = rows.filter((r) => Number.isFinite(r.value))
  const max = Math.max(1, ...valid.map((r) => r.value))
  const best = valid.length ? (lowerIsBetter ? Math.min(...valid.map((r) => r.value)) : Math.max(...valid.map((r) => r.value))) : NaN
  return (
    <div className="bars">
      {rows.map((r, i) => (
        <div key={i} className={`bar-row ${r.value === best ? 'best' : ''}`}>
          <span className="muted">{r.label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${Number.isFinite(r.value) ? Math.max(2, (r.value / max) * 100) : 0}%` }} />
          </div>
          <span className="num" style={{ textAlign: 'right' }}>
            {Number.isFinite(r.value) ? `${Math.round(r.value)} ${unit}` : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

export function CurvePreview({ curve, inner, outer, travel = 4 }: { curve: string; inner: number; outer: number; travel?: number }) {
  const t = useT(chartsText)
  const W = 220
  const H = 160
  const pad = 22
  const f = (u: number) => (curve === 'progressive' ? Math.pow(u, 1.8) : curve === 'aggressive' ? Math.pow(u, 0.6) : u)
  const pts: string[] = []
  for (let k = 0; k <= 60; k++) {
    const mm = (k / 60) * travel
    const u = Math.min(1, Math.max(0, (mm - inner) / (travel - inner - outer)))
    pts.push(`${k ? 'L' : 'M'}${pad + (mm / travel) * (W - 2 * pad)},${H - pad - f(u) * (H - 2 * pad)}`)
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 260, height: 'auto' }}>
      <rect x={pad} y={pad} width={W - 2 * pad} height={H - 2 * pad} fill="none" stroke={C.grid} />
      <line x1={pad} y1={H - pad} x2={W - pad} y2={pad} stroke={C.grid} strokeDasharray="3 3" />
      <path d={pts.join(' ')} fill="none" stroke={C.intended} strokeWidth={2.5} />
      <text x={pad} y={H - 6} fill={C.axis} fontSize="10">
        {t.travel}
      </text>
      <text x={4} y={pad + 4} fill={C.axis} fontSize="10">
        {t.output}
      </text>
    </svg>
  )
}
