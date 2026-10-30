// HID keyboard usage IDs (page 0x07) -> KeyboardEvent.code.
// The Wooting analog report identifies keys by HID usage, the browser by `code`;
// both describe the physical position, so this table links the two worlds.

const map: Record<number, string> = {}

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
for (let i = 0; i < 26; i++) map[0x04 + i] = `Key${letters[i]}`
for (let i = 0; i < 9; i++) map[0x1e + i] = `Digit${i + 1}`
map[0x27] = 'Digit0'

Object.assign(map, {
  0x28: 'Enter',
  0x29: 'Escape',
  0x2a: 'Backspace',
  0x2b: 'Tab',
  0x2c: 'Space',
  0x2d: 'Minus',
  0x2e: 'Equal',
  0x2f: 'BracketLeft',
  0x30: 'BracketRight',
  0x31: 'Backslash',
  0x32: 'Backslash', // ISO "#" key next to Enter, reported as Backslash by browsers
  0x33: 'Semicolon',
  0x34: 'Quote',
  0x35: 'Backquote',
  0x36: 'Comma',
  0x37: 'Period',
  0x38: 'Slash',
  0x39: 'CapsLock',
  0x46: 'PrintScreen',
  0x47: 'ScrollLock',
  0x48: 'Pause',
  0x49: 'Insert',
  0x4a: 'Home',
  0x4b: 'PageUp',
  0x4c: 'Delete',
  0x4d: 'End',
  0x4e: 'PageDown',
  0x4f: 'ArrowRight',
  0x50: 'ArrowLeft',
  0x51: 'ArrowDown',
  0x52: 'ArrowUp',
  0x64: 'IntlBackslash',
  0x65: 'ContextMenu',
  0xe0: 'ControlLeft',
  0xe1: 'ShiftLeft',
  0xe2: 'AltLeft',
  0xe3: 'MetaLeft',
  0xe4: 'ControlRight',
  0xe5: 'ShiftRight',
  0xe6: 'AltRight',
  0xe7: 'MetaRight',
})
for (let i = 0; i < 12; i++) map[0x3a + i] = `F${i + 1}`

// Wooting-specific codes used by the analog SDK for keys that have no HID usage.
const wootingExtra: Record<number, string> = {
  0x408: 'Mode',
  0x409: 'Fn',
  0x40a: 'Mode1',
  0x40b: 'Mode2',
  0x40c: 'Mode3',
}

export function hidToCode(usage: number): string | null {
  return map[usage] ?? wootingExtra[usage] ?? null
}

export function isKnownUsage(usage: number): boolean {
  return usage in map || usage in wootingExtra
}

export const SHORT_LABELS: Record<string, string> = {
  Escape: 'Esc',
  Backspace: '⌫',
  Tab: 'Tab',
  CapsLock: 'Caps',
  Enter: '⏎',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift',
  ControlLeft: 'Ctrl',
  ControlRight: 'Ctrl',
  AltLeft: '⌥',
  AltRight: '⌥',
  MetaLeft: '⌘',
  MetaRight: '⌘',
  Space: '',
  Fn: 'Fn',
  ContextMenu: 'Menu',
}

export const CODE_NAMES: Record<string, string> = {
  Space: 'Espace',
  Backspace: 'Retour arrière',
  Enter: 'Entrée',
  ShiftLeft: 'Shift gauche',
  ShiftRight: 'Shift droit',
  ControlLeft: 'Ctrl gauche',
  ControlRight: 'Ctrl droit',
  AltLeft: 'Alt gauche',
  AltRight: 'Alt droit',
  MetaLeft: 'Cmd gauche',
  MetaRight: 'Cmd droit',
  CapsLock: 'Verr. Maj',
  Tab: 'Tab',
  Escape: 'Échap',
  Fn: 'Fn',
}
