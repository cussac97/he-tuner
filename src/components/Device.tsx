import { useEffect, useReducer } from 'react'
import { demo } from '../lib/demo'
import { Icon } from './icons'
import { hid } from '../lib/hid'
import { recorder } from '../lib/recorder'

export function useDevice() {
  const [, force] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    const a = hid.onChange(force)
    const b = recorder.onStatus(force)
    return () => {
      a()
      b()
    }
  }, [])
  return { status: hid.status, source: recorder.source }
}

export function SourcePill() {
  const { status, source } = useDevice()
  if (source === 'hid' && status.state === 'connected')
    return (
      <span className="pill ok">
        <span className="dot" />
        {status.name}
      </span>
    )
  if (source === 'demo')
    return (
      <span className="pill demo">
        <span className="dot" />
        Mode démo
      </span>
    )
  if (status.state === 'error')
    return (
      <span className="pill bad">
        <span className="dot" />
        Erreur
      </span>
    )
  return (
    <span className="pill">
      <span className="dot" />
      Aucun clavier
    </span>
  )
}

export function ConnectButtons({ compact }: { compact?: boolean }) {
  const { status, source } = useDevice()
  const connected = source === 'hid'
  const unsupported = status.state === 'unsupported'
  return (
    <div className="row">
      {connected ? (
        <button className="btn small" onClick={() => hid.disconnect()}>
          Déconnecter
        </button>
      ) : (
        <button
          className={`btn ${compact ? 'small' : ''} primary`}
          disabled={unsupported}
          onClick={async () => {
            if (source === 'demo') demo.stop()
            await hid.request()
          }}
          title={unsupported ? 'WebHID est requis : utilise Chrome, Edge, Arc ou Brave' : undefined}
        >
          Connecter le Wooting
        </button>
      )}
      {!connected &&
        (source === 'demo' ? (
          <button className={`btn ${compact ? 'small' : ''} ghost`} onClick={() => demo.stop()}>
            Quitter la démo
          </button>
        ) : (
          <button className={`btn ${compact ? 'small' : ''}`} onClick={() => demo.start()}>
            Mode démo
          </button>
        ))}
    </div>
  )
}

export function DeviceHint() {
  const { status } = useDevice()
  if (status.state === 'unsupported')
    return (
      <div className="callout warn">
        <span className="ico">
          <Icon name="warn" size={16} />
        </span>
        <div>
          <b>Ce navigateur ne gère pas WebHID.</b>
          <p className="muted">
            Ouvre cette page dans Chrome, Edge, Arc ou Brave sur ton Mac pour lire le clavier. Le mode démo et la session exemple fonctionnent partout.
          </p>
        </div>
      </div>
    )
  if (status.state === 'error')
    return (
      <div className="callout warn">
        <span className="ico">
          <Icon name="warn" size={16} />
        </span>
        <div>
          <b>{status.message}</b>
          <p className="muted">Débranche/rebranche le clavier puis reconnecte. Si rien n’arrive, ferme Wootility et réessaie.</p>
        </div>
      </div>
    )
  return null
}
