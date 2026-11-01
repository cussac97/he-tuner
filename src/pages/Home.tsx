import { motion } from 'framer-motion'
import { ConnectButtons, DeviceHint, useDevice } from '../components/Device'
import { Icon } from '../components/icons'
import { KeyboardViz } from '../components/KeyboardViz'
import { Btn, ease, MaskText } from '../components/ui'
import { FeatureGrid } from '../demos/FeatureGrid'
import { ReplayDemo } from '../demos/ReplayDemo'
import { LEVELS } from '../games/levels'
import { useT } from '../i18n'
import { homeText } from '../i18n/app/home'
import { navigate } from '../lib/router'
import { generateSampleSession } from '../lib/sample'
import { store, useStore } from '../lib/store'

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

      <ReplayDemo />

      <FeatureGrid />

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
    </div>
  )
}
