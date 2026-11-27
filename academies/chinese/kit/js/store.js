// Learner state for ONE academy: lessons, saved words (spaced repetition), quiz and pronunciation results,
// daily XP, certificates. Saved on the device first (works offline and without an account) under a key that
// includes the academy id, and synced to ac_progress/{academy}__{uid} when signed in. Academies never share it.
import * as fb from "./fb.js";
import { A, key } from "./ctx.js";
import { today, debounce, uid } from "./util.js";

const blank = () => ({ v: 1, lessons: {}, words: {}, quiz: {}, pron: {}, days: {}, certs: {}, last: null, goal: 20, updated: 0 });
let S = blank();
let P = {};
const subs = new Set();

export function load() {
  try { S = { ...blank(), ...JSON.parse(localStorage.getItem(key("state")) || "{}") }; } catch (e) { S = blank(); }
  try { P = JSON.parse(localStorage.getItem("ac.prefs") || "{}"); } catch (e) { P = {}; }
}
export const onChange = (fn) => { subs.add(fn); return () => subs.delete(fn); };
const progressId = (u) => `${A.id}__${u.uid}`;
const pushRemote = debounce(async () => {
  const u = fb.currentUser();
  if (!u) return;
  try { await fb.set("ac_progress", progressId(u), { academy: A.id, uid: u.uid, state: JSON.stringify(S), summary: summary() }, false); }
  catch (e) { console.warn("sync failed", e); }
}, 2500);
function save() {
  S.updated = Date.now();
  try { localStorage.setItem(key("state"), JSON.stringify(S)); } catch (e) {}
  pushRemote();
  subs.forEach((fn) => fn(S));
}
export const state = () => S;

// ---------- prefs (shared interface prefs on this origin) ----------
export const prefs = () => ({ lang: "ar", theme: null, rate: 1, voice: "", showReading: true, showAr: true, ...P });
export function setPref(k, v) { P[k] = v; try { localStorage.setItem("ac.prefs", JSON.stringify(P)); } catch (e) {} }

// ---------- sync: union; newer `t` wins per record ----------
function merge(a, b) {
  const out = blank();
  const newer = (x, y) => (!x ? y : !y ? x : (y.t || 0) > (x.t || 0) ? y : x);
  for (const k of ["lessons", "words", "quiz", "pron", "certs"]) {
    out[k] = { ...a[k] };
    for (const [id, v] of Object.entries(b[k] || {})) out[k][id] = newer(out[k][id], v);
  }
  out.days = { ...a.days };
  for (const [d, v] of Object.entries(b.days || {})) {
    const o = (out.days[d] ||= {});
    for (const [k, x] of Object.entries(v)) o[k] = Math.max(o[k] || 0, x);
  }
  out.last = newer(a.last, b.last);
  out.goal = (a.updated || 0) >= (b.updated || 0) ? a.goal : b.goal;
  return out;
}
export async function syncFromRemote() {
  const u = fb.currentUser();
  if (!u) return;
  const r = await fb.get("ac_progress", progressId(u));
  if (r?.state) { try { S = merge(S, JSON.parse(r.state)); } catch (e) { console.warn(e); } }
  save();
}
// Small numbers the central admin can read without parsing the whole state.
function summary() {
  return { lessons: lessonsDone(), words: savedWords().length, xp: totalXp(), streak: streak(), pron: pronAvg(), lastActive: today() };
}

// ---------- activity / XP ----------
export function xp(n = 1) {
  const d = (S.days[today()] ||= {});
  d.xp = (d.xp || 0) + n;
  save();
}
export const xpToday = () => S.days[today()]?.xp || 0;
export const totalXp = () => Object.values(S.days).reduce((a, d) => a + (d.xp || 0), 0);
export function setGoal(n) { S.goal = n; save(); }
export function streak() {
  let n = 0;
  const d = new Date();
  if (!(S.days[today(d)]?.xp > 0)) d.setDate(d.getDate() - 1);
  while (S.days[today(d)]?.xp > 0) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
export function lastDays(k = 10) {
  const out = [];
  for (let i = k - 1; i >= 0; i--) { const x = new Date(); x.setDate(x.getDate() - i); out.push(S.days[today(x)]?.xp || 0); }
  return out;
}

// ---------- lessons ----------
export const lessonState = (id) => S.lessons[id] || null;
export const isDone = (id) => !!S.lessons[id]?.done;
export function completeLesson(id, score = 1) {
  const prev = S.lessons[id];
  S.lessons[id] = { done: true, score: Math.max(score, prev?.score || 0), t: Date.now() };
  S.last = { lesson: id, t: Date.now() };
  xp(prev?.done ? 2 : 10);
}
export function touchLesson(id) { S.last = { lesson: id, t: Date.now() }; save(); }
export const lessonsDone = () => Object.values(S.lessons).filter((l) => l.done).length;

// ---------- words + spaced repetition ----------
const INTERVALS = [0, 1, 2, 4, 8, 16, 35, 90];
export const savedWords = () => Object.entries(S.words).filter(([, w]) => !w.deleted).map(([id, w]) => ({ id, ...w }));
export const isSaved = (id) => !!S.words[id] && !S.words[id].deleted;
export function saveWord(id) { S.words[id] = { box: 0, due: Date.now(), added: Date.now(), t: Date.now() }; xp(1); }
export function removeWord(id) { S.words[id] = { deleted: true, t: Date.now() }; save(); }
export function grade(id, g) {
  const w = S.words[id];
  if (!w) return;
  w.box = g === 0 ? 0 : Math.min(INTERVALS.length - 1, (w.box || 0) + (g === 1 ? 0 : g === 2 ? 1 : 2));
  w.due = Date.now() + (g === 0 ? 60000 : INTERVALS[w.box] * 86400000);
  w.reviews = (w.reviews || 0) + 1;
  w.t = Date.now();
  xp(1);
}
export const dueWords = () => savedWords().filter((w) => (w.due || 0) <= Date.now());
export const masteredCount = () => savedWords().filter((w) => (w.box || 0) >= 4).length;

// ---------- quizzes & pronunciation ----------
export function addQuiz(kind, id, score, total) { S.quiz[uid()] = { kind, id, score, total, t: Date.now() }; xp(Math.max(1, score)); }
export const quizzes = () => Object.values(S.quiz).filter((q) => !q.deleted).sort((a, b) => b.t - a.t);
export function quizAvg() { const q = quizzes().filter((x) => x.total); return q.length ? q.reduce((a, x) => a + x.score / x.total, 0) / q.length : null; }
export function addPron(text, score) {
  S.pron[uid()] = { text, score, t: Date.now() };
  const all = Object.entries(S.pron).sort((a, b) => b[1].t - a[1].t);
  for (const [k] of all.slice(200)) delete S.pron[k];
  xp(1);
}
export function pronAvg() { const p = Object.values(S.pron).slice(-50); return p.length ? p.reduce((a, x) => a + x.score, 0) / p.length : null; }

// ---------- certificates ----------
export function addCert(levelId, score, name) {
  const prev = S.certs[levelId];
  if (prev && prev.score >= score) return prev;
  const serial = `${A.id.slice(0, 2).toUpperCase()}-${levelId.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  S.certs[levelId] = { score, name, serial, t: Date.now() };
  save();
  return S.certs[levelId];
}
export const cert = (levelId) => S.certs[levelId] || null;

export function exportData() { return JSON.stringify({ academy: A.id, state: S }, null, 1); }
export function reset() { S = blank(); save(); }
