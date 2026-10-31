// HoldGame: prompts around the ring and the score screen.

import { messages } from '..'

export const holdText = messages(
  {
    headlinePinned: 'You hold the key bottomed out: nothing moves (the sensor is maxed out).',
    headlineSteady: 'Solid as a rock, barely any tremor.',
    headlineWobble: (mm: string) => `Your finger wobbles by ${mm} mm while holding.`,
    maxWobble: 'Max wobble',
    heldDepth: 'Held depth',
    safeRt: 'Safe RT from',
    press: (key: string) => `Press ${key}`,
    holdOn: 'Hold on…',
    letGo: 'Let go!',
    nice: 'Nice',
  },
  {
    fr: {
      headlinePinned: 'Tu tiens la touche en butée : rien ne bouge (le capteur est au maximum).',
      headlineSteady: 'Solide comme un roc, presque aucun tremblement.',
      headlineWobble: (mm) => `Ton doigt oscille de ${mm} mm en maintien.`,
      maxWobble: 'Oscillation max',
      heldDepth: 'Profondeur tenue',
      safeRt: 'RT sûr à partir de',
      press: (key) => `Appuie sur ${key}`,
      holdOn: 'Tiens bon…',
      letGo: 'Lâche !',
      nice: 'Nickel',
    },
    de: {
      headlinePinned: 'Du hältst die Taste am Anschlag: nichts bewegt sich (der Sensor ist am Maximum).',
      headlineSteady: 'Felsenfest, kaum ein Zittern.',
      headlineWobble: (mm) => `Dein Finger schwankt beim Halten um ${mm} mm.`,
      maxWobble: 'Max. Schwankung',
      heldDepth: 'Gehaltene Tiefe',
      safeRt: 'Sicheres RT ab',
      press: (key) => `Drück ${key}`,
      holdOn: 'Halten…',
      letGo: 'Loslassen!',
      nice: 'Sauber',
    },
    es: {
      headlinePinned: 'Mantienes la tecla a tope: nada se mueve (el sensor está al máximo).',
      headlineSteady: 'Firme como una roca, casi sin temblor.',
      headlineWobble: (mm) => `Tu dedo oscila ${mm} mm al mantener.`,
      maxWobble: 'Oscilación máx.',
      heldDepth: 'Profundidad mantenida',
      safeRt: 'RT seguro desde',
      press: (key) => `Pulsa ${key}`,
      holdOn: 'Aguanta…',
      letGo: '¡Suelta!',
      nice: 'Perfecto',
    },
  },
)
