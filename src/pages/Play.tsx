import { DeviceHint } from '../components/Device'
import { Icon } from '../components/icons'
import { Btn, MaskText, Reveal, Spot } from '../components/ui'
import { LEVELS } from '../games/levels'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { EXERCISE_INFO } from '../lib/types'

export function PlayHub() {
  const s = useStore()
  const count = (k: string) => s.exercises.filter((e) => e.kind === k && e.source !== 'sample').length
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="label-mono">Parcours · 6 niveaux · ≈ 2 min</span>
          <h1 style={{ marginTop: 10 }}>
            <MaskText text="Six tests, enchaînés." />
          </h1>
          <p>Fais le parcours une première fois, applique les réglages dans Wootility, puis refais-le : la différence se lit directement dans tes données.</p>
        </div>
        <Btn className="primary huge" onClick={() => navigate('/jouer/run')}>
          <Icon name="play" size={14} /> Lancer
        </Btn>
      </div>
      <DeviceHint />
      <Reveal className="grid g3">
        {LEVELS.map((l, i) => {
          const n = count(l.kind)
          return (
            <Spot key={l.kind} style={{ cursor: 'pointer', minHeight: 210 }} whileTap={{ scale: 0.985 }} onClick={() => navigate(`/jouer/${l.kind}`)}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="label-mono" style={{ color: 'var(--accent)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {n > 0 && <span className="pill ok">{n}× fait</span>}
              </div>
              <div className="icon-tile" style={{ marginTop: 18 }}>
                <Icon name={l.icon} />
              </div>
              <h2 style={{ marginTop: 14 }}>{l.name}</h2>
              <p className="muted" style={{ marginTop: 6, fontSize: 13.5 }}>
                {EXERCISE_INFO[l.kind].measures}
              </p>
            </Spot>
          )
        })}
      </Reveal>
    </div>
  )
}
