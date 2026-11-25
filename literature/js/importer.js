// Plain-text novel importer shared by the admin CMS (browser) and tools/import-gutenberg.mjs (Node).
// Keeps paragraph order and chapter sequence exactly; every paragraph keeps its source line number.
const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100 };
const roman = (s) => [...s].reduce((acc, ch, i, a) => (ROMAN[ch] < (ROMAN[a[i + 1]] || 0) ? acc - ROMAN[ch] : acc + ROMAN[ch]), 0);
const WORDS = (t) => t.split(/\s+/).filter(Boolean).length;
export const SECTION_WORDS = 650;

const titleCase = (t) => (t === t.toUpperCase() ? t.toLowerCase().replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/\b(Of|The|And|A|An|At|In|On|To|By|For)\b/g, (w, _, i) => (i ? w.toLowerCase() : w)).replace(/^./, (c) => c.toUpperCase()).replace(/\bDr\b/g, "Dr") : t);

// opts.titles: optional list of chapter titles for books whose headings carry no numbers
// (e.g. "STORY OF THE DOOR"); a line equal to a title (ignoring case and a final period) starts that chapter.
export function parseNovel(raw, opts = {}) {
  const titles = (opts.titles || []).map((x) => x.trim()).filter(Boolean);
  const tkey = (x) => x.toLowerCase().replace(/[.\s]+$/g, "").replace(/\s+/g, " ").replace(/[’']/g, "'");
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
    if (titles.length) {
      const k = titles.findIndex((x) => tkey(x) === tkey(l));
      return k >= 0 ? { n: k + 1, title: titleCase(titles[k]), skip: 1, loose: true } : null;
    }
    if ((m = /^CHAPTER ([IVXLC]+|\d+)\.?(?:\s*[—-]\s*(.+)|\s+(\S.*))?$/i.exec(l))) {
      m[2] = m[2] || m[3];
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
  let cur = null, para = [], paraLine = 0, part = "", newPart = false, partOffset = 0;
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
    // Part headings: "PART ONE--The Old Buccaneer" or "PART I. A VOYAGE TO LILLIPUT."
    const pm = /^PART ([A-Z]+)--(.+)$/.exec(t) || /^PART ([IVX]+)\.\s+(.+?)\.?$/.exec(t);
    if (pm) { flush(); part = titleCase(pm[2].trim()); newPart = true; continue; }
    const h = headingAt(i);
    // A table of contents produces empty chapters; when chapter 1 appears again, start over.
    if (h && h.n === 1 && chapters.length && (chapters.every((c) => !c.paras.length) || (chapters.length === 1 && cur.n === 1))) { chapters.length = 0; cur = null; }
    // Books whose chapter numbers restart in every part keep one continuous sequence.
    if (h && newPart && cur && h.n === 1 && cur.n >= 1) { partOffset = cur.n; h.restart = true; }
    if (h && !h.loose) h.n += partOffset;
    if (h && (!cur || h.n === cur.n + 1 || (h.loose && h.n !== cur.n))) {
      newPart = false;
      flush();
      if (cur && h.n !== cur.n + 1 && !h.restart) { corrections.push(`source line ${i + offset}: heading numeral ${h.n} corrected to ${cur.n + 1}`); h.n = cur.n + 1; }
      cur = { n: h.n, title: h.title.replace(/--/g, "—"), part, paras: [] };
      chapters.push(cur);
      i += h.skip - 1;
      continue;
    }
    if (!cur) continue;
    if (!t) { flush(); continue; }
    if (/^\[(Illustration|Picture)/.test(t)) { flush(); while (i < body.length && !body[i].includes("]")) i++; continue; }
    if (!para.length) paraLine = i + offset;
    para.push(/^ {6,}/.test(rawLine) && para.length ? "\n" + t : t);
  }
  flush();
  const last = chapters.at(-1);
  // Trailing end matter: "THE END", scene-break stars, printer colophons.
  while (last && /^(THE END|FINIS)\.?$|^[* ]+$|^Printed by /i.test(last.paras.at(-1)?.text || "")) last.paras.pop();

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
