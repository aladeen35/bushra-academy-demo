// AI Literature Tutor (Gemini through Firebase AI Logic). It receives the current book, chapter, selected passage,
// the learner's level and recent progress, and must keep original text and its own explanations clearly apart.
import { t, lang } from "../i18n.js";
import { $, esc, ICON } from "../util.js";
import * as fb from "../fb.js";
import * as store from "../store.js";

const history = []; // kept for the session only

function systemPrompt(ctx) {
  const lvl = store.level() || "unknown (assume B1)";
  const words = store.savedWords().slice(-15).map((w) => w.id).join(", ");
  return `You are the Albushra Literature tutor, teaching English to Arabic-speaking learners (Sudan and the Gulf) through literature.
Learner CEFR level: ${lvl}. Recently saved words: ${words || "none"}.
Interface language: ${lang() === "ar" ? "Arabic. Answer mainly in clear Modern Standard Arabic, keeping English words and examples in English." : "English. Answer in simple English; add a short Arabic gloss for key words."}
${ctx ? `Current book: "${ctx.title}" by ${ctx.author}. Chapter ${ctx.n}${ctx.chapterTitle ? ` ("${ctx.chapterTitle}")` : ""}.
ORIGINAL PASSAGE (verbatim, the only text you may quote):
"""${ctx.selection ? ctx.selection : ctx.text}"""
${ctx.selection ? `It comes from this paragraph:\n"""${ctx.text}"""` : ""}
${ctx.ar ? `Existing Arabic translation of the paragraph (AI draft):\n"""${ctx.ar}"""` : ""}` : "No passage is selected; answer general questions about English and the books in the library."}
Rules:
- Never invent quotations. Quote only words that appear in the ORIGINAL PASSAGE above, and mark every quotation on its own line starting with "> ". Everything else is your explanation.
- If asked about parts of a book you were not given, say you can only explain the passage provided, and do not make up plot details or quotes.
- Adapt vocabulary and length to the learner's level. Prefer short paragraphs and bullet points. Give IPA for pronunciation questions.
- For "test my understanding", ask 3 short questions one at a time and wait for answers.
- Keep content family-friendly and respectful of culture and religion.`;
}

export async function render(main) {
  let ctx = null;
  try { ctx = JSON.parse(sessionStorage.getItem("lit.tutorCtx") || "null"); } catch (e) {}
  let pending = null;
  try { pending = JSON.parse(sessionStorage.getItem("lit.tutorAsk") || "null"); sessionStorage.removeItem("lit.tutorAsk"); } catch (e) {}
  if (pending?.ctx) { ctx = pending.ctx; sessionStorage.setItem("lit.tutorCtx", JSON.stringify(ctx)); }

  const ready = fb.enabled && (await fb.init());
  const user = fb.currentUser();
  const QUICK = ["tq_explain", "tq_translate", "tq_grammar", "tq_pron", "tq_summary", "tq_culture", "tq_examples", "tq_test"];

  main.innerHTML = `
    <h1 class="display h1">${t("tutor")}</h1>
    <p class="muted">${t("tutorIntro")}</p>
    <div class="panel" style="margin-bottom:16px">
      <div class="eyebrow">${t("tutorCtx")}</div>
      ${ctx ? `<p class="small" style="margin:4px 0"><b lang="en">${esc(ctx.title)}</b> · ${t("chapterN", { n: ctx.n })}</p>
        <blockquote class="en" style="margin:6px 0;border-inline-start:3px solid var(--gold);padding-inline-start:10px;max-height:9em;overflow:auto">${esc(ctx.selection || ctx.text)}</blockquote>
        <div class="row"><a class="link small" href="#/read/${ctx.slug}/${ctx.n}/${ctx.s}/${ctx.pid}">${t("inContext")} →</a><button class="btn ghost small" id="clear-ctx">${t("clearCtx")}</button></div>`
        : `<p class="small muted" style="margin:4px 0">${t("tutorNoCtx")}</p>`}
    </div>
    ${!fb.enabled || !ready ? `<div class="notice">${t("tutorOff")}</div>` : !user ? `<div class="notice">${t("tutorSignIn")} <a class="link" href="#/profile">${t("signIn")} →</a></div>` : `
    <div class="quick">${QUICK.map((k) => `<button class="chip plain" data-q="${k}">${t(k)}</button>`).join("")}</div>
    <div class="chat" id="chat" aria-live="polite"></div>
    <form class="chat-form" id="ask"><textarea class="input" name="q" rows="2" placeholder="${t("tutorPh")}" aria-label="${t("tutorPh")}"></textarea><button class="btn">${t("send")}</button></form>`}`;

  $("#clear-ctx", main)?.addEventListener("click", () => { sessionStorage.removeItem("lit.tutorCtx"); render(main); });
  const chat = $("#chat", main);
  if (!chat) return;

  const fmt = (text) => esc(text).split("\n").map((l) => (l.startsWith("&gt; ") ? `<blockquote title="${t("quoteLabel")}">${l.slice(5)}</blockquote>` : l)).join("\n").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  const draw = () => {
    chat.innerHTML = history.map((h) => h.role === "me" ? `<div class="msg me">${esc(h.text)}</div>`
      : `<div class="msg ai"><div class="small muted" style="margin-bottom:4px">✦ ${t("aiLabel")}</div>${fmt(h.text)}</div>`).join("");
    chat.lastElementChild?.scrollIntoView({ block: "nearest" });
  };
  async function send(q) {
    if (!q.trim()) return;
    history.push({ role: "me", text: q.trim() });
    draw();
    chat.insertAdjacentHTML("beforeend", `<div class="msg ai muted" id="typing">${t("thinking")}</div>`);
    try {
      const a = await fb.aiChat(history, systemPrompt(ctx));
      history.push({ role: "ai", text: a });
      store.action();
    } catch (e) {
      console.error(e);
      history.pop();
      chat.insertAdjacentHTML("beforeend", `<div class="msg ai">${t("tutorErr")}</div>`);
      $("#typing", main)?.remove();
      return;
    }
    draw();
  }
  draw();
  $("#ask", main).onsubmit = (e) => { e.preventDefault(); const q = e.target.q.value; e.target.q.value = ""; send(q); };
  $("#ask", main).q.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#ask", main).requestSubmit(); } };
  main.querySelector(".quick").onclick = (e) => { const b = e.target.closest("[data-q]"); if (b) send(t(b.dataset.q)); };
  if (pending?.q) send(pending.q);
}
