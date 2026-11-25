import { t, L, lang, RIGHTS } from "../i18n.js";
import { esc, num, pct } from "../util.js";
import { book, textAllowed } from "../data.js";
import * as store from "../store.js";
import { bookTitle, bookAuthor, chapterCount, chapterLabel, rightsChip } from "./parts.js";

let tab = "contents";

export async function render(main, [slug]) {
  const b = await book(slug);
  if (!b) { main.innerHTML = `<div class="empty">${t("notFound")}</div>`; return; }
  const a = b.about || {};
  const n = chapterCount(b);
  const p = store.bookProgress(slug, n);
  const canRead = textAllowed(b);
  const last = store.state().books[slug]?.last;
  const startHref = canRead ? `#/read/${slug}/${last?.n || 1}/${last?.s || "s1"}` : `#/study/${slug}/${last?.n || 1}`;
  const studyN = new Set(b.available?.study || []);
  const arStatus = b.available?.ar || {};

  const chapterRows = () => {
    let part = null;
    return (b.chapters || []).map((c) => {
      const st = store.chapterState(slug, c.n);
      const head = c.part && c.part !== part ? `<li class="part-label">${esc(c.part)}</li>` : "";
      part = c.part;
      const badges = [
        canRead && c.words ? `<span class="small muted">${num(c.words)} ${t("words")}</span>` : "",
        arStatus[c.n] ? `<span class="chip ${arStatus[c.n] === "approved" ? "ok" : "warn"}">ع</span>` : "",
        studyN.has(c.n) ? `<span class="chip gold">${t("quiz")}</span>` : "",
      ].join(" ");
      const href = canRead ? `#/read/${slug}/${c.n}` : studyN.has(c.n) ? `#/study/${slug}/${c.n}` : "";
      const inner = `<span class="num">${num(c.n)}</span><span>${chapterLabel(c)}${st && !st.done && st.total ? `<div class="bar" style="margin-top:6px;max-width:180px"><i style="width:${(st.read.length / st.total) * 100}%"></i></div>` : ""}</span><span class="row" style="gap:6px">${badges}</span>`;
      return `${head}<li class="${st?.done ? "done" : ""}">${href ? `<a href="${href}">${inner}</a>` : `<div class="muted">${inner}</div>`}</li>`;
    }).join("");
  };

  const r = b.rights || {};
  const rightsRows = [
    ["r_status", rightsChip(b)], ["r_died", r.authorDied ? num(r.authorDied, { useGrouping: false }) : "—"], ["r_first", r.firstPublished ? num(r.firstPublished, { useGrouping: false }) : "—"],
    ["r_juris", esc(L(r.jurisdiction))], ["r_edition", esc(L(r.sourceEdition))], ["r_trans", esc(L(r.translationRights))], ["r_audio", esc(L(r.audioRights))],
    ["r_dist", esc(L(r.distributionRights))], ["r_cond", esc(L(r.conditions))],
    ["r_docs", (r.licenseDocs || []).length ? r.licenseDocs.map((d) => `<a class="link" href="${esc(d.url || d)}" rel="noopener" target="_blank">${esc(d.name || d.url || d)}</a>`).join("<br>") : "—"],
    ["r_verified", esc(r.verifiedAt || "—")],
  ];

  const tabs = {
    contents: () => `<ul class="chapters">${chapterRows()}</ul>`,
    about: () => `
      ${a.objectives?.length ? `<h3>${t("objectives")}</h3><ul>${a.objectives.map((o) => `<li>${esc(L(o))}</li>`).join("")}</ul>` : ""}
      ${a.context ? `<h3>${t("context")}</h3><p>${esc(L(a.context))}</p>` : ""}
      ${a.themes?.length ? `<h3>${t("themes")}</h3><ul>${a.themes.map((o) => `<li>${esc(L(o))}</li>`).join("")}</ul>` : ""}
      ${a.author ? `<h3>${t("aboutAuthor")}</h3><p><b lang="en">${esc(a.author.name || b.author)}</b> ${a.author.born ? `(${a.author.born}–${a.author.died || ""})` : ""}</p><p>${esc(L(a.author.bio))}</p>` : ""}`,
    characters: () => `<div class="char-list">${(a.characters || []).map((c) => `<div><b class="en" style="display:block">${esc(c.name)}</b><span class="small">${esc(L(c))}</span></div>`).join("") || `<div class="empty">—</div>`}</div>`,
    rights: () => `<table class="rights-table"><tbody>${rightsRows.map(([k, v]) => `<tr><th>${t(k)}</th><td>${v}</td></tr>`).join("")}</tbody></table>`,
  };

  main.innerHTML = `
    <div class="book-hero fade-in">
      <div class="cover"><img src="${esc(b.cover)}" alt="${esc(b.title)}" width="300" height="450"></div>
      <div>
        <div class="eyebrow">${esc(L(b.genre))}</div>
        <h1 class="display h1" lang="en" style="margin:4px 0">${esc(b.title)}</h1>
        ${lang() === "ar" && b.titleAr ? `<div class="h2" style="font-family:var(--naskh)">${esc(b.titleAr)}</div>` : ""}
        <div class="muted">${esc(bookAuthor(b))} · ${num(b.year, { useGrouping: false })}</div>
        <div class="facts">
          <div><b>${esc(b.level || "—")}</b><span>${t("level")}</span></div>
          <div><b>${num(n)}</b><span>${t("chapters")}</span></div>
          <div><b>${num(b.studyHours || 0)}</b><span>${t("hours")} · ${t("studyTime")}</span></div>
          <div><b>${pct(p)}</b><span>${t("yourProgress")}</span></div>
        </div>
        <div class="row">${rightsChip(b)}<span class="chip plain">${canRead ? t("fullText") : t("studyOnly")}</span></div>
        ${!canRead ? `<p class="notice red small" style="margin-top:12px">${t("tfaNotice")}</p>` : ""}
        <div class="row" style="margin-top:14px">
          <a class="btn" href="${startHref}">${last ? t("continue") : canRead ? t("startReading") : t("studyChapter")}</a>
          ${studyN.size ? `<a class="btn ghost" href="#/quiz/${slug}/final">${t("bookAssessment")}</a>` : ""}
        </div>
      </div>
    </div>
    <div class="tabs" role="tablist">${Object.keys(tabs).map((k) => `<button role="tab" aria-selected="${k === tab}" data-tab="${k}">${t(k === "contents" ? "contents" : k === "about" ? "about" : k)}</button>`).join("")}</div>
    <div id="tab-body" role="tabpanel"></div>`;
  const body = main.querySelector("#tab-body");
  const show = () => { body.innerHTML = tabs[tab](); main.querySelectorAll("[data-tab]").forEach((x) => x.setAttribute("aria-selected", x.dataset.tab === tab)); };
  main.querySelector(".tabs").addEventListener("click", (e) => { const x = e.target.closest("[data-tab]"); if (x) { tab = x.dataset.tab; show(); } });
  show();
}
