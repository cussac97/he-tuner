// RepeatGame (Spam level): live counters and the score screen.

import { messages } from '..'

export const repeatText = messages(
  {
    failed: 'Not enough taps detected. Keep hammering the key until the timer runs out!',
    headlineLost: (n: number) =>
      n > 1 ? `${n} taps lost to your current setting. Rapid Trigger would have caught them all.` : `1 tap lost to your current setting. Rapid Trigger would have caught it.`,
    headlineFast: 'Machine gun! And your keyboard caught every one.',
    headlineOk: 'Your keyboard caught every tap.',
    realTaps: 'Actual taps',
    rate: 'Rate',
    tapsPerSec: 'taps/s',
    received: 'Received by the Mac',
    lift: 'Lift between 2 taps',
    liveTaps: 'taps',
    liveReceived: 'received',
    liveTime: 'time',
  },
  {
    fr: {
      failed: 'Pas assez de tapes détectées. Martèle la touche pendant tout le chrono !',
      headlineLost: (n) => `${n} tape${n > 1 ? 's' : ''} perdue${n > 1 ? 's' : ''} par ton réglage actuel. Le Rapid Trigger les aurait toutes captées.`,
      headlineFast: 'Mitraillette ! Et ton clavier a tout capté.',
      headlineOk: 'Ton clavier a capté chaque tape.',
      realTaps: 'Tapes réelles',
      rate: 'Cadence',
      tapsPerSec: 'tapes/s',
      received: 'Reçues par le Mac',
      lift: 'Remontée entre 2 tapes',
      liveTaps: 'tapes',
      liveReceived: 'reçues',
      liveTime: 'temps',
    },
    de: {
      failed: 'Zu wenige Anschläge erkannt. Hämmere bis zum Ende der Zeit auf die Taste!',
      headlineLost: (n) =>
        n > 1
          ? `${n} Anschläge gehen mit deiner aktuellen Einstellung verloren. Rapid Trigger hätte alle erfasst.`
          : `1 Anschlag geht mit deiner aktuellen Einstellung verloren. Rapid Trigger hätte ihn erfasst.`,
      headlineFast: 'Maschinengewehr! Und deine Tastatur hat alles erfasst.',
      headlineOk: 'Deine Tastatur hat jeden Anschlag erfasst.',
      realTaps: 'Echte Anschläge',
      rate: 'Frequenz',
      tapsPerSec: 'Anschl./s',
      received: 'Beim Mac angekommen',
      lift: 'Hub zwischen 2 Anschlägen',
      liveTaps: 'Anschläge',
      liveReceived: 'empfangen',
      liveTime: 'Zeit',
    },
    es: {
      failed: 'No se detectaron suficientes pulsaciones. ¡Machaca la tecla hasta que acabe el tiempo!',
      headlineLost: (n) =>
        n > 1
          ? `${n} pulsaciones perdidas por tu ajuste actual. El Rapid Trigger las habría captado todas.`
          : `1 pulsación perdida por tu ajuste actual. El Rapid Trigger la habría captado.`,
      headlineFast: '¡Ametralladora! Y tu teclado lo captó todo.',
      headlineOk: 'Tu teclado captó cada pulsación.',
      realTaps: 'Pulsaciones reales',
      rate: 'Cadencia',
      tapsPerSec: 'puls./s',
      received: 'Recibidas por el Mac',
      lift: 'Subida entre 2 pulsaciones',
      liveTaps: 'pulsaciones',
      liveReceived: 'recibidas',
      liveTime: 'tiempo',
    },
  },
)
