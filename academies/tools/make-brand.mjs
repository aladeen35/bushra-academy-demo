// Renders an academy's logo, mark and PWA icons from an SVG design with the preinstalled Chromium.
// Usage: node academies/tools/make-brand.mjs chinese   (writes academies/<id>/assets/*)
// Design: Albushra identity (black, deep red, ivory, gold arch) + one restrained cultural element per academy.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright"); // preinstalled globally in CI/cloud
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DESIGNS = {
  chinese: { glyph: "中", font: "Noto Serif SC", fontParam: "Noto+Serif+SC:wght@700", line1: "ALBUSHRA", line2: "CHINESE ACADEMY", tag: "Learn Mandarin · 学中文" },
  korean: { glyph: "한", font: "Noto Serif KR", fontParam: "Noto+Serif+KR:wght@700", line1: "ALBUSHRA", line2: "KOREAN ACADEMY", tag: "Learn Korean · 한국어" },
  japanese: { glyph: "日", font: "Noto Serif JP", fontParam: "Noto+Serif+JP:wght@700", line1: "ALBUSHRA", line2: "JAPANESE ACADEMY", tag: "Learn Japanese · 日本語" },
};
const id = process.argv[2] || "chinese";
const d = DESIGNS[id];
const out = process.argv[3] || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", id, "assets");
mkdirSync(out, { recursive: true });

const seal = (cx, cy, s) => `
  <g transform="translate(${cx} ${cy})">
    <rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" rx="${s * 0.12}" fill="url(#red)"/>
    <rect x="${-s / 2 + s * 0.07}" y="${-s / 2 + s * 0.07}" width="${s * 0.86}" height="${s * 0.86}" rx="${s * 0.08}" fill="none" stroke="#f6e7c8" stroke-width="${s * 0.025}" opacity=".85"/>
    <text x="0" y="${s * 0.03}" text-anchor="middle" dominant-baseline="middle" font-family="${d.font}" font-weight="700" font-size="${s * 0.62}" fill="#fbf3e3">${d.glyph}</text>
  </g>`;
const defs = `<defs>
  <radialGradient id="bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#2a0d0d"/><stop offset=".55" stop-color="#120909"/><stop offset="1" stop-color="#050303"/></radialGradient>
  <linearGradient id="gold" x1="0" x2="1"><stop offset="0" stop-color="#8a6a22"/><stop offset=".5" stop-color="#f0d48a"/><stop offset="1" stop-color="#8a6a22"/></linearGradient>
  <linearGradient id="red" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d81f2a"/><stop offset="1" stop-color="#7d0b12"/></linearGradient>
  <filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
const full = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">${defs}
  <rect width="960" height="640" fill="url(#bg)"/>
  <path d="M300 300 A180 180 0 0 1 660 300" fill="none" stroke="url(#gold)" stroke-width="6" filter="url(#glow)"/>
  ${seal(480, 250, 170)}
  <text x="480" y="440" text-anchor="middle" font-family="Playfair Display" font-weight="700" font-size="92" fill="#fbf3e3" letter-spacing="4">${d.line1}</text>
  <line x1="110" x2="250" y1="488" y2="488" stroke="url(#gold)" stroke-width="3"/><line x1="710" x2="850" y1="488" y2="488" stroke="url(#gold)" stroke-width="3"/>
  <text x="480" y="500" text-anchor="middle" font-family="Playfair Display" font-weight="700" font-size="40" fill="#d8b35e" letter-spacing="6">${d.line2}</text>
  <text x="480" y="562" text-anchor="middle" font-family="Playfair Display, ${d.font}" font-style="italic" font-size="34" fill="#efe6da">${d.tag}</text>
  <path d="M300 600 Q480 575 660 600" fill="none" stroke="#b3121b" stroke-width="5"/></svg>`;
const icon = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${defs}
  <rect width="512" height="512" fill="url(#bg)"/>
  <path d="M${116 + pad} ${300} A${140 - pad} ${140 - pad} 0 0 1 ${396 - pad} 300" fill="none" stroke="url(#gold)" stroke-width="10" filter="url(#glow)"/>
  ${seal(256, 270, 230 - pad * 1.4)}</svg>`;
const mark = `<svg xmlns="http://www.w3.org/2000/svg" width="458" height="264" viewBox="0 0 458 264">${defs}
  <rect width="458" height="264" fill="url(#bg)"/><path d="M109 210 A120 120 0 0 1 349 210" fill="none" stroke="url(#gold)" stroke-width="6" filter="url(#glow)"/>${seal(229, 150, 150)}</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage();
async function shot(svg, w, h, file, type = "png") {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=${d.fontParam}&display=block"><style>html,body{margin:0;background:#000}</style></head><body>${svg}</body></html>`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(out, file), type: type === "webp" ? "png" : type, clip: { x: 0, y: 0, width: w, height: h } });
}
await shot(full, 960, 640, "logo-full.png");
await shot(mark, 458, 264, "mark.png");
await shot(icon(0), 512, 512, "icon-512.png");
await shot(icon(40), 512, 512, "icon-maskable-512.png");
await browser.close();
console.log("brand written to", out);
