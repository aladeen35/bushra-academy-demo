// Pinyin helpers: numbered ↔ tone-marked conversion, tone extraction, per-character readings, dictation matching.
const MARKS = { a: "āáǎà", e: "ēéěè", i: "īíǐì", o: "ōóǒò", u: "ūúǔù", ü: "ǖǘǚǜ" };
const HAN = /\p{Script=Han}/u;
export const isHan = (c) => HAN.test(c);

// "nv3" / "lü4" / "zhong1" → marked syllable. Tone 5/0 = neutral (no mark).
export function mark(syl) {
  const m = String(syl).toLowerCase().match(/^([a-züv]+)([0-5])?$/);
  if (!m) return syl;
  let s = m[1].replace(/v/g, "ü");
  const tone = +(m[2] || 5);
  if (tone < 1 || tone > 4) return s;
  // Rule: a or e takes the mark; in "ou" the o; otherwise the last vowel.
  let idx = s.search(/[ae]/);
  if (idx < 0) idx = s.indexOf("ou");
  if (idx < 0) { for (let i = s.length - 1; i >= 0; i--) if ("iouü".includes(s[i])) { idx = i; break; } }
  if (idx < 0) return s;
  return s.slice(0, idx) + MARKS[s[idx]][tone - 1] + s.slice(idx + 1);
}
export const markAll = (pyn) => String(pyn).split(/\s+/).filter(Boolean).map(mark);

// Tone number of a marked syllable (0 = neutral).
export function toneOf(syl) {
  for (const [, set] of Object.entries(MARKS)) for (let k = 0; k < 4; k++) if (syl.includes(set[k])) return k + 1;
  return 0;
}
export const stripTones = (s) => String(s).normalize("NFD").replace(/[̀́̄̌]/g, "").normalize("NFC");

// Character → reading map built from content (vocabulary pyn, starter characters, tone sets).
export function charMap(words, extra = []) {
  const m = new Map();
  const add = (c, r) => { if (isHan(c) && r && !m.has(c)) m.set(c, r); };
  for (const w of words.values ? words.values() : words) {
    const chars = [...(w.hz || "")].filter(isHan);
    const syl = String(w.pyn || "").split(/\s+/);
    if (chars.length === syl.length) chars.forEach((c, i) => add(c, mark(syl[i])));
  }
  for (const x of extra) add(x.hz, x.py);
  return m;
}

// Dictation: accept characters, toneless pinyin, numbered pinyin, or marked pinyin (tones checked when typed).
export function matchReading(input, w) {
  const target = String(w.py || "").toLowerCase().replace(/[\s'’-]/g, "");
  let v = String(input || "").trim().toLowerCase().replace(/v/g, "ü");
  if (!v) return false;
  if ([...v].some(isHan)) return v.replace(/[\s\p{P}]/gu, "") === String(w.hz).replace(/[\s\p{P}]/gu, "");
  if (/\d/.test(v)) v = v.replace(/([a-zü]+)([0-5])/g, (_, s, n) => mark(s + n));
  v = v.replace(/[\s'’-]/g, "");
  const typedTones = stripTones(v) !== v;
  return typedTones ? v.normalize("NFC") === target.normalize("NFC") : v === stripTones(target);
}

// Arabic digits → Chinese numerals (0–99) so speech recognition output "2" matches 二.
const D = "零一二三四五六七八九";
export function numToZh(n) {
  n = +n;
  if (n < 10) return D[n];
  if (n < 20) return "十" + (n % 10 ? D[n % 10] : "");
  if (n < 100) return D[Math.floor(n / 10)] + "十" + (n % 10 ? D[n % 10] : "");
  return String(n).split("").map((d) => D[+d]).join("");
}

export const TONE_COLORS = ["#8a817c", "#c0392b", "#d68910", "#1e8449", "#2e5fa8"]; // neutral, 1, 2, 3, 4
