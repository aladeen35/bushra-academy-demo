// Vocabulary: categories, my saved words, spaced-repetition review, mixed practice.
import { t, L } from "../i18n.js";
import { $, esc, num, shuffle, ICON } from "../util.js";
import { categories, allWords } from "../data.js";
import * as store from "../store.js";
import { say } from "../speech.js";
import { run, vocabQuestions } from "../practice.js";
import { term, termOf, meaning, sentence } from "./parts.js";
import { wordRows, wireWords } from "./vocab-cat.js";

const TABS = [["", "categories"], ["mine", "myWords"], ["review", "review"], ["practice", "practice"]];

export async function render(main, [tab = ""]) {
  const [cats, words] = await Promise.all([categories(), allWords()]);
  const saved = store.savedWords().map((w) => ({ ...w, e: words.get(w.id) })).filter((w) => w.e);
  const due = store.dueWords().filter((w) => words.has(w.id));
  main.innerHTML = `<h1 class="display h1">${t("nav_vocab")}</h1>
    <div class="stat-row">
      <div class="stat"><b>${num(words.size)}</b><span>${t("words")}</span></div>
      <div class="stat"><b>${num(saved.length)}</b><span>${t("wordsLearned")}</span></div>
      <div class="stat"><b>${num(due.length)}</b><span>${t("dueNow")}</span></div>
      <div class="stat"><b>${num(store.masteredCount())}</b><span>${t("mastered")}</span></div>
    </div>
    <div class="tabs" role="tablist">${TABS.map(([k, key]) => `<a role="tab" aria-selected="${k === tab}" href="#/vocab${k ? "/" + k : ""}">${t(key)}${k === "review" && due.length ? ` (${num(due.length)})` : ""}</a>`).join("")}</div>
    <div id="vbody"></div>`;
  const body = $("#vbody", main);

  if (!tab) {
    body.innerHTML = `<div class="cat-grid">${cats.map((c) => {
      const n = c.words.filter((w) => store.isSaved(w.id)).length;
      return `<a class="cat-card" href="#/vocab/cat/${esc(c.id)}"><span class="cat-icon">${esc(c.icon || "")}</span><b>${esc(L(c.title))}</b>
        <span class="small muted">${num(c.words.length)} ${t("words")}${n ? ` · ✓ ${num(n)}` : ""}</span>
        <span class="tl cat-sample" lang="${esc(document.documentElement.dataset.langtag || "")}">${esc(c.words.slice(0, 3).map(termOf).join(" · "))}</span></a>`;
    }).join("")}</div>`;
    return;
  }
  if (tab === "mine") {
    if (!saved.length) { body.innerHTML = `<div class="empty">${t("noWords")}</div>`; return; }
    const list = saved.sort((a, b) => b.added - a.added).map((w) => w.e);
    body.innerHTML = wordRows(list);
    wireWords(body, list);
    return;
  }
  if (tab === "review") {
    const queue = shuffle(due.map((w) => words.get(w.id)));
    let i = 0;
    const card = () => {
      if (i >= queue.length) { body.innerHTML = `<div class="empty">✓ ${t(saved.length ? "reviewDone" : "noWords")}</div>`; return; }
      const w = queue[i];
      body.innerHTML = `<p class="muted small" style="text-align:center">${num(i + 1)} / ${num(queue.length)} · ${t("tapToFlip")}</p>
        <div class="flash" id="flash" tabindex="0" role="button" aria-label="${t("tapToFlip")}"><div class="flash-inner">
          <div class="flash-face">${term(w, { size: "xxl", reading: false })}</div>
          <div class="flash-face back">${term(w, { size: "xl", reading: true })}<div style="font-size:1.2rem">${esc(meaning(w))}</div>${w.ex ? sentence(w.ex, { speak: false }) : ""}</div>
        </div></div>
        <div class="row" style="justify-content:center;margin-top:16px"><button class="icon-btn" data-say="${esc(termOf(w))}" aria-label="${t("playModel")}">${ICON.speaker}</button></div>
        <div class="row" id="grades" style="justify-content:center;margin-top:12px" hidden>
          ${["again", "hard", "good", "easy"].map((g, k) => `<button class="btn ${k === 2 ? "" : "ghost"} small" data-g="${k}">${t(g)}</button>`).join("")}</div>`;
      const flip = () => { $("#flash", body).classList.toggle("flipped"); $("#grades", body).hidden = false; };
      $("#flash", body).onclick = flip;
      $("#flash", body).onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } };
      body.onclick = (e) => {
        const s = e.target.closest("[data-say]"); if (s) return say(s.dataset.say);
        const g = e.target.closest("[data-g]"); if (g) { store.grade(w.id, +g.dataset.g); i++; card(); }
      };
      say(termOf(w));
    };
    card();
    return;
  }
  if (tab === "practice") {
    const pool = [...words.values()];
    const base = saved.length >= 4 ? saved.map((w) => w.e) : pool;
    run(body, vocabQuestions(base, pool, 10, ["meaning", "listen", "term", "dictation", "match", "speak"]), {
      onFinish: (score, total) => store.addQuiz("vocab", "practice", score, total),
    });
  }
}
