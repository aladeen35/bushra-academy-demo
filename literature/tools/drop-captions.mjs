// Finds illustration captions that plain-text editions leave in the text: a short single-line paragraph
// with no closing punctuation whose words repeat a nearby paragraph (e.g. "How dare I, Mrs. Reed? … the truth").
// Usage: node tools/drop-captions.mjs <slug> [--apply]
// With --apply, removes them from chapters/NN.json and ar/NN.json WITHOUT renumbering other paragraph ids,
// so existing translations, bookmarks and notes stay valid. Each removal is logged in chapters/import-log.json.
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../content/books");
const [slug, flag] = process.argv.slice(2);
const apply = flag === "--apply";
const norm = (s) => s.toLowerCase().replace(/[_“”"‘’'.,;:!?—-]/g, " ").replace(/\s+/g, " ").trim();
const dir = join(ROOT, slug, "chapters");
const logPath = join(dir, "import-log.json");
const log = existsSync(logPath) ? JSON.parse(readFileSync(logPath, "utf8")) : {};
log.captionsRemoved ||= [];
let total = 0;
for (const f of readdirSync(dir).filter((x) => /^\d+\.json$/.test(x)).sort()) {
  const ch = JSON.parse(readFileSync(join(dir, f), "utf8"));
  const all = ch.sections.flatMap((s) => s.paragraphs);
  const drop = new Set();
  all.forEach((p, i) => {
    const t = p.en.trim();
    if (t.includes("\n") || t.length > 140 || /[.!?”"’)]$/.test(t)) return;
    const k = norm(t);
    if (!/[a-z]/.test(k) || k.split(" ").length < 3) return;
    const near = all.slice(Math.max(0, i - 25), i + 26).filter((q) => q !== p);
    if (near.some((q) => norm(q.en).includes(k))) drop.add(p.id);
  });
  if (!drop.size) continue;
  total += drop.size;
  for (const id of drop) console.log(`${slug} ${f.slice(0, 2)} ${id}: ${all.find((p) => p.id === id).en}`);
  if (!apply) continue;
  ch.sections = ch.sections.map((s) => ({ ...s, paragraphs: s.paragraphs.filter((p) => !drop.has(p.id)) })).filter((s) => s.paragraphs.length);
  ch.words = ch.sections.flatMap((s) => s.paragraphs).reduce((a, p) => a + p.en.split(/\s+/).length, 0);
  writeFileSync(join(dir, f), JSON.stringify(ch, null, 1) + "\n");
  const arPath = join(ROOT, slug, "ar", f);
  if (existsSync(arPath)) {
    const ar = JSON.parse(readFileSync(arPath, "utf8"));
    for (const id of drop) delete ar.paragraphs[id];
    writeFileSync(arPath, JSON.stringify(ar, null, 1) + "\n");
  }
  for (const id of drop) log.captionsRemoved.push(`${f.slice(0, 2)}:${id}`);
}
if (apply && total) {
  writeFileSync(logPath, JSON.stringify(log, null, 1) + "\n");
  const idx = JSON.parse(readFileSync(join(dir, "index.json"), "utf8"));
  for (const c of idx) { const ch = JSON.parse(readFileSync(join(dir, String(c.n).padStart(2, "0") + ".json"), "utf8")); c.words = ch.words; c.sections = ch.sections.length; }
  writeFileSync(join(dir, "index.json"), JSON.stringify(idx, null, 1) + "\n");
}
console.log(`${slug}: ${total} caption(s)${apply ? " removed" : " found (dry run)"}`);
