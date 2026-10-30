// App state: persisted settings (localStorage) and exercise records (IndexedDB).

import { useSyncExternalStore } from 'react'
import type { LayoutKind } from './layout'
import { recorder } from './recorder'
import { archive } from './sync'
import type { AnyExercise, ExerciseKind } from './types'

export interface Settings {
  travel: number
  layout: LayoutKind
  lang: 'fr' | 'en'
  duration: number
  /** 0 = most responsive, 1 = safest */
  safety: number
  /** reference actuation drawn on live views (mm) */
  refActuation: number
}

const DEFAULTS: Settings = { travel: 4.0, layout: 'iso', lang: 'fr', duration: 60, safety: 0.5, refActuation: 1.5 }

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('hetuner.settings')
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return { ...DEFAULTS }
}

type Listener = () => void

class Store {
  settings: Settings = loadSettings()
  exercises: AnyExercise[] = []
  loaded = false
  private listeners = new Set<Listener>()
  private version = 0

  constructor() {
    recorder.travel = this.settings.travel
  }

  subscribe = (l: Listener) => {
    this.listeners.add(l)
    return () => {
      this.listeners.delete(l)
    }
  }

  getVersion = () => this.version

  private emit() {
    this.version++
    for (const l of this.listeners) l()
  }

  updateSettings(patch: Partial<Settings>) {
    this.settings = { ...this.settings, ...patch }
    recorder.travel = this.settings.travel
    try {
      localStorage.setItem('hetuner.settings', JSON.stringify(this.settings))
    } catch {
      /* ignore */
    }
    this.emit()
  }

  async load() {
    this.exercises = (await idbAll()).sort((a, b) => a.createdAt - b.createdAt)
    this.loaded = true
    this.emit()
    // Back-fill the local archive with anything recorded before it existed (idempotent)
    await archive.refresh()
    archive.pushExercises(this.exercises)
  }

  async add(ex: AnyExercise) {
    this.exercises = [...this.exercises, ex]
    this.emit()
    archive.pushExercises([ex])
    await idbPut(ex)
  }

  async addMany(list: AnyExercise[]) {
    this.exercises = [...this.exercises, ...list].sort((a, b) => a.createdAt - b.createdAt)
    this.emit()
    archive.pushExercises(list)
    for (const ex of list) await idbPut(ex)
  }

  async remove(id: string) {
    this.exercises = this.exercises.filter((e) => e.id !== id)
    this.emit()
    await idbDelete(id)
  }

  async clear() {
    const ids = this.exercises.map((e) => e.id)
    this.exercises = []
    this.emit()
    for (const id of ids) await idbDelete(id)
  }

  latest<K extends ExerciseKind>(kind: K): Extract<AnyExercise, { kind: K }> | undefined {
    for (let i = this.exercises.length - 1; i >= 0; i--) {
      if (this.exercises[i].kind === kind) return this.exercises[i] as Extract<AnyExercise, { kind: K }>
    }
    return undefined
  }

  ofKind<K extends ExerciseKind>(kind: K): Array<Extract<AnyExercise, { kind: K }>> {
    return this.exercises.filter((e) => e.kind === kind) as Array<Extract<AnyExercise, { kind: K }>>
  }
}

export const store = new Store()

export function useStore(): Store {
  useSyncExternalStore(store.subscribe, store.getVersion)
  return store
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

// --- minimal IndexedDB wrapper ---

const DB = 'hetuner'
const OS = 'exercises'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(OS, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(OS, mode)
    const req = fn(t.objectStore(OS))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbAll(): Promise<AnyExercise[]> {
  try {
    return (await tx('readonly', (s) => s.getAll())) as AnyExercise[]
  } catch {
    return []
  }
}

async function idbPut(ex: AnyExercise) {
  try {
    await tx('readwrite', (s) => s.put(ex))
  } catch {
    /* storage unavailable: data stays in memory for this tab */
  }
}

async function idbDelete(id: string) {
  try {
    await tx('readwrite', (s) => s.delete(id))
  } catch {
    /* ignore */
  }
}
