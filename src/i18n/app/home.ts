// Home page.

import { messages } from '..'

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
    },
  },
)
