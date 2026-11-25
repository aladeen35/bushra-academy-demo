// Learner state: progress, saved words (spaced repetition), bookmarks, notes, quiz attempts, daily activity.
// Saved on the device first (works offline and without an account), synced to Firestore lit_users/{uid} when signed in.
import * as fb from "./fb.js";
import { today, debounce, uid } from "./util.js";

const KEY = "lit.state.v1";
const PREFS = "lit.prefs";
const blank = () => ({ v: 1, books: {}, words: {}, bookmarks: {}, notes: {}, quiz: {}, grammar: {}, likes: {}, days: {}, level: null, last: null, updated: 0 });

let S = blank();
try { S = { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch (e) {}
let P = {};
try { P = JSON.parse(localStorage.getItem(PREFS) || "{}"); } catch (e) {}

const subs = new Set();
export const onChange = (fn) => { subs.add(fn); return () => subs.delete(fn); };
const pushRemote = debounce(async () => {
  const u = fb.currentUser();
  if (!u) return;
  try { await fb.set("lit_users", u.uid, { state: JSON.stringify(S) }, false); } catch (e) { console.warn("sync failed", e); }
}, 2500);
function save() {
  S.updated = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  pushRemote();
  subs.forEach((fn) => fn(S));
}
export const state = () => S;

// ---------- prefs ----------
export const prefs = () => ({ theme: null, lang: "ar", layout: "both", size: 19, lh: 1.75, accent: "en-GB", rate: 1, ...P });
export function setPref(k, v) { P[k] = v; try { localStorage.setItem(PREFS, JSON.stringify(P)); } catch (e) {} }

// ---------- sync ----------
// Merge rule: union of everything; for keyed records the newer `t` wins; deleted records keep a tombstone.
function merge(a, b) {
  const out = blank();
  const newer = (x, y) => (!x ? y : !y ? x : (y.t || 0) > (x.t || 0) ? y : x);
  for (const k of ["words", "bookmarks", "notes", "quiz", "grammar", "likes"]) {
    out[k] = { ...a[k] };
    for (const [id, v] of Object.entries(b[k] || {})) out[k][id] = newer(out[k][id], v);
  }
  out.books = JSON.parse(JSON.stringify(a.books || {}));
  for (const [slug, bk] of Object.entries(b.books || {})) {
    const o = (out.books[slug] ||= { chapters: {} });
    o.started = Math.min(o.started || Infinity, bk.started || Infinity);
    if (!Number.isFinite(o.started)) delete o.started;
    for (const [n, ch] of Object.entries(bk.chapters || {})) {
      const c = (o.chapters[n] ||= { read: [] });
      c.read = [...new Set([...(c.read || []), ...(ch.read || [])])];
      c.done = c.done || ch.done;
      c.total = Math.max(c.total || 0, ch.total || 0);
    }
  }
  out.days = { ...a.days };
  for (const [d, v] of Object.entries(b.days || {})) {
    const o = (out.days[d] ||= {});
    for (const [k, x] of Object.entries(v)) o[k] = Math.max(o[k] || 0, x);
  }
  out.level = newer(a.level, b.level);
  out.last = newer(a.last, b.last);
  return out;
}
export async function syncFromRemote() {
  const u = fb.currentUser();
  if (!u) return;
  const r = await fb.get("lit_users", u.uid);
  if (r?.state) {
    try { S = merge(S, JSON.parse(r.state)); } catch (e) { console.warn(e); }
  }
  save();
}

// ---------- reading progress ----------
export function markSection(slug, n, sectionId, total) {
  const b = (S.books[slug] ||= { chapters: {}, started: Date.now() });
  b.started ||= Date.now();
  const c = (b.chapters[n] ||= { read: [] });
  if (!c.read.includes(sectionId)) c.read.push(sectionId);
  c.total = total;
  if (c.read.length >= total) c.done = true;
  save();
}
export function setLast(slug, n, sectionId) {
  S.last = { slug, n, s: sectionId, t: Date.now() };
  const b = (S.books[slug] ||= { chapters: {}, started: Date.now() });
  b.last = { n, s: sectionId, t: Date.now() };
  save();
}
export function markChapterDone(slug, n) {
  const b = (S.books[slug] ||= { chapters: {}, started: Date.now() });
  const c = (b.chapters[n] ||= { read: [] });
  c.done = true;
  save();
}
export const chapterState = (slug, n) => S.books[slug]?.chapters?.[n] || null;
export function bookProgress(slug, chapterCount) {
  const chs = S.books[slug]?.chapters || {};
  if (!chapterCount) return 0;
  let sum = 0;
  for (const c of Object.values(chs)) sum += c.done ? 1 : c.total ? Math.min(1, (c.read?.length || 0) / c.total) : 0;
  return Math.min(1, sum / chapterCount);
}
export const chaptersDone = (slug) => Object.values(S.books[slug]?.chapters || {}).filter((c) => c.done).length;

// ---------- activity ----------
export function tick(kind, seconds) {
  const d = (S.days[today()] ||= {});
  d[kind] = (d[kind] || 0) + seconds;
  S.updated = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  pushRemote();
}
export function streak() {
  let n = 0;
  const d = new Date();
  // Today counts if active; otherwise the streak is still alive until today ends.
  if (!isActive(today(d))) d.setDate(d.getDate() - 1);
  while (isActive(today(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
const isActive = (day) => { const v = S.days[day]; return !!v && ((v.read || 0) + (v.listen || 0) >= 60 || (v.actions || 0) > 0); };
export function lastDays(k = 10) {
  const out = [];
  const d = new Date();
  for (let i = k - 1; i >= 0; i--) { const x = new Date(d); x.setDate(d.getDate() - i); const v = S.days[today(x)] || {}; out.push((v.read || 0) + (v.listen || 0) + (v.actions || 0) * 30); }
  return out;
}
export const totals = () => Object.values(S.days).reduce((a, v) => ({ read: a.read + (v.read || 0), listen: a.listen + (v.listen || 0) }), { read: 0, listen: 0 });
export function action() { tick("actions", 1); }

// ---------- words + spaced repetition (Leitner-style boxes with SM-2-like intervals) ----------
const INTERVALS = [0, 1, 2, 4, 8, 16, 35, 90]; // days per box
export const savedWords = () => Object.entries(S.words).filter(([, w]) => !w.deleted).map(([id, w]) => ({ id, ...w }));
export const isSaved = (id) => !!S.words[id] && !S.words[id].deleted;
export function saveWord(entry) {
  S.words[entry.id] = { box: 0, due: Date.now(), added: Date.now(), t: Date.now(), ...(entry.online ? { entry } : {}) };
  action();
  save();
}
export function removeWord(id) { S.words[id] = { deleted: true, t: Date.now() }; save(); }
export function grade(id, g) { // g: 0 again, 1 hard, 2 good, 3 easy
  const w = S.words[id];
  if (!w) return;
  w.box = g === 0 ? 0 : Math.min(INTERVALS.length - 1, (w.box || 0) + (g === 1 ? 0 : g === 2 ? 1 : 2));
  w.due = Date.now() + (g === 0 ? 60 * 1000 : INTERVALS[w.box] * 86400000);
  w.reviews = (w.reviews || 0) + 1;
  w.t = Date.now();
  action();
  save();
}
export const dueWords = () => savedWords().filter((w) => (w.due || 0) <= Date.now());
export const masteredCount = () => savedWords().filter((w) => (w.box || 0) >= 4).length;

// ---------- bookmarks & notes ----------
const pkey = (slug, n, pid) => `${slug}|${n}|${pid}`;
export const isBookmarked = (slug, n, pid) => !!S.bookmarks[pkey(slug, n, pid)] && !S.bookmarks[pkey(slug, n, pid)].deleted;
export function toggleBookmark(slug, n, pid, s, excerpt) {
  const k = pkey(slug, n, pid);
  if (isBookmarked(slug, n, pid)) S.bookmarks[k] = { deleted: true, t: Date.now() };
  else S.bookmarks[k] = { slug, n, pid, s, excerpt: excerpt.slice(0, 160), t: Date.now() };
  save();
  return isBookmarked(slug, n, pid);
}
export const bookmarks = () => Object.values(S.bookmarks).filter((b) => !b.deleted).sort((a, b) => b.t - a.t);
export const noteFor = (slug, n, pid) => { const x = S.notes[pkey(slug, n, pid)]; return x && !x.deleted ? x : null; };
export function setNote(slug, n, pid, s, text, excerpt) {
  const k = pkey(slug, n, pid);
  S.notes[k] = text.trim() ? { slug, n, pid, s, text: text.trim(), excerpt: excerpt.slice(0, 160), t: Date.now() } : { deleted: true, t: Date.now() };
  action();
  save();
}
export const notes = () => Object.values(S.notes).filter((b) => !b.deleted).sort((a, b) => b.t - a.t);

// ---------- quizzes, grammar, level ----------
export function addQuiz(slug, n, score, total) {
  S.quiz[uid()] = { slug, n, score, total, t: Date.now() };
  action();
  save();
}
export const quizzes = () => Object.values(S.quiz).filter((q) => !q.deleted).sort((a, b) => b.t - a.t);
export function grammarDone(id, ok) { S.grammar[id] = { ok, t: Date.now() }; action(); save(); }
export const grammarCount = () => Object.values(S.grammar).filter((g) => g.ok).length;
export function setLevel(level, detail) { S.level = { level, detail, t: Date.now() }; save(); }
export const level = () => S.level?.level || null;

// ---------- video likes (Shorts) ----------
export const isLiked = (id) => !!S.likes?.[id] && !S.likes[id].deleted;
export function toggleLike(id) {
  S.likes ||= {};
  S.likes[id] = isLiked(id) ? { deleted: true, t: Date.now() } : { t: Date.now() };
  action();
  save();
  return isLiked(id);
}

export function exportData() { return JSON.stringify({ state: S, prefs: P }, null, 1); }
export function reset() { S = blank(); save(); }
