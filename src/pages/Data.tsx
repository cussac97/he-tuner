import { useRef } from 'react'
import { ArchiveStatus, NoteBox } from '../components/Archive'
import { generateSampleSession } from '../lib/sample'
import { store, useStore } from '../lib/store'
import { EXERCISE_INFO, type AnyExercise } from '../lib/types'

function summary(e: AnyExercise): string {
  switch (e.kind) {
    case 'typing':
      return `${Math.round(e.meta.wpm)} mots/min · ${Math.round(e.meta.accuracy * 100)} % · ${e.meta.keys.length} frappes`
    case 'rest':
      return `${e.meta.phases.length} positions`
    case 'repeat':
      return `touche ${e.meta.code.replace('Key', '')}`
    case 'hold':
      return `${e.meta.windows.length} maintiens`
    case 'strafe':
      return `${e.meta.prompts.length} consignes`
    case 'analog':
      return `${Math.round(e.meta.path.length / 50)} s`
  }
}

const SOURCE = { hid: 'Wooting', demo: 'Démo', sample: 'Exemple' }

export function DataPage() {
  const s = useStore()
  const file = useRef<HTMLInputElement>(null)
  const list = [...s.exercises].reverse()

  const exportAll = () => {
    const blob = new Blob([JSON.stringify({ version: 1, exercises: s.exercises })], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `he-tuner-donnees-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importFile = async (f: File) => {
    try {
      const data = JSON.parse(await f.text())
      const known = new Set(s.exercises.map((e) => e.id))
      const add = (data.exercises as AnyExercise[]).filter((e) => e && e.id && e.kind in EXERCISE_INFO && !known.has(e.id))
      await store.addMany(add)
      alert(`${add.length} exercices importés.`)
    } catch {
      alert('Fichier invalide.')
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Données & paramètres</h1>
          <p>Tout reste dans ton navigateur (IndexedDB). Rien n’est envoyé nulle part.</p>
        </div>
      </div>

      <ArchiveStatus />

      <div className="card">
        <div className="card-head">
          <h3>Clavier</h3>
        </div>
        <div className="grid g3">
          <div className="field">
            <label>Disposition physique</label>
            <div className="seg">
              <button className={s.settings.layout === 'iso' ? 'on' : ''} onClick={() => store.updateSettings({ layout: 'iso' })}>
                ISO (AZERTY / Europe)
              </button>
              <button className={s.settings.layout === 'ansi' ? 'on' : ''} onClick={() => store.updateSettings({ layout: 'ansi' })}>
                ANSI (US)
              </button>
            </div>
          </div>
          <div className="field">
            <label>
              Course totale des switches : <b className="num">{s.settings.travel.toFixed(1)} mm</b>
            </label>
            <input type="range" min={3} max={4.5} step={0.1} value={s.settings.travel} onChange={(e) => store.updateSettings({ travel: +e.target.value })} />
            <span className="faint" style={{ fontSize: 12 }}>
              4.0 mm pour les switches Lekker. Sert à convertir la valeur analogique en millimètres.
            </span>
          </div>
          <div className="field">
            <label>
              Actuation de référence (visualiseur) : <b className="num">{s.settings.refActuation.toFixed(1)} mm</b>
            </label>
            <input
              type="range"
              min={0.1}
              max={3.8}
              step={0.1}
              value={s.settings.refActuation}
              onChange={(e) => store.updateSettings({ refActuation: +e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h3>Exercices enregistrés</h3>
            <p>{s.exercises.length} au total</p>
          </div>
          <div className="row">
            <button className="btn small" onClick={() => store.addMany(generateSampleSession(s.settings.layout, s.settings.lang, Math.floor(Math.random() * 1000)))}>
              Ajouter une session exemple
            </button>
            <button className="btn small" onClick={exportAll} disabled={!s.exercises.length}>
              Exporter tout
            </button>
            <button className="btn small" onClick={() => file.current?.click()}>
              Importer
            </button>
            <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
            {s.exercises.some((e) => e.source === 'sample') && (
              <button
                className="btn small danger"
                onClick={async () => {
                  for (const e of s.exercises.filter((x) => x.source === 'sample')) await store.remove(e.id)
                }}
              >
                Supprimer les exemples
              </button>
            )}
            <button
              className="btn small danger"
              disabled={!s.exercises.length}
              onClick={() => confirm('Supprimer tous les exercices enregistrés ?') && store.clear()}
            >
              Tout supprimer
            </button>
          </div>
        </div>
        {list.length ? (
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Exercice</th>
                <th>Source</th>
                <th>Résumé</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id}>
                  <td className="num muted">{new Date(e.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>{EXERCISE_INFO[e.kind].title}</td>
                  <td>
                    <span className={`pill ${e.source === 'hid' ? 'ok' : e.source === 'demo' ? 'demo' : ''}`}>{SOURCE[e.source]}</span>
                  </td>
                  <td className="muted">{summary(e)}</td>
                  <td className="r">
                    <button className="btn small ghost danger" onClick={() => store.remove(e.id)}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">Aucun exercice pour l’instant.</div>
        )}
      </div>

      <div className="card">
        <NoteBox />
      </div>
    </div>
  )
}
