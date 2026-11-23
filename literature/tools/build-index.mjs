// Writes content/books/<slug>/index.json: which chapters have an Arabic translation (with status) and a study pack.
// Run after adding static content: node tools/build-index.mjs
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../content");
const { books } = JSON.parse(readFileSync(join(ROOT, "catalog.json"), "utf8"));
for (const slug of books) {
  const dir = join(ROOT, "books", slug);
  const list = (sub) => (existsSync(join(dir, sub)) ? readdirSync(join(dir, sub)).filter((f) => /^\d+\.json$/.test(f)) : []);
  const ar = {};
  for (const f of list("ar")) ar[parseInt(f)] = JSON.parse(readFileSync(join(dir, "ar", f), "utf8")).status || "draft";
  const study = list("study").map((f) => parseInt(f)).sort((a, b) => a - b);
  writeFileSync(join(dir, "index.json"), JSON.stringify({ ar, study }) + "\n");
  console.log(slug, "ar:", Object.keys(ar).length, "study:", study.length);
}
