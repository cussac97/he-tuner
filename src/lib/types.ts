import { tr } from '../i18n'
import { exercisesText } from '../i18n/games/exercises'
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

/** Text fields are getters: they read the current language on each access. */
function info(kind: ExerciseKind, minutes: string) {
  return {
    get title() {
      return tr(exercisesText)[kind].title
    },
    get short() {
      return tr(exercisesText)[kind].short
    },
    minutes,
    get measures() {
      return tr(exercisesText)[kind].measures
    },
  }
}

export const EXERCISE_INFO: Record<ExerciseKind, { title: string; short: string; minutes: string; measures: string }> = {
  typing: info('typing', '1 min'),
  rest: info('rest', '20 s'),
  repeat: info('repeat', '10 s'),
  hold: info('hold', '15 s'),
  strafe: info('strafe', '40 s'),
  analog: info('analog', '20 s'),
}

export const EXERCISE_ORDER: ExerciseKind[] = ['typing', 'rest', 'repeat', 'hold', 'strafe', 'analog']
