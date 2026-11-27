// Search across vocabulary (term, reading, Arabic, English), grammar lessons and conversations.
import { t, L } from "../i18n.js";
import { esc, num } from "../util.js";
import { allWords, grammar, dialogues } from "../data.js";
import { termOf, readingOf, meaning } from "./parts.js";
import { wordRows, wireWords } from "./vocab-cat.js";
import { A } from "../ctx.js";

const fold = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ًͯ-ْ]/g, "").replace(/\s+/g, "");

export async function render(main, [q]) {
  const f = fold(q);
  const [words, gr, dl] = await Promise.all([allWords(), grammar().catch(() => []), dialogues().catch(() => [])]);
  const hits = [...words.values()].filter((w) => [termOf(w), readingOf(w), w.ar, w.en, (A.searchExtra?.(w) || "")].some((x) => fold(x).includes(f))).slice(0, 60);
  const g = gr.filter((x) => [L(x.title), x.title.en, x.title.ar, x.pattern].some((s) => fold(s).includes(f)));
  const d = dl.filter((x) => [x.title.ar, x.title.en, ...x.lines.map((l) => termOf(l) + l.ar + l.en)].some((s) => fold(s).includes(f)));
  main.innerHTML = `<h1 class="display h1">«${esc(q)}»</h1>
    ${g.length || d.length ? `<ul class="lesson-list">${g.map((x) => `<li><a href="#/grammar/${esc(x.id)}"><span class="lnum">文</span><span><b>${esc(L(x.title))}</b><br><span class="small muted">${esc(x.pattern)}</span></span></a></li>`).join("")}
      ${d.map((x) => `<li><a href="#/dialogues/${esc(x.id)}"><span class="lnum">💬</span><span><b>${esc(L(x.title))}</b></span></a></li>`).join("")}</ul>` : ""}
    <p class="muted">${num(hits.length)} ${t("words")}</p>
    ${hits.length ? wordRows(hits) : `<div class="empty">${t("noItems")}</div>`}`;
  wireWords(main, hits);
}
