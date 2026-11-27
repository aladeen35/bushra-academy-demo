// Albushra Chinese Academy — everything that is specific to Mandarin. The shared kit (./kit) reads this config;
// the Korean and Japanese academies will provide their own file with the same shape.
import { charMap, isHan, markAll, matchReading, numToZh, toneOf, TONE_COLORS } from "./py.js";
import { esc } from "./kit/js/util.js";
import { lang } from "./kit/js/i18n.js";

let readings = null; // char → marked pinyin, built on first use from the vocabulary
const readingMap = (words) => (readings && readings.size ? readings : (readings = charMap(words || [])));
export function addReadings(list) { readingMap([]); for (const x of list) if (!readings.has(x.hz)) readings.set(x.hz, x.py); }

const toneChip = (syl) => { const t = toneOf(syl); return `<span class="tone-chip" style="background:${TONE_COLORS[t]}">${t || "·"}</span>`; };

export default {
  id: "chinese",
  langTag: "zh-Hans",
  readingLang: "zh-Latn-pinyin",
  nativeName: "中文",
  heroGlyph: "学中文",
  name: { ar: "أكاديمية البشرى للصينية", en: "Albushra Chinese Academy" },
  short: { ar: "الصينية", en: "Chinese" },
  tagline: { ar: "تعلّم الماندرين من الصفر: النطق والنغمات والحروف والمحادثة، بشرح عربي ومعلّم ذكي.", en: "Learn Mandarin from zero: pronunciation, tones, characters and conversation — explained in Arabic, with an AI tutor." },
  fields: { term: "hz", reading: "py" },
  speech: {
    lang: "zh-CN", voicePrefix: "zh",
    // Compare Han characters only; numbers the recognizer writes as digits become Chinese numerals.
    normalize: (s) => String(s).replace(/\d+/g, (n) => numToZh(n)).replace(/[^\p{Script=Han}a-z]/giu, "").toLowerCase(),
  },
  vocabCategories: ["greetings", "introductions", "numbers", "family", "food", "colors", "shopping", "time", "places", "transport", "work-study", "daily", "feelings", "travel"],
  contentFiles: ["course.json", "pinyin.json", "hanzi.json", "grammar.json", "dialogues.json", ...["greetings", "introductions", "numbers", "family", "food", "colors", "shopping", "time", "places", "transport", "work-study", "daily", "feelings", "travel"].map((c) => `vocab/${c}.json`)],
  levelName: (n) => `HSK ${n}`,
  inputHint: { ar: "اكتب بالحروف الصينية (فعّل لوحة مفاتيح «الصينية — بينيين» في هاتفك).", en: "Type in Chinese characters (enable a Chinese Pinyin keyboard)." },
  dictationHint: { ar: "اكتب البينيين: ni3 hao3 أو nǐ hǎo أو ni hao، أو الحروف", en: "Type pinyin: ni3 hao3, nǐ hǎo or ni hao — or characters" },
  matchReading,

  dict: {
    m_pinyin: ["البينيين والنغمات", "Pinyin & tones"], m_hanzi: ["الحروف الصينية", "Hanzi characters"],
    tones: ["النغمات", "Tones"], initials: ["الحروف الأولى", "Initials"], finals: ["الحروف الأخيرة", "Finals"], rules: ["القواعد", "Rules"],
    intro: ["مدخل", "Introduction"], drill: ["تمييز النغمات", "Tone drill"], whichTone: ["أي نغمة سمعت؟", "Which tone did you hear?"],
    toneN: ["النغمة {n}", "Tone {n}"], neutral: ["خفيفة", "Neutral"], whichSound: ["أي صوت تسمع في البداية؟", "Which initial do you hear?"],
    whichFinal: ["أي نهاية تسمع؟", "Which final do you hear?"], arHint: ["للناطق بالعربية", "For Arabic speakers"],
    strokes: ["الخطوط", "Strokes"], strokeOrder: ["ترتيب الخطوط", "Stroke order"], radicals: ["الجذور", "Radicals"], chars: ["الحروف", "Characters"],
    animate: ["شاهد الكتابة", "Animate"], practiceWrite: ["تدرّب على الكتابة", "Practise writing"], strokesN: ["{n} خطوط", "{n} strokes"],
    writeDone: ["أحسنت! كتبت الحرف.", "Well done! Character written."], writerOff: ["تعذّر تحميل بيانات ترتيب الخطوط (تحتاج اتصالًا بالإنترنت).", "Couldn't load stroke data (needs internet)."],
    radicalMeaning: ["ما معنى هذا الجذر؟", "What does this radical mean?"], strokeName: ["ما اسم هذا الخط؟", "What is this stroke called?"],
    sandhiTip: ["تنبيه تغيّر النغمة", "Tone-change alert"], toneMap: ["خريطة النغمات", "Tone map"],
    t3t3: ["نغمتان ثالثتان متتاليتان: تُنطق الأولى بالنغمة الثانية ({a} ← {b}).", "Two third tones in a row: say the first as a second tone ({a} → {b})."],
    buTip: ["«不» قبل نغمة رابعة يُنطق bú.", "不 before a fourth tone is said bú."],
    yiTip: ["«一» يُنطق yí قبل الرابعة، وyì قبل الأولى والثانية والثالثة، وyī وحده أو في العدّ.", "一 is yí before tone 4, yì before tones 1–3, yī alone or when counting."],
    hanziOf: ["حروف الكلمة", "Characters in this word"],
  },

  modules: [
    { id: "pinyin", icon: "tone", title: { ar: "البينيين والنغمات", en: "Pinyin & tones" }, load: () => import("./modules/pinyin.js") },
    { id: "hanzi", icon: "write", title: { ar: "الحروف الصينية", en: "Hanzi" }, load: () => import("./modules/hanzi.js") },
  ],

  levels: [
    { id: "foundations", badge: { ar: "الوحدة A", en: "Unit A" }, title: { ar: "أساسيات الصينية", en: "Chinese foundations" },
      desc: { ar: "تمييز النغمات، أصوات البينيين، وأول الحروف.", en: "Tone recognition, pinyin sounds and first characters." },
      filter: (w) => w.hsk === 1 && [...w.hz].length <= 2, recipe: { meaning: 4, listen: 4, term: 2 },
      extra: async () => (await import("./modules/pinyin.js")).toneQuestions(8) },
    { id: "hsk1", badge: { ar: "HSK 1", en: "HSK 1" }, title: { ar: "المستوى الأول (HSK 1)", en: "Level 1 (HSK 1)" },
      desc: { ar: "مفردات HSK 1، القواعد الأساسية، ومحادثات المستوى الأول.", en: "HSK 1 vocabulary, core grammar and level-1 conversations." },
      filter: (w) => w.hsk === 1, grammarLevel: 1, dialogueLevel: 1, recipe: { meaning: 6, term: 4, listen: 4, dictation: 2, grammar: 6, dialogue: 3 } },
    { id: "hsk2", badge: { ar: "HSK 2", en: "HSK 2" }, title: { ar: "المستوى الثاني (HSK 2)", en: "Level 2 (HSK 2)" },
      desc: { ar: "مفردات حتى HSK 2، أدوات الربط والأنماط، ومحادثات المستوى الثاني.", en: "Vocabulary up to HSK 2, connectors and patterns, level-2 conversations." },
      filter: (w) => w.hsk <= 2, grammarLevel: 2, dialogueLevel: 2, recipe: { meaning: 6, term: 4, listen: 5, dictation: 3, grammar: 8, dialogue: 4 } },
  ],

  studioExamples: [
    { text: "你好", label: { ar: "مرحبًا", en: "hello" } }, { text: "谢谢", label: { ar: "شكرًا", en: "thanks" } },
    { text: "妈", label: { ar: "النغمة ١", en: "tone 1" } }, { text: "麻", label: { ar: "النغمة ٢", en: "tone 2" } },
    { text: "马", label: { ar: "النغمة ٣", en: "tone 3" } }, { text: "骂", label: { ar: "النغمة ٤", en: "tone 4" } },
    { text: "我叫阿里。", label: { ar: "جملة", en: "sentence" } }, { text: "知道", label: { ar: "zh و d", en: "zh & d" } },
  ],

  // Reading for free text in the studio: per character from the content's pinyin.
  readingFor(text, words) { const m = readingMap(words); return [...text].filter(isHan).map((c) => m.get(c) || "·").join(" "); },
  breakdown(text, words) {
    const w = words && [...words.values()].find((x) => x.hz === text);
    const chars = [...text].filter(isHan);
    const syl = w ? markAll(w.pyn) : chars.map((c) => readingMap(words).get(c) || "");
    return chars.map((c, i) => ({ text: c, label: syl[i] || "" }));
  },
  searchExtra: (w) => w.pyn,

  pronTips(text, item, words) {
    const parts = this.breakdown(text, words);
    if (!parts.length) return "";
    const tips = [];
    for (let i = 0; i < parts.length - 1; i++) {
      const a = parts[i], b = parts[i + 1];
      if (toneOf(a.label) === 3 && toneOf(b.label) === 3) tips.push(this._t("t3t3", { a: a.label, b: a.label.normalize("NFD").replace("̌", "́").normalize("NFC") }));
      if (a.text === "不" && toneOf(b.label) === 4) tips.push(this._t("buTip"));
      if (a.text === "一" && b.label) tips.push(this._t("yiTip"));
    }
    return `<h2 class="h2">${this._t("toneMap")}</h2><div class="syllables">${parts.map((p) => `<span class="syl" style="cursor:default"><span class="tl" lang="zh-Hans">${esc(p.text)}</span>${toneChip(p.label)}<span class="reading">${esc(p.label)}</span></span>`).join("")}</div>
      ${tips.length ? `<div class="notice" style="margin-top:12px"><b>${this._t("sandhiTip")}</b><ul style="margin:6px 0 0">${[...new Set(tips)].map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}`;
  },
  _t(k, vars) { let s = this.dict[k][lang() === "ar" ? 0 : 1]; for (const [a, b] of Object.entries(vars || {})) s = s.replaceAll(`{${a}}`, b); return s; },

  // Word sheet: links to stroke order for each character.
  wordExtra(w) {
    const chars = [...w.hz].filter(isHan);
    return `<h4>${this._t("hanziOf")}</h4><div class="char-grid">${chars.map((c) => `<a class="btn ghost" href="#/m/hanzi/char/${encodeURIComponent(c)}"><span class="tl" lang="zh-Hans" style="font-size:1.6rem">${esc(c)}</span></a>`).join("")}</div>`;
  },
  // Studio clip: stroke-order animation for short texts (Hanzi Writer).
  clipWriter(el, text) {
    const chars = [...text].filter(isHan);
    if (!chars.length || chars.length > 2) return null;
    return { start: async () => { const h = await import("./modules/hanzi.js"); h.animateChars(el, chars); } };
  },

  tutor: {
    system: `You are the Albushra Chinese Academy tutor: an expert, patient teacher of Standard Mandarin (普通话, Simplified characters) for Arabic-speaking beginners (HSK 1–3).
- Always write Chinese in Simplified characters followed by pinyin with tone marks, then the Arabic meaning, e.g. 你好 (nǐ hǎo) — مرحبًا.
- Explain grammar in Arabic, comparing with Arabic structure when helpful (e.g. adjectives need no 是, like Arabic nominal sentences).
- When correcting, mention tones and tone sandhi (3-3, 不, 一) where relevant; describe tongue position for zh/ch/sh/r/j/q/x and ü.
- Keep to HSK 1–2 vocabulary unless the learner asks for more; mark harder words.
- Distinguish 您 vs 你 and polite vs casual forms.`,
  },
};
