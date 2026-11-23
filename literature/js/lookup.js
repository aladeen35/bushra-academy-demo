// Compact vocabulary panel opened by tapping a word anywhere in the app.
import { t, L, lang } from "./i18n.js";
import { esc, mix, openSheet, closeSheet, toast, ICON } from "./util.js";
import { findWord, onlineLookup, vocab } from "./data.js";
import * as store from "./store.js";
import { say } from "./audio.js";

export const CAT_KEYS = ["beginner", "intermediate", "advanced", "literary", "idiom", "phrasal", "cultural", "historical", "nautical", "political"];

function entryHTML(e, ctx) {
  const saved = store.isSaved(e.id);
  const list = (xs) => xs.map((x) => `<button class="chip plain" data-word="${esc(x)}">${esc(x)}</button>`).join(" ");
  return `
    <div class="vocab-head">
      <div>
        <h2 class="vocab-word">${esc(e.word)}</h2>
        ${e.ipa ? `<div class="ipa">${esc(e.ipa)}</div>` : ""}
      </div>
      <div class="row">
        <button class="icon-btn" data-say="en-GB" aria-label="${t("listen")} — ${t("listenGB")}" title="${t("listenGB")}">${ICON.speaker}<span class="small">GB</span></button>
        <button class="icon-btn" data-say="en-US" aria-label="${t("listen")} — ${t("listenUS")}" title="${t("listenUS")}">${ICON.speaker}<span class="small">US</span></button>
      </div>
    </div>
    ${e.ar ? `<p class="vocab-ar" lang="ar">${esc(e.ar)}</p>` : `<p class="muted small">${t("onlineDict")}</p>`}
    <div class="row" style="margin-top:6px">
      ${e.pos ? `<span class="chip plain">${esc(e.pos)}</span>` : ""}
      ${e.level ? `<span class="chip">${esc(e.level)}</span>` : ""}
      ${e.category ? `<span class="chip gold">${t("cat_" + e.category)}</span>` : ""}
    </div>
    <div class="kv">
      ${e.def ? `<div><h4>${t("definition")}</h4><p class="en">${esc(e.def)}</p></div>` : ""}
      ${e.arExplain ? `<div><h4>${t("arExplain")}</h4><p class="ar">${mix(e.arExplain)}</p></div>` : ""}
      ${e.example ? `<div><h4>${t("example")}${e.exampleRef ? ` · <span class="chip plain">${t("fromBook")}</span>` : ""}</h4>
        <p class="en"><i>${esc(e.example)}</i> <button class="para-btn" data-say-text="${esc(e.example)}" aria-label="${t("listen")}">${ICON.speaker}</button></p>
        ${e.exampleAr ? `<p class="ar">${esc(e.exampleAr)}</p>` : ""}</div>` : ""}
      ${e.synonyms?.length ? `<div><h4>${t("synonyms")}</h4><div class="row">${list(e.synonyms)}</div></div>` : ""}
      ${e.antonyms?.length ? `<div><h4>${t("antonyms")}</h4><div class="row">${list(e.antonyms)}</div></div>` : ""}
    </div>
    <div class="row" style="margin-top:18px">
      <button class="btn" data-save>${saved ? t("removeWord") : t("saveWord")}</button>
      <a class="btn ghost" href="#/tutor" data-ask>${ICON.ask}${t("askAboutWord")}</a>
    </div>`;
}

export async function openWord(word, ctx = {}) {
  const sheet = openSheet(`<p class="muted">${t("lookingUp")}</p>`, { label: word, onClose: ctx.onClose });
  let e = await findWord(word, ctx.sentence);
  if (!e) e = await onlineLookup(word);
  if (!document.body.contains(sheet)) return;
  const body = sheet.querySelector(".sheet-body");
  if (!e) {
    body.innerHTML = `<h2 class="vocab-word">${esc(word)}</h2><p class="muted">${t("lookupFail")}</p>
      <div class="row"><button class="icon-btn" data-say="en-GB">${ICON.speaker}<span class="small">GB</span></button>
      <a class="btn ghost" href="#/tutor" data-ask>${ICON.ask}${t("askAboutWord")}</a></div>`;
    e = { word };
  } else body.innerHTML = entryHTML(e, ctx);
  body.onclick = async (ev) => {
    const b = ev.target.closest("button, a");
    if (!b) return;
    if (b.dataset.say) say(e.word, { accent: b.dataset.say });
    else if (b.dataset.sayText) say(b.dataset.sayText);
    else if (b.dataset.word) openWord(b.dataset.word);
    else if (b.hasAttribute("data-save")) {
      if (store.isSaved(e.id)) { store.removeWord(e.id); b.textContent = t("saveWord"); }
      else { store.saveWord(e); b.textContent = t("removeWord"); toast(t("savedWord")); }
    } else if (b.hasAttribute("data-ask")) {
      sessionStorage.setItem("lit.tutorAsk", JSON.stringify({
        q: lang() === "ar" ? `ما معنى كلمة «${e.word}» في هذا السياق؟ وكيف أنطقها؟` : `What does "${e.word}" mean here, and how do I pronounce it?`,
        ctx: ctx.tutorCtx || null,
      }));
      closeSheet();
    }
  };
}

// Entry for any saved id (curated or saved-from-online).
export async function entryById(id) {
  const { entries } = await vocab();
  return entries.get(id) || store.state().words[id]?.entry || null;
}
