// A vocabulary category: every word with reading, meaning, audio, example, save, and a link to the studio.
import { t, L } from "../i18n.js";
import { $, esc, num, ICON, toast, openSheet } from "../util.js";
import { category, allWords } from "../data.js";
import * as store from "../store.js";
import { say, SLOW } from "../speech.js";
import { term, termOf, meaning, sentence, studioLink, back, levelChip } from "./parts.js";
import { A } from "../ctx.js";

export function wordRows(words) {
  return `<div class="vocab-grid">${words.map((w) => `<article class="vcard" data-id="${esc(w.id)}">
    <div class="row" style="justify-content:space-between;flex-wrap:nowrap;align-items:flex-start">
      <button class="vterm" data-open="${esc(w.id)}">${term(w, { size: "xl", reading: true })}</button>
      <div class="row" style="gap:6px;flex-wrap:nowrap">
        <button class="icon-btn" data-say="${esc(termOf(w))}" aria-label="${t("normal")}">${ICON.speaker}</button>
        <button class="icon-btn" data-slow="${esc(termOf(w))}" aria-label="${t("slow")}">${ICON.slow}</button>
      </div></div>
    <div class="vmeaning">${esc(meaning(w))}</div>
    ${w.ex ? `<div class="vex">${sentence(w.ex, { speak: true })}</div>` : ""}
    <div class="row" style="justify-content:space-between;margin-top:8px">
      <span>${levelChip(w.hsk || w.level)}</span>
      <span class="row" style="gap:6px"><a class="btn ghost small" href="${studioLink(termOf(w))}">${ICON.studio}</a>
      <button class="btn ghost small" data-save="${esc(w.id)}" aria-pressed="${store.isSaved(w.id)}">${store.isSaved(w.id) ? "✓ " + t("saved") : ICON.bookmark}</button></span>
    </div></article>`).join("")}</div>`;
}

export function wireWords(root, words) {
  root.addEventListener("click", (e) => {
    const s = e.target.closest("[data-say]"); if (s) return say(s.dataset.say);
    const sl = e.target.closest("[data-slow]"); if (sl) return say(sl.dataset.slow, { rate: SLOW });
    const sv = e.target.closest("[data-save]");
    if (sv) {
      const id = sv.dataset.save;
      if (store.isSaved(id)) { store.removeWord(id); sv.innerHTML = ICON.bookmark; sv.setAttribute("aria-pressed", "false"); }
      else { store.saveWord(id); sv.innerHTML = "✓ " + t("saved"); sv.setAttribute("aria-pressed", "true"); toast(t("saved")); }
      return;
    }
    const o = e.target.closest("[data-open]"); if (o) openWordSheet(words.find((w) => w.id === o.dataset.open));
  });
}

export function openWordSheet(w) {
  if (!w) return;
  const sheet = openSheet(`<div style="text-align:center">${term(w, { size: "xxl", reading: true })}</div>
    <p style="text-align:center;font-size:1.2rem;margin:6px 0">${esc(meaning(w))}</p>
    <div class="row" style="justify-content:center"><button class="btn" data-say="${esc(termOf(w))}">${ICON.speaker} ${t("normal")}</button>
      <button class="btn ghost" data-slow="${esc(termOf(w))}">${ICON.slow} ${t("slow")}</button>
      <a class="btn ghost" href="${studioLink(termOf(w))}">${ICON.studio} ${t("nav_studio")}</a></div>
    ${w.note_ar ? `<div class="notice" style="margin-top:14px"><b>${t("note")}:</b> ${esc(w.note_ar)}</div>` : ""}
    ${w.ex ? `<h4>${t("example")}</h4>${sentence(w.ex)}` : ""}
    ${A.wordExtra ? A.wordExtra(w) : ""}`, { label: termOf(w) });
  sheet.addEventListener("click", (e) => {
    const s = e.target.closest("[data-say]"); if (s) say(s.dataset.say);
    const sl = e.target.closest("[data-slow]"); if (sl) say(sl.dataset.slow, { rate: SLOW });
  });
  A.onWordSheet?.(sheet, w);
}

export async function render(main, [id]) {
  const c = await category(id);
  main.innerHTML = `${back("#/vocab", "categories")}
    <h1 class="display h1">${esc(c.icon || "")} ${esc(L(c.title))}</h1>
    <p class="muted">${num(c.words.length)} ${t("words")}</p>
    ${wordRows(c.words)}`;
  wireWords(main, c.words);
  await allWords();
}
