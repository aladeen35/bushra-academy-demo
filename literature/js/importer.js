// Plain-text novel importer shared by the admin CMS (browser) and tools/import-gutenberg.mjs (Node).
// Keeps paragraph order and chapter sequence exactly; every paragraph keeps its source line number.
const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100 };
const roman = (s) => [...s].reduce((acc, ch, i, a) => (ROMAN[ch] < (ROMAN[a[i + 1]] || 0) ? acc - ROMAN[ch] : acc + ROMAN[ch]), 0);
const WORDS = (t) => t.split(/\s+/).filter(Boolean).length;
export const SECTION_WORDS = 650;

export function parseNovel(raw) {
  const lines = raw.replace(/\r/g, "").split("\n");
  let start = lines.findIndex((l) => l.startsWith("*** START OF"));
  let end = lines.findIndex((l) => l.startsWith("*** END OF"));
  if (start < 0) start = -1;
  if (end < 0) end = lines.length;
  const body = lines.slice(start + 1, end);
  const offset = start + 2;
  const corrections = [];

  function headingAt(i) {
    const l = body[i].trim();
    let m;
    if ((m = /^CHAPTER ([IVXLC]+|\d+)\.?(?:\s*[—-]\s*(.+))?$/i.exec(l))) {
      const n = /\d/.test(m[1]) ? +m[1] : roman(m[1].toUpperCase());
      if (m[2]) return { n, title: m[2].trim(), skip: 1 };
      let j = i + 1; while (j < body.length && !body[j].trim()) j++;
      const next = body[j]?.trim() || "";
      const sub = next.length < 80 && !/[.”",;]$/.test(next) && !/^CHAPTER/i.test(next) && body[j + 1] !== undefined && !body[j + 1].trim() ? next : "";
      return { n, title: sub, skip: sub ? j - i + 1 : 1 };
    }
    // A roman numeral alone between blank lines, followed by a one-line title (Treasure Island layout).
    if ((m = /^([IVXL]+)$/.exec(l)) && !body[i - 1]?.trim() && !body[i - 2]?.trim() && body[i + 1]?.trim() && !body[i + 2]?.trim()) {
      return { n: roman(m[1]), title: body[i + 1].trim(), skip: 2, loose: true };
    }
    return null;
  }

  const chapters = [];
  let cur = null, para = [], paraLine = 0, part = "";
  const flush = () => {
    if (cur && para.length) {
      const text = para.join(" ").replace(/[ \t]*\n[ \t]*/g, "\n").replace(/[ \t]+/g, " ").replace(/--/g, "—").trim();
      if (text) cur.paras.push({ text, line: paraLine });
    }
    para = [];
  };
  for (let i = 0; i < body.length; i++) {
    const rawLine = body[i];
    const t = rawLine.trim();
    const pm = /^PART ([A-Z]+)--(.+)$/.exec(t);
    if (pm) { flush(); part = pm[2].trim(); continue; }
    const h = headingAt(i);
    if (h && (!cur || h.n === cur.n + 1 || (h.loose && h.n !== cur.n))) {
      flush();
      if (cur && h.n !== cur.n + 1) { corrections.push(`source line ${i + offset}: heading numeral ${h.n} corrected to ${cur.n + 1}`); h.n = cur.n + 1; }
      cur = { n: h.n, title: h.title.replace(/--/g, "—"), part, paras: [] };
      chapters.push(cur);
      i += h.skip - 1;
      continue;
    }
    if (!cur) continue;
    if (!t) { flush(); continue; }
    if (/^\[Illustration/.test(t)) { flush(); while (i < body.length && !body[i].includes("]")) i++; continue; }
    if (!para.length) paraLine = i + offset;
    para.push(/^ {6,}/.test(rawLine) && para.length ? "\n" + t : t);
  }
  flush();
  const last = chapters.at(-1);
  while (last && /^(THE END|FINIS)\.?$/i.test(last.paras.at(-1)?.text || "")) last.paras.pop();

  return {
    corrections,
    chapters: chapters.map((ch) => {
      const sections = [];
      let s = null, words = 0;
      ch.paras.forEach((p, k) => {
        if (!s || words >= SECTION_WORDS) { s = { id: `s${sections.length + 1}`, paragraphs: [] }; sections.push(s); words = 0; }
        s.paragraphs.push({ id: `p${k + 1}`, en: p.text.replace(/ ?\n ?/g, "\n"), src: p.line });
        words += WORDS(p.text);
      });
      return { n: ch.n, title: ch.title, part: ch.part, words: ch.paras.reduce((a, p) => a + WORDS(p.text), 0), sections };
    }),
  };
}

// Splits pasted text of ONE chapter into sections/paragraphs (blank line = new paragraph).
export function parseChapterText(text, n, title = "") {
  const paras = text.replace(/\r/g, "").split(/\n\s*\n/).map((p) => p.replace(/[ \t]*\n[ \t]*/g, " ").replace(/--/g, "—").trim()).filter(Boolean);
  const sections = [];
  let s = null, words = 0;
  paras.forEach((p, k) => {
    if (!s || words >= SECTION_WORDS) { s = { id: `s${sections.length + 1}`, paragraphs: [] }; sections.push(s); words = 0; }
    s.paragraphs.push({ id: `p${k + 1}`, en: p });
    words += WORDS(p);
  });
  return { n, title, part: "", words: paras.reduce((a, p) => a + WORDS(p), 0), sections };
}
