// Text produced by the analysis (src/analysis/recommend.ts): the reasons behind each
// recommendation, override labels, replay scenario names and the "going further" ideas.
// Millimetre values arrive already formatted (toFixed) so every language shows the same digits.

import { messages } from '..'
import type { AnalogCurve } from '../../analysis/recommend'

const s = (n: number, one: string, many: string) => (n === 1 ? one : many)

export const recommendText = messages(
  {
    groups: { space: 'Space bar', modifiers: 'Modifiers' },
    typing: {
      brushes: (n: number, p90: string, a: string, clears: boolean) =>
        `${n} unintended ${s(n, 'brush', 'brushes')} measured; 90% of them stay under ${p90} mm. ${
          clears ? `At ${a} mm, none of them triggers anything any more.` : `Going deeper would cost more responsiveness than the errors it would save.`
        }`,
      presses: (p5: string, bottomOutPct: number | null, a: string) =>
        `95% of your real presses go at least ${p5} mm deep${
          bottomOutPct !== null ? ` (you bottom out ${bottomOutPct}% of the time)` : ''
        }: no risk of a missed press at ${a} mm.`,
      resting: (mm: string) => `Your resting fingers push keys down as far as ${mm} mm: the actuation point sits deeper than that, with a margin.`,
      overrideDeeper: (n: number, restMm: string | null) =>
        `${n} unintended ${s(n, 'contact', 'contacts')}${restMm ? `, ${restMm} mm of resting pressure` : ''}: deeper, to stop the stray triggers.`,
      overrideLighter: 'Clean, decisive presses and no stray contact: this can be more responsive.',
      overrideFinger: (brushes: number, presses: number) =>
        `${brushes} ${s(brushes, 'brush', 'brushes')} over ${presses} presses for this finger: a deeper point on its keys is enough, without slowing down the rest.`,
      rtOn: (release: string, avoided: number) =>
        `RT (${release} mm) would avoid ${avoided} ${s(avoided, 'error', 'errors')} on your data (missed double letters).`,
      rtOff: (extraDoubles: number) =>
        `For typing, Rapid Trigger avoids no error at all on your data${
          extraDoubles > 0 ? ` and would add up to ${extraDoubles} double ${s(extraDoubles, 'trigger', 'triggers')}` : ''
        }. Keep it for the gaming profile.`,
    },
    gaming: {
      rest: (restMm: string, a: string) =>
        `Fingers resting on WASD: up to ${restMm} mm without meaning to → actuation at ${a} mm, as high as possible without stray movement.`,
      noRest: (a: string) => `Without the Rest test, a cautious ${a} mm. Play that level to fine-tune it.`,
      hold: (wobble: string, release: string) =>
        `While holding, your key wobbles by up to ${wobble} mm: with an RT sensitivity of ${release} mm it will never release by mistake.`,
      fastTaps: (lift: string, press: string) =>
        `Your fastest taps only come back up ${lift} mm: press sensitivity lowered to ${press} mm to catch every one of them.`,
      lostTaps: (a: string, lost: number, taps: number, lift: string) =>
        `At ${a} mm without Rapid Trigger, ${lost} of your ${taps} fast taps would be lost: between taps you only come back up to ${lift} mm on average. RT catches them all.`,
      continuous: (moreTaps: number, earlierMs: number) =>
        `Continuous RT catches ${moreTaps > 0 ? `${moreTaps} more ${s(moreTaps, 'tap', 'taps')}` : `your taps ${earlierMs} ms earlier`}: turn it on.`,
      stops: (ms: number) => `Stops: your character stops ${ms} ms sooner with RT than with a fixed 1.5 mm.`,
      socdYes: (pct: number, overlapMs: number, gainMs: number) =>
        `In ${pct}% of your direction changes, you press the new key before letting go of the old one (≈${overlapMs} ms). An SOCD mode would save you ≈${gainMs} ms per change.`,
      socdNo: (pct: number) => `Your direction changes are clean (${pct}% overlap): no need for SOCD.`,
    },
    scenarios: {
      current: 'Current (estimated)',
      noRt: (mm: string) => `No RT · ${mm} mm`,
      rtContinuous: (release: string) => `RT ${release} continuous`,
      recommended: 'Recommended',
    },
    analog: {
      progressive: (ratio: string) =>
        `Your error is ${ratio}× larger in the first quarter of travel: a progressive curve (gentler at the start) gives you finer control at low speed.`,
      aggressive: 'You struggle to hold values near the bottom: a more aggressive curve reaches 100% sooner.',
      linear: 'Your precision is even across the whole travel: a linear curve is ideal.',
      inner: (mm: string) => `You often overshoot small values: ${mm} mm inner deadzone.`,
      outer: (mm: string) => `Near the bottom you often fall short of the target: ${mm} mm outer deadzone, to reach 100% without mashing the key.`,
      lag: (ms: number, pct: number) => `Measured tracking lag: ${ms} ms; ${pct}% of the time within ±0.3 mm of the target.`,
    },
    /** lower-case curve names, as used inside sentences and setting values */
    curves: { linear: 'linear', progressive: 'progressive', aggressive: 'aggressive' } as Record<AnalogCurve, string>,
    ideas: {
      tags: { typing: 'Typing', gaming: 'Gaming', layers: 'Layers', rules: 'Rules', comfort: 'Comfort', analog: 'Analog' },
      space: {
        title: 'Give the space bar its own setting',
        body: 'Your thumbs rest on the space bar. Give it its own actuation point (per-key setting) instead of stiffening the whole keyboard.',
      },
      shift: {
        title: 'Deeper Shift / Ctrl in games',
        body: (restMm: string, mm: string) =>
          `Your pinky rests ${restMm} mm deep on Shift/Ctrl. Set those keys to ${mm} mm in the gaming profile to avoid accidental crouching / walking.`,
      },
      profiles: {
        title: 'Two profiles, one shortcut',
        body: 'Keep a “Typing” profile (deeper actuation, RT off) and a “Gaming” profile (high actuation, RT on). Bind an Fn shortcut to switch between them: the best of both worlds.',
      },
      dks: {
        title: 'Dynamic Keystroke for walking',
        body: 'In games without analog input, a DKS on W can send “walk” halfway down and “run” at the bottom: one key, two speeds.',
      },
      socd: {
        title: 'SOCD: check the rules',
        body: 'Since 2024, Counter-Strike 2 rejects Snap Tap/SOCD-style features on official Valve servers, and several leagues ban them too. Keep a profile without SOCD for those games.',
      },
      bottomOut: {
        title: 'You bottom out',
        body: (pct: number, a: string) =>
          `${pct}% of your presses go all the way down. With the actuation point at ${a} mm, you can train yourself to type lighter: less fatigue, and the keyboard keeps up.`,
      },
      analog: {
        title: (c: AnalogCurve) => ({ linear: 'Linear curve', progressive: 'Progressive curve', aggressive: 'Aggressive curve' })[c],
        body: 'For gamepad mode (racing games, fine movement): apply the recommended curve and deadzones to the analog profile.',
      },
    },
  },
  {
    fr: {
      groups: { space: 'Barre espace', modifiers: 'Modificateurs' },
      typing: {
        brushes: (n, p90, a, clears) =>
          `${n} effleurements involontaires mesurés ; 90 % restent sous ${p90} mm. ${
            clears ? `À ${a} mm, ils ne déclenchent plus rien.` : `Un réglage plus profond coûterait plus en réactivité qu’il n’éviterait d’erreurs.`
          }`,
        presses: (p5, bottomOutPct, a) =>
          `Tes vraies frappes descendent au moins à ${p5} mm dans 95 % des cas${
            bottomOutPct !== null ? ` (tu tapes en fond de course ${bottomOutPct} % du temps)` : ''
          } : aucun risque de frappe ratée à ${a} mm.`,
        resting: (mm) => `Tes doigts posés appuient jusqu’à ${mm} mm : le point d’actuation reste au-dessus avec une marge.`,
        overrideDeeper: (n, restMm) => `${n} contacts involontaires${restMm ? `, ${restMm} mm de pression au repos` : ''} : plus profond pour éviter les déclenchements parasites.`,
        overrideLighter: 'Frappes franches et aucun contact parasite : peut être plus réactif.',
        overrideFinger: (brushes, presses) =>
          `${brushes} effleurements sur ${presses} frappes pour ce doigt : un point plus profond sur ses touches suffit, sans ralentir le reste.`,
        rtOn: (release, avoided) => `Le RT (${release} mm) éviterait ${avoided} erreurs sur tes données (lettres doublées ratées).`,
        rtOff: (extraDoubles) =>
          `En frappe, le Rapid Trigger n’évite aucune erreur sur tes données${
            extraDoubles > 0 ? ` et ajouterait jusqu’à ${extraDoubles} doubles déclenchements` : ''
          }. Garde-le pour le profil jeu.`,
      },
      gaming: {
        rest: (restMm, a) =>
          `Doigts posés sur ZQSD/WASD : jusqu’à ${restMm} mm sans le vouloir → actuation à ${a} mm, aussi haut que possible sans mouvement parasite.`,
        noRest: (a) => `Sans test « repos », valeur prudente de ${a} mm. Fais l’exercice pour l’affiner.`,
        hold: (wobble, release) => `En maintien, ta touche oscille jusqu’à ${wobble} mm : une sensibilité RT de ${release} mm ne relâchera jamais par erreur.`,
        fastTaps: (lift, press) => `Tes tapes les plus rapides ne remontent que de ${lift} mm : sensibilité d’appui réduite à ${press} mm pour toutes les capter.`,
        lostTaps: (a, lost, taps, lift) =>
          `À ${a} mm sans Rapid Trigger, ${lost} de tes ${taps} tapes rapides seraient perdues : entre deux tapes tu ne remontes qu’à ${lift} mm en moyenne. Le RT les capte toutes.`,
        continuous: (moreTaps, earlierMs) =>
          `Le RT continu capte ${moreTaps > 0 ? `${moreTaps} tapes de plus` : `tes tapes ${earlierMs} ms plus tôt`} : à activer.`,
        stops: (ms) => `Arrêts : ton personnage s’arrête ${ms} ms plus tôt avec le RT qu’avec un réglage fixe à 1.5 mm.`,
        socdYes: (pct, overlapMs, gainMs) =>
          `Dans ${pct} % de tes changements de direction, tu appuies sur la nouvelle touche avant de lâcher l’ancienne (≈${overlapMs} ms). Un mode SOCD te ferait gagner ≈${gainMs} ms par changement.`,
        socdNo: (pct) => `Tes changements de direction sont propres (${pct} % de chevauchement) : pas besoin de SOCD.`,
      },
      scenarios: {
        current: 'Actuel (estimé)',
        noRt: (mm) => `Sans RT · ${mm} mm`,
        rtContinuous: (release) => `RT ${release} continu`,
        recommended: 'Recommandé',
      },
      analog: {
        progressive: (ratio) =>
          `Ton erreur est ${ratio}× plus grande dans le premier quart de course : une courbe progressive (plus douce au début) te donnera plus de finesse à faible vitesse.`,
        aggressive: 'Tu as du mal à tenir les valeurs proches du fond : une courbe plus agressive atteint 100 % plus tôt.',
        linear: 'Ta précision est homogène sur toute la course : une courbe linéaire est idéale.',
        inner: (mm) => `Tu dépasses souvent les petites valeurs : zone morte basse de ${mm} mm.`,
        outer: (mm) => `Tu restes souvent sous la cible près du fond : zone morte haute de ${mm} mm pour atteindre 100 % sans écraser.`,
        lag: (ms, pct) => `Délai de suivi mesuré : ${ms} ms ; ${pct} % du temps à ±0,3 mm de la cible.`,
      },
      curves: { linear: 'linéaire', progressive: 'progressive', aggressive: 'agressive' },
      ideas: {
        tags: { typing: 'Frappe', gaming: 'Jeu', layers: 'Couches', rules: 'Règles', comfort: 'Confort', analog: 'Analogique' },
        space: {
          title: 'Barre espace à part',
          body: 'Tes pouces se posent sur la barre espace. Donne-lui son propre point d’actuation (réglage par touche) plutôt que de durcir tout le clavier.',
        },
        shift: {
          title: 'Shift / Ctrl plus profonds en jeu',
          body: (restMm, mm) =>
            `Ton auriculaire repose à ${restMm} mm sur Shift/Ctrl. Mets ces touches à ${mm} mm dans le profil jeu pour éviter les accroupissements / marches involontaires.`,
        },
        profiles: {
          title: 'Deux profils, un raccourci',
          body: 'Garde un profil « Frappe » (actuation plus profonde, RT désactivé) et un profil « Jeu » (actuation haute, RT). Assigne un raccourci Fn pour basculer : c’est le meilleur des deux mondes.',
        },
        dks: {
          title: 'Dynamic Keystroke sur la marche',
          body: 'Dans les jeux sans analogique, un DKS sur Z/W peut envoyer « marcher » à mi-course et « courir » au fond : une seule touche, deux vitesses.',
        },
        socd: {
          title: 'SOCD : vérifie le règlement',
          body: 'Counter-Strike 2 refuse les fonctions de type Snap Tap/SOCD sur les serveurs officiels de Valve depuis 2024, et plusieurs ligues aussi. Garde un profil sans SOCD pour ces jeux.',
        },
        bottomOut: {
          title: 'Tu frappes en fond de course',
          body: (pct, a) =>
            `${pct} % de tes frappes vont jusqu’au fond. Avec un point d’actuation à ${a} mm, tu peux t’entraîner à frapper plus léger : moins de fatigue, et le clavier suit.`,
        },
        analog: {
          title: (c) => `Courbe ${{ linear: 'linéaire', progressive: 'progressive', aggressive: 'agressive' }[c]}`,
          body: 'Pour le mode manette (jeux de course, déplacements fins) : applique la courbe et les zones mortes recommandées au profil analogique.',
        },
      },
    },
    de: {
      groups: { space: 'Leertaste', modifiers: 'Modifier-Tasten' },
      typing: {
        brushes: (n, p90, a, clears) =>
          `${n} ${s(n, 'ungewollter Streifer', 'ungewollte Streifer')} gemessen; 90 % davon bleiben unter ${p90} mm. ${
            clears ? `Bei ${a} mm lösen sie nichts mehr aus.` : `Ein tieferer Punkt würde mehr Reaktionsschnelle kosten, als er Fehler verhindert.`
          }`,
        presses: (p5, bottomOutPct, a) =>
          `95 % deiner echten Anschläge gehen mindestens ${p5} mm tief${
            bottomOutPct !== null ? ` (du drückst ${bottomOutPct} % der Zeit ganz durch)` : ''
          }: kein Risiko eines verpassten Anschlags bei ${a} mm.`,
        resting: (mm) => `Deine aufliegenden Finger drücken die Tasten bis zu ${mm} mm herunter: der Auslösepunkt liegt mit Sicherheitsabstand tiefer.`,
        overrideDeeper: (n, restMm) =>
          `${n} ungewollte ${s(n, 'Berührung', 'Berührungen')}${restMm ? `, ${restMm} mm Druck im Ruhezustand` : ''}: tiefer, damit nichts mehr versehentlich auslöst.`,
        overrideLighter: 'Klare Anschläge und keine Fehlkontakte: darf reaktionsschneller sein.',
        overrideFinger: (brushes, presses) =>
          `${brushes} Streifer auf ${presses} Anschläge bei diesem Finger: ein tieferer Punkt auf seinen Tasten reicht, ohne den Rest auszubremsen.`,
        rtOn: (release, avoided) => `RT (${release} mm) würde auf deinen Daten ${avoided} Fehler vermeiden (verpasste Doppelbuchstaben).`,
        rtOff: (extraDoubles) =>
          `Beim Tippen verhindert Rapid Trigger auf deinen Daten keinen einzigen Fehler${
            extraDoubles > 0 ? ` und würde bis zu ${extraDoubles} ${s(extraDoubles, 'Doppelauslösung', 'Doppelauslösungen')} hinzufügen` : ''
          }. Heb ihn dir fürs Gaming-Profil auf.`,
      },
      gaming: {
        rest: (restMm, a) =>
          `Finger auf WASD aufgelegt: bis zu ${restMm} mm ungewollt → Auslösepunkt bei ${a} mm, so hoch wie möglich ohne ungewollte Bewegung.`,
        noRest: (a) => `Ohne den Test „Ruhe“ ein vorsichtiger Wert von ${a} mm. Spiel dieses Level, um ihn zu verfeinern.`,
        hold: (wobble, release) =>
          `Beim Halten schwankt deine Taste um bis zu ${wobble} mm: mit einer RT-Empfindlichkeit von ${release} mm wird sie nie versehentlich losgelassen.`,
        fastTaps: (lift, press) =>
          `Deine schnellsten Anschläge gehen nur ${lift} mm wieder hoch: Drück-Empfindlichkeit auf ${press} mm gesenkt, damit jeder einzelne erkannt wird.`,
        lostTaps: (a, lost, taps, lift) =>
          `Bei ${a} mm ohne Rapid Trigger gingen ${lost} deiner ${taps} schnellen Anschläge verloren: zwischen zwei Anschlägen gehst du im Schnitt nur bis ${lift} mm zurück. RT erfasst sie alle.`,
        continuous: (moreTaps, earlierMs) =>
          `Kontinuierlicher RT erfasst ${
            moreTaps > 0 ? `${moreTaps} ${s(moreTaps, 'Anschlag', 'Anschläge')} mehr` : `deine Anschläge ${earlierMs} ms früher`
          }: einschalten.`,
        stops: (ms) => `Stopps: deine Spielfigur bleibt mit RT ${ms} ms früher stehen als mit festen 1.5 mm.`,
        socdYes: (pct, overlapMs, gainMs) =>
          `Bei ${pct} % deiner Richtungswechsel drückst du die neue Taste, bevor du die alte loslässt (≈${overlapMs} ms). Ein SOCD-Modus würde dir ≈${gainMs} ms pro Wechsel bringen.`,
        socdNo: (pct) => `Deine Richtungswechsel sind sauber (${pct} % Überlappung): kein SOCD nötig.`,
      },
      scenarios: {
        current: 'Aktuell (geschätzt)',
        noRt: (mm) => `Ohne RT · ${mm} mm`,
        rtContinuous: (release) => `RT ${release} kontinuierlich`,
        recommended: 'Empfohlen',
      },
      analog: {
        progressive: (ratio) =>
          `Dein Fehler ist im ersten Viertel des Tastenwegs ${ratio}× größer: eine progressive Kurve (sanfter am Anfang) gibt dir mehr Feingefühl bei langsamen Bewegungen.`,
        aggressive: 'Werte nahe am Boden kannst du schlecht halten: eine aggressivere Kurve erreicht 100 % früher.',
        linear: 'Deine Präzision ist über den ganzen Tastenweg gleichmäßig: eine lineare Kurve ist ideal.',
        inner: (mm) => `Kleine Werte überschießt du oft: innere Totzone von ${mm} mm.`,
        outer: (mm) => `Nahe am Boden bleibst du oft unter dem Ziel: äußere Totzone von ${mm} mm, um 100 % zu erreichen, ohne durchzudrücken.`,
        lag: (ms, pct) => `Gemessene Nachführverzögerung: ${ms} ms; ${pct} % der Zeit innerhalb von ±0.3 mm um das Ziel.`,
      },
      curves: { linear: 'linear', progressive: 'progressiv', aggressive: 'aggressiv' },
      ideas: {
        tags: { typing: 'Tippen', gaming: 'Gaming', layers: 'Ebenen', rules: 'Regeln', comfort: 'Komfort', analog: 'Analog' },
        space: {
          title: 'Eigene Einstellung für die Leertaste',
          body: 'Deine Daumen liegen auf der Leertaste. Gib ihr einen eigenen Auslösepunkt (Einstellung pro Taste), statt die ganze Tastatur unempfindlicher zu machen.',
        },
        shift: {
          title: 'Shift / Strg im Spiel tiefer',
          body: (restMm, mm) =>
            `Dein kleiner Finger liegt mit ${restMm} mm auf Shift/Strg. Stell diese Tasten im Gaming-Profil auf ${mm} mm, um ungewolltes Ducken / Gehen zu vermeiden.`,
        },
        profiles: {
          title: 'Zwei Profile, ein Tastenkürzel',
          body: 'Leg dir ein Tipp-Profil (tieferer Auslösepunkt, RT aus) und ein Gaming-Profil (hoher Auslösepunkt, RT an) an. Belege ein Fn-Tastenkürzel zum Umschalten: das Beste aus beiden Welten.',
        },
        dks: {
          title: 'Dynamic Keystroke fürs Gehen',
          body: 'In Spielen ohne Analog-Unterstützung kann ein DKS auf W auf halbem Weg „Gehen“ und ganz unten „Rennen“ senden: eine Taste, zwei Geschwindigkeiten.',
        },
        socd: {
          title: 'SOCD: Regeln prüfen',
          body: 'Counter-Strike 2 lässt Funktionen wie Snap Tap/SOCD seit 2024 auf offiziellen Valve-Servern nicht zu, mehrere Ligen ebenfalls. Behalte für diese Spiele ein Profil ohne SOCD.',
        },
        bottomOut: {
          title: 'Du drückst ganz durch',
          body: (pct, a) =>
            `${pct} % deiner Anschläge gehen bis ganz nach unten. Mit einem Auslösepunkt bei ${a} mm kannst du dir einen leichteren Anschlag antrainieren: weniger Ermüdung, und die Tastatur kommt mit.`,
        },
        analog: {
          title: (c) => ({ linear: 'Lineare Kurve', progressive: 'Progressive Kurve', aggressive: 'Aggressive Kurve' })[c],
          body: 'Für den Gamepad-Modus (Rennspiele, feine Bewegungen): übernimm die empfohlene Kurve und die Totzonen ins Analogprofil.',
        },
      },
    },
    es: {
      groups: { space: 'Barra espaciadora', modifiers: 'Modificadores' },
      typing: {
        brushes: (n, p90, a, clears) =>
          `${n} ${s(n, 'roce involuntario medido', 'roces involuntarios medidos')}; el 90 % se queda por debajo de ${p90} mm. ${
            clears ? `A ${a} mm, ya no activan nada.` : `Un ajuste más profundo costaría más en reactividad de lo que ahorraría en errores.`
          }`,
        presses: (p5, bottomOutPct, a) =>
          `El 95 % de tus pulsaciones reales baja al menos hasta ${p5} mm${
            bottomOutPct !== null ? ` (llegas al fondo el ${bottomOutPct} % del tiempo)` : ''
          }: ningún riesgo de pulsación perdida a ${a} mm.`,
        resting: (mm) => `Tus dedos apoyados hunden las teclas hasta ${mm} mm: el punto de actuación queda más abajo, con margen.`,
        overrideDeeper: (n, restMm) =>
          `${n} ${s(n, 'contacto involuntario', 'contactos involuntarios')}${restMm ? `, ${restMm} mm de presión en reposo` : ''}: más profundo para evitar activaciones no deseadas.`,
        overrideLighter: 'Pulsaciones firmes y ningún contacto no deseado: puede ser más reactivo.',
        overrideFinger: (brushes, presses) =>
          `${brushes} ${s(brushes, 'roce', 'roces')} en ${presses} pulsaciones con este dedo: basta con un punto más profundo en sus teclas, sin frenar el resto.`,
        rtOn: (release, avoided) => `El RT (${release} mm) evitaría ${avoided} ${s(avoided, 'error', 'errores')} en tus datos (letras dobles perdidas).`,
        rtOff: (extraDoubles) =>
          `Al escribir, el Rapid Trigger no evita ningún error en tus datos${
            extraDoubles > 0 ? ` y añadiría hasta ${extraDoubles} ${s(extraDoubles, 'activación doble', 'activaciones dobles')}` : ''
          }. Guárdalo para el perfil de juego.`,
      },
      gaming: {
        rest: (restMm, a) =>
          `Dedos apoyados en WASD: hasta ${restMm} mm sin querer → actuación a ${a} mm, lo más alto posible sin movimientos no deseados.`,
        noRest: (a) => `Sin la prueba «Reposo», un valor prudente de ${a} mm. Juega ese nivel para afinarlo.`,
        hold: (wobble, release) =>
          `Al mantener, tu tecla oscila hasta ${wobble} mm: con una sensibilidad RT de ${release} mm nunca se soltará por error.`,
        fastTaps: (lift, press) =>
          `Tus pulsaciones más rápidas solo suben ${lift} mm: sensibilidad de pulsación reducida a ${press} mm para captarlas todas.`,
        lostTaps: (a, lost, taps, lift) =>
          `A ${a} mm sin Rapid Trigger, se perderían ${lost} de tus ${taps} pulsaciones rápidas: entre dos pulsaciones solo subes hasta ${lift} mm de media. El RT las capta todas.`,
        continuous: (moreTaps, earlierMs) =>
          `El RT continuo capta ${
            moreTaps > 0 ? `${moreTaps} ${s(moreTaps, 'pulsación', 'pulsaciones')} más` : `tus pulsaciones ${earlierMs} ms antes`
          }: actívalo.`,
        stops: (ms) => `Paradas: tu personaje se detiene ${ms} ms antes con RT que con un ajuste fijo de 1.5 mm.`,
        socdYes: (pct, overlapMs, gainMs) =>
          `En el ${pct} % de tus cambios de dirección, pulsas la tecla nueva antes de soltar la anterior (≈${overlapMs} ms). Un modo SOCD te haría ganar ≈${gainMs} ms por cambio.`,
        socdNo: (pct) => `Tus cambios de dirección son limpios (${pct} % de solapamiento): no necesitas SOCD.`,
      },
      scenarios: {
        current: 'Actual (estimado)',
        noRt: (mm) => `Sin RT · ${mm} mm`,
        rtContinuous: (release) => `RT ${release} continuo`,
        recommended: 'Recomendado',
      },
      analog: {
        progressive: (ratio) =>
          `Tu error es ${ratio}× mayor en el primer cuarto del recorrido de la tecla: una curva progresiva (más suave al principio) te dará más precisión a baja velocidad.`,
        aggressive: 'Te cuesta mantener los valores cerca del fondo: una curva más agresiva llega al 100 % antes.',
        linear: 'Tu precisión es homogénea en todo el recorrido de la tecla: una curva lineal es ideal.',
        inner: (mm) => `A menudo te pasas en los valores pequeños: zona muerta interior de ${mm} mm.`,
        outer: (mm) => `Cerca del fondo sueles quedarte por debajo del objetivo: zona muerta exterior de ${mm} mm para llegar al 100 % sin aplastar la tecla.`,
        lag: (ms, pct) => `Retardo de seguimiento medido: ${ms} ms; ${pct} % del tiempo a ±0.3 mm del objetivo.`,
      },
      curves: { linear: 'lineal', progressive: 'progresiva', aggressive: 'agresiva' },
      ideas: {
        tags: { typing: 'Escritura', gaming: 'Juego', layers: 'Capas', rules: 'Reglas', comfort: 'Comodidad', analog: 'Analógico' },
        space: {
          title: 'La barra espaciadora, aparte',
          body: 'Tus pulgares se apoyan en la barra espaciadora. Dale su propio punto de actuación (ajuste por tecla) en lugar de endurecer todo el teclado.',
        },
        shift: {
          title: 'Shift / Ctrl más profundos en juego',
          body: (restMm, mm) =>
            `Tu meñique descansa a ${restMm} mm sobre Shift/Ctrl. Pon estas teclas a ${mm} mm en el perfil de juego para no agacharte / caminar sin querer.`,
        },
        profiles: {
          title: 'Dos perfiles, un atajo',
          body: 'Ten un perfil de escritura (actuación más profunda, RT desactivado) y un perfil de juego (actuación alta, RT). Asigna un atajo con Fn para cambiar: lo mejor de ambos mundos.',
        },
        dks: {
          title: 'Dynamic Keystroke para caminar',
          body: 'En juegos sin entrada analógica, un DKS en W puede enviar «caminar» a media pulsación y «correr» al fondo: una sola tecla, dos velocidades.',
        },
        socd: {
          title: 'SOCD: revisa el reglamento',
          body: 'Desde 2024, Counter-Strike 2 rechaza las funciones tipo Snap Tap/SOCD en los servidores oficiales de Valve, y varias ligas también. Ten un perfil sin SOCD para esos juegos.',
        },
        bottomOut: {
          title: 'Llegas al fondo de la tecla',
          body: (pct, a) =>
            `El ${pct} % de tus pulsaciones llega hasta el fondo. Con un punto de actuación a ${a} mm, puedes entrenarte para teclear más suave: menos fatiga, y el teclado responde igual.`,
        },
        analog: {
          title: (c) => ({ linear: 'Curva lineal', progressive: 'Curva progresiva', aggressive: 'Curva agresiva' })[c],
          body: 'Para el modo mando (juegos de carreras, movimientos finos): aplica la curva y las zonas muertas recomendadas al perfil analógico.',
        },
      },
    },
  },
)
