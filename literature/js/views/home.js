import { t, L, lang } from "../i18n.js";
import { esc, num, pct, duration, seeded, today, ICON } from "../util.js";
import { catalog, book, vocab, study } from "../data.js";
import * as store from "../store.js";
import * as fb from "../fb.js";
import { openWord } from "../lookup.js";
import { say } from "../audio.js";
import { bookCard, bookTitle, bookAuthor, chapterCount, chapterLabel, progressRing } from "./parts.js";

export async function render(main) {
  const [{ books, featured }, { entries }] = await Promise.all([catalog(), vocab()]);
  const last = store.state().last;
  const lastBook = last ? books.find((b) => b.slug === last.slug) : null;
  const heroSlug = lastBook?.slug || featured || books[0]?.slug;
  const hero = heroSlug ? await book(heroSlug) : null;
  const full = await Promise.all(books.map((b) => book(b.slug)));
  const u = fb.currentUser();
  const name = u?.displayName?.split(" ")[0];

  // Continue target
  let contHref = hero ? `#/book/${hero.slug}` : "#/library";
  let contLabel = t("startReading");
  if (last && lastBook) { contHref = lastBook.text === "none" ? `#/study/${last.slug}/${last.n}` : `#/read/${last.slug}/${last.n}/${last.s || "s1"}`; contLabel = t("continue"); }
  const heroP = hero ? store.bookProgress(hero.slug, chapterCount(hero)) : 0;

  // Word of the day: stable per day across all learners.
  const all = [...entries.values()].filter((e) => e.ar && e.def);
  const wod = all.length ? all[Math.floor(seeded(today())() * all.length)] : null;

  const days = store.lastDays(10);
  const max = Math.max(1, ...days);
  const tot = store.totals();
  const startedBooks = full.filter((b) => b && store.bookProgress(b.slug, chapterCount(b)) > 0);
  const overall = startedBooks.length ? startedBooks.reduce((a, b) => a + store.bookProgress(b.slug, chapterCount(b)), 0) / startedBooks.length : 0;
  const chDone = full.reduce((a, b) => a + (b ? store.chaptersDone(b.slug) : 0), 0);
  const chTotal = startedBooks.reduce((a, b) => a + chapterCount(b), 0);

  // Recommended grammar lessons: from the chapters the learner is on (or the first chapters).
  const recPacks = await Promise.all(full.filter(Boolean).slice(0, 4).map((b) => study(b.slug, store.state().books[b.slug]?.last?.n || 1)));
  const lvl = store.level();
  const order = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const lessons = recPacks.filter(Boolean).flatMap((p, i) => (p.grammar || []).map((g) => ({ ...g, book: full.filter(Boolean)[i] })))
    .filter((g) => !lvl || order.indexOf(g.level) <= order.indexOf(lvl) + 1).slice(0, 3);

  const recent = store.bookmarks().length || last ? books.filter((b) => store.state().books[b.slug]?.last).sort((a, b) => store.state().books[b.slug].last.t - store.state().books[a.slug].last.t).slice(0, 3) : [];

  main.innerHTML = `
  <section class="hero fade-in">
    <div class="hero-copy">
      <h1 class="display">${last ? t("welcome") : t("welcomeNew")}${name ? `, <em>${esc(name)}</em>` : last ? "" : ` <em>${t("appName")}</em>`}${last && !name ? "" : ""}</h1>
      <p>${t("discover")}</p>
      <div class="row"><a class="btn" href="${contHref}">${ICON.play} ${contLabel}</a><a class="link" href="#/learning">${t("viewProgress")} →</a></div>
    </div>
    ${hero ? `<div class="hero-art"><img src="${esc(hero.cover)}" alt="" width="600" height="900">
      <div class="hero-progress"><div class="display" style="font-size:1.3rem" lang="en">${esc(hero.title)}</div><div class="small" style="opacity:.8">${esc(bookAuthor(hero))}</div>
      <div class="row small" style="justify-content:space-between;margin:8px 0 6px"><span>${t("yourProgress")}</span><b>${pct(heroP)}</b></div>
      <div class="bar"><i style="width:${heroP * 100}%"></i></div></div></div>` : ""}
  </section>

  <div class="home-grid">
    <div>
      <section class="section">
        <div class="section-head"><h2 class="display h2">${t("library")}</h2><a class="link" href="#/library">${t("exploreAll")} →</a></div>
        <div class="shelf">${books.map((b) => bookCard(full.find((f) => f?.slug === b.slug) || b)).join("")}</div>
      </section>
      ${recent.length ? `<section class="section"><div class="section-head"><h2 class="display h2">${t("recent")}</h2></div>
        <ul class="chapters">${recent.map((b) => { const l = store.state().books[b.slug].last; const fb_ = full.find((f) => f?.slug === b.slug); const c = fb_?.chapters?.find((x) => x.n === l.n) || { n: l.n };
          return `<li><a href="${b.text === "none" ? `#/study/${b.slug}/${l.n}` : `#/read/${b.slug}/${l.n}/${l.s || "s1"}`}"><span class="num">${num(l.n)}</span><span><b>${esc(bookTitle(b))}</b><br><span class="small muted">${chapterLabel(c)}</span></span><span>${ICON.arrow}</span></a></li>`; }).join("")}</ul></section>` : ""}
      ${lessons.length ? `<section class="section"><div class="section-head"><h2 class="display h2">${t("recommended")}</h2><a class="link" href="#/grammar">${t("grammarLab")} →</a></div>
        <ul class="chapters">${lessons.map((g) => `<li><a href="#/grammar/${esc(g.id)}"><span class="num">${esc(g.level)}</span><span><b>${esc(L(g.title))}</b><br><span class="small muted">${esc(bookTitle(g.book))} · ${t("t_" + g.topic)}</span></span><span>${ICON.arrow}</span></a></li>`).join("")}</ul></section>` : ""}
    </div>
    <aside>
      ${wod ? `<section class="section panel word-of-day">
        <div class="eyebrow">${t("todaysWord")}</div>
        <p class="w" lang="en">${esc(wod.word)}</p>
        <div class="ipa">${esc(wod.ipa || "")}</div>
        <div class="row" style="justify-content:space-between"><span class="tr" lang="ar">${esc(wod.ar)}</span><button class="icon-btn" id="wod-say" aria-label="${t("listen")}">${ICON.speaker}</button></div>
        <p class="en small" style="margin:8px 0">${esc(wod.def)}</p>
        <button class="btn ghost small" id="wod-more">${t("learnMore")} →</button>
      </section>` : ""}
      <section class="section panel">
        <div class="eyebrow">${t("streak")}</div>
        <div class="streak"><b>${num(store.streak())}</b><span>${store.streak() === 1 ? t("day") : t("days")}</span>
          <div class="spark" aria-hidden="true">${days.map((v) => `<i class="${v ? "" : "off"}" style="height:${v ? 8 + (v / max) * 36 : 6}px"></i>`).join("")}</div></div>
      </section>
      <section class="section panel">
        <div class="eyebrow">${t("progressTitle")}</div>
        <div class="row" style="gap:18px;margin-top:10px">${progressRing(overall, 110)}
          <div class="small" style="display:grid;gap:6px">
            <span>📖 ${num(startedBooks.length)} ${t("of")} ${num(books.length)} ${t("booksDone")}</span>
            <span>📑 ${num(chDone)}${chTotal ? ` ${t("of")} ${num(chTotal)}` : ""} ${t("chaptersDone")}</span>
            <span>⏱ ${duration(tot.read)} ${t("readingTime")}</span>
          </div></div>
      </section>
      <section class="section">
        <div class="eyebrow" style="margin-bottom:8px">${t("quick")}</div>
        <div class="grid-2" style="grid-template-columns:1fr 1fr;gap:10px">
          <a class="btn ghost" href="${contHref}">${t("readNext")}</a>
          <a class="btn ghost" href="#/vocab/review">${t("practiceVocab")}</a>
          <a class="btn ghost" href="${hero ? `#/quiz/${hero.slug}/${store.state().books[hero.slug]?.last?.n || 1}` : "#/library"}">${t("takeQuiz")}</a>
          <a class="btn ghost" href="#/tutor">${t("askTutor")}</a>
        </div>
      </section>
    </aside>
  </div>`;
  main.querySelector("#wod-say")?.addEventListener("click", () => say(wod.word));
  main.querySelector("#wod-more")?.addEventListener("click", () => openWord(wod.word, { sentence: wod.word }));
}
