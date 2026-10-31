import { motion } from 'framer-motion'
import { ConnectButtons, DeviceHint, useDevice } from '../components/Device'
import { Icon, type IconName } from '../components/icons'
import { KeyboardViz } from '../components/KeyboardViz'
import { Btn, ease, Item, MaskText, Reveal, Spot } from '../components/ui'
import { LEVELS } from '../games/levels'
import { useT } from '../i18n'
import { homeText } from '../i18n/app/home'
import { navigate } from '../lib/router'
import { generateSampleSession } from '../lib/sample'
import { store, useStore } from '../lib/store'

const SPECS = ['rate', 'resolution', 'tests', 'local'] as const

const FEATURES: Array<{ icon: IconName; key: 'raw' | 'tests' | 'replay' }> = [
  { icon: 'analog', key: 'raw' },
  { icon: 'bolt', key: 'tests' },
  { icon: 'flask', key: 'replay' },
]

export function Home() {
  const s = useStore()
  const { source } = useDevice()
  const t = useT(homeText)
  const hasData = s.exercises.length > 0

  return (
    <div className="page">
      <div className="col" style={{ alignItems: 'center', textAlign: 'center', gap: 22, paddingTop: 40 }}>
        <motion.span className="pill" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
          <span className="dot" style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
          {t.pill}
        </motion.span>
        <h1 style={{ maxWidth: 860 }}>
          <MaskText text={t.hero1} />
          <br />
          <MaskText text={t.hero2} delay={0.18} className="accent" />
        </h1>
        <motion.p
          className="muted"
          style={{ fontSize: 17, maxWidth: 600 }}
          initial={{ opacity: 0, filter: 'blur(6px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, ease, delay: 0.35 }}
        >
          {t.sub}
        </motion.p>
        <motion.div className="row" style={{ justifyContent: 'center' }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease, delay: 0.5 }}>
          <Btn className="primary huge" onClick={() => navigate('/jouer/run')}>
            <Icon name="play" size={14} /> {t.run}
          </Btn>
          {!hasData ? (
            <Btn
              className="big"
              onClick={async () => {
                await store.addMany(generateSampleSession(s.settings.layout))
                navigate('/reglages')
              }}
            >
              {t.example}
            </Btn>
          ) : (
            <Btn className="big" onClick={() => navigate('/reglages')}>
              {t.mySettings}
            </Btn>
          )}
        </motion.div>
        <motion.div className="row" style={{ justifyContent: 'center', gap: 18 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          {LEVELS.map((l, i) => (
            <button key={l.kind} className="accordion-btn" onClick={() => navigate(`/jouer/${l.kind}`)}>
              <span style={{ color: 'var(--accent)' }}>{String(i + 1).padStart(2, '0')}</span> {l.name}
            </button>
          ))}
        </motion.div>
      </div>

      <DeviceHint />

      <motion.div className="card" initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.8, ease, delay: 0.55 }}>
        <div className="card-head">
          <div>
            <span className="label-mono">{t.liveTag}</span>
            <h3 style={{ marginTop: 6 }}>{t.liveTitle}</h3>
            <p>
              {source === 'hid' ? t.liveHid : source === 'demo' ? t.liveDemo : t.liveNone}
            </p>
          </div>
          <ConnectButtons />
        </div>
        <KeyboardViz layout={s.settings.layout} live travel={s.settings.travel} />
      </motion.div>

      <Reveal className="grid g4">
        {SPECS.map((k) => (
          <Item key={k} className="tile" style={{ padding: '16px 18px' }}>
            <div style={{ fontFamily: 'var(--title)', fontWeight: 900, fontSize: 24, letterSpacing: '-0.03em' }}>{t.specs[k].v}</div>
            <div className="label-mono" style={{ marginTop: 2 }}>
              {t.specs[k].l}
            </div>
          </Item>
        ))}
      </Reveal>

      <Reveal className="grid g3">
        {FEATURES.map((f) => (
          <Spot key={f.key}>
            <div className="icon-tile">
              <Icon name={f.icon} />
            </div>
            <h3 style={{ marginTop: 16 }}>{t.features[f.key].t}</h3>
            <p className="muted" style={{ marginTop: 6, fontSize: 13.5 }}>
              {t.features[f.key].d}
            </p>
          </Spot>
        ))}
      </Reveal>
    </div>
  )
}
