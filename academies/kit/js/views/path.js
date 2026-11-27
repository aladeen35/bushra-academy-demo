// The curriculum: units (A, B, C…) with ordered lessons. Lessons open in order inside a unit, but any unit can be
// started (a learner who already knows pinyin can jump to vocabulary).
import { t, L } from "../i18n.js";
import { esc, num, ICON } from "../util.js";
import { course } from "../data.js";
import * as store from "../store.js";
import { A } from "../ctx.js";

const TYPE_ICON = { module: "script", vocab: "vocab", grammar: "grammar", dialogue: "chat2", test: "test", review: "repeat" };

export async function render(main) {
  const c = await course();
  main.innerHTML = `<h1 class="display h1">${t("curriculum")}</h1>
    <p class="muted">${esc(L(c.intro || A.tagline))}</p>
    ${c.units.map((u, ui) => {
      const done = u.lessons.filter((l) => store.isDone(l.id)).length;
      return `<section class="section unit" id="u${ui}">
        <div class="unit-head"><span class="unit-letter">${esc(u.code || ui + 1)}</span>
          <div style="flex:1"><h2 class="h2" style="margin:0">${esc(L(u.title))}</h2><p class="small muted" style="margin:2px 0 0">${esc(L(u.summary || ""))}</p></div>
          <span class="chip ${done === u.lessons.length ? "ok" : "plain"}">${num(done)} / ${num(u.lessons.length)}</span></div>
        <ol class="lesson-list">${u.lessons.map((l, li) => {
          const st = store.lessonState(l.id);
          const open = li === 0 || store.isDone(u.lessons[li - 1].id) || st;
          return `<li class="${st?.done ? "done" : ""}"><a href="#/lesson/${esc(l.id)}" ${open ? "" : `aria-disabled="true" title="${t("locked")}"`} class="${open ? "" : "locked"}">
            <span class="lnum">${st?.done ? ICON.check : num(li + 1)}</span>
            <span style="flex:1;min-width:0"><b>${esc(L(l.title))}</b><br><span class="small muted">${esc(L(l.summary || ""))}</span></span>
            <span class="ltype">${ICON[TYPE_ICON[l.type]] || ICON.arrow}</span></a></li>`;
        }).join("")}</ol></section>`;
    }).join("")}`;
  const anchor = location.hash.split("#")[2];
  if (anchor) main.querySelector(`#${CSS.escape(anchor)}`)?.scrollIntoView();
}
