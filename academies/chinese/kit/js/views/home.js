// Academy dashboard: level, daily goal, completed lessons, vocabulary, pronunciation, quiz scores, streak,
// overall progress and the recommended next lesson. Numbers belong to this academy only.
import { A } from "../ctx.js";
import { t, L, lang } from "../i18n.js";
import { esc, num, pct, seeded, today, ICON } from "../util.js";
import { lessonList, allWords } from "../data.js";
import * as store from "../store.js";
import * as fb from "../fb.js";
import { say } from "../speech.js";
import { term, meaning, termOf, readingOf, progressRing, studioLink } from "./parts.js";

export async function nextLesson(list) { return list.find((l) => !store.isDone(l.id)) || null; }

export async function render(main) {
  const [list, words] = await Promise.all([lessonList(), allWords()]);
  const done = list.filter((l) => store.isDone(l.id)).length;
  const next = await nextLesson(list);
  const overall = list.length ? done / list.length : 0;
  const levelNow = [...(A.levels || [])].reverse().find((lv) => store.cert(lv.id)) || null;
  const goal = store.state().goal || 20;
  const xp = store.xpToday();
  const pron = store.pronAvg();
  const qa = store.quizAvg();
  const all = [...words.values()];
  const wod = all.length ? all[Math.floor(seeded(today() + A.id)() * all.length)] : null;
  const days = store.lastDays(10);
  const max = Math.max(1, ...days);
  const u = fb.currentUser();
  const name = u?.displayName?.split(" ")[0];

  main.innerHTML = `
  <section class="hero academy-hero fade-in">
    <div class="hero-copy">
      <div class="eyebrow" style="color:var(--gold)">${esc(L(A.name))}</div>
      <h1 class="display">${done ? t("welcome") : t("welcomeNew")}${name ? `, <em>${esc(name)}</em>` : done ? "" : ` <em>${esc(L(A.short))}</em>`}</h1>
      <p>${esc(L(A.tagline))}</p>
      <div class="row">${next ? `<a class="btn" href="#/lesson/${esc(next.id)}">${ICON.play} ${done ? t("continue") : t("start")}</a>` : ""}<a class="link" style="color:#fff" href="#/path">${t("curriculum")} →</a></div>
    </div>
    <div class="hero-art hero-glyph" aria-hidden="true"><span lang="${A.langTag}">${esc(A.heroGlyph || A.nativeName)}</span></div>
  </section>

  <div class="stat-row" style="margin-top:20px">
    <div class="stat"><b>${levelNow ? esc(L(levelNow.title)) : "—"}</b><span>${t("yourLevel")}</span></div>
    <div class="stat"><b>${num(done)}<small> / ${num(list.length)}</small></b><span>${t("lessonsDone")}</span></div>
    <div class="stat"><b>${num(store.savedWords().length)}</b><span>${t("wordsLearned")}</span></div>
    <div class="stat"><b>${pron == null ? "—" : pct(pron)}</b><span>${t("pronScore")}</span></div>
    <div class="stat"><b>${qa == null ? "—" : pct(qa)}</b><span>${t("quizAvg")}</span></div>
  </div>

  <div class="home-grid">
    <div>
      ${next ? `<section class="section panel next-lesson">
        <div class="eyebrow">${t("nextLesson")}</div>
        <h2 class="h2" style="margin:6px 0">${esc(L(next.title))}</h2>
        <p class="muted small" style="margin:0 0 12px">${t("unit")} ${num(next.ui + 1)} · ${esc(L(next.unit.title))}</p>
        <a class="btn" href="#/lesson/${esc(next.id)}">${t("open")} ${ICON.arrow}</a>
      </section>` : ""}
      <section class="section">
        <div class="section-head"><h2 class="display h2">${t("curriculum")}</h2><a class="link" href="#/path">${t("open")} →</a></div>
        <div id="units"></div>
      </section>
    </div>
    <aside>
      <section class="section panel">
        <div class="eyebrow">${t("dailyGoal")}</div>
        <div class="row" style="gap:16px;margin-top:8px">${progressRing(Math.min(1, xp / goal), 96)}
          <div><b style="font-size:1.3rem">${num(xp)} / ${num(goal)}</b> ${t("xp")}<br><span class="small muted">${xp >= goal ? "🎉 " + t("goalDone") : ""}</span></div></div>
      </section>
      <section class="section panel">
        <div class="eyebrow">${t("streak")}</div>
        <div class="streak"><b>${num(store.streak())}</b><span>${store.streak() === 1 ? t("day") : t("days")}</span>
          <div class="spark" aria-hidden="true">${days.map((v) => `<i class="${v ? "" : "off"}" style="height:${v ? 8 + (v / max) * 36 : 6}px"></i>`).join("")}</div></div>
      </section>
      <section class="section panel">
        <div class="eyebrow">${t("overall")}</div>
        <div class="row" style="gap:16px;margin-top:8px">${progressRing(overall, 96)}<p class="small muted" style="margin:0;flex:1">${t("progressNote")}</p></div>
      </section>
      ${wod ? `<section class="section panel word-of-day">
        <div class="eyebrow">${t("wordOfDay")}</div>
        <div class="row" style="justify-content:space-between;align-items:center">${term(wod, { size: "xl", reading: true })}
          <button class="icon-btn" data-say="${esc(termOf(wod))}" aria-label="${t("playModel")}">${ICON.speaker}</button></div>
        <p style="margin:6px 0">${esc(meaning(wod))}</p>
        <a class="btn ghost small" href="${studioLink(termOf(wod))}">${t("studyWord")} →</a>
      </section>` : ""}
      <section class="section">
        <div class="eyebrow" style="margin-bottom:8px">${t("quick")}</div>
        <div class="grid-2" style="grid-template-columns:1fr 1fr;gap:10px">
          <a class="btn ghost" href="#/vocab/review">${t("reviewWords")}</a>
          <a class="btn ghost" href="#/studio">${t("openStudio")}</a>
          <a class="btn ghost" href="#/tutor">${t("askTutor")}</a>
          <a class="btn ghost" href="#/tests">${t("takeTest")}</a>
        </div>
      </section>
    </aside>
  </div>`;

  // Unit progress cards.
  const units = [];
  for (const l of list) { (units[l.ui] ||= { unit: l.unit, total: 0, done: 0 }).total++; if (store.isDone(l.id)) units[l.ui].done++; }
  main.querySelector("#units").innerHTML = `<div class="unit-grid">${units.map((x, i) => `<a class="unit-card" href="#/path#u${i}">
    <span class="unit-letter">${esc(x.unit.code || i + 1)}</span><b>${esc(L(x.unit.title))}</b>
    <span class="small muted">${num(x.done)} / ${num(x.total)} ${t("lessons")}</span><div class="bar"><i style="width:${(x.done / x.total) * 100}%"></i></div></a>`).join("")}</div>`;
  main.onclick = (e) => { const s = e.target.closest("[data-say]"); if (s) say(s.dataset.say); };
}
