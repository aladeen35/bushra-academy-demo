// AI language tutor (Gemini through Firebase AI Logic; no key in the client). Each academy supplies its own
// persona and rules (A.tutor.system); the kit adds the learner's level, current lesson context and formality.
import { A } from "../ctx.js";
import { t, L, lang } from "../i18n.js";
import { $, esc, ICON } from "../util.js";
import * as fb from "../fb.js";
import * as store from "../store.js";
import { lessonList } from "../data.js";

const history = [];
let formality = "formal";

async function systemPrompt(ctx) {
  const list = await lessonList().catch(() => []);
  const done = list.filter((l) => store.isDone(l.id)).map((l) => l.title.en);
  const lvl = [...(A.levels || [])].reverse().find((lv) => store.cert(lv.id));
  return `${A.tutor.system}
Learner: Arabic speaker (Sudan / Gulf). Certified level here: ${lvl ? lvl.title.en : "none yet (beginner)"}. Completed lessons (${done.length}): ${done.slice(-12).join("; ") || "none"}.
Interface language: ${lang() === "ar" ? "Arabic — explain in clear Modern Standard Arabic; keep target-language text in its own script, always followed by its romanization/reading." : "English — explain in simple English; add short Arabic glosses for key terms."}
Register requested: ${formality === "formal" ? "formal/polite" : "informal/casual"} (point out the difference when it matters).
${ctx ? `CURRENT LESSON CONTEXT: ${JSON.stringify(ctx)}` : "No lesson context; answer general questions."}
General rules:
- Adjust difficulty to the learner; prefer short paragraphs, bullet points and tables of (target | reading | Arabic).
- When correcting a sentence: show the corrected sentence, then explain each change briefly.
- When role-playing a scenario: stay in character with one short line at a time, give the reading and Arabic under each line, and wait for the learner's reply.
- For "quiz me": ask one question at a time and wait.
- Never invent facts about exams; if unsure, say so. Keep content family-friendly and respectful of culture and religion.`;
}

export async function render(main) {
  let ctx = null;
  try { ctx = JSON.parse(sessionStorage.getItem(`ac.${A.id}.tutorCtx`) || "null"); } catch (e) {}
  const pending = sessionStorage.getItem(`ac.${A.id}.tutorAsk`);
  sessionStorage.removeItem(`ac.${A.id}.tutorAsk`);
  const ready = fb.enabled && (await fb.init());
  const user = fb.currentUser();
  const QUICK = ["tq_explain", "tq_correct", "tq_translate", "tq_examples", "tq_pron", "tq_formal", "tq_quiz"];
  const SC = ["sc_intro", "sc_restaurant", "sc_shop", "sc_taxi"];

  main.innerHTML = `<h1 class="display h1">${t("nav_tutor")}</h1>
    <p class="muted">${t("tutorIntro")}</p>
    <div class="panel" style="margin-bottom:16px">
      <div class="eyebrow">${t("tutorCtx")}</div>
      ${ctx ? `<p class="small" style="margin:4px 0"><b>${esc(ctx.title || "")}</b> ${ctx.pattern ? `· <span lang="${A.langTag}" dir="ltr">${esc(ctx.pattern)}</span>` : ""}</p>
        <button class="btn ghost small" id="clear-ctx">${t("clearCtx")}</button>` : `<p class="small muted" style="margin:4px 0">${t("tutorNoCtx")}</p>`}
    </div>
    ${!fb.enabled || !ready ? `<div class="notice">${t("tutorOff")}</div>` : !user ? `<div class="notice">${t("tutorSignIn")} <a class="link" href="#/profile">${t("signIn")} →</a></div>` : `
    <div class="row" style="margin-bottom:8px"><span class="small muted">${t("pattern") ? "" : ""}</span>
      ${["formal", "informal"].map((f) => `<button class="chip" data-f="${f}" aria-pressed="${f === formality}">${t(f)}</button>`).join("")}</div>
    <div class="quick">${QUICK.map((k) => `<button class="chip plain" data-q="${k}">${t(k)}</button>`).join("")}</div>
    <div class="quick">${SC.map((k) => `<button class="chip gold" data-sc="${k}">🎭 ${t("scenario")}: ${t(k)}</button>`).join("")}</div>
    <div class="chat" id="chat" aria-live="polite"></div>
    <form class="chat-form" id="ask"><textarea class="input" name="q" rows="2" placeholder="${t("tutorPh")}" aria-label="${t("tutorPh")}"></textarea><button class="btn">${t("send")}</button></form>`}`;

  $("#clear-ctx", main)?.addEventListener("click", () => { sessionStorage.removeItem(`ac.${A.id}.tutorCtx`); render(main); });
  const chat = $("#chat", main);
  if (!chat) return;
  const fmt = (text) => esc(text).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  const draw = () => {
    chat.innerHTML = history.map((h) => h.role === "me" ? `<div class="msg me">${esc(h.text)}</div>`
      : `<div class="msg ai"><div class="small muted" style="margin-bottom:4px">✦ ${t("aiLabel")}</div>${fmt(h.text)}</div>`).join("");
    chat.lastElementChild?.scrollIntoView({ block: "nearest" });
  };
  async function send(q) {
    if (!q.trim()) return;
    history.push({ role: "me", text: q.trim() });
    draw();
    chat.insertAdjacentHTML("beforeend", `<div class="msg ai muted">${t("thinking")}</div>`);
    try {
      const a = await fb.aiChat(history, await systemPrompt(ctx));
      history.push({ role: "ai", text: a });
      store.xp(1);
    } catch (e) {
      console.error(e);
      history.pop();
      draw();
      chat.insertAdjacentHTML("beforeend", `<div class="msg ai">${t("tutorErr")}</div>`);
      return;
    }
    draw();
  }
  draw();
  $("#ask", main).onsubmit = (e) => { e.preventDefault(); const q = e.target.q.value; e.target.q.value = ""; send(q); };
  $("#ask", main).q.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#ask", main).requestSubmit(); } };
  main.addEventListener("click", (e) => {
    const b = e.target.closest("[data-q]"); if (b) return send(t(b.dataset.q));
    const s = e.target.closest("[data-sc]"); if (s) return send(`${t("scenario")}: ${t(s.dataset.sc)} — ${lang() === "ar" ? "ابدأ المحاكاة بجملة قصيرة منك." : "Start the role-play with one short line."}`);
    const f = e.target.closest("[data-f]"); if (f) { formality = f.dataset.f; main.querySelectorAll("[data-f]").forEach((x) => x.setAttribute("aria-pressed", x.dataset.f === formality)); }
  });
  if (pending) send(pending);
}
