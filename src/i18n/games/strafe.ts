// StrafeGame: score screen.

import { messages } from '..'

export const strafeText = messages(
  {
    headlineOverlap: (pct: number) => `You often press the new direction before releasing the old one (${pct}% of switches).`,
    headlineGain: (ms: number) => `Clean counter-strafes. Rapid Trigger would stop you ${ms} ms sooner.`,
    headlineClean: 'Clean, snappy counter-strafes.',
    rightDir: 'Right direction',
    switches: 'Switches',
    overlaps: 'Overlaps',
    chartTitle: 'Stop delay, replayed with each setting',
    ready: 'Ready…',
  },
  {
    fr: {
      headlineOverlap: (pct) => `Tu appuies souvent la nouvelle direction avant de lâcher l’ancienne (${pct} % des changements).`,
      headlineGain: (ms) => `Contre-strafes propres. Le Rapid Trigger t’arrêterait ${ms} ms plus tôt.`,
      headlineClean: 'Contre-strafes propres et réactifs.',
      rightDir: 'Bonne direction',
      switches: 'Changements',
      overlaps: 'Chevauchements',
      chartTitle: 'Délai d’arrêt rejoué avec chaque réglage',
      ready: 'Prêt…',
    },
    de: {
      headlineOverlap: (pct) => `Du drückst oft die neue Richtung, bevor du die alte loslässt (${pct} % der Wechsel).`,
      headlineGain: (ms) => `Saubere Counter-Strafes. Rapid Trigger würde dich ${ms} ms früher stoppen.`,
      headlineClean: 'Saubere, reaktionsschnelle Counter-Strafes.',
      rightDir: 'Richtige Richtung',
      switches: 'Wechsel',
      overlaps: 'Überlappungen',
      chartTitle: 'Stoppverzögerung, mit jeder Einstellung nachgespielt',
      ready: 'Bereit…',
    },
    es: {
      headlineOverlap: (pct) => `A menudo pulsas la nueva dirección antes de soltar la anterior (${pct} % de los cambios).`,
      headlineGain: (ms) => `Contra-strafes limpios. El Rapid Trigger te frenaría ${ms} ms antes.`,
      headlineClean: 'Contra-strafes limpios y reactivos.',
      rightDir: 'Dirección correcta',
      switches: 'Cambios',
      overlaps: 'Solapamientos',
      chartTitle: 'Retardo de frenado, reproducido con cada ajuste',
      ready: 'Listo…',
    },
  },
)
