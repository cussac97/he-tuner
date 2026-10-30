import type { ReactNode } from 'react'
import type { IconName } from '../components/icons'
import type { ExerciseKind } from '../lib/types'

export interface LevelStat {
  label: string
  value: string
  unit?: string
}

export interface LevelResult {
  /** 0..1000 */
  score: number
  headline: string
  stats: LevelStat[]
  extra?: ReactNode
  failed?: boolean
}

export interface GameProps {
  /** shorter durations when chained in a run */
  quick: boolean
  onComplete: (r: LevelResult) => void
}

export interface LevelDef {
  kind: ExerciseKind
  name: string
  icon: IconName
  tagline: () => ReactNode
  /** games that start on the player's first input skip the 3-2-1 */
  countdown: boolean
}
