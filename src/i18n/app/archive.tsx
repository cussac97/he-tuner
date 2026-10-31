// Local archive status (dev server only) and the analysis note box.

import type { ReactNode } from 'react'
import { messages } from '..'

const Code = ({ children }: { children: ReactNode }) => <span className="num">{children}</span>

export const archiveText = messages(
  {
    onTitle: 'Auto-archiving on',
    onBody: (exercises: number, profiles: number, pending: number) => (
      <>
        {' '}
        — {exercises} exercises and {profiles} recommendations saved as JSON in the project’s <Code>data/</Code> folder
        {pending > 0 ? ` (sending ${pending}…)` : ''}. Example sessions are not archived.
      </>
    ),
    offTitle: 'Archiving unavailable',
    offBody: () => (
      <>
        {' '}
        — it only works when the app runs with <Code>npm run dev</Code>. Your data stays in the browser; use “Export all” to back it up.
      </>
    ),
    noteLabel: 'Note for the analysis: what you changed in Wootility, how it feels…',
    notePlaceholder: 'e.g. applied 1.8 mm globally, space at 2.2 mm, RT off. Fewer typos, typing feels a bit heavier.',
    saveNote: 'Save note',
    saved: 'Note saved ✓',
    saveFailed: 'Couldn’t save the note',
  },
  {
    fr: {
      onTitle: 'Archivage automatique actif',
      onBody: (exercises, profiles, pending) => (
        <>
          {' '}
          — {exercises} exercices et {profiles} recommandations sauvegardés en JSON dans le dossier <Code>data/</Code> du projet
          {pending > 0 ? ` (envoi de ${pending} en cours…)` : ''}. Les sessions exemple ne sont pas archivées.
        </>
      ),
      offTitle: 'Archivage indisponible',
      offBody: () => (
        <>
          {' '}
          — il ne fonctionne que lorsque l’app est lancée avec <Code>npm run dev</Code>. Tes données restent dans le navigateur ; utilise « Exporter tout »
          pour les sauvegarder.
        </>
      ),
      noteLabel: 'Note pour l’analyse : ce que tu as changé dans Wootility, tes impressions…',
      notePlaceholder: 'ex. : appliqué 1.8 mm global, espace à 2.2 mm, RT désactivé. Moins de fautes, frappe un peu plus dure.',
      saveNote: 'Enregistrer la note',
      saved: 'Note enregistrée ✓',
      saveFailed: 'Échec de l’enregistrement',
    },
    de: {
      onTitle: 'Automatische Archivierung aktiv',
      onBody: (exercises, profiles, pending) => (
        <>
          {' '}
          — {exercises} Übungen und {profiles} Empfehlungen als JSON im Ordner <Code>data/</Code> des Projekts gespeichert
          {pending > 0 ? ` (${pending} werden gesendet…)` : ''}. Beispielsitzungen werden nicht archiviert.
        </>
      ),
      offTitle: 'Archivierung nicht verfügbar',
      offBody: () => (
        <>
          {' '}
          — sie funktioniert nur, wenn die App mit <Code>npm run dev</Code> gestartet wird. Deine Daten bleiben im Browser; nutze „Alles exportieren“, um sie
          zu sichern.
        </>
      ),
      noteLabel: 'Notiz für die Analyse: was du in Wootility geändert hast, deine Eindrücke…',
      notePlaceholder: 'z. B. 1.8 mm global übernommen, Leertaste auf 2.2 mm, RT aus. Weniger Tippfehler, Anschlag etwas schwerer.',
      saveNote: 'Notiz speichern',
      saved: 'Notiz gespeichert ✓',
      saveFailed: 'Speichern fehlgeschlagen',
    },
    es: {
      onTitle: 'Archivado automático activo',
      onBody: (exercises, profiles, pending) => (
        <>
          {' '}
          — {exercises} ejercicios y {profiles} recomendaciones guardados en JSON en la carpeta <Code>data/</Code> del proyecto
          {pending > 0 ? ` (enviando ${pending}…)` : ''}. Las sesiones de ejemplo no se archivan.
        </>
      ),
      offTitle: 'Archivado no disponible',
      offBody: () => (
        <>
          {' '}
          — solo funciona cuando la app se ejecuta con <Code>npm run dev</Code>. Tus datos se quedan en el navegador; usa «Exportar todo» para guardarlos.
        </>
      ),
      noteLabel: 'Nota para el análisis: qué cambiaste en Wootility, tus impresiones…',
      notePlaceholder: 'p. ej.: 1.8 mm global aplicado, espacio a 2.2 mm, RT desactivado. Menos errores, la escritura se siente algo más dura.',
      saveNote: 'Guardar nota',
      saved: 'Nota guardada ✓',
      saveFailed: 'No se pudo guardar la nota',
    },
  },
)
