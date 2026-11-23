// Chapter study pack: summary, objectives, culture notes, vocabulary, grammar and quiz entry.
// For books whose text is not licensed this is the whole chapter experience.
import { t, L } from "../i18n.js";
import { esc, mix, num, ICON } from "../util.js";
import { book, study, vocab, textAllowed } from "../data.js";
import * as store from "../store.js";
import { openWord } from "../lookup.js";
import { say } from "../audio.js";
import { bookTitle, chapterLabel } from "./parts.js";

export async function render(main, [slug, nStr]) {
  const n = +nStr;
  const [b, pack, voc] = await Promise.all([book(slug), study(slug, n), vocab()]);
  if (!b) { main.innerHTML = `<div class="empty">${t("notFound")}</div>`; return; }
  const ch = (b.chapters || []).find((c) => c.n === n) || { n };
  const canRead = textAllowed(b);
  const chs = b.chapters || [];
  const prev = chs.find((c) => c.n === n - 1);
  const next = chs.find((c) => c.n === n + 1);
  if (!canRead) store.setLast(slug, n, null);
  if (!pack) {
    main.innerHTML = `<a class="link" href="#/book/${slug}">← ${esc(bookTitle(b))}</a><h1 class="display h2">${chapterLabel(ch)}</h1><div class="empty">${t("noQuiz")}</div>`;
    return;
  }
  const words = (pack.vocab || []).map((id) => voc.entries.get(id)).filter(Boolean);
  const st = store.chapterState(slug, n);

  main.innerHTML = `
    <a class="link" href="#/book/${slug}">← ${esc(bookTitle(b))}</a>
    <div class="eyebrow">${ch.part ? esc(ch.part) : ""}</div>
    <h1 class="display h1" style="margin-top:4px">${chapterLabel(ch)}</h1>
    ${!canRead ? `<p class="notice red small">${t("tfaNotice")}</p>` : ""}
    <div class="grid-2" style="margin-top:20px;align-items:start">
      <section class="panel">
        <h2 class="h2">${t("about")}</h2>
        <p class="ar" style="font-size:1.1rem;line-height:1.9">${mix(pack.summary?.ar || "")}</p>
        <p class="en" style="font-size:1.05rem;line-height:1.75">${esc(pack.summary?.en || "")}</p>
        ${canRead ? `<a class="btn ghost small" href="#/read/${slug}/${n}">${t("startReading")} →</a>` : ""}
      </section>
      <section>
        ${pack.objectives?.length ? `<h2 class="h2">${t("objectives")}</h2><ul>${pack.objectives.map((o) => `<li>${mix(L(o))}</li>`).join("")}</ul>` : ""}
        ${pack.culture?.length ? `<h2 class="h2" style="margin-top:18px">${t("context")}</h2>${pack.culture.map((c) => `<details class="panel" style="padding:12px 16px;margin-bottom:8px"><summary style="cursor:pointer;min-height:32px"><b lang="en">${esc(c.term)}</b></summary><p class="en small">${esc(c.en)}</p><p class="ar">${mix(c.ar)}</p></details>`).join("")}` : ""}
      </section>
    </div>
    <section class="section">
      <div class="section-head"><h2 class="display h2">${t("nav_vocab")} · ${num(words.length)}</h2><a class="link" href="#/vocab/practice?b=${slug}&n=${n}">${t("practice")} →</a></div>
      <div class="word-list">${words.map((w) => `<div class="word-row" style="cursor:default">
        <button class="para-btn" style="justify-self:start;text-align:start" data-w="${esc(w.word)}"><span><span class="en" style="font-weight:600">${esc(w.word)}</span> <span class="muted small" style="direction:ltr">${esc(w.ipa || "")}</span><br><span class="ar">${esc(w.ar)}</span></span></button>
        <span class="row"><span class="level">${esc(w.level || "")}</span><button class="icon-btn" data-say="${esc(w.word)}" aria-label="${t("listen")} ${esc(w.word)}">${ICON.speaker}</button>
        <button class="icon-btn" data-save="${esc(w.id)}" aria-pressed="${store.isSaved(w.id)}" aria-label="${t("saveWord")}">${store.isSaved(w.id) ? "★" : "☆"}</button></span></div>`).join("")}</div>
    </section>
    ${pack.grammar?.length ? `<section class="section"><div class="section-head"><h2 class="display h2">${t("grammarLab")}</h2></div>
      <ul class="chapters">${pack.grammar.map((g) => `<li><a href="#/grammar/${esc(g.id)}"><span class="num">${esc(g.level || "")}</span><span><b>${mix(L(g.title))}</b><br><span class="small muted">${t("t_" + g.topic)}</span></span><span>${ICON.arrow}</span></a></li>`).join("")}</ul></section>` : ""}
    <div class="row" style="justify-content:space-between;margin-top:24px">
      ${prev ? `<a class="btn ghost" href="#/study/${slug}/${n - 1}">← ${t("chapterN", { n: num(n - 1) })}</a>` : "<span></span>"}
      <div class="row">
        ${pack.quiz?.length ? `<a class="btn" href="#/quiz/${slug}/${n}">${t("chapterQuiz")}</a>` : ""}
        ${!canRead ? `<button class="btn ghost" id="mark-done" ${st?.done ? "disabled" : ""}>${st?.done ? "✓ " + t("completed") : t("finishChapter")}</button>` : ""}
      </div>
      ${next ? `<a class="btn ghost" href="#/study/${slug}/${n + 1}">${t("chapterN", { n: num(n + 1) })} →</a>` : "<span></span>"}
    </div>`;
  main.addEventListener("click", (e) => {
    const w = e.target.closest("[data-w]"); if (w) return openWord(w.dataset.w, { sentence: w.dataset.w });
    const s = e.target.closest("[data-say]"); if (s) return say(s.dataset.say);
    const sv = e.target.closest("[data-save]");
    if (sv) { const en = voc.entries.get(sv.dataset.save); if (store.isSaved(en.id)) store.removeWord(en.id); else store.saveWord(en); sv.textContent = store.isSaved(en.id) ? "★" : "☆"; sv.setAttribute("aria-pressed", store.isSaved(en.id)); return; }
    const md = e.target.closest("#mark-done");
    if (md) { store.markChapterDone(slug, n); md.disabled = true; md.textContent = "✓ " + t("completed"); }
  });
}
