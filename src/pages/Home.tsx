import { motion } from 'framer-motion'
import { ConnectButtons, DeviceHint, useDevice } from '../components/Device'
import { Icon, type IconName } from '../components/icons'
import { KeyboardViz } from '../components/KeyboardViz'
import { Btn, ease, Item, MaskText, Reveal, Spot } from '../components/ui'
import { LEVELS } from '../games/levels'
import { navigate } from '../lib/router'
import { generateSampleSession } from '../lib/sample'
import { store, useStore } from '../lib/store'

const SPECS: Array<[string, string]> = [
  ['8 000 Hz', 'lecture analogique'],
  ['0,004 mm', 'résolution'],
  ['6 tests', '≈ 2 minutes'],
  ['100 %', 'local, rien n’est envoyé'],
]

const FEATURES: Array<{ icon: IconName; t: string; d: string }> = [
  { icon: 'analog', t: 'Lecture brute', d: 'La course de chaque touche à 8 kHz, et l’état d’actuation que le clavier calcule lui-même.' },
  { icon: 'bolt', t: 'Six tests ciblés', d: 'Frappe, repos, spam, maintien, strafe, contrôle analogique : chacun isole un comportement précis.' },
  { icon: 'flask', t: 'Rejoué, pas deviné', d: 'Chaque réglage proposé a d’abord été simulé sur tes propres frappes enregistrées.' },
]

export function Home() {
  const s = useStore()
  const { source } = useDevice()
  const hasData = s.exercises.length > 0

  return (
    <div className="page">
      <div className="col" style={{ alignItems: 'center', textAlign: 'center', gap: 22, paddingTop: 40 }}>
        <motion.span className="pill" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
          <span className="dot" style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
          Wooting · protocole analogique V2
        </motion.span>
        <h1 style={{ maxWidth: 860 }}>
          <MaskText text="Ton clavier, réglé" />
          <br />
          <MaskText text="au dixième de millimètre." delay={0.18} className="accent" />
        </h1>
        <motion.p
          className="muted"
          style={{ fontSize: 17, maxWidth: 600 }}
          initial={{ opacity: 0, filter: 'blur(6px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, ease, delay: 0.35 }}
        >
          HE Tuner lit la course de chaque touche pendant six tests courts, rejoue tes frappes avec des centaines de réglages et te dit quoi mettre dans
          Wootility.
        </motion.p>
        <motion.div className="row" style={{ justifyContent: 'center' }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease, delay: 0.5 }}>
          <Btn className="primary huge" onClick={() => navigate('/jouer/run')}>
            <Icon name="play" size={14} /> Lancer le parcours
          </Btn>
          {!hasData ? (
            <Btn
              className="big"
              onClick={async () => {
                await store.addMany(generateSampleSession(s.settings.layout, s.settings.lang))
                navigate('/reglages')
              }}
            >
              Voir un exemple
            </Btn>
          ) : (
            <Btn className="big" onClick={() => navigate('/reglages')}>
              Mes réglages
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
            <span className="label-mono">Live</span>
            <h3 style={{ marginTop: 6 }}>Ton clavier, en direct</h3>
            <p>
              {source === 'hid'
                ? 'Appuie sur une touche : elle s’enfonce et se remplit selon sa vraie profondeur.'
                : source === 'demo'
                  ? 'Mode démo : tes frappes sont converties en courses simulées.'
                  : 'Branche ton Wooting (Chrome, Edge, Arc, Brave) ou essaie la démo.'}
            </p>
          </div>
          <ConnectButtons />
        </div>
        <KeyboardViz layout={s.settings.layout} live travel={s.settings.travel} />
      </motion.div>

      <Reveal className="grid g4">
        {SPECS.map(([v, l]) => (
          <Item key={v} className="tile" style={{ padding: '16px 18px' }}>
            <div style={{ fontFamily: 'var(--title)', fontWeight: 900, fontSize: 24, letterSpacing: '-0.03em' }}>{v}</div>
            <div className="label-mono" style={{ marginTop: 2 }}>
              {l}
            </div>
          </Item>
        ))}
      </Reveal>

      <Reveal className="grid g3">
        {FEATURES.map((f) => (
          <Spot key={f.t}>
            <div className="icon-tile">
              <Icon name={f.icon} />
            </div>
            <h3 style={{ marginTop: 16 }}>{f.t}</h3>
            <p className="muted" style={{ marginTop: 6, fontSize: 13.5 }}>
              {f.d}
            </p>
          </Spot>
        ))}
      </Reveal>
    </div>
  )
}
