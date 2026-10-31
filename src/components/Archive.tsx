import { useState } from 'react'
import { useT } from '../i18n'
import { archiveText } from '../i18n/app/archive'
import { Icon } from './icons'
import { store } from '../lib/store'
import { archive, useArchive } from '../lib/sync'

export function ArchiveStatus() {
  const a = useArchive()
  const t = useT(archiveText)
  if (a.available === null) return null
  return a.available ? (
    <div className="callout info">
      <span className="ico">
        <Icon name="save" size={16} />
      </span>
      <div>
        <b>{t.onTitle}</b>
        {t.onBody(a.exercises, a.profiles, a.pending)}
      </div>
    </div>
  ) : (
    <div className="callout warn">
      <span className="ico">
        <Icon name="save" size={16} />
      </span>
      <div>
        <b>{t.offTitle}</b>
        {t.offBody()}
      </div>
    </div>
  )
}

export function NoteBox({ placeholder }: { placeholder?: string }) {
  const a = useArchive()
  const t = useT(archiveText)
  const [text, setText] = useState('')
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  if (!a.available) return null
  return (
    <div className="col" style={{ gap: 8 }}>
      <label className="muted" style={{ fontSize: 13 }}>
        {t.noteLabel}
      </label>
      <textarea
        value={text}
        onChange={(e) => (setText(e.target.value), setState('idle'))}
        placeholder={placeholder ?? t.notePlaceholder}
        rows={3}
      />
      <div className="row">
        <button
          className="btn small"
          disabled={!text.trim() || state === 'saving'}
          onClick={async () => {
            setState('saving')
            const last = store.exercises[store.exercises.length - 1]
            const ok = await archive.note(text, {
              exercises: store.exercises.length,
              lastExerciseId: last?.id ?? null,
              settings: store.settings,
            })
            setState(ok ? 'saved' : 'error')
            if (ok) setText('')
          }}
        >
          {t.saveNote}
        </button>
        {state === 'saved' && <span className="muted">{t.saved}</span>}
        {state === 'error' && <span style={{ color: 'var(--bad)' }}>{t.saveFailed}</span>}
      </div>
    </div>
  )
}
