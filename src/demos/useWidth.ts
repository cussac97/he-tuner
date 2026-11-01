import { useLayoutEffect, useRef, useState } from 'react'

/** The width of the slot an illustration sits in, so its Stage is designed at 1:1 for it. */
export function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const measure = () => setWidth(Math.round(node.clientWidth))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}
