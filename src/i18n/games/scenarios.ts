// Names of the settings replayed in the Spam and Strafe score charts.

import { messages } from '..'

export const scenariosText = messages(
  {
    fixed: (mm: string) => `Fixed ${mm} mm`,
    current: (mm: string) => `Current (${mm} mm)`,
  },
  {
    fr: { fixed: (mm) => `Fixe ${mm} mm`, current: (mm) => `Actuel (${mm} mm)` },
    de: { fixed: (mm) => `Fest ${mm} mm`, current: (mm) => `Aktuell (${mm} mm)` },
    es: { fixed: (mm) => `Fijo ${mm} mm`, current: (mm) => `Actual (${mm} mm)` },
  },
)
