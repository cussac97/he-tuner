import { useEffect, useState } from 'react'
import { fixed, rapid } from '../analysis/core'
import { ConnectButtons, DeviceHint, useDevice } from '../components/Device'
import { KeyboardViz } from '../components/KeyboardViz'
import { LiveTrace } from '../components/LiveTrace'
import { useT } from '../i18n'
import { liveText } from '../i18n/app/live'
import { hid } from '../lib/hid'
import { recorder } from '../lib/recorder'
import { useStore } from '../lib/store'

function useTicker(ms: number) {
  const [, set] = useState(0)
  useEffect(() => {
    const id = setInterval(() => set((x) => x + 1), ms)
    return () => clearInterval(id)
  }, [ms])
}

export function Live() {
  const s = useStore()
  const { status, source } = useDevice()
  const t = useT(liveText)
  useTicker(250)
  const [a, setA] = useState(s.settings.refActuation)
  const [sens, setSens] = useState(0.2)
  const [cont, setCont] = useState(false)
  const [raw, setRaw] = useState(false)

  const sims = [
    { name: t.simFixed(a.toFixed(1)), s: fixed(a), color: '#5f5f68' },
    { name: `RT ${sens.toFixed(2)}${cont ? t.simContinuous : ''}`, s: rapid(a, sens, sens, cont), color: '#c8ff2e' },
  ]

  const rawHex = recorder.lastRaw ? Array.from(recorder.lastRaw.slice(0, 48)).map((b) => b.toString(16).padStart(2, '0')).join(' ') : '—'

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>
        <ConnectButtons />
      </div>
      <DeviceHint />

      <div className="card">
        <KeyboardViz layout={s.settings.layout} live threshold={a} travel={s.settings.travel} />
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h3>{t.traceTitle}</h3>
            <p>{t.traceBody}</p>
          </div>
        </div>
        <LiveTrace sims={sims} travel={s.settings.travel} height={300} />
        <div className="grid g3" style={{ marginTop: 16 }}>
          <div className="field">
            <label>
              {t.actuation}
              <b className="num">{a.toFixed(1)} mm</b>
            </label>
            <input type="range" min={0.1} max={3.8} step={0.1} value={a} onChange={(e) => setA(+e.target.value)} />
          </div>
          <div className="field">
            <label>
              {t.sensitivity}
              <b className="num">{sens.toFixed(2)} mm</b>
            </label>
            <input type="range" min={0.05} max={1} step={0.05} value={sens} onChange={(e) => setSens(+e.target.value)} />
          </div>
          <div className="field">
            <label>{t.rtMode}</label>
            <div className="seg">
              <button className={!cont ? 'on' : ''} onClick={() => setCont(false)}>
                {t.standard}
              </button>
              <button className={cont ? 'on' : ''} onClick={() => setCont(true)}>
                {t.continuous}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid g4">
        <div className="card tight stat">
          <span className="label">{t.source}</span>
          <span className="value" style={{ fontSize: 18 }}>
            {source === 'hid' ? 'Wooting (WebHID)' : source === 'demo' ? t.sourceDemo : '—'}
          </span>
        </div>
        <div className="card tight stat">
          <span className="label">{t.reportRate}</span>
          <span className="value">{source === 'hid' ? recorder.reportRate : '—'}</span>
          <span className="sub">{t.reportRateSub}</span>
        </div>
        <div className="card tight stat">
          <span className="label">{t.activeKeys}</span>
          <span className="value">{recorder.active.size}</span>
        </div>
        <div className="card tight stat">
          <span className="label">{t.totalTravel}</span>
          <span className="value">
            {s.settings.travel.toFixed(1)}
            <small>mm</small>
          </span>
          <span className="sub">{t.totalTravelSub}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>{t.diagTitle}</h3>
          <button className="btn small ghost" onClick={() => setRaw((r) => !r)}>
            {raw ? t.hide : t.show}
          </button>
        </div>
        {raw && (
          <div className="col" style={{ fontSize: 13 }}>
            <div>
              <span className="muted">{t.device}</span>
              {status.state === 'connected' ? `${status.name} · PID 0x${status.productId.toString(16)}` : '—'}
            </div>
            <div>
              <span className="muted">{t.protocol}</span>
              {status.state === 'connected' ? status.protocol : '—'}
            </div>
            <div>
              <span className="muted">{t.keysRead}</span>
              {hid.lastDecoded.length
                ? hid.lastDecoded
                    .map((k) => `${k.code ?? '?'} ${(k.value * s.settings.travel).toFixed(2)} mm${k.actuated ? ' ●' : ''}`)
                    .join(' · ')
                : t.noKeyDown}
            </div>
            <div>
              <span className="muted">{t.unknownCodes}</span>
              {hid.unknownKeys.size
                ? [...hid.unknownKeys.values()].map((k) => `0x${k.raw.toString(16)}${k.row >= 0 ? ` (${t.matrixPos(k.row, k.col)})` : ''}`).join(', ')
                : t.none}
            </div>
            <div className="num" style={{ wordBreak: 'break-all', color: '#c7d1da' }}>
              {rawHex}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
