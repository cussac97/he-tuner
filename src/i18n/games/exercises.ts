// EXERCISE_INFO text (lib/types.ts): full title, short name and what each exercise measures.

import { messages } from '..'

interface Info {
  title: string
  short: string
  measures: string
}
type Infos = { typing: Info; rest: Info; repeat: Info; hold: Info; strafe: Info; analog: Info }

export const exercisesText = messages<Infos>(
  {
    typing: {
      title: 'Typing test',
      short: 'Typing',
      measures: 'How deep each press goes, brushes on neighboring keys, missed presses, your current setting.',
    },
    rest: {
      title: 'Resting fingers',
      short: 'Rest',
      measures: 'How much your resting fingers press without meaning to: the floor for your actuation point.',
    },
    repeat: {
      title: 'Rapid repeat',
      short: 'Repeat',
      measures: 'How far you lift between two fast presses: how much you really need Rapid Trigger.',
    },
    hold: {
      title: 'Hold',
      short: 'Hold',
      measures: 'The micro-tremors while you hold a key down: the lowest RT sensitivity with no false release.',
    },
    strafe: {
      title: 'Counter-strafe',
      short: 'Strafe',
      measures: 'Your left/right switches: what Rapid Trigger and the SOCD modes really gain you.',
    },
    analog: {
      title: 'Analog control',
      short: 'Analog',
      measures: 'Your precision at partial depth: curve and dead zones for gamepad mode.',
    },
  },
  {
    fr: {
      typing: {
        title: 'Test de frappe',
        short: 'Frappe',
        measures: 'Profondeur de chaque frappe, effleurements des touches voisines, frappes ratées, réglage actuel.',
      },
      rest: {
        title: 'Doigts au repos',
        short: 'Repos',
        measures: 'Pression de tes doigts posés sans appuyer : la limite basse du point d’actuation.',
      },
      repeat: {
        title: 'Répétition rapide',
        short: 'Répétition',
        measures: 'Jusqu’où tu remontes entre deux frappes rapides : le besoin réel de Rapid Trigger.',
      },
      hold: {
        title: 'Maintien',
        short: 'Maintien',
        measures: 'Les micro-tremblements quand tu maintiens une touche : la sensibilité RT minimale sans faux relâchement.',
      },
      strafe: {
        title: 'Contre-strafe',
        short: 'Strafe',
        measures: 'Tes transitions gauche/droite : gain réel du Rapid Trigger et des modes SOCD.',
      },
      analog: {
        title: 'Contrôle analogique',
        short: 'Analogique',
        measures: 'Ta précision à profondeur partielle : courbe et zones mortes pour le mode manette.',
      },
    },
    de: {
      typing: {
        title: 'Tipptest',
        short: 'Tippen',
        measures: 'Tiefe jedes Anschlags, Streifer an Nachbartasten, verpasste Anschläge, deine aktuelle Einstellung.',
      },
      rest: {
        title: 'Aufliegende Finger',
        short: 'Ruhe',
        measures: 'Druck deiner aufliegenden Finger, ohne dass du drückst: die Untergrenze für den Auslösepunkt.',
      },
      repeat: {
        title: 'Schnelle Wiederholung',
        short: 'Wiederholung',
        measures: 'Wie weit du zwischen zwei schnellen Anschlägen loslässt: wie sehr du Rapid Trigger wirklich brauchst.',
      },
      hold: {
        title: 'Halten',
        short: 'Halten',
        measures: 'Das Mikrozittern beim Halten einer Taste: die minimale RT-Empfindlichkeit ohne ungewolltes Loslassen.',
      },
      strafe: {
        title: 'Counter-Strafe',
        short: 'Strafe',
        measures: 'Deine Links/Rechts-Wechsel: was Rapid Trigger und die SOCD-Modi wirklich bringen.',
      },
      analog: {
        title: 'Analoge Kontrolle',
        short: 'Analog',
        measures: 'Deine Präzision bei halber Tiefe: Kurve und Totzonen für den Gamepad-Modus.',
      },
    },
    es: {
      typing: {
        title: 'Prueba de escritura',
        short: 'Escritura',
        measures: 'Profundidad de cada pulsación, roces en teclas vecinas, pulsaciones fallidas, tu ajuste actual.',
      },
      rest: {
        title: 'Dedos en reposo',
        short: 'Reposo',
        measures: 'Presión de tus dedos apoyados sin pulsar: el límite inferior del punto de actuación.',
      },
      repeat: {
        title: 'Repetición rápida',
        short: 'Repetición',
        measures: 'Cuánto subes entre dos pulsaciones rápidas: cuánto necesitas de verdad el Rapid Trigger.',
      },
      hold: {
        title: 'Mantener',
        short: 'Mantener',
        measures: 'Los microtemblores al mantener una tecla: la sensibilidad RT mínima sin liberaciones falsas.',
      },
      strafe: {
        title: 'Contra-strafe',
        short: 'Strafe',
        measures: 'Tus cambios izquierda/derecha: lo que ganas de verdad con el Rapid Trigger y los modos SOCD.',
      },
      analog: {
        title: 'Control analógico',
        short: 'Analógico',
        measures: 'Tu precisión a profundidad parcial: curva y zonas muertas para el modo mando.',
      },
    },
  },
)
