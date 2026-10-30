import { useEffect, useState } from 'react'
import { recorder } from '../lib/recorder'
import { newId, store } from '../lib/store'
import type { ExerciseKind, ExerciseRecord, MetaByKind } from '../lib/types'

export async function saveExercise<K extends ExerciseKind>(kind: K, t0: number, t1: number, meta: MetaByKind[K]): Promise<ExerciseRecord<K>> {
  // The demo source commits samples with a short delay; let them land first.
  await new Promise((r) => setTimeout(r, 160))
  const { traces, keys, hw } = recorder.clip(t0 - 400, t1 + 400)
  const rec: ExerciseRecord<K> = {
    id: newId(),
    kind,
    createdAt: Date.now(),
    source: recorder.source === 'hid' ? 'hid' : 'demo',
    travel: recorder.travel,
    t0,
    t1,
    traces,
    keys,
    hw: hw.length ? hw : undefined,
    meta,
  }
  await store.add(rec as never)
  return rec
}

export function useNow(active: boolean, ms = 50) {
  const [now, setNow] = useState(() => performance.now())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(performance.now()), ms)
    return () => clearInterval(id)
  }, [active, ms])
  return now
}

/** Blocks the browser's default handling (scrolling, back navigation…) while a game runs. */
export function useSwallowKeys(active: boolean) {
  useEffect(() => {
    if (!active) return
    const h = (e: KeyboardEvent) => {
      if (e.metaKey) return
      e.preventDefault()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [active])
}

export const clampScore = (x: number) => Math.round(Math.max(0, Math.min(1000, x)))
