import { useEffect, useState } from 'react'
import { fixed, rapid } from '../analysis/core'
import { ConnectButtons, DeviceHint, useDevice } from '../components/Device'
import { KeyboardViz } from '../components/KeyboardViz'
import { LiveTrace } from '../components/LiveTrace'
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
  useTicker(250)
  const [a, setA] = useState(s.settings.refActuation)
  const [sens, setSens] = useState(0.2)
  const [cont, setCont] = useState(false)
  const [raw, setRaw] = useState(false)

  const sims = [
    { name: `Fixe ${a.toFixed(1)} mm`, s: fixed(a), color: '#5f5f68' },
    { name: `RT ${sens.toFixed(2)}${cont ? ' continu' : ''}`, s: rapid(a, sens, sens, cont), color: '#c8ff2e' },
  ]

  const rawHex = recorder.lastRaw ? Array.from(recorder.lastRaw.slice(0, 48)).map((b) => b.toString(16).padStart(2, '0')).join(' ') : '—'

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Visualiseur</h1>
          <p>La course de chaque touche en temps réel, et un bac à sable : bouge les réglages et vois immédiatement quand le clavier considèrerait la touche enfoncée.</p>
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
            <h3>Course dans le temps</h3>
            <p>Profondeur vers le bas. Les bandes du bas rejouent la dernière touche utilisée avec deux réglages.</p>
          </div>
        </div>
        <LiveTrace sims={sims} travel={s.settings.travel} height={300} />
        <div className="grid g3" style={{ marginTop: 16 }}>
          <div className="field">
            <label>
              Point d’actuation : <b className="num">{a.toFixed(1)} mm</b>
            </label>
            <input type="range" min={0.1} max={3.8} step={0.1} value={a} onChange={(e) => setA(+e.target.value)} />
          </div>
          <div className="field">
            <label>
              Sensibilité Rapid Trigger : <b className="num">{sens.toFixed(2)} mm</b>
            </label>
            <input type="range" min={0.05} max={1} step={0.05} value={sens} onChange={(e) => setSens(+e.target.value)} />
          </div>
          <div className="field">
            <label>Mode RT</label>
            <div className="seg">
              <button className={!cont ? 'on' : ''} onClick={() => setCont(false)}>
                Standard
              </button>
              <button className={cont ? 'on' : ''} onClick={() => setCont(true)}>
                Continu
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid g4">
        <div className="card tight stat">
          <span className="label">Source</span>
          <span className="value" style={{ fontSize: 18 }}>
            {source === 'hid' ? 'Wooting (WebHID)' : source === 'demo' ? 'Démo' : '—'}
          </span>
        </div>
        <div className="card tight stat">
          <span className="label">Rapports / s</span>
          <span className="value">{source === 'hid' ? recorder.reportRate : '—'}</span>
          <span className="sub">envoyés quand une touche bouge</span>
        </div>
        <div className="card tight stat">
          <span className="label">Touches actives</span>
          <span className="value">{recorder.active.size}</span>
        </div>
        <div className="card tight stat">
          <span className="label">Course totale</span>
          <span className="value">
            {s.settings.travel.toFixed(1)}
            <small>mm</small>
          </span>
          <span className="sub">modifiable dans Données</span>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Diagnostic HID</h3>
          <button className="btn small ghost" onClick={() => setRaw((r) => !r)}>
            {raw ? 'Masquer' : 'Afficher'}
          </button>
        </div>
        {raw && (
          <div className="col" style={{ fontSize: 13 }}>
            <div>
              <span className="muted">Périphérique : </span>
              {status.state === 'connected' ? `${status.name} · PID 0x${status.productId.toString(16)}` : '—'}
            </div>
            <div>
              <span className="muted">Protocole : </span>
              {status.state === 'connected' ? status.protocol : '—'}
            </div>
            <div>
              <span className="muted">Touches lues : </span>
              {hid.lastDecoded.length
                ? hid.lastDecoded
                    .map((k) => `${k.code ?? '?'} ${(k.value * s.settings.travel).toFixed(2)} mm${k.actuated ? ' ●' : ''}`)
                    .join(' · ')
                : 'aucune touche enfoncée'}
            </div>
            <div>
              <span className="muted">Codes non reconnus : </span>
              {hid.unknownKeys.size ? [...hid.unknownKeys.keys()].join(', ') : 'aucun'}
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
