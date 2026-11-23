// Adaptive placement test (staircase): start at B1, move up after a correct answer, down after a wrong one.
// The estimate is the highest level where the learner answered most questions correctly.
import { t, L, lang } from "../i18n.js";
import { $, esc, num, shuffle } from "../util.js";
import { placementBank } from "../data.js";
import * as store from "../store.js";

const STEPS = 12;

export async function render(main) {
  const bank = await placementBank();
  const levels = bank.levels;
  const intro = () => {
    const cur = store.level();
    main.innerHTML = `<div class="panel" style="max-width:640px;margin:0 auto">
      <h1 class="display h1">${t("placement")}</h1>
      ${cur ? `<p>${t("yourLevel")}: <span class="chip" style="font-size:1rem">${esc(cur)}</span></p>` : ""}
      <p>${t("placementIntro")}</p><p class="small muted">${t("levelNote")}</p>
      <button class="btn" id="go">${cur ? t("retest") : t("startTest")}</button></div>`;
    $("#go", main).onclick = run;
  };
  function run() {
    const byLevel = Object.fromEntries(levels.map((l) => [l, shuffle(bank.questions.filter((q) => q.level === l))]));
    let li = levels.indexOf("B1");
    const log = [];
    const next = () => {
      if (log.length >= STEPS) return finish(log);
      let q = byLevel[levels[li]].pop();
      if (!q) { const alt = levels.findIndex((l) => byLevel[l].length); if (alt < 0) return finish(log); li = alt; q = byLevel[levels[li]].pop(); }
      const order = shuffle(q.options.map((_, i) => i));
      main.innerHTML = `<div class="panel" style="max-width:680px;margin:0 auto">
        <div class="row" style="justify-content:space-between"><span class="eyebrow">${t("placement")}</span><span class="chip plain">${num(log.length + 1)} / ${num(STEPS)}</span></div>
        <div class="bar" style="margin:10px 0 18px"><i style="width:${(log.length / STEPS) * 100}%"></i></div>
        ${q.text ? `<blockquote class="en" style="margin:0 0 14px;padding:12px 14px;background:var(--paper-2);border-radius:10px;line-height:1.7">${esc(q.text)}</blockquote>` : ""}
        <h2 class="h2 en">${esc(q.q.en)}</h2>${lang() === "ar" ? `<p class="ar muted">${esc(q.q.ar)}</p>` : ""}
        <div class="choices">${order.map((i) => `<button class="choice en" data-i="${i}">${esc(q.options[i])}</button>`).join("")}</div></div>`;
      main.querySelector(".choices").onclick = (e) => {
        const b = e.target.closest(".choice");
        if (!b) return;
        const ok = +b.dataset.i === q.answer;
        log.push({ level: q.level, ok });
        li = Math.max(0, Math.min(levels.length - 1, li + (ok ? 1 : -1)));
        next();
      };
    };
    next();
  }
  function finish(log) {
    let est = levels[0];
    for (const l of levels) {
      const at = log.filter((x) => x.level === l);
      if (at.length && at.filter((x) => x.ok).length / at.length >= 0.5) est = l;
    }
    store.setLevel(est, { correct: log.filter((x) => x.ok).length, total: log.length, at: Date.now() });
    main.innerHTML = `<div class="panel fade-in" style="max-width:640px;margin:0 auto;text-align:center">
      <h1 class="display h2">${t("yourLevel")}</h1>
      <div class="display" style="font-size:4rem;color:var(--red)">${est}</div>
      <p>${num(log.filter((x) => x.ok).length)} / ${num(log.length)}</p>
      <p class="small muted">${t("levelNote")}</p>
      <div class="row" style="justify-content:center"><a class="btn" href="#/grammar">${t("grammarLab")}</a><a class="btn ghost" href="#/library">${t("nav_library")}</a></div></div>`;
  }
  intro();
}
