// Interactive exercise engine shared by lessons, vocabulary practice, grammar, dialogues and level tests.
// Question kinds: meaning (term → meaning), term (meaning → term), listen (audio → term), match, order,
// translate, dictation, speak, mcq (free text question), tone (module-provided audio → choice).
import { A } from "./ctx.js";
import { t, L, lang } from "./i18n.js";
import { $, esc, num, shuffle, ICON } from "./util.js";
import { say, listen, similarity, asrSupported } from "./speech.js";
import * as store from "./store.js";
import { termOf, readingOf, meaning, term } from "./views/parts.js";

// ---------- question builders from vocabulary ----------
export function vocabQuestions(words, pool, n = 8, kinds = ["meaning", "term", "listen", "meaning", "match"]) {
  const qs = [];
  const list = shuffle(words);
  let k = 0;
  for (const w of list) {
    if (qs.length >= n) break;
    const kind = kinds[k++ % kinds.length];
    if (kind === "match") {
      const group = shuffle(list).slice(0, 4);
      if (group.length >= 3) qs.push({ kind: "match", pairs: group });
      continue;
    }
    const others = shuffle(pool.filter((x) => x.id !== w.id && meaning(x) !== meaning(w) && termOf(x) !== termOf(w))).slice(0, 3);
    if (others.length < 2) continue;
    qs.push({ kind, item: w, options: shuffle([w, ...others]) });
  }
  return qs;
}
// Grammar exercises from grammar.json (order / mcq / translate).
export const grammarQuestions = (lesson) => (lesson.exercises || []).map((x) => ({ kind: x.type === "mcq" ? "mcq" : x.type, ex: x, lesson }));

// ---------- runner ----------
// run(container, questions, {title, onFinish(score,total)}) — renders one question at a time with feedback.
export function run(root, questions, { onFinish, passMark = 0.7, title = "" } = {}) {
  let i = 0, score = 0;
  const total = questions.length;
  const next = () => {
    if (i >= total) return finish();
    const q = questions[i];
    root.innerHTML = `<div class="quiz fade-in">
      <div class="row" style="justify-content:space-between"><span class="small muted">${title ? esc(title) + " · " : ""}${t("qOf", { i: num(i + 1), n: num(total) })}</span>
        <span class="chip ok">${num(score)}</span></div>
      <div class="bar" style="margin:8px 0 18px"><i style="width:${(i / total) * 100}%"></i></div>
      <div id="qbody"></div><div id="qfb" aria-live="polite"></div></div>`;
    const body = $("#qbody", root);
    const fbEl = $("#qfb", root);
    const answer = (ok, right) => {
      if (ok) score++;
      store.xp(ok ? 1 : 0);
      fbEl.innerHTML = `<div class="feedback ${ok ? "ok" : "bad"}"><b>${ok ? "✓ " + t("correct") : "✗ " + t("wrong")}</b>${!ok && right ? `<div>${t("answerWas")} ${right}</div>` : ""}
        ${q.ex?.why ? `<div class="small">${esc(L(q.ex.why))}</div>` : ""}</div>
        <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" id="qnext">${i + 1 < total ? t("nextQ") : t("finish")}</button></div>`;
      $("#qnext", root).onclick = () => { i++; next(); };
      $("#qnext", root).focus();
    };
    KINDS[q.kind](body, q, answer);
  };
  const finish = () => {
    const ratio = total ? score / total : 0;
    root.innerHTML = `<div class="panel fade-in" style="text-align:center">
      <div class="eyebrow">${t("result")}</div><div class="big-score">${num(score)} / ${num(total)}</div>
      <p>${ratio >= passMark ? "🎉 " + t("lessonPassed") : t("needScore", { n: num(Math.ceil(passMark * total)) })}</p>
      <div class="row" style="justify-content:center"><button class="btn ghost" id="again">${t("reset")}</button></div></div>`;
    $("#again", root).onclick = () => { i = 0; score = 0; questions.splice(0, questions.length, ...shuffle(questions)); next(); };
    onFinish?.(score, total, root);
  };
  next();
}

const opt = (html, data) => `<button class="choice" data-v="${esc(data)}">${html}</button>`;
function choose(body, html, opts, correct, answer, render = (x) => x) {
  body.innerHTML = html + `<div class="choices">${opts.map((o, k) => opt(render(o), k)).join("")}</div>`;
  body.querySelector(".choices").onclick = (e) => {
    const b = e.target.closest(".choice");
    if (!b || body.dataset.done) return;
    body.dataset.done = 1;
    const k = +b.dataset.v;
    body.querySelectorAll(".choice").forEach((x, j) => { x.disabled = true; if (j === correct) x.classList.add("right"); });
    if (k !== correct) b.classList.add("wrong");
    answer(k === correct, render(opts[correct]));
  };
}
const sayBtn = (text, extra = "") => `<button class="icon-btn big-say" data-say="${esc(text)}" aria-label="${t("playModel")}" ${extra}>${ICON.speaker}</button>`;
function wireSay(body) { body.addEventListener("click", (e) => { const s = e.target.closest("[data-say]"); if (s) say(s.dataset.say); }); }
const normTarget = (s) => String(s).replace(/[\s\p{P}]/gu, "");

const KINDS = {
  meaning(body, q, answer) {
    choose(body, `<h3>${t("chooseMeaning")}</h3><div class="q-term">${term(q.item, { size: "xl" })} ${sayBtn(termOf(q.item))}</div>`,
      q.options, q.options.indexOf(q.item), answer, (o) => esc(meaning(o)));
    wireSay(body);
  },
  term(body, q, answer) {
    choose(body, `<h3>${t("chooseTerm")}</h3><p class="q-prompt">${esc(meaning(q.item))}</p>`,
      q.options, q.options.indexOf(q.item), answer, (o) => term(o, { size: "lg" }));
  },
  listen(body, q, answer) {
    choose(body, `<h3>${t("listenChoose")}</h3><div class="q-term">${sayBtn(termOf(q.item))}</div>`,
      q.options, q.options.indexOf(q.item), answer, (o) => term(o, { size: "lg", reading: false }));
    wireSay(body);
    setTimeout(() => say(termOf(q.item)), 250);
  },
  tone(body, q, answer) { // module-provided: {audio, prompt, options:[labels], correct}
    choose(body, `<h3>${esc(q.prompt)}</h3><div class="q-term">${sayBtn(q.audio)}</div>`, q.options, q.correct, answer);
    wireSay(body);
    setTimeout(() => say(q.audio), 250);
  },
  mcq(body, q, answer) {
    const x = q.ex;
    const tgt = !x.plain && typeof x.options[0] === "string"; // options written in the target language
    const opts = x.options.map((o) => (typeof o === "string" ? o : L(o)));
    const qtext = typeof x.q === "string" ? `<div class="tl xl" lang="${A.langTag}">${esc(x.q)}</div>` : `<p class="q-prompt">${esc(L(x.q))}</p>`;
    choose(body, `<h3>${x.plain ? t("comprehension") : t("chooseTerm")}</h3>${qtext}${x.py ? `<div class="reading">${esc(x.py)}</div>` : ""}`,
      opts, x.answer, answer, (o) => (tgt ? `<span lang="${A.langTag}" class="tl lg">${esc(o)}</span>` : esc(o)));
  },
  order(body, q, answer) {
    const x = q.ex;
    let picked = [];
    const pool = shuffle(x.tokens.map((tok, k) => ({ tok, k })));
    const draw = () => {
      body.innerHTML = `<h3>${t("orderWords")}</h3><p class="q-prompt">${esc(lang() === "ar" ? x.ar || x.en : x.en || x.ar)}</p>
        <div class="order-line" lang="${A.langTag}">${picked.map((p) => `<button class="tok on" data-k="${p.k}">${esc(p.tok)}</button>`).join("") || `<span class="muted small">…</span>`}</div>
        <div class="order-pool" lang="${A.langTag}">${pool.filter((p) => !picked.includes(p)).map((p) => `<button class="tok" data-k="${p.k}">${esc(p.tok)}</button>`).join("")}</div>
        <div class="row" style="justify-content:flex-end"><button class="btn" id="ochk" ${picked.length === x.tokens.length ? "" : "disabled"}>${t("check")}</button></div>`;
      body.onclick = (e) => {
        if (body.dataset.done) return;
        const b = e.target.closest(".tok");
        if (b) { const p = pool.find((z) => z.k === +b.dataset.k); picked = picked.includes(p) ? picked.filter((z) => z !== p) : [...picked, p]; draw(); return; }
        if (e.target.closest("#ochk")) {
          body.dataset.done = 1;
          const got = picked.map((p) => p.tok).join("");
          answer(normTarget(got) === normTarget(x.answer), `<span class="tl" lang="${A.langTag}">${esc(x.answer)}</span>`);
        }
      };
    };
    draw();
  },
  translate(body, q, answer) {
    const x = q.ex;
    body.innerHTML = `<h3>${t("translateTo", { lang: L(A.short) })}</h3><p class="q-prompt">${esc(lang() === "ar" ? x.ar || x.en : x.en || x.ar)}</p>
      <input class="input tl" lang="${A.langTag}" id="tin" autocomplete="off" placeholder="${t("typeHere")}">
      <p class="small muted">${esc(L(A.inputHint || ""))}</p>
      <div class="row" style="justify-content:flex-end"><button class="btn" id="tchk">${t("check")}</button></div>`;
    const go = () => {
      if (body.dataset.done) return;
      body.dataset.done = 1;
      const v = normTarget($("#tin", body).value);
      const ok = [x.answer, ...(x.accept || [])].some((a) => normTarget(a) === v);
      answer(ok, `<span class="tl" lang="${A.langTag}">${esc(x.answer)}</span>`);
    };
    $("#tchk", body).onclick = go;
    $("#tin", body).onkeydown = (e) => { if (e.key === "Enter") go(); };
  },
  dictation(body, q, answer) {
    const w = q.item;
    body.innerHTML = `<h3>${t("dictation")}</h3><div class="q-term">${sayBtn(termOf(w))}</div>
      <input class="input" id="din" autocomplete="off" placeholder="${esc(L(A.dictationHint || { ar: t("typeHere"), en: t("typeHere") }))}">
      <div class="row" style="justify-content:flex-end"><button class="btn" id="dchk">${t("check")}</button></div>`;
    wireSay(body);
    setTimeout(() => say(termOf(w)), 250);
    const go = () => {
      if (body.dataset.done) return;
      body.dataset.done = 1;
      const v = $("#din", body).value;
      const ok = (A.matchReading || ((a, b) => normTarget(a) === normTarget(b)))(v, w) || normTarget(v) === normTarget(termOf(w));
      answer(ok, term(w, { size: "lg", reading: true }));
    };
    $("#dchk", body).onclick = go;
    $("#din", body).onkeydown = (e) => { if (e.key === "Enter") go(); };
  },
  speak(body, q, answer) {
    const w = q.item;
    body.innerHTML = `<h3>${t("speakIt")}</h3><div class="q-term">${term(w, { size: "xl", reading: true })} ${sayBtn(termOf(w))}</div>
      <p class="q-prompt small">${esc(meaning(w))}</p>
      ${asrSupported ? `<div class="row" style="justify-content:center"><button class="btn" id="mic">${ICON.mic} ${t("tapSpeak")}</button><button class="btn ghost" id="skp">${t("skip")}</button></div><div id="heard" class="small muted" style="text-align:center;margin-top:8px"></div>`
        : `<div class="notice">${t("noSpeechRec")}</div><div class="row" style="justify-content:flex-end"><button class="btn ghost" id="skp">${t("skip")}</button></div>`}`;
    wireSay(body);
    $("#skp", body).onclick = () => { body.dataset.done = 1; answer(false, term(w, { reading: true })); };
    $("#mic", body)?.addEventListener("click", async () => {
      if (body.dataset.done) return;
      $("#heard", body).textContent = "🎙 …";
      try {
        const heard = await listen();
        const s = similarity(termOf(w), heard);
        store.addPron(termOf(w), s);
        $("#heard", body).innerHTML = `${t("heard")}: <span lang="${A.langTag}">${esc(heard[0] || "—")}</span> · ${t("similarity")} ${Math.round(s * 100)}%`;
        if (s >= 0.6) { body.dataset.done = 1; answer(true); }
      } catch (e) { $("#heard", body).textContent = t("micDenied"); }
    });
  },
  match(body, q, answer) {
    const left = shuffle(q.pairs), right = shuffle(q.pairs);
    let sel = null, matched = 0, mistakes = 0;
    body.innerHTML = `<h3>${t("matchPairs")}</h3><div class="match-grid">
      <div style="display:grid;gap:10px">${left.map((p) => `<button data-l="${esc(p.id)}">${term(p, { size: "lg", reading: false })}</button>`).join("")}</div>
      <div style="display:grid;gap:10px">${right.map((p) => `<button data-r="${esc(p.id)}">${esc(meaning(p))}</button>`).join("")}</div></div>`;
    body.onclick = (e) => {
      const b = e.target.closest("button");
      if (!b || b.classList.contains("done") || body.dataset.done) return;
      if (b.dataset.l) { body.querySelectorAll("[data-l]").forEach((x) => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); sel = b.dataset.l; say(termOf(q.pairs.find((p) => p.id === sel))); return; }
      if (b.dataset.r && sel) {
        const l = body.querySelector(`[data-l="${CSS.escape(sel)}"]`);
        if (b.dataset.r === sel) { l.classList.add("done"); b.classList.add("done"); l.removeAttribute("aria-pressed"); matched++; sel = null; }
        else { mistakes++; b.classList.add("shake"); setTimeout(() => b.classList.remove("shake"), 400); }
        if (matched === q.pairs.length) { body.dataset.done = 1; answer(mistakes <= 1); }
      }
    };
  },
};
