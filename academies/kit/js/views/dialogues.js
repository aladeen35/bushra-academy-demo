// Conversations: line-by-line player with a voice per speaker, role-play with speech recognition,
// key phrases and comprehension questions.
import { t, L, lang } from "../i18n.js";
import { $, $$, esc, num, ICON } from "../util.js";
import { dialogues } from "../data.js";
import * as store from "../store.js";
import { say, stop, voiceForGender, listen, similarity, asrSupported, SLOW } from "../speech.js";
import { run } from "../practice.js";
import { termOf, readingOf, meaning, sentence, back, levelChip } from "./parts.js";
import { A } from "../ctx.js";

export function dialogueQuestions(d) {
  return (d.questions || []).map((q) => ({ kind: "mcq", ex: { q: q.q, options: q.options[lang()] || q.options.ar, answer: q.answer, plain: true } }));
}

export function dialogueBody(root, d) {
  const voices = Object.fromEntries(Object.entries(d.people).map(([k, p]) => [k, voiceForGender(p.g)]));
  root.innerHTML = `<p class="scene">${esc(L(d.scene))}</p>
    <div class="row"><button class="btn" id="dplay">${ICON.play} ${t("playAll")}</button>
      ${asrSupported ? Object.entries(d.people).map(([k, p]) => `<button class="btn ghost small" data-role="${k}">${ICON.mic} ${t("roleplay")} <span lang="${A.langTag}">${esc(p.name)}</span></button>`).join("") : ""}</div>
    <div class="dialogue">${d.lines.map((l, i) => {
      const p = d.people[l.who];
      return `<div class="bubble ${l.who === "A" ? "a" : "b"}" data-i="${i}">
        <div class="who"><span lang="${A.langTag}">${esc(p.name)}</span> <span class="small muted">${esc(p.py || "")}</span></div>
        <div class="row" style="flex-wrap:nowrap;align-items:flex-start;gap:8px">
          <div style="flex:1;min-width:0"><div class="tl sent-t" lang="${A.langTag}">${esc(termOf(l))}</div>
          <div class="reading">${esc(readingOf(l))}</div><div class="small muted">${esc(meaning(l))}</div></div>
          <div style="display:grid;gap:4px"><button class="icon-btn" data-line="${i}" aria-label="${t("normal")}">${ICON.speaker}</button>
          <button class="icon-btn" data-slowline="${i}" aria-label="${t("slow")}">${ICON.slow}</button></div></div>
        <div class="heard small"></div></div>`;
    }).join("")}</div>
    ${d.keyPhrases?.length ? `<h2 class="h2">${t("keyPhrases")}</h2><div class="sent-list">${d.keyPhrases.map((x) => sentence(x)).join("")}</div>` : ""}`;
  let token = 0;
  const playLine = async (i, rate) => {
    $$(".bubble", root).forEach((b) => b.classList.toggle("speaking", +b.dataset.i === i));
    const l = d.lines[i];
    return say(termOf(l), { voice: voices[l.who], rate });
  };
  const playAll = async (from = 0, roleSkip = null) => {
    const my = ++token;
    for (let i = from; i < d.lines.length && my === token; i++) {
      if (d.lines[i].who === roleSkip) {
        const b = $(`.bubble[data-i="${i}"]`, root);
        b.classList.add("speaking");
        b.querySelector(".heard").textContent = `🎙 ${t("yourTurn")}`;
        try {
          const heard = await listen();
          const s = similarity(termOf(d.lines[i]), heard);
          store.addPron(termOf(d.lines[i]), s);
          b.querySelector(".heard").innerHTML = `${t("heard")}: <span lang="${A.langTag}">${esc(heard[0] || "—")}</span> · ${t("similarity")} ${Math.round(s * 100)}% ${s >= 0.75 ? "✓" : ""}`;
        } catch (e) { b.querySelector(".heard").textContent = t("micDenied"); return; }
        continue;
      }
      if (!(await playLine(i))) return;
      await new Promise((r) => setTimeout(r, 300));
    }
    $$(".bubble", root).forEach((b) => b.classList.remove("speaking"));
  };
  root.addEventListener("click", (e) => {
    const s = e.target.closest("[data-say]"); if (s) return say(s.dataset.say);
    const ln = e.target.closest("[data-line]"); if (ln) { token++; return playLine(+ln.dataset.line); }
    const sl = e.target.closest("[data-slowline]"); if (sl) { token++; return playLine(+sl.dataset.slowline, SLOW); }
    if (e.target.closest("#dplay")) return playAll();
    const r = e.target.closest("[data-role]"); if (r) return playAll(0, r.dataset.role);
  });
  return () => { token++; stop(); };
}

export async function render(main, [id]) {
  const list = await dialogues();
  if (!id) {
    main.innerHTML = `<h1 class="display h1">${t("nav_dialogues")}</h1><p class="muted">${t("dialoguesIntro")}</p>
      <ol class="lesson-list">${list.map((d, i) => `<li><a href="#/dialogues/${esc(d.id)}"><span class="lnum">${num(i + 1)}</span>
        <span style="flex:1;min-width:0"><b>${esc(L(d.title))}</b><br><span class="small muted">${esc(L(d.scene))}</span></span>${levelChip(d.level)}</a></li>`).join("")}</ol>`;
    return;
  }
  const d = list.find((x) => x.id === id);
  if (!d) { main.innerHTML = `<div class="empty">${t("notFound")}</div>`; return; }
  main.innerHTML = `${back("#/dialogues", "nav_dialogues")}<h1 class="display h1">${esc(L(d.title))}</h1><div id="dbody"></div>
    <h2 class="h2">${t("comprehension")}</h2><div id="dq"></div>`;
  const cleanup = dialogueBody($("#dbody", main), d);
  run($("#dq", main), dialogueQuestions(d), { onFinish: (s, n) => store.addQuiz("dialogue", d.id, s, n) });
  return cleanup;
}
