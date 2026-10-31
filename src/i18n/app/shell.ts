// App shell: top bar, "needs a source" screen, footer.

import { messages } from '..'

export const shellText = messages(
  {
    nav: { home: 'Home', play: 'Play', live: 'Visualizer', settings: 'My settings', data: 'Data' },
    needsTitle: 'Plug in your Wooting',
    needsBody: 'Connect the keyboard to record your real data, or start demo mode to try it out with simulated key travel.',
    connect: 'Connect',
    demo: 'Demo',
    repoTitle: 'Source code on GitHub',
    footer: 'open source, MIT License · independent project, not affiliated with Wooting',
  },
  {
    fr: {
      nav: { home: 'Accueil', play: 'Jouer', live: 'Visualiseur', settings: 'Mes réglages', data: 'Données' },
      needsTitle: 'Branche ton Wooting',
      needsBody: 'Connecte le clavier pour enregistrer tes vraies données, ou lance le mode démo pour essayer avec des courses simulées.',
      connect: 'Connecter',
      demo: 'Démo',
      repoTitle: 'Code source sur GitHub',
      footer: 'open source, licence MIT · projet indépendant, non affilié à Wooting',
    },
    de: {
      nav: { home: 'Start', play: 'Spielen', live: 'Visualisierung', settings: 'Meine Einstellungen', data: 'Daten' },
      needsTitle: 'Schließ dein Wooting an',
      needsBody: 'Verbinde die Tastatur, um deine echten Daten aufzuzeichnen, oder starte den Demo-Modus und probier es mit simuliertem Tastenweg aus.',
      connect: 'Verbinden',
      demo: 'Demo',
      repoTitle: 'Quellcode auf GitHub',
      footer: 'Open Source, MIT-Lizenz · unabhängiges Projekt, nicht mit Wooting verbunden',
    },
    es: {
      nav: { home: 'Inicio', play: 'Jugar', live: 'Visualizador', settings: 'Mis ajustes', data: 'Datos' },
      needsTitle: 'Conecta tu Wooting',
      needsBody: 'Conecta el teclado para grabar tus datos reales, o inicia el modo demo para probar con pulsaciones simuladas.',
      connect: 'Conectar',
      demo: 'Demo',
      repoTitle: 'Código fuente en GitHub',
      footer: 'código abierto, licencia MIT · proyecto independiente, sin afiliación con Wooting',
    },
  },
)
