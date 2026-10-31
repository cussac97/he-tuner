// Key names: short cap labels (keyboard drawing) and full names (in sentences, lists).
// Read through SHORT_LABELS / CODE_NAMES in lib/hidCodes.ts, whose fields follow the language.

import { messages } from '..'

type ShortLabels = Record<
  | 'Escape'
  | 'Backspace'
  | 'Tab'
  | 'CapsLock'
  | 'Enter'
  | 'ShiftLeft'
  | 'ShiftRight'
  | 'ControlLeft'
  | 'ControlRight'
  | 'AltLeft'
  | 'AltRight'
  | 'MetaLeft'
  | 'MetaRight'
  | 'Space'
  | 'Fn'
  | 'ContextMenu',
  string
>

const SHORT_EN: ShortLabels = {
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

export const shortLabels = messages<ShortLabels>(SHORT_EN, {
  fr: SHORT_EN,
  de: { ...SHORT_EN, ControlLeft: 'Strg', ControlRight: 'Strg', ContextMenu: 'Menü' },
  es: { ...SHORT_EN, ContextMenu: 'Menú' },
})

type CodeNames = Record<
  | 'Space'
  | 'Backspace'
  | 'Enter'
  | 'ShiftLeft'
  | 'ShiftRight'
  | 'ControlLeft'
  | 'ControlRight'
  | 'AltLeft'
  | 'AltRight'
  | 'MetaLeft'
  | 'MetaRight'
  | 'CapsLock'
  | 'Tab'
  | 'Escape'
  | 'Fn',
  string
>

export const codeNames = messages<CodeNames>(
  {
    Space: 'Space',
    Backspace: 'Backspace',
    Enter: 'Enter',
    ShiftLeft: 'Left Shift',
    ShiftRight: 'Right Shift',
    ControlLeft: 'Left Ctrl',
    ControlRight: 'Right Ctrl',
    AltLeft: 'Left Alt',
    AltRight: 'Right Alt',
    MetaLeft: 'Left Cmd',
    MetaRight: 'Right Cmd',
    CapsLock: 'Caps Lock',
    Tab: 'Tab',
    Escape: 'Esc',
    Fn: 'Fn',
  },
  {
    fr: {
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
    },
    de: {
      Space: 'Leertaste',
      Backspace: 'Rücktaste',
      Enter: 'Enter',
      ShiftLeft: 'Shift links',
      ShiftRight: 'Shift rechts',
      ControlLeft: 'Strg links',
      ControlRight: 'Strg rechts',
      AltLeft: 'Alt links',
      AltRight: 'Alt rechts',
      MetaLeft: 'Cmd links',
      MetaRight: 'Cmd rechts',
      CapsLock: 'Feststelltaste',
      Tab: 'Tab',
      Escape: 'Esc',
      Fn: 'Fn',
    },
    es: {
      Space: 'Espacio',
      Backspace: 'Retroceso',
      Enter: 'Intro',
      ShiftLeft: 'Shift izq.',
      ShiftRight: 'Shift der.',
      ControlLeft: 'Ctrl izq.',
      ControlRight: 'Ctrl der.',
      AltLeft: 'Alt izq.',
      AltRight: 'Alt der.',
      MetaLeft: 'Cmd izq.',
      MetaRight: 'Cmd der.',
      CapsLock: 'Bloq Mayús',
      Tab: 'Tab',
      Escape: 'Esc',
      Fn: 'Fn',
    },
  },
)
