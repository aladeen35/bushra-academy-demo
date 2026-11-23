// Vocabulary Lab: personal dictionary, spaced-repetition flashcards, practice games, browsing by category.
import { t, L, lang } from "../i18n.js";
import { $, $$, esc, num, shuffle, ICON, toast, seeded, today } from "../util.js";
import { vocab, catalog, study, norm } from "../data.js";
import * as store from "../store.js";
import { say } from "../audio.js";
import { openWord, entryById, CAT_KEYS } from "../lookup.js";

const TABS = ["words", "review", "practice", "browse"];
const B = { cat: "", level: "", book: "" };

export async function render(main, [tabArg, query]) {
  const tab = TABS.includes(tabArg) ? tabArg : "words";
  const qs = new URLSearchParams(query || "");
  const [voc, { books }] = await Promise.all([vocab(), catalog()]);
  const saved = (await Promise.all(store.savedWords().map(async (w) => ({ ...w, e: await entryById(w.id) })))).filter((w) => w.e);
  const due = store.dueWords();

  main.innerHTML = `
    <h1 class="display h1">${t("vocabLab")}</h1>
    <div class="stat-row">
      <div class="stat"><b>${num(saved.length)}</b><span>${t("wordsLearned")}</span></div>
      <div class="stat"><b>${num(due.length)}</b><span>${t("dueNow")}</span></div>
      <div class="stat"><b>${num(store.masteredCount())}</b><span>${t("mastered")}</span></div>
      <div class="stat"><b>${num(voc.entries.size)}</b><span>${t("browse")}</span></div>
    </div>
    <div class="tabs" role="tablist">${TABS.map((k) => `<a role="tab" class="link" style="padding:0 16px;border-bottom:3px solid ${k === tab ? "var(--red)" : "transparent"};color:${k === tab ? "var(--red)" : "var(--ink-3)"}" aria-selected="${k === tab}" href="#/vocab/${k}">${t(k === "words" ? "myWords" : k)}${k === "review" && due.length ? ` (${num(due.length)})` : ""}</a>`).join("")}</div>
    <div id="vbody"></div>`;
  const body = $("#vbody", main);

  // ---------- my words ----------
  if (tab === "words") {
    if (!saved.length) { body.innerHTML = `<div class="empty">${t("noWords")}<br><a class="btn small" style="margin-top:12px" href="#/library">${t("nav_library")}</a></div>`; return; }
    const label = (w) => ((w.box || 0) >= 4 ? `<span class="chip ok">${t("mastered")}</span>` : (w.reviews || 0) ? `<span class="chip gold">${t("learning")}</span>` : `<span class="chip plain">${t("newWord")}</span>`);
    body.innerHTML = `<div class="word-list">${saved.sort((a, b) => b.added - a.added).map((w) => `<div class="word-row" style="cursor:default">
      <button class="para-btn" style="justify-self:start;text-align:start" data-w="${esc(w.e.word)}"><span><span class="en" style="font-weight:600">${esc(w.e.word)}</span> <span class="ar">${esc(w.e.ar || "")}</span></span></button>
      <span class="row">${label(w)}<button class="icon-btn" data-say="${esc(w.e.word)}" aria-label="${t("listen")}">${ICON.speaker}</button><button class="icon-btn" data-rm="${esc(w.id)}" aria-label="${t("removeWord")}">${ICON.close}</button></span></div>`).join("")}</div>`;
    body.onclick = (e) => {
      const w = e.target.closest("[data-w]"); if (w) return openWord(w.dataset.w, { sentence: w.dataset.w });
      const s = e.target.closest("[data-say]"); if (s) return say(s.dataset.say);
      const r = e.target.closest("[data-rm]"); if (r) { store.removeWord(r.dataset.rm); r.closest(".word-row").remove(); }
    };
    return;
  }

  // ---------- spaced repetition ----------
  if (tab === "review") {
    const queue = shuffle(due.map((w) => saved.find((s) => s.id === w.id)).filter(Boolean));
    let i = 0;
    const card = () => {
      if (i >= queue.length) { body.innerHTML = `<div class="empty">✓ ${t(saved.length ? "reviewDone" : "noWords")}</div>`; return; }
      const w = queue[i], e = w.e;
      body.innerHTML = `<p class="muted small" style="text-align:center">${num(i + 1)} / ${num(queue.length)} · ${t("tapToFlip")}</p>
        <div class="flash" id="flash" tabindex="0" role="button" aria-label="${t("tapToFlip")}"><div class="flash-inner">
          <div class="flash-face"><div class="vocab-word" style="text-align:center">${esc(e.word)}</div><div class="ipa">${esc(e.ipa || "")}</div>
            ${e.example ? `<p class="en small muted" style="text-align:center">${esc(e.example).replace(new RegExp(`\\b(${esc(e.word)}\\w*)`, "i"), "<b>$1</b>")}</p>` : ""}</div>
          <div class="flash-face back"><div class="vocab-ar">${esc(e.ar || "")}</div><p class="en small">${esc(e.def || "")}</p>${e.exampleAr ? `<p class="ar small">${esc(e.exampleAr)}</p>` : ""}</div>
        </div></div>
        <div class="row" style="justify-content:center;margin-top:16px"><button class="icon-btn" data-say aria-label="${t("listen")}">${ICON.speaker}</button></div>
        <div class="row" id="grades" style="justify-content:center;margin-top:12px" hidden>
          ${["again", "hard", "good", "easy"].map((g, k) => `<button class="btn ${k === 2 ? "" : "ghost"} small" data-g="${k}">${t(g)}</button>`).join("")}</div>`;
      const flash = $("#flash", body);
      const flip = () => { flash.classList.toggle("flipped"); $("#grades", body).hidden = false; };
      flash.onclick = flip;
      flash.onkeydown = (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); flip(); } };
      say(e.word);
      body.onclick = (ev) => {
        if (ev.target.closest("[data-say]")) return say(e.word);
        const g = ev.target.closest("[data-g]");
        if (g) { store.grade(w.id, +g.dataset.g); if (+g.dataset.g === 0) queue.push(w); i++; card(); }
      };
    };
    card();
    return;
  }

  // ---------- browse ----------
  if (tab === "browse") {
    const levels = [...new Set([...voc.entries.values()].map((e) => e.level).filter(Boolean))].sort();
    const opt = (v, l, c) => `<option value="${esc(v)}" ${v === c ? "selected" : ""}>${esc(l)}</option>`;
    body.innerHTML = `<form class="filters" id="bf">
      <select name="cat" aria-label="${t("category")}">${opt("", t("allCats"), B.cat)}${CAT_KEYS.map((c) => opt(c, t("cat_" + c), B.cat)).join("")}</select>
      <select name="level" aria-label="${t("level")}">${opt("", t("allLevels"), B.level)}${levels.map((c) => opt(c, c, B.level)).join("")}</select>
      <select name="book" aria-label="${t("book")}">${opt("", t("allBooks"), B.book)}${books.map((b) => opt(b.slug, b.title, B.book)).join("")}</select></form>
      <div class="word-list" id="bl"></div>`;
    const draw = () => {
      const list = [...voc.entries.values()].filter((e) => (!B.cat || e.category === B.cat) && (!B.level || e.level === B.level) && (!B.book || e.book === B.book)).sort((a, b) => a.word.localeCompare(b.word));
      $("#bl", body).innerHTML = list.map((e) => `<button class="word-row" data-w="${esc(e.word)}"><span><span class="en">${esc(e.word)}</span> <span class="muted small">${esc(e.ipa || "")}</span></span><span class="row"><span class="ar">${esc(e.ar)}</span><span class="level">${esc(e.level || "")}</span></span></button>`).join("") || `<div class="empty">${t("noResults")}</div>`;
    };
    $("#bf", body).oninput = (e) => { B[e.target.name] = e.target.value; draw(); };
    body.onclick = (e) => { const w = e.target.closest("[data-w]"); if (w) openWord(w.dataset.w, { sentence: w.dataset.w }); };
    draw();
    return;
  }

  // ---------- practice ----------
  let source;
  const fromBook = qs.get("b");
  if (fromBook) {
    const pack = await study(fromBook, +qs.get("n") || 1);
    source = (pack?.vocab || []).map((id) => voc.entries.get(id)).filter(Boolean);
  } else if (saved.length >= 4 && qs.get("all") !== "1") source = saved.map((w) => w.e).filter((e) => e.ar);
  else source = [...voc.entries.values()].filter((e) => e.ar);
  const pool = source.length >= 4 ? source : [...voc.entries.values()];
  const others = [...voc.entries.values()].filter((e) => e.ar);
  const mode = qs.get("m") || "mcq";
  const modes = ["mcq", "matching", "spelling", "pronunciation"];
  const base = `#/vocab/practice?${fromBook ? `b=${fromBook}&n=${qs.get("n") || 1}&` : ""}`;
  body.innerHTML = `<div class="row" style="margin-bottom:16px">${modes.map((m) => `<a class="chip ${m === mode ? "" : "plain"}" style="min-height:44px;text-decoration:none" href="${base}m=${m}">${t(m)}</a>`).join("")}
    ${saved.length < 4 && !fromBook ? `<span class="muted small">${t("needMore")}</span>` : ""}</div><div id="game" class="panel" style="max-width:640px"></div>`;
  const game = $("#game", body);
  let score = 0, rounds = 0;
  const rnd = Math.random;
  const tally = () => `<p class="muted small">${t("score")}: ${num(score)} / ${num(rounds)}</p>`;

  const games = {
    mcq() {
      const e = pool[Math.floor(rnd() * pool.length)];
      const opts = shuffle([e, ...shuffle(others.filter((o) => o.ar !== e.ar)).slice(0, 3)]);
      game.innerHTML = `${tally()}<h2 class="h2">${t("chooseMeaning")}</h2><div class="row"><span class="vocab-word">${esc(e.word)}</span><button class="icon-btn" data-say aria-label="${t("listen")}">${ICON.speaker}</button></div>
        <div class="choices" style="margin-top:12px">${opts.map((o) => `<button class="choice ar" data-ok="${o === e}">${esc(o.ar)}</button>`).join("")}</div><div id="fb"></div>`;
      game.onclick = (ev) => {
        if (ev.target.closest("[data-say]")) return say(e.word);
        const c = ev.target.closest(".choice"); if (!c || c.disabled) return;
        const ok = c.dataset.ok === "true"; rounds++; if (ok) score++;
        $$(".choice", game).forEach((x) => { x.disabled = true; if (x.dataset.ok === "true") x.classList.add("right"); });
        if (!ok) c.classList.add("wrong");
        if (store.isSaved(e.id)) store.grade(e.id, ok ? 2 : 0); else store.action();
        $("#fb", game).innerHTML = `<div class="feedback">${ok ? "✓ " + t("correct") : "✗ " + t("wrong")} — <span class="en">${esc(e.def || "")}</span><div style="margin-top:8px"><button class="btn small" data-next>${t("nextQ")} →</button></div></div>`;
        $("[data-next]", game).onclick = (x) => { x.stopPropagation(); games.mcq(); };
      };
    },
    matching() {
      const set = shuffle(pool).slice(0, 5);
      const left = shuffle(set), right = shuffle(set);
      let pick = null, found = 0;
      game.innerHTML = `${tally()}<h2 class="h2">${t("matchPairs")}</h2><div class="match-grid">
        <div style="display:grid;gap:10px">${left.map((e) => `<button class="en" data-l="${esc(e.id)}">${esc(e.word)}</button>`).join("")}</div>
        <div style="display:grid;gap:10px">${right.map((e) => `<button class="ar" data-r="${esc(e.id)}">${esc(e.ar)}</button>`).join("")}</div></div><div id="fb"></div>`;
      game.onclick = (ev) => {
        const b = ev.target.closest("button[data-l], button[data-r]");
        if (!b || b.classList.contains("done")) return;
        if (b.dataset.l) { $$("[data-l]", game).forEach((x) => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); pick = b.dataset.l; say(set.find((e) => e.id === pick).word); return; }
        if (!pick) return;
        rounds++;
        if (b.dataset.r === pick) {
          score++; found++;
          b.classList.add("done"); const l = $(`[data-l="${CSS.escape(pick)}"]`, game); l.classList.add("done"); l.setAttribute("aria-pressed", "false"); pick = null;
          if (found === set.length) { store.action(); $("#fb", game).innerHTML = `<div class="feedback">✓ ${t("correct")} <button class="btn small" data-again>${t("nextQ")} →</button></div>`; $("[data-again]", game).onclick = (x) => { x.stopPropagation(); games.matching(); }; }
        } else { b.classList.add("wrong"); setTimeout(() => b.classList.remove("wrong"), 500); }
      };
    },
    spelling() {
      const e = pool.filter((x) => !x.word.includes(" "))[Math.floor(rnd() * pool.filter((x) => !x.word.includes(" ")).length)];
      game.innerHTML = `${tally()}<h2 class="h2">${t("typeWord")}</h2><p class="ar">${esc(e.ar)}</p>
        <div class="row"><button class="btn ghost" data-say>${ICON.speaker} ${t("listen")}</button></div>
        <form class="row" style="margin-top:12px" id="sp"><input class="input en" style="flex:1" name="a" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="${t("typeWord")}"><button class="btn">${t("check")}</button></form><div id="fb"></div>`;
      say(e.word);
      $("[data-say]", game).onclick = () => say(e.word);
      $("#sp", game).onsubmit = (ev) => {
        ev.preventDefault();
        const ok = norm(ev.target.a.value) === norm(e.word); rounds++; if (ok) score++;
        if (store.isSaved(e.id)) store.grade(e.id, ok ? 2 : 0); else store.action();
        $("#fb", game).innerHTML = `<div class="feedback">${ok ? "✓ " + t("correct") : `✗ ${t("answerWas")} <b class="en">${esc(e.word)}</b>`}<div style="margin-top:8px"><button class="btn small" data-next>${t("nextQ")} →</button></div></div>`;
        $("[data-next]", game).onclick = games.spelling;
      };
    },
    pronunciation() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const e = pool[Math.floor(rnd() * pool.length)];
      if (!SR) { game.innerHTML = `<div class="notice">${t("noSpeechRec")}</div>`; return; }
      game.innerHTML = `${tally()}<h2 class="h2">${t("sayWord")}</h2><div class="row"><span class="vocab-word">${esc(e.word)}</span><span class="ipa">${esc(e.ipa || "")}</span></div>
        <div class="row" style="margin-top:12px"><button class="btn ghost" data-say>${ICON.speaker} ${t("listen")}</button><button class="btn" data-rec>${ICON.mic} ${t("startSpeaking")}</button></div><div id="fb"></div>`;
      game.onclick = (ev) => {
        if (ev.target.closest("[data-say]")) return say(e.word);
        if (ev.target.closest("[data-next]")) return games.pronunciation();
        if (!ev.target.closest("[data-rec]")) return;
        const rec = new SR();
        rec.lang = store.prefs().accent; rec.maxAlternatives = 5; rec.interimResults = false;
        $("#fb", game).innerHTML = `<div class="feedback">🎙 …</div>`;
        rec.onresult = (r) => {
          const alts = [...r.results[0]].map((a) => a.transcript.toLowerCase().trim());
          const ok = alts.some((a) => a.split(/\s+/).some((x) => norm(x) === norm(e.word)) || norm(a) === norm(e.word));
          rounds++; if (ok) score++; store.action();
          $("#fb", game).innerHTML = `<div class="feedback">${ok ? "✓ " + t("correct") : "✗ " + t("tryAgain")} — ${t("heard")}: <span class="en">“${esc(alts[0] || "")}”</span><div style="margin-top:8px"><button class="btn small" data-next>${t("nextQ")} →</button></div></div>`;
        };
        rec.onerror = () => { $("#fb", game).innerHTML = `<div class="feedback">${t("tryAgain")}</div>`; };
        rec.start();
      };
    },
  };
  (games[mode] || games.mcq)();
}
