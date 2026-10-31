// Interface language. One setting drives both the UI text and the words of the typing test.
//
// Text lives in namespace files (src/i18n/<area>/<name>.ts[x]) declared with `messages()`:
// the English block is the reference, and TypeScript rejects any other language that misses
// a key or changes a signature. Values are strings, or functions for interpolation / JSX.
//
//   const m = messages({ hello: (n: string) => `Hi ${n}` }, { fr: { hello: (n) => `Salut ${n}` }, de: …, es: … })
//   const t = useT(m)        // in components: re-renders on language change
//   const t = tr(m)          // elsewhere (analysis code): current language, no subscription

import { useSyncExternalStore } from 'react'

export const LANGS = ['en', 'fr', 'de', 'es'] as const
export type Lang = (typeof LANGS)[number]

export const LANG_NAMES: Record<Lang, string> = { en: 'English', fr: 'Français', de: 'Deutsch', es: 'Español' }

export type Messages<T> = Record<Lang, T>

export function messages<T>(en: T, others: Record<Exclude<Lang, 'en'>, NoInfer<T>>): Messages<T> {
  return { en, ...others }
}

const KEY = 'hetuner.lang'
const isLang = (x: unknown): x is Lang => LANGS.includes(x as Lang)

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (isLang(saved)) return saved
    // before the language setting existed, the typing-test language was stored with the settings
    const legacy = JSON.parse(localStorage.getItem('hetuner.settings') ?? '{}').lang
    if (isLang(legacy)) return legacy
  } catch {
    /* no storage (Node scripts, private mode) */
  }
  return 'en'
}

let current: Lang = initial()
const listeners = new Set<() => void>()
const applyDocument = () => {
  if (typeof document !== 'undefined') document.documentElement.lang = current
}
applyDocument()

export function getLang(): Lang {
  return current
}

export function setLang(l: Lang) {
  if (l === current) return
  current = l
  try {
    localStorage.setItem(KEY, l)
  } catch {
    /* ignore */
  }
  applyDocument()
  for (const f of listeners) f()
}

const subscribe = (f: () => void) => {
  listeners.add(f)
  return () => {
    listeners.delete(f)
  }
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang)
}

export function useT<T>(m: Messages<T>): T {
  return m[useLang()]
}

export function tr<T>(m: Messages<T>): T {
  return m[current]
}
