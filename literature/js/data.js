// Content access. Static JSON in /content is the published baseline; when Firebase is connected,
// editor changes in Firestore (lit_* collections) override it and books added in the CMS are appended.
// Nothing here knows about specific books: everything comes from catalog.json and the CMS.
import * as fb from "./fb.js";
import { TEXT_ALLOWED } from "./i18n.js";
import { pad2 } from "./util.js";

const cache = new Map();
async function json(path) {
  if (cache.has(path)) return cache.get(path);
  const p = fetch(`content/${path}`, { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  cache.set(path, p);
  return p;
}
const memo = new Map();
const once = (key, fn) => { if (!memo.has(key)) memo.set(key, fn().catch((e) => { memo.delete(key); throw e; })); return memo.get(key); };
export function invalidate() { memo.clear(); cache.clear(); }

export const textAllowed = (book) => book?.text !== "none" && TEXT_ALLOWED.includes(book?.rights?.status);

// ---------- catalog ----------
export function catalog({ includeUnpublished = false } = {}) {
  return once(`catalog:${includeUnpublished}`, async () => {
    const cat = (await json("catalog.json")) || { books: [] };
    const statics = await Promise.all(cat.books.map((s) => json(`books/${s}/book.json`)));
    const remote = fb.enabled ? await fb.list("lit_books", includeUnpublished && fb.isEditor() ? null : ["published", "==", true]) : [];
    const bySlug = new Map();
    statics.filter(Boolean).forEach((b) => bySlug.set(b.slug, { ...b, source: "static" }));
    for (const r of remote) {
      const base = bySlug.get(r.id);
      const { updatedAt, updatedBy, ...data } = r;
      bySlug.set(r.id, { ...(base || {}), ...data, slug: r.id, rights: { ...(base?.rights || {}), ...(data.rights || {}) }, source: base ? "static+cms" : "cms" });
    }
    let books = [...bySlug.values()];
    if (!includeUnpublished) books = books.filter((b) => b.published !== false);
    const order = (r) => { const i = cat.books.indexOf(r.slug); return i < 0 ? 1000 + (r.order || 0) : i; };
    books.sort((a, b) => order(a) - order(b));
    return { books, featured: cat.featured };
  });
}

export async function book(slug, opts) {
  const { books } = await catalog(opts);
  const b = books.find((x) => x.slug === slug);
  if (!b) return null;
  const [about, idx, status] = await Promise.all([about_(slug), chapterIndex(slug), json(`books/${slug}/index.json`)]);
  return { ...b, about, chapters: idx, available: status || { ar: {}, study: [] } };
}

function about_(slug) {
  return once(`about:${slug}`, async () => {
    const [s, r] = await Promise.all([json(`books/${slug}/about.json`), fb.enabled ? fb.get("lit_about", slug) : null]);
    return r ? { ...(s || {}), ...r } : s || {};
  });
}

export function chapterIndex(slug) {
  return once(`idx:${slug}`, async () => {
    const r = fb.enabled ? await fb.get("lit_chapter_index", slug) : null;
    if (r?.chapters?.length) return r.chapters;
    return (await json(`books/${slug}/chapters/index.json`)) || [];
  });
}

// Chapter text is only returned when the book's rights allow publishing the text.
export function chapter(slug, n) {
  return once(`ch:${slug}:${n}`, async () => {
    const b = (await catalog({ includeUnpublished: fb.isEditor() })).books.find((x) => x.slug === slug);
    if (!b || !textAllowed(b)) return null;
    const r = fb.enabled ? await fb.get("lit_chapters", `${slug}_${pad2(n)}`) : null;
    if (r?.sections) return r;
    return json(`books/${slug}/chapters/${pad2(n)}.json`);
  });
}

// Which static translation/study files exist (tools/build-index.mjs), so missing files are never requested.
const avail = async (slug) => (await json(`books/${slug}/index.json`)) || { ar: {}, study: [] };

// Arabic translation: {status, translator, paragraphs: {pid: text}, pstatus: {pid: status}}
export function translation(slug, n) {
  return once(`ar:${slug}:${n}`, async () => {
    const a = await avail(slug);
    const [s, r] = await Promise.all([a.ar?.[n] ? json(`books/${slug}/ar/${pad2(n)}.json`) : null, fb.enabled ? fb.get("lit_translations", `${slug}_${pad2(n)}`) : null]);
    if (!s && !r) return null;
    const out = { status: "draft", translator: "", paragraphs: {}, pstatus: {}, ...(s || {}) };
    out.paragraphs = { ...(s?.paragraphs || {}) };
    if (r) {
      Object.assign(out.paragraphs, r.paragraphs || {});
      out.pstatus = { ...(r.pstatus || {}) };
      if (r.status) out.status = r.status;
      if (r.translator) out.translator = r.translator;
    }
    return out;
  });
}

export function study(slug, n) {
  return once(`st:${slug}:${n}`, async () => {
    const a = await avail(slug);
    const [s, r] = await Promise.all([a.study?.includes(n) ? json(`books/${slug}/study/${pad2(n)}.json`) : null, fb.enabled ? fb.get("lit_study", `${slug}_${pad2(n)}`) : null]);
    return r?.pack ? r.pack : s;
  });
}

export async function studyAll(slug) {
  const b = await book(slug);
  if (!b) return [];
  // Static packs from the index; with Firebase, CMS packs may exist for any chapter.
  const ns = new Set([...(b.available.study || []), ...(fb.enabled ? (b.chapters || []).map((c) => c.n) : [])]);
  const packs = await Promise.all([...ns].sort((a, c) => a - c).map((n) => study(slug, n)));
  return packs.filter(Boolean);
}

// ---------- vocabulary ----------
// Returns {entries: Map id→entry, byForm: Map form→entry, phrases: [entry]} across all published books.
export function vocab() {
  return once("vocab", async () => {
    const { books } = await catalog();
    const lists = await Promise.all(books.map(async (b) => {
      const [s, r] = await Promise.all([json(`vocab/${b.slug}.json`), fb.enabled ? fb.get("lit_vocab", b.slug) : null]);
      const map = new Map((s || []).map((e) => [e.id, e]));
      if (r?.entries) for (const [id, e] of Object.entries(r.entries)) e ? map.set(id, { ...e, id }) : map.delete(id);
      return [...map.values()].map((e) => ({ ...e, book: b.slug }));
    }));
    const entries = new Map();
    const byForm = new Map();
    const phrases = [];
    for (const e of lists.flat()) {
      if (entries.has(e.id)) continue;
      entries.set(e.id, e);
      for (const f of [e.word, e.id, ...(e.forms || [])]) {
        const k = norm(f);
        if (!k) continue;
        if (k.includes(" ")) phrases.push({ k, e });
        else if (!byForm.has(k)) byForm.set(k, e);
      }
    }
    phrases.sort((a, b) => b.k.length - a.k.length);
    return { entries, byForm, phrases };
  });
}
export const norm = (w) => String(w || "").toLowerCase().replace(/[’‘]/g, "'").replace(/^[^a-z]+|[^a-z]+$/g, "");

export async function findWord(word, sentence = "") {
  const { byForm, phrases } = await vocab();
  const w = norm(word);
  const s = " " + String(sentence).toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z' -]+/g, " ").replace(/\s+/g, " ") + " ";
  for (const p of phrases) if (p.k.split(" ").includes(w) && s.includes(" " + p.k + " ")) return p.e;
  if (byForm.has(w)) return byForm.get(w);
  const stems = [w.replace(/'s$/, ""), w.replace(/ies$/, "y"), w.replace(/es$/, ""), w.replace(/s$/, ""), w.replace(/ied$/, "y"), w.replace(/ed$/, ""), w.replace(/d$/, ""),
    w.replace(/ing$/, ""), w.replace(/ing$/, "e"), w.replace(/ly$/, ""), w.replace(/([a-z])\1(ed|ing)$/, "$1")];
  for (const st of stems) if (st !== w && byForm.has(st)) return byForm.get(st);
  return null;
}

// Free Dictionary API (no key) for words not yet in the curated dictionary.
export async function onlineLookup(word) {
  const w = norm(word);
  if (!w) return null;
  return once(`dict:${w}`, async () => {
    const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`).catch(() => null);
    if (!r || !r.ok) return null;
    const [d] = await r.json();
    const m = d.meanings?.[0];
    const def = m?.definitions?.[0];
    return {
      id: `dict:${w}`, word: d.word, online: true,
      ipa: d.phonetic || d.phonetics?.find((p) => p.text)?.text || "",
      pos: m?.partOfSpeech || "", def: def?.definition || "", example: def?.example || "",
      synonyms: [...new Set([...(def?.synonyms || []), ...(m?.synonyms || [])])].slice(0, 6),
      antonyms: [...new Set([...(def?.antonyms || []), ...(m?.antonyms || [])])].slice(0, 6),
    };
  });
}

// Placement test bank.
export const placementBank = () => json("placement.json");

// ---------- search ----------
export async function searchAll(q) {
  const s = q.trim().toLowerCase();
  if (!s) return { books: [], words: [] };
  const [{ books }, { entries }] = await Promise.all([catalog(), vocab()]);
  const hit = (...xs) => xs.some((x) => String(x || "").toLowerCase().includes(s));
  return {
    books: books.filter((b) => hit(b.title, b.titleAr, b.author, b.authorAr, b.genre?.en, b.genre?.ar, ...(b.tags || []))),
    words: [...entries.values()].filter((e) => hit(e.word, e.ar, ...(e.forms || []))).slice(0, 40),
  };
}
