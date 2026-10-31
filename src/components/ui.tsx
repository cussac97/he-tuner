import { animate, motion, useInView, type HTMLMotionProps, type Variants } from 'framer-motion'
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useT } from '../i18n'
import { uiText } from '../i18n/app/ui'
import { Icon } from './icons'

export const ease = [0.2, 0.8, 0.2, 1] as const
export const spring = { type: 'spring', stiffness: 380, damping: 32 } as const
export const softSpring = { type: 'spring', stiffness: 200, damping: 28 } as const

/** Button with a restrained press feel. */
export function Btn({ className = '', children, ...rest }: HTMLMotionProps<'button'> & { children?: ReactNode }) {
  return (
    <motion.button className={`btn ${className}`} whileTap={{ scale: 0.97 }} transition={spring} {...rest}>
      {children}
    </motion.button>
  )
}

/** Number that rolls to its value once it scrolls into view. */
export function CountUp({ value, decimals = 0, duration = 1, delay = 0 }: { value: number; decimals?: number; duration?: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const from = useRef(0)
  useEffect(() => {
    if (!inView || !ref.current || !Number.isFinite(value)) return
    const el = ref.current
    const ctl = animate(from.current, value, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = v.toFixed(decimals)
      },
    })
    from.current = value
    return () => ctl.stop()
  }, [value, inView, decimals, duration, delay])
  return <span ref={ref}>{Number.isFinite(value) ? (0).toFixed(decimals) : '—'}</span>
}

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
}
export const rise: Variants = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease } },
}

export function Reveal({ children, className, style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <motion.div className={className} style={style} variants={stagger} initial="hidden" animate="show">
      {children}
    </motion.div>
  )
}

export function Item({ children, className, style, ...rest }: HTMLMotionProps<'div'> & { children?: ReactNode }) {
  return (
    <motion.div className={className} style={style} variants={rise} {...rest}>
      {children}
    </motion.div>
  )
}

/** Card whose border and surface light up under the cursor. */
export function Spot({ children, className = '', style, ...rest }: HTMLMotionProps<'div'> & { children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <motion.div
      ref={ref}
      className={`card spot ${className}`}
      style={style}
      variants={rise}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect()
        ref.current!.style.setProperty('--mx', `${e.clientX - r.left}px`)
        ref.current!.style.setProperty('--my', `${e.clientY - r.top}px`)
      }}
      onMouseLeave={() => {
        ref.current!.style.setProperty('--mx', '-500px')
        ref.current!.style.setProperty('--my', '-500px')
      }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/** Title whose words slide up from behind a mask, one after the other. */
export function MaskText({ text, className, delay = 0, style }: { text: string; className?: string; delay?: number; style?: React.CSSProperties }) {
  return (
    <span className={className} style={style} aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="mask-line" aria-hidden>
          <motion.span initial={{ y: '105%' }} animate={{ y: '0%' }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: delay + i * 0.06 }}>
            {w}
            {i < text.split(' ').length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

/** Dot-matrix backdrop with a slow accent glow, for stages. */
export function Backdrop() {
  return (
    <>
      <div className="dotgrid" />
      <motion.div
        className="glow"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: [1, 1.08, 1] }}
        transition={{ opacity: { duration: 0.8 }, scale: { duration: 6, repeat: Infinity, ease: 'easeInOut' } }}
      />
    </>
  )
}

/** Accent shockwave rings, for a strong score. */
export function Pulse({ rings = 3 }: { rings?: number }) {
  return (
    <div style={{ position: 'absolute', left: '50%', top: '42%', pointerEvents: 'none' }}>
      {Array.from({ length: rings }, (_, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            width: 160,
            height: 160,
            marginLeft: -80,
            marginTop: -80,
            borderRadius: '50%',
            border: '1px solid var(--accent)',
          }}
          initial={{ scale: 0.3, opacity: 0.8 }}
          animate={{ scale: 3.2, opacity: 0 }}
          transition={{ duration: 1.6, delay: i * 0.18, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </div>
  )
}

/** Circular timer for auto-advancing screens. */
export function Ring({ ms, color = 'var(--accent)', size = 30, paused }: { ms: number; color?: string; size?: number; paused?: boolean }) {
  const r = size / 2 - 2.5
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} className="ring">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--elev-2)" strokeWidth={2.5} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: paused ? c : 0 }}
        transition={{ duration: ms / 1000, ease: 'linear' }}
      />
    </svg>
  )
}

// --- focus mode: dims the chrome while a game is running ---
let focus = false
const focusListeners = new Set<() => void>()
export function setFocusMode(v: boolean) {
  if (focus === v) return
  focus = v
  for (const l of focusListeners) l()
}
export function useFocusMode() {
  return useSyncExternalStore(
    (l) => {
      focusListeners.add(l)
      return () => {
        focusListeners.delete(l)
      }
    },
    () => focus,
  )
}

/** Collapsible details section with a smooth height animation. */
export function Why({ children, label }: { children: ReactNode; label?: string }) {
  const t = useT(uiText)
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button className="accordion-btn" onClick={() => setOpen((o) => !o)}>
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={spring} style={{ display: 'inline-flex' }}>
          <Icon name="chevron" size={14} />
        </motion.span>
        {label ?? t.why}
      </button>
      <motion.div initial={false} animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }} transition={{ duration: 0.4, ease }} style={{ overflow: 'hidden' }}>
        <div style={{ paddingTop: 14 }}>{children}</div>
      </motion.div>
    </div>
  )
}
