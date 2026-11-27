# Albushra Academies — أكاديميات البشرى للغات

Independent AI-assisted language academies of Albushra Technology, built on one shared foundation and the
design system of **Albushra Literature** (`../literature`, which stays separate and unchanged).

| Academy | Folder | Domain | Status |
|---|---|---|---|
| Chinese (Mandarin) | `chinese/` | `chinese.albushra.app` | built (phase 2) |
| Korean | `korean/` | `korean.albushra.app` | next: Hangul + pronunciation first |
| Japanese | `japanese/` | `japanese.albushra.app` | after Korean: kana, then N5 kanji |

Each academy is its **own app**: own subdomain, PWA, home and dashboard, curriculum, content files,
vocabulary, exercises, tests/certificates, AI tutor persona, pronunciation studio and admin permissions.
Progress is stored per academy (`ac.<id>.*` on the device, `ac_progress/<id>__<uid>` in Firestore) and is never merged.

## Structure
```
kit/                      shared foundation (single source of truth — edit here, never in <academy>/kit)
  css/base.css            Albushra Literature design system (deep red, black, ivory, gold; RTL/LTR; light/dark)
  css/academy.css         language-learning components (ruby readings, exercises, studio, dialogues, certificate)
  js/app.js               router + shell; start(config)
  js/ctx.js               the running academy's config (kit code never names a language)
  js/i18n.js              Arabic/English UI strings (academies add their own)
  js/fb.js, firebase-config.js   optional Firebase: one shared project, accounts, sync, CMS, media queue, AI (Gemini via AI Logic)
  js/store.js             per-academy learner state, spaced repetition, XP/goal/streak, certificates
  js/speech.js            device TTS (voices, female/male when known, slow/normal), speech recognition, record & compare
  js/practice.js          exercise engine: meaning, term, listen, match, order, translate, dictation, speak, mcq, tone
  js/data.js              content loader with editor overrides
  js/ecosystem.js         list of academies (switch-academy links)
  js/views/*.js           home (dashboard), path, lesson, vocab, grammar, dialogues, studio, tutor, tests, cert, profile, admin, search
<academy>/
  index.html, manifest.webmanifest, sw.js, privacy.html, assets/
  academy.js              everything language-specific: fonts, fields, speech locale, levels, tutor persona, studio hooks
  modules/*.js            language-only screens (Chinese: pinyin.js, hanzi.js)
  content/                course.json, grammar.json, dialogues.json, vocab/<category>.json (+ pinyin.json, hanzi.json)
  kit/                    synced copy of ../kit (each subdomain serves its own files)
tools/sync-kit.mjs        copy kit into every academy (CI runs --check)
tools/check-content.mjs   content validation (CI)
tools/make-brand.mjs      logo + icons per academy
tests/smoke.cjs           390×844 smoke test, Arabic + English (CI)
firestore.rules           rules for the shared academies Firebase project
docs/OWNER-STEPS-AR.md    console steps for the owner (Arabic)
```

## Adding an academy (no rebuild of the others)
1. `mkdir academies/<id>` with `index.html` (copy Chinese, change fonts/colors/title), `manifest.webmanifest`, `sw.js`, `privacy.html`.
2. `academy.js` with the same shape as `chinese/academy.js` (fields, speech locale, levels, tutor prompt, modules).
3. Content in `content/` following the Chinese schema; `node academies/tools/check-content.mjs`.
4. `node academies/tools/make-brand.mjs <id>`, `node academies/tools/sync-kit.mjs`.
5. Add it to `kit/js/ecosystem.js` and to the albushra.app registry (`test/albushra-app/registry/apps.json`).

## Pronunciation: audio vs video
Audio is always immediate (device voices, two speeds, syllable breakdown, recording, recognition scoring).
Video is a separate, cached library: `ac_media/<academy>__<sha>` holds one record per text. Learners queue requests;
an editor (or, later, a Cloud Function worker) generates the clip with a video provider, reviews it and approves it with
a URL; every learner then reuses the same approved video. A missing/failed video never blocks audio. The studio also
plays a live animated clip (stroke order + slow / syllables / normal) generated in the browser.

## Local preview
`cd academies && python3 -m http.server 8765` → http://localhost:8765/chinese/
