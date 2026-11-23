// Assembles a chapter translation from per-section work files and validates it against the English text.
// Translators write content/books/<slug>/ar/_work/NN-sK.json as {"p12": "…", …}; then:
//   node tools/ar-merge.mjs <slug> <n> [translator]
// Writes ar/NN.json (status "draft") only if every paragraph id of the chapter has a non-empty translation.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../content/books");
const [slug, nArg, translator = "AI draft"] = process.argv.slice(2);
const nn = String(+nArg).padStart(2, "0");
const ch = JSON.parse(readFileSync(join(ROOT, slug, "chapters", `${nn}.json`), "utf8"));
const ids = ch.sections.flatMap((s) => s.paragraphs.map((p) => p.id));
const work = join(ROOT, slug, "ar", "_work");
const paragraphs = {};
if (existsSync(work)) for (const f of readdirSync(work).filter((f) => f.startsWith(`${nn}-`) && f.endsWith(".json"))) Object.assign(paragraphs, JSON.parse(readFileSync(join(work, f), "utf8")));
const missing = ids.filter((id) => !String(paragraphs[id] || "").trim());
const extra = Object.keys(paragraphs).filter((id) => !ids.includes(id));
if (missing.length || extra.length) {
  console.error(`${slug} ${nn}: missing ${missing.join(",") || "-"} · unknown ${extra.join(",") || "-"}`);
  process.exit(1);
}
const ordered = Object.fromEntries(ids.map((id) => [id, paragraphs[id].trim()]));
mkdirSync(join(ROOT, slug, "ar"), { recursive: true });
writeFileSync(join(ROOT, slug, "ar", `${nn}.json`), JSON.stringify({ chapter: +nArg, translator, status: "draft", paragraphs: ordered }, null, 1) + "\n");
console.log(`${slug} ${nn}: ${ids.length} paragraphs OK`);
