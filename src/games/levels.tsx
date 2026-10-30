import type { ComponentType } from 'react'
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
    name: 'Frappe',
    icon: 'keyboard',
    countdown: false,
    tagline: () => <>Tape les mots comme d’habitude. Le chrono part à ta première lettre.</>,
    Game: TypingGame,
  },
  {
    kind: 'rest',
    name: 'Repos',
    icon: 'rest',
    countdown: true,
    tagline: () => <>Pose tes doigts sur le clavier, sans appuyer. Ne bouge plus.</>,
    Game: RestGame,
  },
  {
    kind: 'repeat',
    name: 'Spam',
    icon: 'bolt',
    countdown: true,
    tagline: () => <>Martèle {K(REPEAT_CODE)} le plus vite possible.</>,
    Game: RepeatGame,
  },
  {
    kind: 'hold',
    name: 'Maintien',
    icon: 'hold',
    countdown: true,
    tagline: () => <>Maintiens {K(HOLD_CODE)} à fond, comme pour avancer en jeu. Trois fois.</>,
    Game: HoldGame,
  },
  {
    kind: 'strafe',
    name: 'Strafe',
    icon: 'strafe',
    countdown: true,
    tagline: () => (
      <>
        Suis les flèches avec {K(LEFT)} et {K(RIGHT)}. Change de sens le plus vite possible.
      </>
    ),
    Game: StrafeGame,
  },
  {
    kind: 'analog',
    name: 'Analogique',
    icon: 'analog',
    countdown: true,
    tagline: () => <>Enfonce {K(ANALOG_CODE)} plus ou moins pour garder le curseur dans la zone.</>,
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
