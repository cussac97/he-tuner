# HE Tuner

**Find the right actuation point, Rapid Trigger and SOCD settings for your Wooting Hall-effect keyboard, measured on your own keystrokes.**

HE Tuner reads the raw analog travel of every key while you play six short tests (about two minutes). It then replays your recorded keystrokes through a model of the keyboard's actuation logic, once per candidate setting, and recommends the values that remove stray characters and missed presses without slowing you down. You get a typing profile, a gaming profile and an analog curve, with the evidence behind each number.

### ▶ Try it: **https://cussac97.github.io/he-tuner/**

Open it in **Chrome, Edge, Arc or Brave**, plug in your Wooting, click **Connect**. No keyboard at hand? Click **Demo** to get simulated analog data from any keyboard, or **See an example** to explore a generated session.

> Available in **English, French, German and Spanish** (globe menu, top right). The typing test uses words in the same language, accents included.

---

## Run it locally

```bash
git clone https://github.com/cussac97/he-tuner.git
cd he-tuner
npm install
npm run dev
```

Then open http://localhost:5173 in a Chromium-based browser.

- **Requirements:** Node.js 18+, and a Chromium browser for keyboard access (WebHID). Safari and Firefox can only run the demo mode.
- **macOS / Windows / Linux:** WebHID needs no driver. On Linux you may need a udev rule granting access to the Wooting hidraw device.
- **Wootility can stay open.** HE Tuner only reads the analog interface.

## What it does

| | |
|---|---|
| **Reads the keyboard** | WebHID on the official Wooting analog interface: protocol V2 (`0xFF53`, 10-bit values, up to 8 kHz, plus the keyboard's own *actuated* bit) and V1 (`0xFF54`). The format follows [wooting-analog-sdk](https://github.com/WootingKb/wooting-analog-sdk). |
| **Six tests** | Typing (Monkeytype-style, words in English, French, German or Spanish, accents and dead keys supported), resting fingers, fast repeat, hold stability, counter-strafe, analog control. They run back to back like levels in a game. |
| **Labels every key movement** | Intended press, brush of a neighbouring key, resting finger, too-light press, stray character. The ground truth comes from the expected text. |
| **Replays the data under other settings** | Fixed actuation, Rapid Trigger (separate press/release), continuous RT, SOCD (last input / deeper wins). Each candidate setting is scored on your own keystrokes. |
| **Reads your current settings** | Your current actuation point and Rapid Trigger state, read from the keyboard (protocol V2) or inferred from the timing of the keydowns. |
| **Recommends** | A typing profile, a gaming profile and an analog curve, with a checklist to apply in Wootility. |
| **Stays local** | Data lives in your browser (IndexedDB). Nothing is sent anywhere. |

## How it works

```
WebHID reports ─► recorder (per-key step functions, mm)
                      │
   keyboard events ───┤  exercises clip a time window + metadata
                      ▼
               analysis/typing.ts     label each excursion (intended / brush / rest / missed…)
               analysis/exercises.ts  rest, repeat taps, hold drawdown, strafe transitions, analog error
               analysis/core.ts       actuation state machine (fixed / RT / continuous / SOCD)
               analysis/recommend.ts  grid-search candidate settings on the recorded data
```

- `src/lib/hid.ts` — WebHID connection and report decoding
- `src/games/` — the six levels and the level runner (intro → countdown → play → score)
- `src/lib/demo.ts` — demo source: turns ordinary key presses into plausible analog traces
- `src/lib/sample.ts` — generates a full example session from a model typist. It doubles as a regression fixture.
- `src/i18n/` — interface text, one namespace file per area, each holding the four languages side by side

### Scripts

| Command | |
|---|---|
| `npm run dev` | dev server, plus a local archive (see below) |
| `npm run build` | typecheck + production build |
| `npm run check` | runs the whole analysis on a generated session, plus decoding, dead-key and word-list tests |
| `npm run analyze` | re-runs the analysis on your archived real recordings |

### Local archive

While the app runs with `npm run dev`, every exercise you record is also written as JSON to `./data/` (git-ignored), together with every recommendation shown and the notes you type. `npm run analyze` replays the analysis on it, run by run. This makes before/after comparisons easy. The hosted demo has no archive.

## Supported keyboards

- **Tested:** Wooting 60HE v2 (ISO, macOS, Chrome).
- **Expected to work:** any Wooting that exposes the analog interface (80HE, 60HE / 60HE+, Two HE, UwU…). Please open an issue with your model and the output of the **HID diagnostic** panel (Visualizer page) whether it works or not.

## Status and known limitations

This is an early version. Real-world data from a first user already showed where the recommendation engine needs work:

- **It reads the keyboard but never writes its configuration.** Wootility's configuration protocol is not public, so you apply the values by hand.
- **Mis-aimed presses vs brushes.** Deep presses on the wrong key are sometimes counted as "brushes" that a deeper actuation could prevent. This led to over-deep per-key overrides.
- **Per-key overrides need more evidence.** Today one or two events can trigger an override. They should shrink toward the global value.
- **"Missed press" detection is too loose.** A thumb grazing the space bar can be read as a light press.
- **Hold test.** When the key is held fully bottomed out, the sensor is saturated, so it says nothing about Rapid Trigger safety at partial depth.
- **Strafe delays** are measured from a 0.3 mm threshold, so very low actuations show 0 ms.
- **Recommendations should show a comfort range,** not a single value, when the data cannot tell settings apart.

## Contributing

Issues and PRs are welcome, especially:
- recordings from other Wooting models: export them from **Data → Export all**, after checking the file is fine to share;
- fixes for the limitations above (run `npm run check` before submitting);
- new languages: add a block to each namespace file in `src/i18n/` (TypeScript lists every missing string) and a word list in `src/lib/typing.ts`.

## Disclaimer

HE Tuner is an independent community project. It is not affiliated with or endorsed by Wooting. Use the recommendations as a starting point and trust your own feel.

## License

[MIT](LICENSE)

---

## 🇫🇷 En bref

HE Tuner lit la course analogique de chaque touche de ton Wooting pendant six tests courts (frappe, repos, spam, maintien, strafe, analogique). Il rejoue ensuite tes frappes avec des centaines de réglages possibles pour te recommander un point d'actuation, un Rapid Trigger et un SOCD adaptés à tes doigts.

- **Essayer :** https://cussac97.github.io/he-tuner/ (Chrome, Edge, Arc ou Brave). L'interface s'ouvre en anglais : choisis **Français** dans le menu 🌐 en haut à droite, puis « Connecter », ou « Démo » sans clavier.
- **En local :**

  ```bash
  git clone https://github.com/cussac97/he-tuner.git && cd he-tuner && npm install && npm run dev
  ```

Tout reste dans ton navigateur. L'outil lit le clavier mais n'écrit rien dedans : les valeurs s'appliquent dans Wootility.
