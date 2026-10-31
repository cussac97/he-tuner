import { useEffect, useReducer } from 'react'
import { useT } from '../i18n'
import { deviceText } from '../i18n/app/device'
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
  const t = useT(deviceText)
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
        {t.demoMode}
      </span>
    )
  if (status.state === 'error')
    return (
      <span className="pill bad">
        <span className="dot" />
        {t.error}
      </span>
    )
  return (
    <span className="pill">
      <span className="dot" />
      {t.noKeyboard}
    </span>
  )
}

export function ConnectButtons({ compact }: { compact?: boolean }) {
  const { status, source } = useDevice()
  const t = useT(deviceText)
  const connected = source === 'hid'
  const unsupported = status.state === 'unsupported'
  return (
    <div className="row">
      {connected ? (
        <button className="btn small" onClick={() => hid.disconnect()}>
          {t.disconnect}
        </button>
      ) : (
        <button
          className={`btn ${compact ? 'small' : ''} primary`}
          disabled={unsupported}
          onClick={async () => {
            if (source === 'demo') demo.stop()
            await hid.request()
          }}
          title={unsupported ? t.needWebHid : undefined}
        >
          {t.connect}
        </button>
      )}
      {!connected &&
        (source === 'demo' ? (
          <button className={`btn ${compact ? 'small' : ''} ghost`} onClick={() => demo.stop()}>
            {t.exitDemo}
          </button>
        ) : (
          <button className={`btn ${compact ? 'small' : ''}`} onClick={() => demo.start()}>
            {t.demoMode}
          </button>
        ))}
    </div>
  )
}

export function DeviceHint() {
  const { status } = useDevice()
  const t = useT(deviceText)
  if (status.state === 'unsupported')
    return (
      <div className="callout warn">
        <span className="ico">
          <Icon name="warn" size={16} />
        </span>
        <div>
          <b>{t.unsupportedTitle}</b>
          <p className="muted">{t.unsupportedBody}</p>
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
          <p className="muted">{t.errorBody}</p>
        </div>
      </div>
    )
  return null
}
