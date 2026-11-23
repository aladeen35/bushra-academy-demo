# Albushra Literature — content schema

All learner-facing content is data. The app never hardcodes a book; it reads `catalog.json` and the files below.

```
content/
  catalog.json                      list of book slugs in display order
  books/<slug>/book.json            metadata, rights record, chapter index pointer
  books/<slug>/about.json           author profile, historical context, themes, characters, objectives
  books/<slug>/chapters/index.json  chapter list (n, title, part, words, sections)   ← only when text is authorized
  books/<slug>/chapters/NN.json     original English, sections → paragraphs {id, en, src}
  books/<slug>/ar/NN.json           Arabic translation, keyed by paragraph id, with review status
  books/<slug>/study/NN.json        chapter study pack: summary, objectives, vocab ids, grammar, culture notes, quiz
  vocab/<slug>.json                 dictionary entries used by the book
```

Bilingual text is always `{ "en": "...", "ar": "..." }`.

## ar/NN.json
```json
{ "chapter": 1, "translator": "AI draft", "status": "draft", "paragraphs": { "p1": "…", "p2": "…" } }
```
`status`: `draft` (AI or unreviewed) · `reviewed` · `approved`. The reader shows a badge until `approved`.
Every paragraph id of the chapter must be present, in the same meaning and order; nothing summarized or skipped.

## study/NN.json
```json
{
  "chapter": 1,
  "summary": {"en": "", "ar": ""},
  "objectives": [{"en": "", "ar": ""}],
  "vocab": ["word-id", "..."],
  "grammar": [{
    "id": "je-1-past-perfect", "topic": "tenses|sentence|passive|conditional|reported|prepositions|conjunctions|complex|punctuation|descriptive",
    "level": "B1",
    "title": {"en": "", "ar": ""},
    "explain": {"en": "", "ar": ""},
    "example": {"en": "exact sentence copied from the chapter (or an original sentence when the text is not authorized)", "ar": "", "ref": "p12"},
    "exercise": {"q": {"en": "", "ar": ""}, "options": ["", "", ""], "answer": 0, "why": {"en": "", "ar": ""}}
  }],
  "culture": [{"term": "", "en": "", "ar": ""}],
  "quiz": [{
    "type": "vocab|comprehension|grammar|translation|context",
    "q": {"en": "", "ar": ""}, "options": ["", "", "", ""], "answer": 0,
    "explain": {"en": "", "ar": ""}, "ref": "p5"
  }]
}
```
`ref` points at a paragraph id when the chapter text is in the app; omit it otherwise.

## vocab/<slug>.json
```json
[{
  "id": "courage", "word": "courage", "forms": ["courageous"],
  "ar": "الشجاعة", "ipa": "/ˈkʌr.ɪdʒ/", "pos": "noun",
  "def": "The ability to face danger or difficulty without fear.",
  "arExplain": "شرح عربي قصير",
  "example": "He showed great courage.", "exampleAr": "أظهر شجاعة كبيرة.", "exampleRef": "1:p3",
  "synonyms": ["bravery"], "antonyms": ["cowardice"],
  "level": "B1",
  "category": "beginner|intermediate|advanced|literary|idiom|phrasal|cultural|historical|nautical|political"
}]
```
`exampleRef` = `<chapter>:<paragraph id>` when the example is quoted from the book; `null` for an original example.
`forms` lists inflections/derivations that should open this entry when tapped in the reader.

## about.json
```json
{
  "author": {"name": "", "born": 1816, "died": 1855, "bio": {"en": "", "ar": ""}},
  "context": {"en": "", "ar": ""},
  "themes": [{"en": "", "ar": ""}],
  "characters": [{"name": "", "en": "", "ar": ""}],
  "objectives": [{"en": "", "ar": ""}]
}
```
