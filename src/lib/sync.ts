// Mirrors recorded data to the dev server's local archive (./data, see vite.config.ts).
// Fire-and-forget: when the app is not served by `npm run dev` the endpoint is absent
// and the archive simply reports itself as unavailable.

import { useSyncExternalStore } from 'react'
import type { AnyExercise } from './types'

const BASE = '/__hetuner'

export interface ArchiveState {
  available: boolean | null
  exercises: number
  profiles: number
  dir: string | null
  pending: number
}

class Archive {
  state: ArchiveState = { available: null, exercises: 0, profiles: 0, dir: null, pending: 0 }
  private listeners = new Set<() => void>()
  private sent = new Set<string>()
  private queue: Promise<unknown> = Promise.resolve()

  subscribe = (l: () => void) => {
    this.listeners.add(l)
    return () => {
      this.listeners.delete(l)
    }
  }

  getState = () => this.state

  private update(patch: Partial<ArchiveState>) {
    this.state = { ...this.state, ...patch }
    for (const l of this.listeners) l()
  }

  async refresh() {
    // the archive endpoint only exists on the dev server (vite.config.ts)
    if (!import.meta.env.DEV) {
      this.update({ available: false })
      return
    }
    try {
      const r = await fetch(`${BASE}/status`)
      if (!r.ok) throw new Error()
      const s = await r.json()
      this.update({ available: true, exercises: s.exercises, profiles: s.profiles, dir: s.dir })
    } catch {
      this.update({ available: false })
    }
  }

  private post(path: string, body: unknown): Promise<boolean> {
    if (!import.meta.env.DEV) return Promise.resolve(false)
    this.update({ pending: this.state.pending + 1 })
    // one request at a time: exercise files can weigh a few MB
    const done = this.queue
      .then(() => fetch(`${BASE}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }))
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return true
      })
      .catch(() => {
        this.update({ available: false })
        return false
      })
      .finally(() => this.update({ pending: this.state.pending - 1 }))
    this.queue = done
    return done
  }

  /** Real recordings only: generated example sessions are not worth archiving. */
  pushExercises(list: AnyExercise[]) {
    for (const ex of list) {
      if (ex.source === 'sample' || this.sent.has(ex.id)) continue
      this.sent.add(ex.id)
      this.post('/exercise', ex)
    }
    this.queue.then(() => this.refresh())
  }

  pushProfile(body: { settings: unknown; exerciseIds: string[]; profile: unknown }) {
    this.post('/profile', { at: Date.now(), ...body }).then(() => this.refresh())
  }

  note(text: string, context: unknown) {
    return this.post('/note', { text, context })
  }
}

export const archive = new Archive()

export function useArchive(): ArchiveState {
  return useSyncExternalStore(archive.subscribe, archive.getState)
}
