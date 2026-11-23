// Small reusable view fragments.
import { t, L, lang, RIGHTS } from "../i18n.js";
import { esc, num, pct } from "../util.js";
import * as store from "../store.js";

export const bookTitle = (b) => (lang() === "ar" && b.titleAr ? b.titleAr : b.title);
export const bookAuthor = (b) => (lang() === "ar" && b.authorAr ? b.authorAr : b.author);
export const chapterCount = (b) => b.chapters?.length || b.chapterCount || 0;

export function bookCard(b) {
  const p = store.bookProgress(b.slug, chapterCount(b));
  return `<a class="book-card" href="#/book/${esc(b.slug)}">
    <div class="cover"><img src="${esc(b.cover)}" alt="${esc(b.title)}" loading="lazy" width="300" height="450">
      ${p > 0 ? `<div class="bar" aria-hidden="true"><i style="width:${Math.round(p * 100)}%"></i></div>` : ""}</div>
    <div><h3 lang="en" class="en">${esc(b.title)}</h3><div class="muted small">${esc(bookAuthor(b))}</div></div>
    <div class="meta"><span class="chip">${esc(L(b.genre).split("·")[0].trim())}</span><span class="level">${esc(b.level || "")}</span></div>
  </a>`;
}

export function rightsChip(b) {
  const r = RIGHTS[b.rights?.status] || RIGHTS.awaiting;
  return `<span class="chip ${r.cls}">${t(r.key)}</span>`;
}

export function chapterLabel(c) {
  const head = t("chapterN", { n: num(c.n) });
  return c.title ? `${head} · <span lang="en" class="en" style="display:inline">${esc(c.title)}</span>` : head;
}

export function progressRing(p, size = 120) {
  return `<div class="ring" style="--p:${Math.round(p * 100)};width:${size}px" data-label="${pct(p)}" role="img" aria-label="${pct(p)}"></div>`;
}

export function trStatusBadge(status) {
  if (status === "approved") return `<span class="chip ok draft-badge">${t("approvedBadge")}</span>`;
  if (status === "reviewed") return `<span class="chip gold draft-badge">${t("reviewedBadge")}</span>`;
  return `<span class="chip warn draft-badge" title="${t("draftBadge")}">${t("draftBadge")}</span>`;
}
