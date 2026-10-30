import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { ConnectButtons, SourcePill, useDevice } from './components/Device'
import { Icon } from './components/icons'
import { Btn, ease, spring, useFocusMode } from './components/ui'
import { LevelRunner } from './games/LevelRunner'
import { LEVELS } from './games/levels'
import { demo } from './lib/demo'
import { hid } from './lib/hid'
import { navigate, useRoute } from './lib/router'
import { DataPage } from './pages/Data'
import { Home } from './pages/Home'
import { Live } from './pages/Live'
import { PlayHub } from './pages/Play'
import { Results } from './pages/Results'

const NAV: Array<[string, string]> = [
  ['/', 'Accueil'],
  ['/jouer', 'Jouer'],
  ['/live', 'Visualiseur'],
  ['/reglages', 'Mes réglages'],
  ['/donnees', 'Données'],
]

/** Exercises need an analog source: the keyboard, or the demo. */
function NeedsSource({ children }: { children: ReactNode }) {
  const { source } = useDevice()
  if (source !== 'none') return <>{children}</>
  return (
    <div className="card stage" style={{ minHeight: 420 }}>
      <motion.div className="level-icon" animate={{ boxShadow: ['0 0 0px rgba(200,255,46,0)', '0 0 40px rgba(200,255,46,.35)', '0 0 0px rgba(200,255,46,0)'] }} transition={{ duration: 2.4, repeat: Infinity }}>
        <Icon name="plug" size={26} />
      </motion.div>
      <h2>Branche ton Wooting</h2>
      <p className="muted" style={{ maxWidth: 440 }}>
        Connecte le clavier pour enregistrer tes vraies données, ou lance le mode démo pour essayer avec des courses simulées.
      </p>
      <ConnectButtons />
    </div>
  )
}

export function App() {
  const route = useRoute()
  const focus = useFocusMode()
  const section = '/' + (route.split('/')[1] ?? '')

  let page: ReactNode
  if (route === '/') page = <Home />
  else if (route === '/jouer') page = <PlayHub />
  else if (route === '/jouer/run')
    page = (
      <div className="page">
        <NeedsSource>
          <LevelRunner levels={LEVELS} mode="run" />
        </NeedsSource>
      </div>
    )
  else if (route.startsWith('/jouer/')) {
    const lv = LEVELS.find((l) => l.kind === route.split('/')[2])
    page = lv ? (
      <div className="page">
        <NeedsSource>
          <LevelRunner key={lv.kind} levels={[lv]} mode="single" />
        </NeedsSource>
      </div>
    ) : (
      <PlayHub />
    )
  } else if (route.startsWith('/live')) page = <Live />
  else if (route.startsWith('/reglages')) page = <Results />
  else if (route.startsWith('/donnees')) page = <DataPage />
  else page = <Home />

  return (
    <>
      <header className={`topbar ${focus ? 'focus' : ''}`}>
        <button className="brand" onClick={() => navigate('/')}>
          <div className="brand-mark">
            <span />
          </div>
          <span className="brand-name">HE Tuner</span>
        </button>
        <nav className="nav">
          {NAV.map(([to, label]) => {
            const on = to === '/' ? section === '/' : section === to
            return (
              <button key={to} className={on ? 'on' : ''} onClick={() => navigate(to)}>
                {on && <motion.span layoutId="nav-bg" className="nav-bg" transition={spring} />}
                {label}
              </button>
            )
          })}
        </nav>
        <div className="row" style={{ gap: 8 }}>
          <SourcePill />
          <HeaderConnect />
        </div>
      </header>
      <main className="main">
        <AnimatePresence mode="wait">
          <motion.div
            key={route.startsWith('/jouer/') ? route : section}
            initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.45, ease } }}
            exit={{ opacity: 0, y: -6, filter: 'blur(8px)', transition: { duration: 0.2, ease } }}
          >
            {page}
          </motion.div>
        </AnimatePresence>
      </main>
    </>
  )
}

function HeaderConnect() {
  const { source } = useDevice()
  if (source !== 'none') return null
  return (
    <>
      <Btn className="small primary" onClick={() => hid.request()}>
        Connecter
      </Btn>
      <Btn className="small ghost" onClick={() => demo.start()}>
        Démo
      </Btn>
    </>
  )
}
