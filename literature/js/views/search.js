import { t } from "../i18n.js";
import { esc } from "../util.js";
import { searchAll, book } from "../data.js";
import { openWord } from "../lookup.js";
import { bookCard } from "./parts.js";

export async function render(main, [q]) {
  const query = decodeURIComponent(q || "");
  const { books, words } = await searchAll(query);
  const full = (await Promise.all(books.map((b) => book(b.slug)))).filter(Boolean);
  document.querySelector("#search input").value = query;
  main.innerHTML = `<h1 class="display h2">${t("search")}: <span lang="und">${esc(query)}</span></h1>
    ${full.length ? `<section class="section"><div class="section-head"><h2 class="h2 display">${t("books")}</h2></div><div class="shelf">${full.map(bookCard).join("")}</div></section>` : ""}
    ${words.length ? `<section class="section"><div class="section-head"><h2 class="h2 display">${t("nav_vocab")}</h2></div>
      <div class="word-list">${words.map((w) => `<button class="word-row" data-w="${esc(w.word)}"><span><span class="en">${esc(w.word)}</span> <span class="muted small">${esc(w.ipa || "")}</span></span><span class="ar">${esc(w.ar)}</span></button>`).join("")}</div></section>` : ""}
    ${!full.length && !words.length ? `<div class="empty">${t("noResults")}</div>` : ""}`;
  main.addEventListener("click", (e) => { const b = e.target.closest("[data-w]"); if (b) openWord(b.dataset.w, { sentence: b.dataset.w }); });
}
