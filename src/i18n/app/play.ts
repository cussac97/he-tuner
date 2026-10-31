// Play hub: the list of levels and the full run.

import { messages } from '..'

export const playText = messages(
  {
    tag: 'Run · 6 levels · ≈ 2 min',
    title: 'Six tests, back to back.',
    intro: 'Do the run once, apply the settings in Wootility, then do it again: the difference shows up right in your data.',
    start: 'Start',
    done: (n: number) => `${n}× done`,
  },
  {
    fr: {
      tag: 'Parcours · 6 niveaux · ≈ 2 min',
      title: 'Six tests, enchaînés.',
      intro: 'Fais le parcours une première fois, applique les réglages dans Wootility, puis refais-le : la différence se lit directement dans tes données.',
      start: 'Lancer',
      done: (n) => `${n}× fait`,
    },
    de: {
      tag: 'Durchlauf · 6 Level · ≈ 2 min',
      title: 'Sechs Tests am Stück.',
      intro: 'Mach den Durchlauf einmal, übernimm die Einstellungen in Wootility und mach ihn dann noch mal: Den Unterschied siehst du direkt in deinen Daten.',
      start: 'Start',
      done: (n) => `${n}× gespielt`,
    },
    es: {
      tag: 'Recorrido · 6 niveles · ≈ 2 min',
      title: 'Seis pruebas, seguidas.',
      intro: 'Haz el recorrido una vez, aplica los ajustes en Wootility y vuelve a hacerlo: la diferencia se ve directamente en tus datos.',
      start: 'Empezar',
      done: (n) => `${n}× hecho`,
    },
  },
)
