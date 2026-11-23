// Chapter quizzes and the final book assessment, with instant feedback and adaptive question order.
import { t, L, lang } from "../i18n.js";
import { $, esc, mix, num, pct, shuffle, ICON } from "../util.js";
import { book, study, studyAll, chapter, textAllowed } from "../data.js";
import * as store from "../store.js";
import { say } from "../audio.js";
import { bookTitle } from "./parts.js";

const EASY = ["vocab", "comprehension"];

export async function render(main, [slug, which]) {
  const b = await book(slug);
  if (!b) { main.innerHTML = `<div class="empty">${t("notFound")}</div>`; return; }
  const final = which === "final";
  const n = final ? 0 : +which;
  let pool;
  if (final) {
    const packs = await studyAll(slug);
    pool = packs.flatMap((p) => (p.quiz || []).map((q) => ({ ...q, ch: p.chapter })));
    pool = shuffle(pool).slice(0, 20);
  } else {
    const pack = await study(slug, n);
    pool = (pack?.quiz || []).map((q) => ({ ...q, ch: n }));
  }
  if (!pool.length) { main.innerHTML = `<a class="link" href="#/book/${slug}">← ${esc(bookTitle(b))}</a><div class="empty">${t("noQuiz")}</div>`; return; }

  // Questions tied to a paragraph can be answered by listening to it (listening comprehension).
  const remaining = [...pool];
  const total = pool.length;
  let score = 0, answered = 0, wrongStreak = 0, rightStreak = 0;
  const history = [];

  function pick() {
    // Adaptive: after mistakes prefer easier types, after a run of successes prefer harder ones.
    let idx = -1;
    if (wrongStreak >= 1) idx = remaining.findIndex((q) => EASY.includes(q.type));
    else if (rightStreak >= 2) idx = remaining.findIndex((q) => !EASY.includes(q.type));
    if (idx < 0) idx = 0;
    return remaining.splice(idx, 1)[0];
  }

  function ask() {
    if (!remaining.length) return done();
    const q = pick();
    const order = shuffle(q.options.map((o, i) => i));
    main.innerHTML = `
      <a class="link" href="#/book/${slug}">← ${esc(bookTitle(b))}</a>
      <div class="row" style="justify-content:space-between;margin:10px 0">
        <h1 class="display h2" style="margin:0">${final ? t("bookAssessment") : `${t("chapterQuiz")} · ${t("chapterN", { n: num(n) })}`}</h1>
        <span class="chip plain">${t("question")} ${num(answered + 1)} ${t("of")} ${num(total)}</span>
      </div>
      <div class="bar" style="margin-bottom:18px"><i style="width:${(answered / total) * 100}%"></i></div>
      <div class="panel" style="max-width:760px">
        <span class="chip gold">${t("q_" + q.type)}</span>
        <h2 class="h2" style="margin-top:12px">${mix(L(q.q))}</h2>
        ${lang() === "ar" && q.q.en ? `<p class="en muted">${esc(q.q.en)}</p>` : ""}
        ${q.ref && q.ch && textAllowed(b) ? `<button class="btn ghost small" id="listen-p">${ICON.speaker} ${t("listenAndAnswer")}</button>` : ""}
        <div class="choices" id="choices">${order.map((i) => `<button class="choice ${/[a-z]/i.test(q.options[i]) ? "en" : "ar"}" data-i="${i}">${esc(q.options[i])}</button>`).join("")}</div>
        <div id="fb"></div>
      </div>`;
    $("#listen-p", main)?.addEventListener("click", async () => {
      const ch = await chapter(slug, q.ch);
      const p = ch?.sections.flatMap((s) => s.paragraphs).find((x) => x.id === q.ref);
      if (p) say(p.en);
    });
    $("#choices", main).addEventListener("click", (e) => {
      const btn = e.target.closest(".choice");
      if (!btn || btn.disabled) return;
      const i = +btn.dataset.i;
      const ok = i === q.answer;
      answered++;
      if (ok) { score++; rightStreak++; wrongStreak = 0; } else { wrongStreak++; rightStreak = 0; }
      history.push({ q, i, ok });
      main.querySelectorAll(".choice").forEach((c) => { c.disabled = true; if (+c.dataset.i === q.answer) c.classList.add("right"); });
      if (!ok) btn.classList.add("wrong");
      $("#fb", main).innerHTML = `<div class="feedback fade-in"><b style="color:${ok ? "var(--ok)" : "var(--red)"}">${ok ? "✓ " + t("correct") : "✗ " + t("wrong")}</b>
        ${!ok ? `<div class="small">${t("answerWas")} <b>${esc(q.options[q.answer])}</b></div>` : ""}
        ${q.explain ? `<p style="margin:8px 0 0">${mix(L(q.explain))}</p>` : ""}
        ${q.ref && q.ch ? `<a class="link small" href="#/read/${slug}/${q.ch}/s1/${q.ref}">${t("inContext")} →</a>` : ""}
        <div style="margin-top:10px"><button class="btn" id="nextq">${remaining.length ? t("nextQ") : t("finish")} →</button></div></div>`;
      $("#nextq", main).focus();
      $("#nextq", main).onclick = ask;
    });
  }

  function done() {
    store.addQuiz(slug, final ? "final" : n, score, total);
    const p = score / total;
    main.innerHTML = `
      <div class="panel fade-in" style="max-width:640px;margin:0 auto;text-align:center">
        <h1 class="display h2">${final ? t("bookAssessment") : t("chapterQuiz")}</h1>
        <div style="display:grid;place-items:center;margin:16px 0"><div class="ring" style="--p:${Math.round(p * 100)}" data-label="${num(score)}/${num(total)}"></div></div>
        <p class="h2">${pct(p)}</p>
        <div class="row" style="justify-content:center">
          <a class="btn" href="#/quiz/${slug}/${which}" onclick="setTimeout(()=>dispatchEvent(new HashChangeEvent('hashchange')),0)">${t("retake")}</a>
          <a class="btn ghost" href="#/book/${slug}">${t("backToBook")}</a>
          <a class="btn ghost" href="#/vocab/review">${t("practiceVocab")}</a>
        </div>
      </div>
      <section class="section" style="max-width:760px;margin-inline:auto">
        ${history.filter((h) => !h.ok).map((h) => `<div class="feedback" style="margin-bottom:8px"><b>${mix(L(h.q.q))}</b><br>${t("answerWas")} <b>${esc(h.q.options[h.q.answer])}</b>${h.q.explain ? `<div class="small">${mix(L(h.q.explain))}</div>` : ""}</div>`).join("")}
      </section>`;
  }
  ask();
}
