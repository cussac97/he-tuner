import { useRef } from 'react'
import { ArchiveStatus, NoteBox } from '../components/Archive'
import { tr, useT } from '../i18n'
import { dataText } from '../i18n/app/data'
import { generateSampleSession } from '../lib/sample'
import { store, useStore } from '../lib/store'
import { EXERCISE_INFO, type AnyExercise } from '../lib/types'

function summary(e: AnyExercise): string {
  const t = tr(dataText).summary
  switch (e.kind) {
    case 'typing':
      return t.typing(Math.round(e.meta.wpm), Math.round(e.meta.accuracy * 100), e.meta.keys.length)
    case 'rest':
      return t.rest(e.meta.phases.length)
    case 'repeat':
      return t.repeat(e.meta.code.replace('Key', ''))
    case 'hold':
      return t.hold(e.meta.windows.length)
    case 'strafe':
      return t.strafe(e.meta.prompts.length)
    case 'analog':
      return `${Math.round(e.meta.path.length / 50)} s`
  }
}

export function DataPage() {
  const s = useStore()
  const t = useT(dataText)
  const file = useRef<HTMLInputElement>(null)
  const list = [...s.exercises].reverse()

  const exportAll = () => {
    const blob = new Blob([JSON.stringify({ version: 1, exercises: s.exercises })], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${t.exportFile}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importFile = async (f: File) => {
    try {
      const data = JSON.parse(await f.text())
      const known = new Set(s.exercises.map((e) => e.id))
      const add = (data.exercises as AnyExercise[]).filter((e) => e && e.id && e.kind in EXERCISE_INFO && !known.has(e.id))
      await store.addMany(add)
      alert(t.imported(add.length))
    } catch {
      alert(t.invalidFile)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>
      </div>

      <ArchiveStatus />

      <div className="card">
        <div className="card-head">
          <h3>{t.keyboard}</h3>
        </div>
        <div className="grid g3">
          <div className="field">
            <label>{t.layout}</label>
            <div className="seg">
              <button className={s.settings.layout === 'iso' ? 'on' : ''} onClick={() => store.updateSettings({ layout: 'iso' })}>
                {t.iso}
              </button>
              <button className={s.settings.layout === 'ansi' ? 'on' : ''} onClick={() => store.updateSettings({ layout: 'ansi' })}>
                {t.ansi}
              </button>
            </div>
          </div>
          <div className="field">
            <label>
              {t.travel}
              <b className="num">{s.settings.travel.toFixed(1)} mm</b>
            </label>
            <input type="range" min={3} max={4.5} step={0.1} value={s.settings.travel} onChange={(e) => store.updateSettings({ travel: +e.target.value })} />
            <span className="faint" style={{ fontSize: 12 }}>
              {t.travelHint}
            </span>
          </div>
          <div className="field">
            <label>
              {t.refActuation}
              <b className="num">{s.settings.refActuation.toFixed(1)} mm</b>
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
            <h3>{t.recorded}</h3>
            <p>{t.total(s.exercises.length)}</p>
          </div>
          <div className="row">
            <button className="btn small" onClick={() => store.addMany(generateSampleSession(s.settings.layout, undefined, Math.floor(Math.random() * 1000)))}>
              {t.addSample}
            </button>
            <button className="btn small" onClick={exportAll} disabled={!s.exercises.length}>
              {t.exportAll}
            </button>
            <button className="btn small" onClick={() => file.current?.click()}>
              {t.import}
            </button>
            <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
            {s.exercises.some((e) => e.source === 'sample') && (
              <button
                className="btn small danger"
                onClick={async () => {
                  for (const e of s.exercises.filter((x) => x.source === 'sample')) await store.remove(e.id)
                }}
              >
                {t.deleteSamples}
              </button>
            )}
            <button
              className="btn small danger"
              disabled={!s.exercises.length}
              onClick={() => confirm(t.confirmClear) && store.clear()}
            >
              {t.deleteAll}
            </button>
          </div>
        </div>
        {list.length ? (
          <table className="data">
            <thead>
              <tr>
                <th>{t.colDate}</th>
                <th>{t.colExercise}</th>
                <th>{t.colSource}</th>
                <th>{t.colSummary}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id}>
                  <td className="num muted">{new Date(e.createdAt).toLocaleString(t.dateLocale, { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>{EXERCISE_INFO[e.kind].title}</td>
                  <td>
                    <span className={`pill ${e.source === 'hid' ? 'ok' : e.source === 'demo' ? 'demo' : ''}`}>{t.sources[e.source]}</span>
                  </td>
                  <td className="muted">{summary(e)}</td>
                  <td className="r">
                    <button className="btn small ghost danger" onClick={() => store.remove(e.id)}>
                      {t.delete}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">{t.empty}</div>
        )}
      </div>

      <div className="card">
        <NoteBox />
      </div>
    </div>
  )
}
