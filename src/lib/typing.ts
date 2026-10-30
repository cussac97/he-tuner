// Word-by-word typing test logic, shared by the UI and the sample-session generator.

import type { TypingClass, TypingKey } from './types'

// Common French words, spelled properly. With "accents" off they are folded to ASCII.
const FR = `le de un à être et en avoir que pour dans ce il qui ne sur se pas plus pouvoir par je avec tout faire son mettre
autre on mais nous comme où si leur y dire elle devoir avant deux même prendre aussi celui donner bien fois vous encore
nouveau aller cela entre premier vouloir déjà grand mon me moins aucun lui temps très savoir falloir voir quelque sans raison
notre dont non an monde jour monsieur demander alors après trouver personne rendre part dernier venir pendant passer peu
suite bon comprendre depuis point ainsi heure rester seul cas jeune penser toujours mot femme homme droit main nom
vie place parler tenir porter pays coup chose moment question petit enfant sens reste lieu idée fin travail
partir ville terre eau fait maison porte table route nuit matin soir semaine mois année livre lettre papier histoire
musique image couleur rouge vert bleu blanc noir jaune froid chaud vite lent fort doux clair simple facile rapide clavier
touche doigt frappe écran souris bureau lampe chaise fenêtre jardin arbre fleur chemin pont train avion voiture
été là voilà père mère frère café école élève général réponse première dernière lumière rivière forêt tête fête rêve
côté hôtel île château théâtre numéro vérité société qualité réalité énergie étoile étude époque étrange préféré présent
prêt problème système modèle siècle règle pièce scène collège français façon ça leçon garçon reçu bientôt plutôt âge
même déjà être après très où à ça été`

const EN = `the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or an
will my one all would there their what so up out if about who get which go me when make can like time no just him know take
people into year your good some could them see other than then now look only come its over think also back after use two how
our work first well way even new want because any these give day most us great between need large under never same another
small every found still learn should world high every near add food between own below country plant last school father keep
tree never start city earth eye light thought head under story saw left few while along might close something seem next hard
open example begin life always those both paper together got group often run important until children side feet car mile night
walk white sea began grow took river four carry state once book hear stop without second later miss idea enough eat face watch
far indian real almost let above girl sometimes mountain cut young talk soon list song being leave family keyboard switch press`

export const WORDS = {
  fr: [...new Set(FR.split(/\s+/).filter(Boolean))],
  en: [...new Set(EN.split(/\s+/).filter(Boolean))],
}

export function stripAccents(w: string): string {
  return w.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function randomWords(lang: 'fr' | 'en', n: number, rnd: () => number = Math.random, accents = true): string[] {
  const list = WORDS[lang]
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    let w = list[Math.floor(rnd() * list.length)]
    if (out.length && w === out[out.length - 1]) w = list[Math.floor(rnd() * list.length)]
    out.push(accents ? w : stripAccents(w))
  }
  return out
}

/** Browsers only compose dead keys (^ then e → ê) when a text field has focus; our
 *  test listens to raw keydowns, so we compose ourselves. A letter typed right after a
 *  dead key becomes the expected accented letter when it is its base letter. */
export function composeDead(key: string, expected: string | null): string {
  if (key === ' ') return '^'
  if (key.normalize('NFD').length > 1) return key // the browser already composed it
  const k = key.toLowerCase()
  if (expected && expected !== k && expected.normalize('NFD')[0] === k) return expected
  return `${k}\u0302`.normalize('NFC') // best guess (circumflex): still wrong vs a plain letter
}

export class TypingEngine {
  wordIdx = 0
  typed = ''
  results: Array<{ word: string; typed: string }> = []
  keys: TypingKey[] = []
  timeline: Array<{ t: number; codes: string[] }> = []
  correct = 0
  wrong = 0

  constructor(
    public words: string[],
    private codeFor: (ch: string) => string | null,
    t0: number,
  ) {
    this.timeline.push({ t: t0, codes: this.lookahead() })
  }

  get target(): string {
    return this.words[this.wordIdx] ?? ''
  }

  private isCleanPrefix(): boolean {
    return this.target.startsWith(this.typed)
  }

  /** character expected at the caret, or null when the current word already has an error */
  expectedChar(): string | null {
    if (!this.isCleanPrefix()) return null
    return this.target[this.typed.length] ?? ' '
  }

  lookahead(n = 3): string[] {
    if (!this.isCleanPrefix()) return ['Backspace']
    const rest = this.target.slice(this.typed.length) + ' ' + (this.words[this.wordIdx + 1] ?? '')
    const codes: string[] = []
    for (const ch of rest.slice(0, n)) {
      const c = this.codeFor(ch)
      if (c) codes.push(c)
    }
    return codes
  }

  press(t: number, code: string, key: string, mod = false): TypingClass {
    const expectedCode = this.lookahead(1)[0] ?? null
    let cls: TypingClass
    if (key === 'Backspace') {
      cls = 'back'
      const prev = this.results[this.results.length - 1]
      if (!this.typed.length && prev && prev.typed !== prev.word) {
        // like monkeytype: step back into the previous word when it has mistakes
        this.results.pop()
        this.wordIdx--
        this.typed = mod ? '' : prev.typed
      } else this.typed = mod ? '' : this.typed.slice(0, -1)
    } else if (key === ' ') {
      if (!this.typed.length) cls = 'spaceEmpty'
      else {
        cls = 'space'
        this.results.push({ word: this.target, typed: this.typed })
        this.wordIdx++
        this.typed = ''
      }
    } else if (key.length === 1) {
      const ch = key.toLowerCase()
      const pos = this.typed.length
      if (pos >= this.target.length) cls = 'extra'
      else cls = ch === this.target[pos] ? 'correct' : 'wrong'
      if (cls === 'correct') this.correct++
      else this.wrong++
      this.typed += ch
    } else {
      cls = 'other'
    }
    this.keys.push({ t, code, key, cls, expectedCode })
    if (cls !== 'other') this.timeline.push({ t, codes: this.lookahead() })
    return cls
  }

  stats(elapsedMs: number) {
    const minutes = Math.max(elapsedMs, 1000) / 60000
    let good = 0
    let all = 0
    for (const r of this.results) {
      all += r.typed.length + 1
      if (r.typed === r.word) good += r.word.length + 1
    }
    const total = this.correct + this.wrong
    return {
      wpm: good / 5 / minutes,
      rawWpm: all / 5 / minutes,
      accuracy: total ? this.correct / total : 1,
    }
  }
}
