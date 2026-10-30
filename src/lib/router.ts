import { useSyncExternalStore } from 'react'

const subscribe = (l: () => void) => {
  window.addEventListener('hashchange', l)
  return () => window.removeEventListener('hashchange', l)
}

const get = () => window.location.hash.replace(/^#/, '') || '/'

export function useRoute(): string {
  return useSyncExternalStore(subscribe, get)
}

export function navigate(path: string) {
  window.location.hash = path
  window.scrollTo(0, 0)
}
