// One curriculum lesson: "Learn" content followed by graded practice. Passing (70%) completes the lesson.
// Lesson types: module (academy-specific, e.g. pinyin/hanzi), vocab, grammar, dialogue, review, test.
import { A } from "../ctx.js";
import { t, L } from "../i18n.js";
import { $, esc, num, ICON } from "../util.js";
import { lessonList, category, grammar, dialogues, allWords } from "../data.js";
import * as store from "../store.js";
import { say } from "../speech.js";
import { run, vocabQuestions, grammarQuestions } from "../practice.js";
import { back } from "./parts.js";
import { wordRows } from "./vocab-cat.js";
import { grammarBody } from "./grammar.js";
import { dialogueBody, dialogueQuestions } from "./dialogues.js";

const PASS = 0.7;

export async function render(main, [id]) {
  const list = await lessonList();
  const k = list.findIndex((l) => l.id === id);
  if (k < 0) { main.innerHTML = `<div class="empty">${t("notFound")}</div>`; return; }
  const l = list[k];
  if (l.type === "test") { location.replace(`#/tests/${l.test}`); return; }
  const next = list[k + 1];
  store.touchLesson(l.id);
  const st = store.lessonState(l.id);

  main.innerHTML = `${back("#/path#u" + l.ui, "backToPath")}
    <div class="eyebrow" style="margin-top:8px">${t("unit")} ${esc(l.unit.code || l.ui + 1)} · ${esc(L(l.unit.title))}</div>
    <h1 class="display h1">${esc(L(l.title))} ${st?.done ? `<span class="chip ok">${ICON.check} ${t("done")}</span>` : ""}</h1>
    ${l.summary ? `<p class="muted">${esc(L(l.summary))}</p>` : ""}
    <div class="tabs" role="tablist"><button role="tab" aria-selected="true" data-tab="learn">${t("learn")}</button><button role="tab" aria-selected="false" data-tab="practice">${t("practice")}</button></div>
    <div id="learn"></div>
    <div id="practice" hidden></div>
    <div id="after" class="row" style="justify-content:space-between;margin-top:28px">
      <a class="btn ghost" href="#/path#u${l.ui}">${t("backToPath")}</a>
      ${next ? `<a class="btn ghost" href="#/lesson/${esc(next.id)}">${t("nextInPath")} ${ICON.arrow}</a>` : ""}
    </div>`;
  const learn = $("#learn", main), practice = $("#practice", main);

  // Build learn content + a function that produces practice questions.
  let makeQs = () => [];
  if (l.type === "module") {
    const mod = A.modules.find((m) => m.id === l.module);
    const m = await mod.load();
    makeQs = await m.lesson(learn, l);
  } else if (l.type === "vocab") {
    const c = await category(l.cat);
    const pool = [...(await allWords()).values()];
    const words = l.range ? c.words.slice(l.range[0], l.range[1]) : c.words;
    learn.innerHTML = `<p class="muted small">${esc(c.icon || "")} ${esc(L(c.title))} · ${num(words.length)} ${t("words")}</p>${wordRows(words)}`;
    makeQs = () => vocabQuestions(words, pool, Math.min(10, words.length + 2), ["meaning", "listen", "term", "meaning", "match", "speak", "dictation"]);
  } else if (l.type === "grammar") {
    const g = (await grammar()).find((x) => x.id === l.grammar);
    learn.innerHTML = grammarBody(g, { exercises: false });
    makeQs = () => grammarQuestions(g);
  } else if (l.type === "dialogue") {
    const d = (await dialogues()).find((x) => x.id === l.dialogue);
    learn.innerHTML = "";
    dialogueBody(learn, d);
    makeQs = () => dialogueQuestions(d);
  } else if (l.type === "review") {
    const words = (await Promise.all(l.cats.map((c) => category(c)))).flatMap((c) => c.words);
    learn.innerHTML = `<p>${esc(L(l.summary || ""))}</p>`;
    makeQs = () => vocabQuestions(words, words, 12, ["meaning", "term", "listen", "dictation", "speak", "match"]);
  }
  learn.insertAdjacentHTML("beforeend", `<div class="row" style="justify-content:center;margin-top:24px"><button class="btn" id="go-practice">${t("startPractice")} ${ICON.arrow}</button></div>`);
  learn.addEventListener("click", (e) => { const s = e.target.closest("[data-say]"); if (s) say(s.dataset.say); });

  const tabs = main.querySelectorAll("[data-tab]");
  const show = (tab) => {
    tabs.forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === tab));
    learn.hidden = tab !== "learn";
    practice.hidden = tab !== "practice";
    if (tab === "practice") {
      const qs = makeQs();
      if (!qs.length) { practice.innerHTML = `<div class="empty">${t("noItems")}<br><button class="btn small" id="mark" style="margin-top:12px">${t("markDone")}</button></div>`;
        $("#mark", practice).onclick = () => { store.completeLesson(l.id, 1); render(main, [id]); }; return; }
      run(practice, qs, {
        passMark: PASS, title: L(l.title),
        onFinish: (score, total) => {
          store.addQuiz("lesson", l.id, score, total);
          if (score / total >= PASS) store.completeLesson(l.id, score / total);
        },
      });
    }
    window.scrollTo(0, 0);
  };
  tabs.forEach((b) => (b.onclick = () => show(b.dataset.tab)));
  $("#go-practice", main).onclick = () => show("practice");
}
