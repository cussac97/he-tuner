// Language pickers: a compact menu for the top bar, and a segmented control for the places
// where the typing test starts. Language names are written in their own language.

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { LANG_NAMES, LANGS, setLang, useLang } from '../i18n'
import { Icon } from './icons'
import { ease } from './ui'

export function LangMenu() {
  const lang = useLang()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', away)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('pointerdown', away)
      window.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div className="lang-menu" ref={box}>
      <button className="icon-link lang-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} title={LANG_NAMES[lang]}>
        <Icon name="globe" size={15} />
        <span>{lang.toUpperCase()}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            className="lang-list"
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.97, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { duration: 0.22, ease } }}
            exit={{ opacity: 0, y: -4, scale: 0.98, filter: 'blur(4px)', transition: { duration: 0.14, ease } }}
          >
            {LANGS.map((l) => (
              <li key={l}>
                <button
                  role="option"
                  aria-selected={l === lang}
                  className={l === lang ? 'on' : ''}
                  onClick={() => {
                    setLang(l)
                    setOpen(false)
                  }}
                >
                  <span className="code">{l.toUpperCase()}</span>
                  {LANG_NAMES[l]}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

export function LangSeg() {
  const lang = useLang()
  return (
    <div className="seg" role="radiogroup">
      {LANGS.map((l) => (
        <button key={l} role="radio" aria-checked={l === lang} className={l === lang ? 'on' : ''} onClick={() => setLang(l)}>
          {LANG_NAMES[l].toLowerCase()}
        </button>
      ))}
    </div>
  )
}
