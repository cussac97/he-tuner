import { messages } from '..'

export const chartsText = messages(
  {
    unintended: 'unintended',
    intended: 'intended',
    current: (mm: string) => `current ${mm}`,
    recommended: (mm: string) => `recommended ${mm}`,
    travel: 'travel',
    output: 'output',
  },
  {
    fr: {
      unintended: 'involontaire',
      intended: 'voulu',
      current: (mm) => `actuel ${mm}`,
      recommended: (mm) => `recommandé ${mm}`,
      travel: 'course',
      output: 'sortie',
    },
    de: {
      unintended: 'ungewollt',
      intended: 'gewollt',
      current: (mm) => `aktuell ${mm}`,
      recommended: (mm) => `empfohlen ${mm}`,
      travel: 'Tastenweg',
      output: 'Ausgabe',
    },
    es: {
      unintended: 'involuntario',
      intended: 'voluntario',
      current: (mm) => `actual ${mm}`,
      recommended: (mm) => `recomendado ${mm}`,
      travel: 'recorrido',
      output: 'salida',
    },
  },
)
