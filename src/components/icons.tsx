// Minimal stroke icons (24px grid), drawn to sit with the mono / rounded typography.

const PATHS = {
  keyboard: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="3" />
      <path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M8 14h8" />
    </>
  ),
  rest: (
    <>
      <path d="M4 16c2.5-1.2 5.5-1.8 8-1.8S17.5 14.8 20 16" />
      <path d="M7 12V7.5M10.5 11.4V6M14 11.4V6.6M17.5 12.2V8.4" />
    </>
  ),
  bolt: <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8Z" />,
  hold: (
    <>
      <rect x="5" y="9" width="14" height="10" rx="3" />
      <path d="M12 3v6M9 6l3 3 3-3" />
    </>
  ),
  strafe: <path d="M3.5 12h17M7.5 8l-4 4 4 4M16.5 8l4 4-4 4" />,
  analog: (
    <>
      <path d="M6 4v16M12 4v16M18 4v16" />
      <circle cx="6" cy="15" r="2" fill="currentColor" />
      <circle cx="12" cy="8" r="2" fill="currentColor" />
      <circle cx="18" cy="12" r="2" fill="currentColor" />
    </>
  ),
  plug: <path d="M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0V8ZM12 16v5" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  warn: <path d="M12 3.5 2.5 20h19L12 3.5ZM12 10v4.5M12 17.5h.01" />,
  flask: <path d="M9 3h6M10 3v6l-5.5 9.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3M7.5 15h9" />,
  save: <path d="M5 4h11l3 3v13H5V4ZM8 4v5h7V4M8 20v-6h8v6" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  gamepad: (
    <>
      <path d="M7 8h10a4 4 0 0 1 4 4.5l-.6 3.5a2.5 2.5 0 0 1-4.3 1.2L14.5 15h-5l-1.6 2.2A2.5 2.5 0 0 1 3.6 16L3 12.5A4 4 0 0 1 7 8Z" />
      <path d="M8 11v3M6.5 12.5h3M15.5 12h.01M17.5 13.5h.01" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  replay: <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  play: <path d="M7 5v14l11-7L7 5Z" fill="currentColor" />,
}

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 20, stroke = 1.7 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name]}
    </svg>
  )
}
