// Level names and title-card taglines (games/levels.tsx). Key caps are passed in as nodes.

import type { ReactNode } from 'react'
import { messages } from '..'

export const levelsText = messages(
  {
    typing: { name: 'Typing', tagline: () => <>Type the words as you normally would. The timer starts on your first letter.</> },
    rest: { name: 'Rest', tagline: () => <>Rest your fingers on the keyboard without pressing. Then hold still.</> },
    repeat: { name: 'Spam', tagline: (k: ReactNode) => <>Hammer {k} as fast as you can.</> },
    hold: { name: 'Hold', tagline: (k: ReactNode) => <>Hold {k} all the way down, like walking forward in a game. Three times.</> },
    strafe: {
      name: 'Strafe',
      tagline: (l: ReactNode, r: ReactNode) => (
        <>
          Follow the arrows with {l} and {r}. Switch direction as fast as you can.
        </>
      ),
    },
    analog: { name: 'Analog', tagline: (k: ReactNode) => <>Press {k} more or less deep to keep the cursor inside the zone.</> },
  },
  {
    fr: {
      typing: { name: 'Frappe', tagline: () => <>Tape les mots comme d’habitude. Le chrono part à ta première lettre.</> },
      rest: { name: 'Repos', tagline: () => <>Pose tes doigts sur le clavier, sans appuyer. Ne bouge plus.</> },
      repeat: { name: 'Spam', tagline: (k) => <>Martèle {k} le plus vite possible.</> },
      hold: { name: 'Maintien', tagline: (k) => <>Maintiens {k} à fond, comme pour avancer en jeu. Trois fois.</> },
      strafe: {
        name: 'Strafe',
        tagline: (l, r) => (
          <>
            Suis les flèches avec {l} et {r}. Change de sens le plus vite possible.
          </>
        ),
      },
      analog: { name: 'Analogique', tagline: (k) => <>Enfonce {k} plus ou moins pour garder le curseur dans la zone.</> },
    },
    de: {
      typing: { name: 'Tippen', tagline: () => <>Tippe die Wörter wie gewohnt. Der Timer startet mit deinem ersten Buchstaben.</> },
      rest: { name: 'Ruhe', tagline: () => <>Leg deine Finger auf die Tastatur, ohne zu drücken. Dann nicht mehr bewegen.</> },
      repeat: { name: 'Spam', tagline: (k) => <>Hämmere so schnell du kannst auf {k}.</> },
      hold: { name: 'Halten', tagline: (k) => <>Halte {k} ganz durchgedrückt, wie beim Vorwärtslaufen im Spiel. Dreimal.</> },
      strafe: {
        name: 'Strafe',
        tagline: (l, r) => (
          <>
            Folge den Pfeilen mit {l} und {r}. Wechsle so schnell wie möglich die Richtung.
          </>
        ),
      },
      analog: { name: 'Analog', tagline: (k) => <>Drück {k} mehr oder weniger tief, um den Cursor in der Zone zu halten.</> },
    },
    es: {
      typing: { name: 'Escritura', tagline: () => <>Escribe las palabras como siempre. El cronómetro arranca con tu primera letra.</> },
      rest: { name: 'Reposo', tagline: () => <>Apoya los dedos en el teclado sin pulsar. Y no te muevas.</> },
      repeat: { name: 'Spam', tagline: (k) => <>Machaca {k} lo más rápido que puedas.</> },
      hold: { name: 'Mantener', tagline: (k) => <>Mantén {k} a fondo, como para avanzar en un juego. Tres veces.</> },
      strafe: {
        name: 'Strafe',
        tagline: (l, r) => (
          <>
            Sigue las flechas con {l} y {r}. Cambia de sentido lo más rápido que puedas.
          </>
        ),
      },
      analog: { name: 'Analógico', tagline: (k) => <>Pulsa {k} más o menos a fondo para mantener el cursor dentro de la zona.</> },
    },
  },
)
