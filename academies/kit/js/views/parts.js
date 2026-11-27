// Small reusable fragments. Content items use the academy's field names (A.fields.term / A.fields.reading),
// so the same views serve Chinese (hz/py), Korean and Japanese.
import { A } from "../ctx.js";
import { t, L, lang } from "../i18n.js";
import { esc, pct, ICON } from "../util.js";
import { prefs } from "../store.js";

export const termOf = (x) => x?.[A.fields.term] ?? "";
export const readingOf = (x) => x?.[A.fields.reading] ?? "";
export const meaning = (x) => (lang() === "ar" ? x.ar || x.en : x.en || x.ar) || "";

// Target text with its reading above (ruby) when the learner wants it.
export function term(x, { size = "", reading = prefs().showReading, tag = "span" } = {}) {
  const r = readingOf(x);
  return `<${tag} class="tl ${size}" lang="${A.langTag}">${reading && r ? `<ruby>${esc(termOf(x))}<rt lang="${A.readingLang || "en"}">${esc(r)}</rt></ruby>` : esc(termOf(x))}</${tag}>`;
}
// Sentence block: target, reading line, translation.
export function sentence(x, { showAr = prefs().showAr, showReading = prefs().showReading, speak = true } = {}) {
  return `<div class="sent">
    <div class="row" style="flex-wrap:nowrap;align-items:flex-start;gap:8px">
      ${speak ? `<button class="icon-btn" data-say="${esc(termOf(x))}" aria-label="${t("playModel")}">${ICON.speaker}</button>` : ""}
      <div style="min-width:0"><div class="tl sent-t" lang="${A.langTag}">${esc(termOf(x))}</div>
      ${showReading && readingOf(x) ? `<div class="reading" lang="${A.readingLang || "en"}">${esc(readingOf(x))}</div>` : ""}
      ${showAr ? `<div class="tr small muted">${esc(meaning(x))}</div>` : ""}</div>
    </div></div>`;
}
export function progressRing(p, size = 120) {
  return `<div class="ring" style="--p:${Math.round(p * 100)};width:${size}px" data-label="${pct(p)}" role="img" aria-label="${pct(p)}"></div>`;
}
export const studioLink = (text) => `#/studio/${encodeURIComponent(text)}`;
export const back = (href, key) => `<a class="link small" href="${href}">${lang() === "ar" ? "→" : "←"} ${t(key)}</a>`;
export const levelChip = (n) => (n ? `<span class="chip gold">${esc(A.levelName ? A.levelName(n) : n)}</span>` : "");
export { L };
