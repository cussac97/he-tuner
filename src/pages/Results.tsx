import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { buildProfile, type Confidence, type Profile, type SimCounts } from '../analysis/recommend'
import { NoteBox } from '../components/Archive'
import { Bars, CurvePreview, DepthHistogram, ErrorCurve } from '../components/Charts'
import { KeyboardViz } from '../components/KeyboardViz'
import { Icon, type IconName } from '../components/icons'
import { Btn, CountUp, ease, Item, MaskText, Reveal, Spot, Why } from '../components/ui'
import { levelOf } from '../games/levels'
import { useLang, useT } from '../i18n'
import { resultsText } from '../i18n/results/page'
import { recommendText } from '../i18n/results/recommend'
import { CODE_NAMES } from '../lib/hidCodes'
import { FINGER_NAMES, keyLabel, type Finger } from '../lib/layout'
import { navigate } from '../lib/router'
import { generateSampleSession } from '../lib/sample'
import { store, useStore } from '../lib/store'
import { archive } from '../lib/sync'
import type { ExerciseKind } from '../lib/types'

const per1000 = (n: number, c: SimCounts) => (c.wanted ? (n / c.wanted) * 1000 : 0)
const keyName = (c: string) => CODE_NAMES[c] ?? keyLabel(c)
type T = (typeof resultsText)['en']

function Conf({ c }: { c: Confidence }) {
  const t = useT(resultsText)
  return <span className={`pill ${c === 'high' ? 'ok' : c === 'medium' ? 'warn' : ''}`}>{t.conf[c]}</span>
}

export function Results() {
  const s = useStore()
  const t = useT(resultsText)
  // the profile holds text (reasons, labels), so it is rebuilt when the language changes
  const lang = useLang()
  const profile = useMemo(() => buildProfile(s.exercises, s.settings), [s.exercises, s.settings, lang])

  // Keep a trace of every recommendation actually shown, for later before/after analysis
  // (keyed on the data, not the language, so switching language does not archive a duplicate)
  useEffect(() => {
    if (!profile.hasData || s.exercises.every((e) => e.source === 'sample')) return
    const id = setTimeout(() => archive.pushProfile({ settings: s.settings, exerciseIds: s.exercises.map((e) => e.id), profile }), 1500)
    return () => clearTimeout(id)
  }, [s.exercises, s.settings])

  if (!profile.hasData)
    return (
      <div className="page">
        <div className="card stage">
          <div className="icon-tile" style={{ width: 56, height: 56 }}>
            <Icon name="compass" size={26} />
          </div>
          <h2>{t.empty.title}</h2>
          <p className="muted">{t.empty.body}</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Btn onClick={() => store.addMany(generateSampleSession(s.settings.layout))}>{t.empty.example}</Btn>
            <Btn className="primary big" onClick={() => navigate('/jouer/run')}>
              {t.empty.start}
            </Btn>
          </div>
        </div>
      </div>
    )

  const isSample = s.exercises.some((e) => e.source === 'sample')

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="label-mono">{t.head.label}</span>
          <h1 style={{ marginTop: 10 }}>
            <MaskText key={t.head.title} text={t.head.title} />
          </h1>
          <p>{t.head.sub}</p>
        </div>
        <div className="card tight field" style={{ minWidth: 280 }}>
          <label>
            {t.head.priority} · <b className="accent">{s.settings.safety < 0.34 ? t.head.speed : s.settings.safety > 0.66 ? t.head.safe : t.head.balanced}</b>
          </label>
          <input type="range" min={0} max={1} step={0.05} value={s.settings.safety} onChange={(e) => store.updateSettings({ safety: +e.target.value })} />
        </div>
      </div>

      {isSample && (
        <div className="callout info">
          <span className="ico">
            <Icon name="info" size={17} />
          </span>
          <div>{t.sample('#/donnees')}</div>
        </div>
      )}
      {profile.missing.length > 0 && (
        <div className="callout warn" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="ico">
            <Icon name="warn" size={17} />
          </span>
          <span>{t.missing}</span>
          <div className="row">
            {profile.missing.map((k) => {
              const l = levelOf(k as ExerciseKind)
              return (
                <Btn key={k} className="small" onClick={() => navigate(`/jouer/${k}`)}>
                  <Icon name={l.icon} size={14} /> {l.name}
                </Btn>
              )
            })}
          </div>
        </div>
      )}

      {profile.typingStats && <PersonaCard p={profile} />}

      <Reveal className="grid g3" style={{ alignItems: 'start' }}>
        {profile.typing && <TypingCard p={profile} />}
        {profile.gaming && <GamingCard p={profile} />}
        {profile.analog && <AnalogCard p={profile} />}
      </Reveal>

      {profile.typing && <Lab p={profile} />}

      {profile.ideas.length > 0 && (
        <div className="col" style={{ gap: 16 }}>
          <div>
            <span className="label-mono">{t.advanced.label}</span>
            <h2 style={{ marginTop: 6 }}>{t.advanced.title}</h2>
          </div>
          <Reveal className="grid g3">
            {profile.ideas.map((i) => (
              <Spot key={i.title}>
                <span className="tag">{i.tag}</span>
                <h3 style={{ marginTop: 12 }}>{i.title}</h3>
                <p className="muted" style={{ marginTop: 6, fontSize: 13.5 }}>
                  {i.body}
                </p>
              </Spot>
            ))}
          </Reveal>
        </div>
      )}

      <Checklist p={profile} />
    </div>
  )
}

// ---------------------------------------------------------------------------

function signature(p: Profile, l: T['signature']) {
  const t = p.typingStats!
  const bo = t.bottomOut
  const arch = bo > 0.85 ? l.heavy : bo < 0.4 ? l.light : l.modulated
  const traits: Array<[string, string]> = [[`${Math.round(t.wpm)}`, l.wpm]]
  traits.push([`${Math.round(t.accuracy * 100)}%`, l.accuracy])
  traits.push([`${Math.round(bo * 100)}%`, l.bottomOut])
  const topFinger = Object.entries(p.fingerAccidents).sort((a, b) => b[1] - a[1])[0]
  if (topFinger && topFinger[1] >= 3) traits.push([FINGER_NAMES[topFinger[0] as Finger], l.leastPrecise])
  if (p.gaming?.strafe && p.gaming.strafe.transitions >= 4) traits.push([`${Math.round(p.gaming.strafe.overlapRate * 100)}%`, l.overlap])
  if (p.gaming?.repeat) traits.push([p.gaming.repeat.freq.toFixed(1), l.tapRate])
  return { ...arch, traits }
}

function PersonaCard({ p }: { p: Profile }) {
  const t = useT(resultsText)
  const l = t.signature
  const sig = signature(p, l)
  const ts = p.typingStats!
  return (
    <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: {} }}>
      <Spot style={{ padding: 32 }}>
        <div className="dotgrid" style={{ opacity: 0.6 }} />
        <div style={{ position: 'relative' }}>
          <span className="label-mono">{l.label}</span>
          <h1 style={{ marginTop: 10 }}>
            <MaskText key={sig.name} text={sig.name} />
          </h1>
          <motion.p className="muted" style={{ fontSize: 16, marginTop: 8 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.6, ease }}>
            {sig.line}
          </motion.p>
          <Reveal className="row" style={{ marginTop: 18, gap: 6 }}>
            {sig.traits.map(([v, l]) => (
              <Item key={l} className="trait">
                <b>{v}</b> {l}
              </Item>
            ))}
          </Reveal>
          <div className="grid g4" style={{ marginTop: 28 }}>
            <div className="stat">
              <span className="label">{l.pressSpeed}</span>
              <span className="value">
                <CountUp value={ts.pressSpeed} />
                <small>mm/s</small>
              </span>
            </div>
            <div className="stat">
              <span className="label">{p.current.measured ? l.actRead : l.actEstimated}</span>
              <span className="value">
                <CountUp value={p.current.actuation ?? NaN} decimals={2} />
                <small>mm</small>
              </span>
            </div>
            <div className="stat">
              <span className="label">{l.rt}</span>
              <span className="value">
                {p.current.rt?.detected ? t.on : t.off}
                {p.current.rt?.detected && p.current.rt.release ? <small>{p.current.rt.release.toFixed(2)} mm</small> : null}
              </span>
            </div>
            <div className="stat">
              <span className="label">{l.stray}</span>
              <span className="value">
                <CountUp value={ts.counts.accidental} />
                <small>/ {ts.keystrokes}</small>
              </span>
            </div>
          </div>
        </div>
      </Spot>
    </motion.div>
  )
}

function SettingCard({ icon, title, conf, children, why }: { icon: IconName; title: string; conf?: Confidence; children: React.ReactNode; why: React.ReactNode }) {
  return (
    <Spot className="col" style={{ gap: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="row" style={{ gap: 12 }}>
          <div className="icon-tile">
            <Icon name={icon} />
          </div>
          <h3>{title}</h3>
        </div>
        {conf && <Conf c={conf} />}
      </div>
      {children}
      <Why>{why}</Why>
    </Spot>
  )
}

function TypingCard({ p }: { p: Profile }) {
  const t = p.typing!
  const l = useT(resultsText)
  return (
    <SettingCard
      icon="keyboard"
      title={l.cards.typing}
      conf={t.confidence}
      why={
        <div className="col" style={{ gap: 14 }}>
          <ul className="reasons">
            {t.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
            <li>{t.rt.reason}</li>
          </ul>
          <Compare cur={t.current} rec={t.recommended} />
        </div>
      }
    >
      <div>
        <span className="muted" style={{ fontSize: 13 }}>
          {l.cards.actuation}
        </span>
        <div className="big-rec">
          <span className="n accent">
            <CountUp value={t.actuation} decimals={1} />
          </span>
          <span className="u">mm</span>
        </div>
        {p.current.actuation !== null && (
          <span className="faint" style={{ fontSize: 13 }}>
            {l.cards.today(p.current.actuation.toFixed(1))}
          </span>
        )}
      </div>
      <div>
        <div className="setting-row">
          <span className="k">Rapid Trigger</span>
          <span className="v">{t.rt.enabled ? l.on : l.off}</span>
        </div>
        {t.overrides.map((o) => (
          <div key={o.label} className="setting-row" style={{ alignItems: 'flex-start' }}>
            <div className="col" style={{ gap: 6 }}>
              <span className="k">{o.label}</span>
              <div className="chips">
                {o.codes.slice(0, 8).map((c) => (
                  <span key={c} className="kbd">
                    {keyName(c) || '␣'}
                  </span>
                ))}
              </div>
            </div>
            <span className="v">{o.value.toFixed(1)} mm</span>
          </div>
        ))}
      </div>
    </SettingCard>
  )
}

function GamingCard({ p }: { p: Profile }) {
  const g = p.gaming!
  const l = useT(resultsText)
  return (
    <SettingCard
      icon="gamepad"
      title={l.cards.gaming}
      conf={g.confidence}
      why={
        <div className="col" style={{ gap: 16 }}>
          <ul className="reasons">
            {g.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {g.strafe && g.strafe.stops > 0 && (
            <div className="col">
              <b style={{ fontSize: 14 }}>{l.cards.stopDelay}</b>
              <Bars rows={g.strafe.results.filter((r) => r.socd === 'none').map((r) => ({ label: r.name, value: r.stopDelay }))} unit="ms" />
            </div>
          )}
          {g.repeat && (
            <div className="col">
              <b style={{ fontSize: 14 }}>{l.cards.fastTaps}</b>
              <Bars rows={g.repeat.results.map((r) => ({ label: r.name, value: (r.registered / g.repeat!.taps.length) * 100 }))} unit="%" lowerIsBetter={false} />
            </div>
          )}
        </div>
      }
    >
      <div>
        <span className="muted" style={{ fontSize: 13 }}>
          {l.cards.actuation}
        </span>
        <div className="big-rec">
          <span className="n accent">
            <CountUp value={g.actuation} decimals={1} />
          </span>
          <span className="u">mm</span>
        </div>
      </div>
      <div>
        <div className="setting-row">
          <span className="k">Rapid Trigger</span>
          <span className="v">{g.rtPress === g.rtRelease ? `${g.rtRelease.toFixed(2)} mm` : `${g.rtPress.toFixed(2)} / ${g.rtRelease.toFixed(2)} mm`}</span>
        </div>
        <div className="setting-row">
          <span className="k">{l.cards.continuous}</span>
          <span className="v">{g.continuous ? l.on : l.off}</span>
        </div>
        <div className="setting-row">
          <span className="k">SOCD</span>
          <span className="v">{l.socd[g.socd]}</span>
        </div>
      </div>
      {g.socd !== 'none' && (
        <div className="callout warn">
          <span className="ico">
            <Icon name="warn" size={16} />
          </span>
          {l.cards.socdWarning}
        </div>
      )}
    </SettingCard>
  )
}

function AnalogCard({ p }: { p: Profile }) {
  const a = p.analog!
  const s = useStore()
  const l = useT(resultsText)
  const curves = useT(recommendText).curves
  return (
    <SettingCard
      icon="analog"
      title={l.cards.analog}
      why={
        <ul className="reasons">
          {a.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      }
    >
      <div className="row" style={{ justifyContent: 'center' }}>
        <CurvePreview curve={a.curve} inner={a.innerDeadzone} outer={a.outerDeadzone} travel={s.settings.travel} />
      </div>
      <div>
        <div className="setting-row">
          <span className="k">{l.cards.curve}</span>
          <span className="v" style={{ textTransform: 'capitalize' }}>
            {curves[a.curve]}
          </span>
        </div>
        <div className="setting-row">
          <span className="k">{l.cards.deadzones}</span>
          <span className="v">
            {a.innerDeadzone.toFixed(1)} / {a.outerDeadzone.toFixed(1)} mm
          </span>
        </div>
      </div>
    </SettingCard>
  )
}

function Compare({ cur, rec }: { cur: SimCounts | null; rec: SimCounts }) {
  const l = useT(resultsText).compare
  const rows: Array<[string, (c: SimCounts) => number, string]> = [
    [l.stray, (c) => per1000(c.accidental, c), '‰'],
    [l.missed, (c) => per1000(c.missed, c), '‰'],
    [l.doubles, (c) => per1000(c.doubles, c), '‰'],
    [l.delay, (c) => c.latency, 'ms'],
  ]
  return (
    <table className="data">
      <thead>
        <tr>
          <th>{l.head}</th>
          {cur && <th className="r">{l.current}</th>}
          <th className="r">{l.proposed}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, f, unit]) => (
          <tr key={label}>
            <td>{label}</td>
            {cur && (
              <td className="r num">
                {f(cur).toFixed(1)} {unit}
              </td>
            )}
            <td className="r num" style={{ color: cur && f(rec) < f(cur) - 0.05 ? 'var(--green)' : undefined, fontWeight: 700 }}>
              {f(rec).toFixed(1)} {unit}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Lab({ p }: { p: Profile }) {
  const t = p.typing!
  const s = useStore()
  const l = useT(resultsText).lab
  const heat: Record<string, number> = {}
  const max = Math.max(1, ...Object.values(p.keyAccidents))
  for (const [c, n] of Object.entries(p.keyAccidents)) heat[c] = n / max
  const ts = p.typingStats!
  const tiles = [
    { label: l.intended, v: ts.counts.intended + ts.counts.typo, c: 'var(--ink)' },
    { label: l.stray, v: ts.counts.accidental, c: 'var(--warn)' },
    { label: l.brushes, v: ts.counts.brush, c: 'var(--cool)' },
    { label: l.missed, v: ts.counts.missed, c: 'var(--red)' },
  ]
  return (
    <motion.div className="card" initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
      <div className="card-head">
        <div>
          <span className="label-mono">{l.label}</span>
          <h2 style={{ marginTop: 4 }}>{l.title}</h2>
          <p>{l.sub}</p>
        </div>
      </div>
      <Reveal className="grid g4" style={{ marginBottom: 22 }}>
        {tiles.map((x) => (
          <Item key={x.label} className="tile stat">
            <span className="label">{x.label}</span>
            <span className="value" style={{ color: x.c }}>
              <CountUp value={x.v} />
            </span>
          </Item>
        ))}
      </Reveal>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="col">
          <b>{l.where}</b>
          <KeyboardViz
            layout={s.settings.layout}
            heat={heat}
            heatColor="#ff7a3d"
            values={Object.fromEntries(Object.entries(p.keyAccidents).map(([c, n]) => [c, String(n)]))}
          />
        </div>
        <div className="col">
          <b>{l.depth}</b>
          <span className="muted" style={{ fontSize: 13 }}>
            {l.depthHelp}
          </span>
          <DepthHistogram {...t.chart} travel={s.settings.travel} />
        </div>
      </div>
      <div className="col" style={{ marginTop: 18 }}>
        <b>{l.errors}</b>
        <span className="muted" style={{ fontSize: 13 }}>
          <span style={{ color: 'var(--warn)' }}>━</span> {l.errorsLegend} · <span style={{ color: 'var(--cool)' }}>┅</span> {l.delayLegend}
        </span>
        <ErrorCurve curve={t.curve} chosen={t.actuation} />
      </div>
    </motion.div>
  )
}

function Checklist({ p }: { p: Profile }) {
  const [copied, setCopied] = useState(false)
  const t = useT(resultsText)
  const curves = useT(recommendText).curves
  const l = t.checklist
  const list = buildChecklist(p, t, curves)
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <span className="label-mono">{l.label}</span>
          <h2 style={{ marginTop: 4 }}>{l.title}</h2>
          <p>{l.sub}</p>
        </div>
        <div className="row">
          <Btn
            className="small"
            onClick={() => {
              navigator.clipboard.writeText(list.map((c, i) => `${i + 1}. ${c}`).join('\n'))
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
          >
            {copied ? l.copied : l.copy}
          </Btn>
          <Btn className="small" onClick={() => exportProfile(p, l.fileName)}>
            {l.export}
          </Btn>
        </div>
      </div>
      <Reveal>
        <ol className="steps">
          {list.map((c, i) => (
            <motion.li key={i} variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}>
              {c}
            </motion.li>
          ))}
        </ol>
      </Reveal>
      <div style={{ marginTop: 22 }}>
        <NoteBox />
      </div>
    </div>
  )
}

function buildChecklist(p: Profile, t: T, curves: Record<string, string>): string[] {
  const l = t.checklist
  const out: string[] = []
  if (p.typing) {
    out.push(l.typingActuation(p.typing.actuation.toFixed(1)))
    for (const o of p.typing.overrides) out.push(l.typingOverride(o.label, o.codes.map(keyName).filter(Boolean).join(', ') || l.space, o.value.toFixed(1)))
    out.push(l.typingRt(p.typing.rt.enabled))
  }
  if (p.gaming) {
    const g = p.gaming
    out.push(l.gamingActuation(g.actuation.toFixed(1)))
    out.push(l.gamingRt(g.rtRelease.toFixed(2), g.rtPress === g.rtRelease ? null : g.rtPress.toFixed(2), g.continuous))
    if (g.socd !== 'none') out.push(l.gamingSocd(t.socd[g.socd]))
    out.push(l.shortcut)
  }
  if (p.analog) out.push(l.analog(curves[p.analog.curve], p.analog.innerDeadzone.toFixed(1), p.analog.outerDeadzone.toFixed(1)))
  out.push(l.verify)
  return out
}

function exportProfile(p: Profile, fileName: string) {
  const data = {
    generatedAt: new Date().toISOString(),
    current: p.current,
    typing: p.typing && { actuation: p.typing.actuation, overrides: p.typing.overrides, rapidTrigger: p.typing.rt.enabled },
    gaming: p.gaming && { actuation: p.gaming.actuation, rtPress: p.gaming.rtPress, rtRelease: p.gaming.rtRelease, continuous: p.gaming.continuous, socd: p.gaming.socd },
    analog: p.analog && { curve: p.analog.curve, innerDeadzone: p.analog.innerDeadzone, outerDeadzone: p.analog.outerDeadzone },
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = fileName
  a.click()
  URL.revokeObjectURL(a.href)
}
