import { messages } from '..'
import type { Finger } from '../../lib/layout'

export const fingerNames = messages<Record<Finger, string>>(
  {
    L5: 'Left pinky',
    L4: 'Left ring',
    L3: 'Left middle',
    L2: 'Left index',
    T: 'Thumbs',
    R2: 'Right index',
    R3: 'Right middle',
    R4: 'Right ring',
    R5: 'Right pinky',
  },
  {
    fr: {
      L5: 'Auriculaire G',
      L4: 'Annulaire G',
      L3: 'Majeur G',
      L2: 'Index G',
      T: 'Pouces',
      R2: 'Index D',
      R3: 'Majeur D',
      R4: 'Annulaire D',
      R5: 'Auriculaire D',
    },
    de: {
      L5: 'Kleiner Finger links',
      L4: 'Ringfinger links',
      L3: 'Mittelfinger links',
      L2: 'Zeigefinger links',
      T: 'Daumen',
      R2: 'Zeigefinger rechts',
      R3: 'Mittelfinger rechts',
      R4: 'Ringfinger rechts',
      R5: 'Kleiner Finger rechts',
    },
    es: {
      L5: 'Meñique izq.',
      L4: 'Anular izq.',
      L3: 'Corazón izq.',
      L2: 'Índice izq.',
      T: 'Pulgares',
      R2: 'Índice der.',
      R3: 'Corazón der.',
      R4: 'Anular der.',
      R5: 'Meñique der.',
    },
  },
)
