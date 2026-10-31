import { DeviceHint } from '../components/Device'
import { Icon } from '../components/icons'
import { LangSeg } from '../components/LangPicker'
import { Btn, MaskText, Reveal, Spot } from '../components/ui'
import { LEVELS } from '../games/levels'
import { useT } from '../i18n'
import { playText } from '../i18n/app/play'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { EXERCISE_INFO } from '../lib/types'

export function PlayHub() {
  const s = useStore()
  const t = useT(playText)
  const count = (k: string) => s.exercises.filter((e) => e.kind === k && e.source !== 'sample').length
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="label-mono">{t.tag}</span>
          <h1 style={{ marginTop: 10 }}>
            <MaskText text={t.title} />
          </h1>
          <p>{t.intro}</p>
        </div>
        <div className="col" style={{ alignItems: 'flex-end', gap: 12 }}>
          <div className="row" style={{ gap: 8, color: 'var(--ink-3)' }}>
            <Icon name="globe" size={15} />
            <LangSeg />
          </div>
          <Btn className="primary huge" onClick={() => navigate('/jouer/run')}>
            <Icon name="play" size={14} /> {t.start}
          </Btn>
        </div>
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
                {n > 0 && <span className="pill ok">{t.done(n)}</span>}
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
