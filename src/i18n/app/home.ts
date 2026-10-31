// Home page.

import { messages } from '..'

type Spec = { v: string; l: string }
type Feature = { t: string; d: string }

export const homeText = messages<{
  pill: string
  hero1: string
  hero2: string
  sub: string
  run: string
  example: string
  mySettings: string
  liveTag: string
  liveTitle: string
  liveHid: string
  liveDemo: string
  liveNone: string
  specs: { rate: Spec; resolution: Spec; tests: Spec; local: Spec }
  features: { raw: Feature; tests: Feature; replay: Feature }
}>(
  {
    pill: 'Wooting · analog protocol V2',
    hero1: 'Your keyboard, tuned',
    hero2: 'to a tenth of a millimeter.',
    sub: 'HE Tuner reads the travel of every key during six short tests, replays your keystrokes through hundreds of settings and tells you what to set in Wootility.',
    run: 'Start the run',
    example: 'See an example',
    mySettings: 'My settings',
    liveTag: 'Live',
    liveTitle: 'Your keyboard, live',
    liveHid: 'Press a key: it sinks and fills up to its real depth.',
    liveDemo: 'Demo mode: your keystrokes are turned into simulated key travel.',
    liveNone: 'Plug in your Wooting (Chrome, Edge, Arc, Brave) or try the demo.',
    specs: {
      rate: { v: '8000 Hz', l: 'analog polling' },
      resolution: { v: '0.004 mm', l: 'resolution' },
      tests: { v: '6 tests', l: '≈ 2 minutes' },
      local: { v: '100%', l: 'local, nothing is uploaded' },
    },
    features: {
      raw: { t: 'Raw readings', d: 'The travel of every key at 8 kHz, plus the actuation state the keyboard computes itself.' },
      tests: { t: 'Six targeted tests', d: 'Typing, rest, spam, hold, strafe, analog control: each one isolates a specific behavior.' },
      replay: { t: 'Replayed, not guessed', d: 'Every suggested setting is first simulated on your own recorded keystrokes.' },
    },
  },
  {
    fr: {
      pill: 'Wooting · protocole analogique V2',
      hero1: 'Ton clavier, réglé',
      hero2: 'au dixième de millimètre.',
      sub: 'HE Tuner lit la course de chaque touche pendant six tests courts, rejoue tes frappes avec des centaines de réglages et te dit quoi mettre dans Wootility.',
      run: 'Lancer le parcours',
      example: 'Voir un exemple',
      mySettings: 'Mes réglages',
      liveTag: 'Live',
      liveTitle: 'Ton clavier, en direct',
      liveHid: 'Appuie sur une touche : elle s’enfonce et se remplit selon sa vraie profondeur.',
      liveDemo: 'Mode démo : tes frappes sont converties en courses simulées.',
      liveNone: 'Branche ton Wooting (Chrome, Edge, Arc, Brave) ou essaie la démo.',
      specs: {
        rate: { v: '8 000 Hz', l: 'lecture analogique' },
        resolution: { v: '0,004 mm', l: 'résolution' },
        tests: { v: '6 tests', l: '≈ 2 minutes' },
        local: { v: '100 %', l: 'local, rien n’est envoyé' },
      },
      features: {
        raw: { t: 'Lecture brute', d: 'La course de chaque touche à 8 kHz, et l’état d’actuation que le clavier calcule lui-même.' },
        tests: { t: 'Six tests ciblés', d: 'Frappe, repos, spam, maintien, strafe, contrôle analogique : chacun isole un comportement précis.' },
        replay: { t: 'Rejoué, pas deviné', d: 'Chaque réglage proposé a d’abord été simulé sur tes propres frappes enregistrées.' },
      },
    },
    de: {
      pill: 'Wooting · Analogprotokoll V2',
      hero1: 'Deine Tastatur, eingestellt',
      hero2: 'auf den Zehntelmillimeter genau.',
      sub: 'HE Tuner liest während sechs kurzer Tests den Tastenweg jeder Taste, spielt deine Anschläge mit Hunderten von Einstellungen durch und sagt dir, was du in Wootility einstellen sollst.',
      run: 'Durchlauf starten',
      example: 'Beispiel ansehen',
      mySettings: 'Meine Einstellungen',
      liveTag: 'Live',
      liveTitle: 'Deine Tastatur, live',
      liveHid: 'Drück eine Taste: Sie sinkt ein und füllt sich bis zu ihrer echten Tiefe.',
      liveDemo: 'Demo-Modus: Deine Anschläge werden in simulierten Tastenweg umgewandelt.',
      liveNone: 'Schließ dein Wooting an (Chrome, Edge, Arc, Brave) oder probier die Demo aus.',
      specs: {
        rate: { v: '8000 Hz', l: 'analoge Abtastung' },
        resolution: { v: '0.004 mm', l: 'Auflösung' },
        tests: { v: '6 Tests', l: '≈ 2 Minuten' },
        local: { v: '100 %', l: 'lokal, nichts wird gesendet' },
      },
      features: {
        raw: { t: 'Rohdaten', d: 'Der Tastenweg jeder Taste mit 8 kHz, dazu der Auslösezustand, den die Tastatur selbst berechnet.' },
        tests: { t: 'Sechs gezielte Tests', d: 'Tippen, Ruhe, Spam, Halten, Strafe, analoge Kontrolle: Jeder Test isoliert ein bestimmtes Verhalten.' },
        replay: { t: 'Nachgespielt, nicht geraten', d: 'Jede vorgeschlagene Einstellung wird zuerst auf deinen eigenen aufgezeichneten Anschlägen simuliert.' },
      },
    },
    es: {
      pill: 'Wooting · protocolo analógico V2',
      hero1: 'Tu teclado, ajustado',
      hero2: 'a la décima de milímetro.',
      sub: 'HE Tuner lee la carrera de cada tecla durante seis pruebas cortas, reproduce tus pulsaciones con cientos de ajustes y te dice qué poner en Wootility.',
      run: 'Iniciar el recorrido',
      example: 'Ver un ejemplo',
      mySettings: 'Mis ajustes',
      liveTag: 'En vivo',
      liveTitle: 'Tu teclado, en directo',
      liveHid: 'Pulsa una tecla: se hunde y se llena según su profundidad real.',
      liveDemo: 'Modo demo: tus pulsaciones se convierten en carreras simuladas.',
      liveNone: 'Conecta tu Wooting (Chrome, Edge, Arc, Brave) o prueba la demo.',
      specs: {
        rate: { v: '8000 Hz', l: 'lectura analógica' },
        resolution: { v: '0.004 mm', l: 'resolución' },
        tests: { v: '6 pruebas', l: '≈ 2 minutos' },
        local: { v: '100 %', l: 'local, no se envía nada' },
      },
      features: {
        raw: { t: 'Lectura en bruto', d: 'La carrera de cada tecla a 8 kHz, y el estado de actuación que calcula el propio teclado.' },
        tests: { t: 'Seis pruebas específicas', d: 'Escritura, reposo, spam, mantener, strafe, control analógico: cada una aísla un comportamiento concreto.' },
        replay: { t: 'Reproducido, no adivinado', d: 'Cada ajuste propuesto se simula antes sobre tus propias pulsaciones grabadas.' },
      },
    },
  },
)
