// Copies the shared kit (academies/kit) into every academy folder (academies/<id>/kit).
// Each academy is served from its own subdomain, so it must carry its own copy of the kit; this script keeps
// the copies identical. `--check` fails (exit 1) when a copy is out of date — CI runs it on every push.
import { cpSync, rmSync, readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const kit = path.join(root, "kit");
const academies = readdirSync(root).filter((d) => existsSync(path.join(root, d, "academy.js")));
const check = process.argv.includes("--check");

const files = (dir, base = dir) => readdirSync(dir).flatMap((f) => {
  const p = path.join(dir, f);
  return statSync(p).isDirectory() ? files(p, base) : [path.relative(base, p)];
});
let bad = 0;
for (const a of academies) {
  const dest = path.join(root, a, "kit");
  if (check) {
    const src = files(kit), dst = existsSync(dest) ? files(dest) : [];
    const diff = [...new Set([...src, ...dst])].filter((f) => !existsSync(path.join(kit, f)) || !existsSync(path.join(dest, f)) || !readFileSync(path.join(kit, f)).equals(readFileSync(path.join(dest, f))));
    if (diff.length) { bad++; console.error(`${a}/kit is out of date: ${diff.join(", ")}\nRun: node academies/tools/sync-kit.mjs`); }
    else console.log(`${a}/kit ✓`);
  } else {
    rmSync(dest, { recursive: true, force: true });
    cpSync(kit, dest, { recursive: true });
    console.log(`synced → ${a}/kit`);
  }
}
process.exit(bad ? 1 : 0);
