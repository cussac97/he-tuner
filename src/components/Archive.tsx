import { useState } from 'react'
import { Icon } from './icons'
import { store } from '../lib/store'
import { archive, useArchive } from '../lib/sync'

export function ArchiveStatus() {
  const a = useArchive()
  if (a.available === null) return null
  return a.available ? (
    <div className="callout info">
      <span className="ico">
        <Icon name="save" size={16} />
      </span>
      <div>
        <b>Archivage automatique actif</b> — {a.exercises} exercices et {a.profiles} recommandations sauvegardés en JSON dans le dossier{' '}
        <span className="num">data/</span> du projet{a.pending > 0 ? ` (envoi de ${a.pending} en cours…)` : ''}. Les sessions exemple ne sont pas archivées.
      </div>
    </div>
  ) : (
    <div className="callout warn">
      <span className="ico">
        <Icon name="save" size={16} />
      </span>
      <div>
        <b>Archivage indisponible</b> — il ne fonctionne que lorsque l’app est lancée avec <span className="num">npm run dev</span>. Tes données restent dans
        le navigateur ; utilise « Exporter tout » pour les sauvegarder.
      </div>
    </div>
  )
}

export function NoteBox({ placeholder }: { placeholder?: string }) {
  const a = useArchive()
  const [text, setText] = useState('')
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  if (!a.available) return null
  return (
    <div className="col" style={{ gap: 8 }}>
      <label className="muted" style={{ fontSize: 13 }}>
        Note pour l’analyse : ce que tu as changé dans Wootility, tes impressions…
      </label>
      <textarea
        value={text}
        onChange={(e) => (setText(e.target.value), setState('idle'))}
        placeholder={placeholder ?? 'ex. : appliqué 1.8 mm global, espace à 2.2 mm, RT désactivé. Moins de fautes, frappe un peu plus dure.'}
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
          Enregistrer la note
        </button>
        {state === 'saved' && <span className="muted">Note enregistrée ✓</span>}
        {state === 'error' && <span style={{ color: 'var(--bad)' }}>Échec de l’enregistrement</span>}
      </div>
    </div>
  )
}
