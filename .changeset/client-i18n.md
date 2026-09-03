---
"@jmfederico/pi-web": minor
---

Localize the app shell frame: section headings, the actions button, the context bar and the empty states now go through a small `t()` layer whose keys are the English strings themselves, so a missing translation degrades to English. The locale follows the browser language and can be pinned in `localStorage` under `pi-web.locale`. Ships an `ru` catalogue; other locales are a catalogue away.
