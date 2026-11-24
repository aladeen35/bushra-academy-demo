# Albushra Literature — البشرى للأدب

Learn English Through Literature. A bilingual (Arabic RTL / English LTR) reading and language-learning web app,
part of the Albushra Technology ecosystem. Target domain: `literature.albushra.app`.

**No build step.** Vanilla ES modules, served as static files. The app works fully offline-first without a backend;
Firebase (optional) adds accounts and sync, the content CMS, and the AI tutor.

## Structure
```
index.html, manifest.webmanifest, sw.js   PWA shell (scope: this folder)
css/app.css                               design system (light / sepia / dark, RTL/LTR)
js/app.js                                 router + navigation
js/i18n.js                                Arabic/English dictionaries, rights statuses, production stages
js/data.js                                content access: static /content + Firestore overrides (lit_* collections)
js/store.js                               learner state (device first, synced to lit_users/{uid})
js/fb.js, js/firebase-config.js           optional Firebase layer (SDK 13.1.0 from gstatic)
js/audio.js                               narration & pronunciation (Web Speech API, en-GB/en-US, 0.75–1.25×)
js/lookup.js                              vocabulary panel (curated dictionary → Free Dictionary API fallback)
js/importer.js                            plain-text novel importer (shared by CMS and tools/)
js/views/*.js                             home, library, book, reader, study, quiz, vocab, grammar, learning, tutor, placement, profile, admin
content/                                  books, chapters, translations, study packs, vocabulary — see content/SCHEMA.md
tools/import-gutenberg.mjs                node tools/import-gutenberg.mjs <slug> <pg.txt>
tools/build-index.mjs                     regenerate content/books/*/index.json after adding static files
tools/ar-merge.mjs                        assemble + validate a chapter translation from per-section work files
tools/drop-captions.mjs                   find/remove illustration captions left in plain-text editions (ids kept stable)
content/TRANSLATION-GUIDE.md              rules and name glossaries for Arabic translators
firestore.rules                           security rules for the lit_* collections
docs/OWNER-STEPS-AR.md                    console steps for the owner (Arabic)
```

## Adding a book
Either in the app (Content management → Add book → import text), or statically: add the slug to
`content/catalog.json`, create `content/books/<slug>/book.json` (with a `rights` record), import chapters, then run
`node tools/build-index.mjs`. Nothing in the code refers to a specific book.

## Rights
Full text is shown only when `rights.status` is `public-domain-verified` or `licensed` and `text` is not `none`;
`firestore.rules` enforces the same rule server-side. *Things Fall Apart* is in copyright and ships as original
study material only (summaries, analysis, vocabulary, exercises) — no text from the novel.

## Local preview
Serve the repository root (`python3 -m http.server`) and open `/literature/`.
