// Level assessments. Each academy defines levels (A.levels) with a question recipe; questions are generated
// from that academy's own vocabulary, grammar and conversations. Passing gives a printable Albushra certificate.
import { A } from "../ctx.js";
import { t, L } from "../i18n.js";
import { $, esc, num, pct, shuffle, ICON } from "../util.js";
import { allWords, grammar, dialogues } from "../data.js";
import * as store from "../store.js";
import * as fb from "../fb.js";
import { run, vocabQuestions } from "../practice.js";
import { back } from "./parts.js";

export const PASS = 0.8;

async function build(level) {
  const words = [...(await allWords()).values()];
  const pool = words.filter(level.filter || (() => true));
  const r = level.recipe || { meaning: 6, term: 4, listen: 4, dictation: 0, grammar: 4, dialogue: 2 };
  const qs = [];
  for (const k of ["meaning", "term", "listen", "dictation"]) if (r[k]) qs.push(...vocabQuestions(pool, words, r[k], [k]));
  if (r.grammar) {
    const g = (await grammar().catch(() => [])).filter((x) => !level.grammarLevel || x.level <= level.grammarLevel);
    const ex = shuffle(g.flatMap((x) => x.exercises.filter((e) => e.type !== "translate").map((e) => ({ kind: e.type, ex: e }))));
    qs.push(...ex.slice(0, r.grammar));
  }
  if (r.dialogue) {
    const d = (await dialogues().catch(() => [])).filter((x) => !level.dialogueLevel || x.level <= level.dialogueLevel);
    qs.push(...shuffle(d.flatMap((x) => (x.questions || []).map((q) => ({ kind: "mcq", ex: { q: q.q, options: q.options[document.documentElement.lang] || q.options.ar, answer: q.answer, plain: true } })))).slice(0, r.dialogue));
  }
  if (level.extra) qs.push(...(await level.extra()));
  return shuffle(qs);
}

export async function render(main, [id]) {
  const levels = A.levels || [];
  if (!id) {
    main.innerHTML = `<h1 class="display h1">${t("nav_tests")}</h1><p class="muted">${t("testsIntro", { n: pct(PASS) })}</p>
      <div class="level-grid">${levels.map((lv) => {
        const best = store.quizzes().filter((q) => q.kind === "test" && q.id === lv.id).reduce((m, q) => Math.max(m, q.score / q.total), 0);
        const c = store.cert(lv.id);
        return `<article class="panel level-card"><div class="eyebrow">${esc(L(lv.badge || ""))}</div><h2 class="h2">${esc(L(lv.title))}</h2>
          <p class="small muted">${esc(L(lv.desc))}</p>
          <p class="small">${t("best")}: <b>${best ? pct(best) : "—"}</b> · ${c ? `<span class="chip ok">${t("passed")}</span>` : ""}</p>
          <div class="row"><a class="btn small" href="#/tests/${esc(lv.id)}">${t("takeTest")}</a>${c ? `<a class="btn ghost small" href="#/cert/${esc(lv.id)}">${t("viewCert")}</a>` : ""}</div></article>`;
      }).join("")}</div>`;
    return;
  }
  const lv = levels.find((x) => x.id === id);
  if (!lv) { main.innerHTML = `<div class="empty">${t("notFound")}</div>`; return; }
  main.innerHTML = `${back("#/tests", "nav_tests")}<h1 class="display h1">${esc(L(lv.title))}</h1><p class="muted">${esc(L(lv.desc))} · ${t("passMark")} ${pct(PASS)}</p><div id="tbody"></div>`;
  const qs = await build(lv);
  run($("#tbody", main), qs, {
    passMark: PASS, title: L(lv.title),
    onFinish: (score, total, root) => {
      store.addQuiz("test", lv.id, score, total);
      if (score / total >= PASS) {
        const name = fb.currentUser()?.displayName || store.prefs().certName || "";
        store.addCert(lv.id, score / total, name);
        root.insertAdjacentHTML("beforeend", `<div class="row" style="justify-content:center;margin-top:16px"><a class="btn" href="#/cert/${esc(lv.id)}">${ICON.test} ${t("viewCert")}</a></div>`);
      }
    },
  });
}
