// Physical 60% layouts (ANSI / ISO), finger assignment and adjacency.

import { tr } from '../i18n'
import { fingerNames } from '../i18n/results/fingers'
import { SHORT_LABELS } from './hidCodes'

export interface KeyGeom {
  code: string
  x: number
  y: number
  w: number
  h: number
  isoEnter?: boolean
}

export type LayoutKind = 'ansi' | 'iso'

function row(y: number, items: Array<[string, number]>, x0 = 0): KeyGeom[] {
  let x = x0
  return items.map(([code, w]) => {
    const k = { code, x, y, w, h: 1 }
    x += w
    return k
  })
}

const letters = (s: string) => s.split('').map((c) => [`Key${c}`, 1] as [string, number])
const digits = '1234567890'.split('').map((c) => [`Digit${c}`, 1] as [string, number])
const bottom: Array<[string, number]> = [
  ['ControlLeft', 1.25],
  ['MetaLeft', 1.25],
  ['AltLeft', 1.25],
  ['Space', 6.25],
  ['AltRight', 1.25],
  ['MetaRight', 1.25],
  ['Fn', 1.25],
  ['ControlRight', 1.25],
]

const ANSI: KeyGeom[] = [
  ...row(0, [['Escape', 1], ...digits, ['Minus', 1], ['Equal', 1], ['Backspace', 2]]),
  ...row(1, [['Tab', 1.5], ...letters('QWERTYUIOP'), ['BracketLeft', 1], ['BracketRight', 1], ['Backslash', 1.5]]),
  ...row(2, [['CapsLock', 1.75], ...letters('ASDFGHJKL'), ['Semicolon', 1], ['Quote', 1], ['Enter', 2.25]]),
  ...row(3, [['ShiftLeft', 2.25], ...letters('ZXCVBNM'), ['Comma', 1], ['Period', 1], ['Slash', 1], ['ShiftRight', 2.75]]),
  ...row(4, bottom),
]

const ISO: KeyGeom[] = [
  ...row(0, [['Escape', 1], ...digits, ['Minus', 1], ['Equal', 1], ['Backspace', 2]]),
  ...row(1, [['Tab', 1.5], ...letters('QWERTYUIOP'), ['BracketLeft', 1], ['BracketRight', 1]]),
  { code: 'Enter', x: 13.5, y: 1, w: 1.5, h: 2, isoEnter: true },
  ...row(2, [['CapsLock', 1.75], ...letters('ASDFGHJKL'), ['Semicolon', 1], ['Quote', 1], ['Backslash', 1]]),
  ...row(3, [['ShiftLeft', 1.25], ['IntlBackslash', 1], ...letters('ZXCVBNM'), ['Comma', 1], ['Period', 1], ['Slash', 1], ['ShiftRight', 2.75]]),
  ...row(4, bottom),
]

export function getLayout(kind: LayoutKind): KeyGeom[] {
  return kind === 'iso' ? ISO : ANSI
}

export type Finger = 'L5' | 'L4' | 'L3' | 'L2' | 'T' | 'R2' | 'R3' | 'R4' | 'R5'

/** Localized finger names; each field reads the current language when accessed. */
export const FINGER_NAMES: Record<Finger, string> = {
  get L5() { return tr(fingerNames).L5 },
  get L4() { return tr(fingerNames).L4 },
  get L3() { return tr(fingerNames).L3 },
  get L2() { return tr(fingerNames).L2 },
  get T() { return tr(fingerNames).T },
  get R2() { return tr(fingerNames).R2 },
  get R3() { return tr(fingerNames).R3 },
  get R4() { return tr(fingerNames).R4 },
  get R5() { return tr(fingerNames).R5 },
}

export const FINGERS: Finger[] = ['L5', 'L4', 'L3', 'L2', 'T', 'R2', 'R3', 'R4', 'R5']

const FINGER_KEYS: Record<Finger, string[]> = {
  L5: ['Escape', 'Backquote', 'Digit1', 'Tab', 'KeyQ', 'CapsLock', 'KeyA', 'ShiftLeft', 'IntlBackslash', 'KeyZ', 'ControlLeft'],
  L4: ['Digit2', 'KeyW', 'KeyS', 'KeyX'],
  L3: ['Digit3', 'KeyE', 'KeyD', 'KeyC'],
  L2: ['Digit4', 'Digit5', 'KeyR', 'KeyT', 'KeyF', 'KeyG', 'KeyV', 'KeyB'],
  T: ['Space', 'MetaLeft', 'AltLeft', 'AltRight', 'MetaRight'],
  R2: ['Digit6', 'Digit7', 'KeyY', 'KeyU', 'KeyH', 'KeyJ', 'KeyN', 'KeyM'],
  R3: ['Digit8', 'KeyI', 'KeyK', 'Comma'],
  R4: ['Digit9', 'KeyO', 'KeyL', 'Period'],
  R5: ['Digit0', 'Minus', 'Equal', 'Backspace', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash', 'Semicolon', 'Quote', 'Enter', 'Slash', 'ShiftRight', 'ControlRight', 'Fn'],
}

const fingerOf = new Map<string, Finger>()
for (const f of FINGERS) for (const c of FINGER_KEYS[f]) fingerOf.set(c, f)

export function fingerFor(code: string): Finger {
  return fingerOf.get(code) ?? 'R5'
}

export const MODIFIERS = new Set([
  'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'Fn', 'CapsLock',
])

// Adjacency: keys whose caps touch horizontally in a row, or overlap across adjacent rows.
const neighborCache = new Map<LayoutKind, Map<string, Set<string>>>()

export function neighbors(kind: LayoutKind): Map<string, Set<string>> {
  const cached = neighborCache.get(kind)
  if (cached) return cached
  const keys = getLayout(kind)
  const m = new Map<string, Set<string>>()
  const add = (a: string, b: string) => {
    if (!m.has(a)) m.set(a, new Set())
    m.get(a)!.add(b)
  }
  for (const a of keys) {
    for (const b of keys) {
      if (a === b) continue
      const yOverlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
      const xOverlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
      const sameRowTouch = yOverlap > 0.5 && Math.abs(xOverlap) < 0.05
      const adjRow = Math.abs(yOverlap) < 0.05 && xOverlap > 0.15
      if (sameRowTouch || adjRow) add(a.code, b.code)
    }
  }
  neighborCache.set(kind, m)
  return m
}

export function areNeighbors(kind: LayoutKind, a: string, b: string): boolean {
  return neighbors(kind).get(a)?.has(b) ?? false
}

// Layout-aware labels via the Keyboard Map API (Chromium) — shows AZERTY letters on AZERTY.
let layoutMap: Map<string, string> | null = null
const labelListeners = new Set<() => void>()

export async function loadLayoutMap() {
  const kb = (navigator as unknown as { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }).keyboard
  if (!kb?.getLayoutMap) return
  try {
    const m = await kb.getLayoutMap()
    layoutMap = new Map(m)
    for (const l of labelListeners) l()
  } catch {
    /* not available (e.g. inside an iframe) */
  }
}

export function onLabels(l: () => void) {
  labelListeners.add(l)
  return () => { labelListeners.delete(l) }
}

export function keyLabel(code: string): string {
  if (code in SHORT_LABELS) return SHORT_LABELS[code]
  const ch = layoutMap?.get(code)
  if (ch) return ch.toUpperCase()
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  const sym: Record<string, string> = {
    Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';',
    Quote: "'", Comma: ',', Period: '.', Slash: '/', Backquote: '`', IntlBackslash: '<',
  }
  return sym[code] ?? code
}

/** char -> code for the user's OS layout (used to know which key the next character needs). */
export function codeForChar(ch: string): string | null {
  if (ch === ' ') return 'Space'
  if (layoutMap) {
    for (const [code, c] of layoutMap) if (c === ch) return code
  }
  if (/^[a-z]$/.test(ch)) return `Key${ch.toUpperCase()}`
  // accented letters typed with a dead key (ê = ^ then e): the letter key is pressed last
  const base = ch.normalize('NFD')[0]
  if (base !== ch) return codeForChar(base)
  return null
}

export const TYPING_HOME = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Space']
export const GAMING_HOME = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ControlLeft', 'Space']
export const WASD = ['KeyW', 'KeyA', 'KeyS', 'KeyD']
