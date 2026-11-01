// Home page illustrations: the replay demo under the hero and the feature grid.

import { messages } from '..'
import type { ExerciseKind } from '../../lib/types'

type Copy = { title: string; body: string }

export const demoText = messages<{
  replay: { title: string; tried: string; registered: string; resting: string; gain: (ms: number) => string }
  grid: {
    tests: Copy & { measured: Record<ExerciseKind, string> }
    polling: { lead: string; label: string }
    /** `keys` is the movement cluster as the visitor's own layout labels it (WASD, ZQSD…) */
    perKey: { title: string; body: (keys: string) => string }
    /** `a` and `d` are the strafe keys, from the visitor's layout */
    socd: { title: string; body: (a: string, d: string) => string; overlap: string }
    local: Copy & { link: string }
  }
}>(
  {
    replay: {
      title: 'Replaying your keystrokes',
      tried: 'settings tried',
      registered: 'Registered',
      resting: 'Resting fingers',
      gain: (ms) => `Registers ${ms} ms sooner`,
    },
    grid: {
      tests: {
        title: 'Six short tests.',
        body: 'Typing, resting, spamming, holding, strafing and analog control. About two minutes.',
        measured: { typing: '64 wpm', rest: '0.34 mm', repeat: '11.8 taps/s', hold: '±0.05 mm', strafe: '38 ms', analog: '±0.21 mm' },
      },
      polling: { lead: 'Read at', label: 'The depth of every key, straight from the analog protocol.' },
      perKey: { title: 'Per key.', body: (keys) => `The space bar, Shift and ${keys} each get the depth your fingers need.` },
      socd: { title: 'Strafes, measured.', body: (a, d) => `How long you hold ${a} and ${d} together, and the SOCD mode that fits.`, overlap: 'both held' },
      local: {
        title: 'Nothing leaves your browser.',
        body: 'Recordings, analysis and settings stay on this device. No account. Open source under MIT.',
        link: 'Read the code',
      },
    },
  },
  {
    fr: {
      replay: {
        title: 'Rejeu de tes frappes',
        tried: 'réglages testés',
        registered: 'Enregistré',
        resting: 'Doigts posés',
        gain: (ms) => `Enregistré ${ms} ms plus tôt`,
      },
      grid: {
        tests: {
          title: 'Six tests courts.',
          body: 'Frappe, repos, spam, maintien, strafe et contrôle analogique. Environ deux minutes.',
          measured: { typing: '64 mots/min', rest: '0.34 mm', repeat: '11.8 frappes/s', hold: '±0.05 mm', strafe: '38 ms', analog: '±0.21 mm' },
        },
        polling: { lead: 'Lu à', label: 'La profondeur de chaque touche, directement depuis le protocole analogique.' },
        perKey: { title: 'Touche par touche.', body: (keys) => `Espace, Maj et ${keys} reçoivent chacune la profondeur qu’il faut à tes doigts.` },
        socd: { title: 'Strafes mesurés.', body: (a, d) => `Combien de temps tu tiens ${a} et ${d} ensemble, et le mode SOCD qui te va.`, overlap: 'les deux' },
        local: {
          title: 'Rien ne quitte ton navigateur.',
          body: 'Enregistrements, analyse et réglages restent sur cet appareil. Pas de compte. Open source, licence MIT.',
          link: 'Voir le code',
        },
      },
    },
    de: {
      replay: {
        title: 'Deine Anschläge, neu abgespielt',
        tried: 'Einstellungen getestet',
        registered: 'Erkannt',
        resting: 'Aufliegende Finger',
        gain: (ms) => `${ms} ms früher erkannt`,
      },
      grid: {
        tests: {
          title: 'Sechs kurze Tests.',
          body: 'Tippen, Ruhe, Spam, Halten, Strafe und Analogsteuerung. Etwa zwei Minuten.',
          measured: { typing: '64 WPM', rest: '0.34 mm', repeat: '11.8 Anschl./s', hold: '±0.05 mm', strafe: '38 ms', analog: '±0.21 mm' },
        },
        polling: { lead: 'Gelesen mit', label: 'Die Tiefe jeder Taste, direkt aus dem Analogprotokoll.' },
        perKey: { title: 'Pro Taste.', body: (keys) => `Leertaste, Shift und ${keys} bekommen jeweils die Tiefe, die deine Finger brauchen.` },
        socd: { title: 'Strafes, gemessen.', body: (a, d) => `Wie lange du ${a} und ${d} gleichzeitig hältst, und welcher SOCD-Modus passt.`, overlap: 'beide' },
        local: {
          title: 'Nichts verlässt deinen Browser.',
          body: 'Aufnahmen, Analyse und Einstellungen bleiben auf diesem Gerät. Kein Konto. Open Source unter MIT.',
          link: 'Zum Code',
        },
      },
    },
    es: {
      replay: {
        title: 'Reproduciendo tus pulsaciones',
        tried: 'ajustes probados',
        registered: 'Registrada',
        resting: 'Dedos apoyados',
        gain: (ms) => `Se registra ${ms} ms antes`,
      },
      grid: {
        tests: {
          title: 'Seis pruebas cortas.',
          body: 'Escritura, reposo, spam, mantener, strafe y control analógico. Unos dos minutos.',
          measured: { typing: '64 ppm', rest: '0.34 mm', repeat: '11.8 pulsaciones/s', hold: '±0.05 mm', strafe: '38 ms', analog: '±0.21 mm' },
        },
        polling: { lead: 'Leído a', label: 'La profundidad de cada tecla, directamente del protocolo analógico.' },
        perKey: { title: 'Tecla por tecla.', body: (keys) => `Espacio, Mayús y ${keys} reciben cada una la profundidad que necesitan tus dedos.` },
        socd: { title: 'Strafes, medidos.', body: (a, d) => `Cuánto tiempo mantienes ${a} y ${d} a la vez, y el modo SOCD que te conviene.`, overlap: 'ambas' },
        local: {
          title: 'Nada sale de tu navegador.',
          body: 'Grabaciones, análisis y ajustes se quedan en este dispositivo. Sin cuenta. Código abierto, licencia MIT.',
          link: 'Ver el código',
        },
      },
    },
  },
)
