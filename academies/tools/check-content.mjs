// Validates every academy's content: JSON parses, ids unique, curriculum references resolve, exercises are
// answerable. Chinese adds pinyin checks (syllable count and tone marks match the numbered pinyin).
// Usage: node academies/tools/check-content.mjs   (CI runs it on every push)
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const err = (a, m) => errors.push(`${a}: ${m}`);
const load = (a, f) => { try { return JSON.parse(readFileSync(path.join(root, a, "content", f), "utf8")); } catch (e) { err(a, `${f}: ${e.message}`); return null; } };
const norm = (s) => String(s).replace(/[\s\p{P}]/gu, "");
const sorted = (s) => [...norm(s)].sort().join("");

for (const a of readdirSync(root).filter((d) => existsSync(path.join(root, d, "academy.js")))) {
  const course = load(a, "course.json");
  const grammar = load(a, "grammar.json") || [];
  const dialogues = load(a, "dialogues.json") || [];
  const cats = readdirSync(path.join(root, a, "content", "vocab")).map((f) => load(a, `vocab/${f}`)).filter(Boolean);
  const ids = new Set();
  const py = a === "chinese" ? await import(pathToFileURL(path.join(root, a, "py.js"))) : null;
  for (const c of cats) for (const w of c.words) {
    if (ids.has(w.id)) err(a, `duplicate word id ${w.id}`);
    ids.add(w.id);
    for (const k of ["ar", "en", "ex"]) if (!w[k]) err(a, `${c.id}/${w.id} missing ${k}`);
    if (py) {
      const han = [...w.hz].filter(py.isHan);
      const syl = String(w.pyn).split(/\s+/);
      if (han.length !== syl.length) err(a, `${w.id}: ${han.length} characters vs ${syl.length} pinyin syllables`);
      if (py.stripTones(w.py).toLowerCase().replace(/[\s'’-]/g, "") !== syl.map((s) => s.replace(/\d/, "").replace(/v/g, "ü")).join("")) err(a, `${w.id}: py "${w.py}" ≠ pyn "${w.pyn}"`);
      if (py.markAll(w.pyn).join("") !== w.py.replace(/[\s'’-]/g, "").toLowerCase()) err(a, `${w.id}: tone marks "${w.py}" ≠ ${py.markAll(w.pyn).join(" ")}`);
    }
  }
  for (const g of grammar) for (const [i, x] of (g.exercises || []).entries()) {
    if (x.type === "order" && sorted(x.tokens.join("")) !== sorted(x.answer)) err(a, `grammar ${g.id} #${i}: tokens ≠ answer`);
    if (x.type === "mcq" && !(x.answer >= 0 && x.answer < x.options.length)) err(a, `grammar ${g.id} #${i}: answer index`);
  }
  for (const d of dialogues) for (const q of d.questions || []) if (!(q.answer < q.options.ar.length && q.options.ar.length === q.options.en.length)) err(a, `dialogue ${d.id}: question options`);
  const catIds = new Set(cats.map((c) => c.id));
  for (const u of course?.units || []) for (const l of u.lessons) {
    if (l.type === "vocab" && !catIds.has(l.cat)) err(a, `lesson ${l.id}: unknown category ${l.cat}`);
    if (l.type === "grammar" && !grammar.some((g) => g.id === l.grammar)) err(a, `lesson ${l.id}: unknown grammar ${l.grammar}`);
    if (l.type === "dialogue" && !dialogues.some((d) => d.id === l.dialogue)) err(a, `lesson ${l.id}: unknown dialogue ${l.dialogue}`);
  }
  console.log(`${a}: ${ids.size} words, ${grammar.length} grammar lessons, ${dialogues.length} dialogues, ${(course?.units || []).reduce((n, u) => n + u.lessons.length, 0)} curriculum lessons`);
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("content ✓");
