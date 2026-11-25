// Imports a Project Gutenberg plain-text novel into Albushra Literature chapter JSON files.
// Usage (from literature/): node tools/import-gutenberg.mjs <slug> <path-to-pg-txt> ["Title one|Title two|…"]
// Writes content/books/<slug>/chapters/NN.json, index.json and import-log.json.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { parseNovel } from "../js/importer.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const [slug, file, titleArg] = process.argv.slice(2);
if (!slug || !file) { console.error("usage: import-gutenberg.mjs <slug> <file>"); process.exit(1); }

const { chapters, corrections } = parseNovel(readFileSync(file, "utf8"), { titles: titleArg ? titleArg.split("|") : [] });
const outDir = join(ROOT, "content/books", slug, "chapters");
mkdirSync(outDir, { recursive: true });
for (const ch of chapters) writeFileSync(join(outDir, `${String(ch.n).padStart(2, "0")}.json`), JSON.stringify(ch, null, 1) + "\n");
writeFileSync(join(outDir, "index.json"), JSON.stringify(chapters.map(({ n, title, part, words, sections }) => ({ n, title, part, words, sections: sections.length })), null, 1) + "\n");
writeFileSync(join(outDir, "import-log.json"), JSON.stringify({ source: basename(file), importedAt: new Date().toISOString().slice(0, 10), corrections }, null, 1) + "\n");
if (corrections.length) console.log("corrections:\n  " + corrections.join("\n  "));
console.log(`${slug}: ${chapters.length} chapters, ${chapters.reduce((a, c) => a + c.words, 0)} words`);
