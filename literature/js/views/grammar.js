// Grammar Lab: lessons drawn from real sentences in the books' study packs, grouped by topic, adapted to level.
import { t, L } from "../i18n.js";
import { $, $$, esc, mix, num, ICON } from "../util.js";
import { catalog, studyAll } from "../data.js";
import * as store from "../store.js";
import { say } from "../audio.js";
import { bookTitle } from "./parts.js";

const ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
let filter = "level";

async function allLessons() {
  const { books } = await catalog();
  const packs = await Promise.all(books.map(async (b) => ({ b, packs: await studyAll(b.slug) })));
  return packs.flatMap(({ b, packs }) => packs.flatMap((p) => (p.grammar || []).map((g) => ({ ...g, book: b, ch: p.chapter }))));
}

export async function render(main, [id]) {
  const lessons = await allLessons();
  if (id) return lesson(main, lessons.find((g) => g.id === id));
  const lvl = store.level();
  const fit = (g) => !lvl || ORDER.indexOf(g.level) <= ORDER.indexOf(lvl) + 1;
  const list = filter === "level" ? lessons.filter(fit) : lessons;
  const topics = [...new Set(list.map((g) => g.topic))];
  main.innerHTML = `
    <h1 class="display h1">${t("grammarLab")}</h1>
    <p class="muted">${t("grammarIntro")}</p>
    <div class="row" style="margin:14px 0">
      <button class="chip" data-f="level" aria-pressed="${filter === "level"}">${t("forYourLevel")}${lvl ? ` (${lvl})` : ""}</button>
      <button class="chip" data-f="all" aria-pressed="${filter === "all"}">${t("allLessons")} (${num(lessons.length)})</button>
      ${!lvl ? `<a class="link small" href="#/placement">${t("placement")} →</a>` : ""}
    </div>
    ${topics.map((tp) => `<section class="section"><div class="section-head"><h2 class="display h2">${t("t_" + tp)}</h2></div>
      <ul class="chapters">${list.filter((g) => g.topic === tp).map((g) => `<li class="${store.state().grammar[g.id]?.ok ? "done" : ""}"><a href="#/grammar/${esc(g.id)}">
        <span class="num">${esc(g.level || "")}</span><span><b>${mix(L(g.title))}</b><br><span class="small muted">${esc(bookTitle(g.book))} · ${t("chapterN", { n: num(g.ch) })}</span></span><span>${ICON.arrow}</span></a></li>`).join("")}</ul></section>`).join("") || `<div class="empty">${t("noResults")}</div>`}`;
  main.onclick = (e) => { const f = e.target.closest("[data-f]"); if (f) { filter = f.dataset.f; render(main, []); } };
}

function lesson(main, g) {
  if (!g) { main.innerHTML = `<div class="empty">${t("notFound")}</div>`; return; }
  const ex = g.exercise;
  const text = g.book.text !== "none";
  main.innerHTML = `
    <a class="link" href="#/grammar">← ${t("grammarLab")}</a>
    <div class="row"><span class="chip">${esc(g.level || "")}</span><span class="chip gold">${t("t_" + g.topic)}</span><span class="muted small">${esc(bookTitle(g.book))} · ${t("chapterN", { n: num(g.ch) })}</span></div>
    <h1 class="display h1" style="margin-top:8px">${mix(L(g.title))}</h1>
    <div class="grid-2" style="align-items:start">
      <section class="panel"><h2 class="h2">${t("explanation")}</h2>
        <p class="ar" style="line-height:1.9">${mix(g.explain?.ar || "")}</p><p class="en">${esc(g.explain?.en || "")}</p></section>
      <section class="panel"><h2 class="h2">${t("example")}</h2>
        <blockquote class="en" style="margin:0;font-size:1.15rem;line-height:1.7;border-inline-start:4px solid var(--gold);padding-inline-start:12px">${esc(g.example?.en || "")}</blockquote>
        <p class="ar" style="margin-top:10px">${mix(g.example?.ar || "")}</p>
        <div class="row"><button class="btn ghost small" data-say>${ICON.speaker} ${t("listen")}</button>
        ${g.example?.ref && text ? `<a class="btn ghost small" href="#/read/${g.book.slug}/${g.ch}/s1/${g.example.ref}">${t("inContext")} →</a>` : ""}</div></section>
    </div>
    ${ex ? `<section class="panel section" style="max-width:760px"><h2 class="h2">${t("exercise")}</h2>
      <p>${mix(L(ex.q))}</p>
      <div class="choices">${ex.options.map((o, i) => `<button class="choice ${/[a-z]/i.test(o) ? "en" : "ar"}" data-i="${i}">${esc(o)}</button>`).join("")}</div><div id="fb"></div></section>` : ""}`;
  main.onclick = (e) => {
    if (e.target.closest("[data-say]")) return say(g.example.en);
    const c = e.target.closest(".choice");
    if (!c || c.disabled) return;
    const ok = +c.dataset.i === ex.answer;
    $$(".choice", main).forEach((x) => { x.disabled = true; if (+x.dataset.i === ex.answer) x.classList.add("right"); });
    if (!ok) c.classList.add("wrong");
    store.grammarDone(g.id, ok);
    $("#fb", main).innerHTML = `<div class="feedback">${ok ? "✓ " + t("correct") + " · " + t("lessonDone") : "✗ " + t("wrong")}${ex.why ? `<p style="margin:6px 0 0">${mix(L(ex.why))}</p>` : ""}</div>`;
  };
}
