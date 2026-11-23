import { t, L } from "../i18n.js";
import { esc, num, pct, duration } from "../util.js";
import { catalog, book } from "../data.js";
import * as store from "../store.js";
import { bookTitle, chapterCount, progressRing } from "./parts.js";

export async function render(main) {
  const { books } = await catalog();
  const full = (await Promise.all(books.map((b) => book(b.slug)))).filter(Boolean);
  const started = full.filter((b) => store.state().books[b.slug]);
  const completed = full.filter((b) => store.bookProgress(b.slug, chapterCount(b)) >= 1);
  const tot = store.totals();
  const qz = store.quizzes();
  const avg = qz.length ? qz.reduce((a, q) => a + q.score / q.total, 0) / qz.length : 0;
  const saved = store.savedWords().length;
  const bm = store.bookmarks();
  const nt = store.notes();
  const titleOf = (slug) => { const b = full.find((x) => x.slug === slug); return b ? bookTitle(b) : slug; };
  const readHref = (x) => { const b = full.find((y) => y.slug === x.slug); return b?.text === "none" ? `#/study/${x.slug}/${x.n}` : `#/read/${x.slug}/${x.n}/${x.s || "s1"}/${x.pid}`; };

  main.innerHTML = `
    <h1 class="display h1">${t("myLearning")}</h1>
    <div class="stat-row">
      <div class="stat"><b>${num(started.length)}</b><span>${t("booksStarted")}</span></div>
      <div class="stat"><b>${num(completed.length)}</b><span>${t("booksCompleted")}</span></div>
      <div class="stat"><b>${num(full.reduce((a, b) => a + store.chaptersDone(b.slug), 0))}</b><span>${t("chaptersDone")}</span></div>
      <div class="stat"><b>${duration(tot.read)}</b><span>${t("readingTime")}</span></div>
      <div class="stat"><b>${duration(tot.listen)}</b><span>${t("listeningTime")}</span></div>
      <div class="stat"><b>${num(saved)}</b><span>${t("wordsLearned")}</span></div>
      <div class="stat"><b>${saved ? pct(store.masteredCount() / saved) : "—"}</b><span>${t("vocabMastery")}</span></div>
      <div class="stat"><b>${num(store.grammarCount())}</b><span>${t("grammarDone")}</span></div>
      <div class="stat"><b>${qz.length ? pct(avg) : "—"}</b><span>${t("quizAvg")}</span></div>
      <div class="stat"><b>${num(store.streak())}</b><span>${t("streak")}</span></div>
      <div class="stat"><b>${esc(store.level() || "—")}</b><span>${t("level")} <a class="link small" style="min-height:0" href="#/placement">${store.level() ? t("retest") : t("startTest")}</a></span></div>
    </div>
    <section class="section"><div class="section-head"><h2 class="display h2">${t("inProgress")}</h2></div>
      ${started.length ? `<ul class="chapters">${started.map((b) => { const p = store.bookProgress(b.slug, chapterCount(b)); const l = store.state().books[b.slug].last;
        return `<li><a href="${l ? readHref({ slug: b.slug, n: l.n, s: l.s, pid: "" }).replace(/\/$/, "") : `#/book/${b.slug}`}"><span>${progressRing(p, 52)}</span>
          <span><b>${esc(bookTitle(b))}</b><br><span class="small muted">${num(store.chaptersDone(b.slug))} / ${num(chapterCount(b))} ${t("chapters")}</span></span><span>${t("continue")} →</span></a></li>`; }).join("")}</ul>`
        : `<div class="empty">${t("noActivity")}<br><a class="btn small" style="margin-top:10px" href="#/library">${t("nav_library")}</a></div>`}
    </section>
    <div class="grid-2">
      <section><div class="section-head"><h2 class="display h2">${t("bookmarks")}</h2></div>
        ${bm.length ? `<ul class="chapters">${bm.map((x) => `<li><a href="${readHref(x)}"><span class="num">${num(x.n)}</span><span><b class="small">${esc(titleOf(x.slug))}</b><br><span class="en small muted">${esc(x.excerpt)}…</span></span><span></span></a></li>`).join("")}</ul>` : `<div class="empty">${t("noBookmarks")}</div>`}</section>
      <section><div class="section-head"><h2 class="display h2">${t("notes")}</h2></div>
        ${nt.length ? `<ul class="chapters">${nt.map((x) => `<li><a href="${readHref(x)}"><span class="num">✎</span><span><b>${esc(x.text)}</b><br><span class="en small muted">${esc(titleOf(x.slug))} · ${esc(x.excerpt.slice(0, 80))}…</span></span><span></span></a></li>`).join("")}</ul>` : `<div class="empty">${t("noNotes")}</div>`}</section>
    </div>
    <section class="section"><div class="section-head"><h2 class="display h2">${t("quizHistory")}</h2></div>
      ${qz.length ? `<table class="admin-table"><tbody>${qz.slice(0, 30).map((q) => `<tr><td>${esc(titleOf(q.slug))}</td><td>${q.n === "final" ? t("bookAssessment") : t("chapterN", { n: num(q.n) })}</td><td><b>${num(q.score)}/${num(q.total)}</b></td><td class="muted small">${new Date(q.t).toLocaleDateString(document.documentElement.lang === "ar" ? "ar-SA" : "en-GB")}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">—</div>`}
    </section>`;
}
