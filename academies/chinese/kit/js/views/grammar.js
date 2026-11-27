// Grammar: list of lessons, and one lesson with pattern, Arabic explanation, examples, common mistakes, exercises.
import { t, L, lang } from "../i18n.js";
import { $, esc, num, ICON } from "../util.js";
import { grammar } from "../data.js";
import * as store from "../store.js";
import { say } from "../speech.js";
import { run, grammarQuestions } from "../practice.js";
import { sentence, back, levelChip } from "./parts.js";
import { A } from "../ctx.js";

export function grammarBody(g, { exercises = true } = {}) {
  const ex = L(g.explain);
  return `<div class="pattern-box"><span class="small muted">${t("pattern")}</span><div class="pattern" dir="ltr" lang="${A.langTag}">${esc(g.pattern)}</div></div>
    <p class="lead">${esc(L(g.summary))}</p>
    ${(Array.isArray(ex) ? ex : [ex]).map((p) => `<p>${esc(p)}</p>`).join("")}
    <h2 class="h2">${t("examples")}</h2><div class="sent-list">${g.examples.map((x) => sentence(x)).join("")}</div>
    ${g.mistakes?.length ? `<h2 class="h2">${t("mistakes")}</h2>${g.mistakes.map((m) => `<div class="mistake">
      <div class="row"><span class="bad-t" lang="${A.langTag}">✗ ${esc(m.wrong)}</span><span class="good-t" lang="${A.langTag}">✓ ${esc(m.right)}</span>
      <button class="icon-btn" data-say="${esc(m.right)}" aria-label="${t("playModel")}">${ICON.speaker}</button></div>
      <p class="small">${esc(L(m.why))}</p></div>`).join("")}` : ""}
    ${exercises ? `<h2 class="h2">${t("exercises")}</h2><div id="gex"></div>` : ""}
    <div class="row" style="margin-top:16px"><button class="btn ghost small" data-tutor="${esc(g.id)}">${ICON.tutor} ${t("tq_explain")}</button></div>`;
}

export async function render(main, [id]) {
  const list = await grammar();
  if (!id) {
    main.innerHTML = `<h1 class="display h1">${t("nav_grammar")}</h1><p class="muted">${t("grammarIntro")}</p>
      <ol class="lesson-list">${list.map((g, i) => `<li class="${store.state().quiz && store.quizzes().some((q) => q.kind === "grammar" && q.id === g.id && q.score / q.total >= 0.7) ? "done" : ""}"><a href="#/grammar/${esc(g.id)}">
        <span class="lnum">${num(i + 1)}</span><span style="flex:1;min-width:0"><b>${esc(L(g.title))}</b><br><span class="small muted" dir="ltr" lang="${A.langTag}">${esc(g.pattern)}</span></span>${levelChip(g.level)}</a></li>`).join("")}</ol>`;
    return;
  }
  const g = list.find((x) => x.id === id);
  if (!g) { main.innerHTML = `<div class="empty">${t("notFound")}</div>`; return; }
  main.innerHTML = `${back("#/grammar", "nav_grammar")}<h1 class="display h1">${esc(L(g.title))}</h1>${grammarBody(g)}`;
  main.addEventListener("click", (e) => {
    const s = e.target.closest("[data-say]"); if (s) say(s.dataset.say);
    const tu = e.target.closest("[data-tutor]");
    if (tu) {
      sessionStorage.setItem(`ac.${A.id}.tutorCtx`, JSON.stringify({ kind: "grammar", title: L(g.title), pattern: g.pattern, summary: g.summary.en, examples: g.examples.slice(0, 3) }));
      sessionStorage.setItem(`ac.${A.id}.tutorAsk`, t("tq_explain"));
      location.hash = "#/tutor";
    }
  });
  run($("#gex", main), grammarQuestions(g), { onFinish: (s, n) => store.addQuiz("grammar", g.id, s, n) });
}
