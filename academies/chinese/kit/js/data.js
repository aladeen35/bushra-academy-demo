// Content access for the running academy. Static JSON under <academy>/content/ is the source; editors can
// publish an override of any file from the admin screen (stored in ac_content/{academy}__{file}).
import * as fb from "./fb.js";
import { A } from "./ctx.js";

const cache = new Map();
export const invalidate = () => cache.clear();
const docId = (path) => `${A.id}__${path.replace(/[/.]/g, "_")}`;

export function json(path) {
  if (!cache.has(path)) {
    cache.set(path, (async () => {
      if (fb.enabled) {
        const o = await fb.get("ac_content", docId(path));
        if (o?.json) { try { return JSON.parse(o.json); } catch (e) { console.warn("bad override", path); } }
      }
      const r = await fetch(`content/${path}`);
      if (!r.ok) throw new Error(`${path}: ${r.status}`);
      return r.json();
    })());
    cache.get(path).catch(() => cache.delete(path));
  }
  return cache.get(path);
}
export const original = async (path) => (await fetch(`content/${path}`)).json();
export async function publishOverride(path, text) { await fb.set("ac_content", docId(path), { academy: A.id, path, json: text }, false); cache.delete(path); }
export async function removeOverride(path) { await fb.del("ac_content", docId(path)); cache.delete(path); }

// ---------- typed accessors ----------
export const course = () => json("course.json");
export const grammar = () => json("grammar.json");
export const dialogues = () => json("dialogues.json");
export const category = (id) => json(`vocab/${id}.json`);
export async function categories() { return Promise.all(A.vocabCategories.map((id) => category(id).catch(() => null))).then((l) => l.filter(Boolean)); }

// All vocabulary entries keyed by id, each with its category.
let wordsP = null;
export function allWords() {
  if (!wordsP) wordsP = categories().then((cats) => {
    const m = new Map();
    for (const c of cats) for (const w of c.words) m.set(w.id, { ...w, cat: c.id });
    return m;
  });
  return wordsP;
}
export const resetWords = () => { wordsP = null; };

// Flattened lesson list from course.json (units → lessons) with unit info, in order.
export async function lessonList() {
  const c = await course();
  return c.units.flatMap((u, ui) => u.lessons.map((l, li) => ({ ...l, unit: u, ui, li })));
}
