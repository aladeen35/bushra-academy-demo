import { t, L } from "../i18n.js";
import { esc, num } from "../util.js";
import { catalog, book } from "../data.js";
import * as store from "../store.js";
import { bookCard, bookAuthor, chapterCount } from "./parts.js";

const F = { q: "", genre: "", author: "", level: "", progress: "" };

export async function render(main) {
  const { books } = await catalog();
  const full = (await Promise.all(books.map((b) => book(b.slug)))).filter(Boolean);
  const genres = [...new Set(full.flatMap((b) => L(b.genre).split("·").map((s) => s.trim())))];
  const authors = [...new Set(full.map((b) => bookAuthor(b)))];
  const levels = [...new Set(full.map((b) => b.level).filter(Boolean))].sort();
  const opt = (v, label, cur) => `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(label)}</option>`;

  main.innerHTML = `
    <div class="section-head"><h1 class="display h1" style="border:0;padding:0">${t("nav_library")}</h1><span class="muted">${num(full.length)} ${t("books")}</span></div>
    <form class="filters" id="lib-f" role="search">
      <input class="input" style="flex:1;min-width:200px;border-radius:999px" name="q" type="search" value="${esc(F.q)}" placeholder="${t("searchPh")}" aria-label="${t("search")}">
      <select name="genre" aria-label="${t("genre")}">${opt("", t("allGenres"), F.genre)}${genres.map((g) => opt(g, g, F.genre)).join("")}</select>
      <select name="author" aria-label="${t("author")}">${opt("", t("allAuthors"), F.author)}${authors.map((g) => opt(g, g, F.author)).join("")}</select>
      <select name="level" aria-label="${t("level")}">${opt("", t("allLevels"), F.level)}${levels.map((g) => opt(g, g, F.level)).join("")}</select>
      <select name="progress" aria-label="${t("yourProgress")}">${opt("", t("allProgress"), F.progress)}${opt("new", t("notStarted"), F.progress)}${opt("doing", t("inProgress"), F.progress)}${opt("done", t("completed"), F.progress)}</select>
    </form>
    <div class="shelf" id="shelf"></div>`;
  const shelf = main.querySelector("#shelf");
  const draw = () => {
    const q = F.q.toLowerCase();
    const list = full.filter((b) => {
      const p = store.bookProgress(b.slug, chapterCount(b));
      return (!q || [b.title, b.titleAr, b.author, b.authorAr, L(b.genre)].some((x) => String(x || "").toLowerCase().includes(q)))
        && (!F.genre || L(b.genre).includes(F.genre))
        && (!F.author || bookAuthor(b) === F.author)
        && (!F.level || b.level === F.level)
        && (!F.progress || (F.progress === "new" ? p === 0 : F.progress === "done" ? p >= 1 : p > 0 && p < 1));
    });
    shelf.innerHTML = list.length ? list.map(bookCard).join("") : `<div class="empty" style="grid-column:1/-1">${t("noResults")}</div>`;
  };
  const form = main.querySelector("#lib-f");
  form.addEventListener("input", () => { for (const k of Object.keys(F)) F[k] = form[k].value; draw(); });
  form.addEventListener("submit", (e) => e.preventDefault());
  draw();
}
