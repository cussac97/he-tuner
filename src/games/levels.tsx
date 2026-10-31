import type { ComponentType } from 'react'
import { tr } from '../i18n'
import { levelsText } from '../i18n/games/levels'
import { keyLabel } from '../lib/layout'
import type { ExerciseKind } from '../lib/types'
import { ANALOG_CODE, AnalogGame } from './AnalogGame'
import { HOLD_CODE, HoldGame } from './HoldGame'
import { REPEAT_CODE, RepeatGame } from './RepeatGame'
import { RestGame } from './RestGame'
import { LEFT, RIGHT, StrafeGame } from './StrafeGame'
import { TypingGame } from './TypingGame'
import type { GameProps, LevelDef } from './types'

const K = (c: string) => <span className="kbd">{keyLabel(c)}</span>

export const LEVELS: Array<LevelDef & { Game: ComponentType<GameProps> }> = [
  {
    kind: 'typing',
    get name() {
      return tr(levelsText).typing.name
    },
    icon: 'keyboard',
    countdown: false,
    tagline: () => tr(levelsText).typing.tagline(),
    Game: TypingGame,
  },
  {
    kind: 'rest',
    get name() {
      return tr(levelsText).rest.name
    },
    icon: 'rest',
    countdown: true,
    tagline: () => tr(levelsText).rest.tagline(),
    Game: RestGame,
  },
  {
    kind: 'repeat',
    get name() {
      return tr(levelsText).repeat.name
    },
    icon: 'bolt',
    countdown: true,
    tagline: () => tr(levelsText).repeat.tagline(K(REPEAT_CODE)),
    Game: RepeatGame,
  },
  {
    kind: 'hold',
    get name() {
      return tr(levelsText).hold.name
    },
    icon: 'hold',
    countdown: true,
    tagline: () => tr(levelsText).hold.tagline(K(HOLD_CODE)),
    Game: HoldGame,
  },
  {
    kind: 'strafe',
    get name() {
      return tr(levelsText).strafe.name
    },
    icon: 'strafe',
    countdown: true,
    tagline: () => tr(levelsText).strafe.tagline(K(LEFT), K(RIGHT)),
    Game: StrafeGame,
  },
  {
    kind: 'analog',
    get name() {
      return tr(levelsText).analog.name
    },
    icon: 'analog',
    countdown: true,
    tagline: () => tr(levelsText).analog.tagline(K(ANALOG_CODE)),
    Game: AnalogGame,
  },
]

export const levelOf = (k: ExerciseKind) => LEVELS.find((l) => l.kind === k)!

export const RANKS = [
  { min: 0, name: 'D' },
  { min: 2000, name: 'C' },
  { min: 3000, name: 'B' },
  { min: 4000, name: 'A' },
  { min: 5000, name: 'S' },
]
export const rankFor = (xp: number) => [...RANKS].reverse().find((r) => xp >= r.min)!
