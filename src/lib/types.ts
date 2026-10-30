import type { HwEvent, KeyEventRec, TraceData } from './recorder'

export type ExerciseKind = 'typing' | 'rest' | 'repeat' | 'hold' | 'strafe' | 'analog'

export type TypingClass = 'correct' | 'wrong' | 'extra' | 'back' | 'space' | 'spaceEmpty' | 'other'

export interface TypingKey {
  t: number
  code: string
  key: string
  cls: TypingClass
  expectedCode: string | null
}

export interface TypingMeta {
  lang: string
  duration: number
  words: string[]
  keys: TypingKey[]
  /** after each keystroke, the codes of the next expected characters (lookahead of 3) */
  timeline: Array<{ t: number; codes: string[] }>
  wpm: number
  rawWpm: number
  accuracy: number
}

export interface RestMeta {
  phases: Array<{ name: 'typing' | 'gaming'; t0: number; t1: number; keys: string[] }>
}

export interface RepeatMeta {
  code: string
  t0: number
  t1: number
}

export interface HoldMeta {
  code: string
  windows: Array<{ t0: number; t1: number }>
}

export interface StrafeMeta {
  left: string
  right: string
  prompts: Array<{ t: number; dir: -1 | 0 | 1 }>
}

export interface AnalogMeta {
  code: string
  t0: number
  path: Array<{ t: number; target: number }>
}

export interface MetaByKind {
  typing: TypingMeta
  rest: RestMeta
  repeat: RepeatMeta
  hold: HoldMeta
  strafe: StrafeMeta
  analog: AnalogMeta
}

export interface ExerciseRecord<K extends ExerciseKind = ExerciseKind> {
  id: string
  kind: K
  createdAt: number
  source: 'hid' | 'demo' | 'sample'
  travel: number
  t0: number
  t1: number
  traces: Record<string, TraceData>
  keys: KeyEventRec[]
  /** keyboard-side actuation changes (analog protocol V2 only) */
  hw?: HwEvent[]
  meta: MetaByKind[K]
}

export type AnyExercise = { [K in ExerciseKind]: ExerciseRecord<K> }[ExerciseKind]

export const EXERCISE_INFO: Record<ExerciseKind, { title: string; short: string; minutes: string; measures: string }> = {
  typing: {
    title: 'Test de frappe',
    short: 'Frappe',
    minutes: '1 min',
    measures: 'Profondeur de chaque frappe, effleurements des touches voisines, frappes ratées, réglage actuel.',
  },
  rest: {
    title: 'Doigts au repos',
    short: 'Repos',
    minutes: '20 s',
    measures: 'Pression de tes doigts posés sans appuyer : la limite basse du point d’actuation.',
  },
  repeat: {
    title: 'Répétition rapide',
    short: 'Répétition',
    minutes: '10 s',
    measures: 'Jusqu’où tu remontes entre deux frappes rapides : le besoin réel de Rapid Trigger.',
  },
  hold: {
    title: 'Maintien',
    short: 'Maintien',
    minutes: '15 s',
    measures: 'Les micro-tremblements quand tu maintiens une touche : la sensibilité RT minimale sans faux relâchement.',
  },
  strafe: {
    title: 'Contre-strafe',
    short: 'Strafe',
    minutes: '40 s',
    measures: 'Tes transitions gauche/droite : gain réel du Rapid Trigger et des modes SOCD.',
  },
  analog: {
    title: 'Contrôle analogique',
    short: 'Analogique',
    minutes: '20 s',
    measures: 'Ta précision à profondeur partielle : courbe et zones mortes pour le mode manette.',
  },
}

export const EXERCISE_ORDER: ExerciseKind[] = ['typing', 'rest', 'repeat', 'hold', 'strafe', 'analog']
