// Bilingual reader: English and Arabic side by side on desktop, paragraph-by-paragraph on mobile.
// Every English word is tappable (vocabulary panel); sentences are the unit for narration and navigation.
import { t, L, lang } from "../i18n.js";
import { $, $$, esc, num, ICON, toast, openSheet, closeSheet } from "../util.js";
import { book, chapter, translation, study, vocab, norm, textAllowed } from "../data.js";
import * as store from "../store.js";
import * as audio from "../audio.js";
import { openWord } from "../lookup.js";
import { chapterLabel, trStatusBadge, bookTitle } from "./parts.js";

const ABBR = /\b(Mr|Mrs|Dr|St|Mme|Mlle|Messrs|Capt|Col|Gen|Rev|Esq|Lt|No)\.["”’]?\s*$/;
export function splitSentences(text) {
  const raw = text.match(/[^.!?…]+(?:[.!?…]+["”’)\]]*|$)\s*/g) || [text];
  const out = [];
  for (const s of raw) {
    if (out.length && (ABBR.test(out[out.length - 1]) || /^\s*[a-z,;:]/.test(s))) out[out.length - 1] += s;
    else out.push(s);
  }
  return out.filter((s) => s.trim());
}
const TOKEN = /_|[A-Za-z]+(?:['’][A-Za-z]+)*(?:-[A-Za-z]+)*|[^A-Za-z_]+/g;
function wordify(sentence, emOpen, known) {
  let html = emOpen ? "<em>" : "";
  let em = emOpen;
  for (const tok of sentence.match(TOKEN) || []) {
    if (tok === "_") { html += em ? "</em>" : "<em>"; em = !em; }
    else if (/^[A-Za-z]/.test(tok)) html += `<span class="w${known.has(norm(tok)) ? " known" : ""}">${esc(tok)}</span>`;
    else html += esc(tok);
  }
  if (em) html += "</em>";
  return { html, em };
}

export async function render(main, [slug, nStr, sId, pId]) {
  const n = +nStr;
  const b = await book(slug);
  if (!b) { main.innerHTML = `<div class="empty">${t("notFound")}</div>`; return; }
  if (!textAllowed(b)) { location.replace(`#/study/${slug}/${n}`); return; }
  const [ch, tr, pack, voc] = await Promise.all([chapter(slug, n), translation(slug, n), study(slug, n), vocab()]);
  if (!ch) { main.innerHTML = `<div class="empty">${t("notFound")}</div>`; return; }
  const sections = ch.sections;
  let si = Math.max(0, sections.findIndex((s) => s.id === sId));
  const prefs = store.prefs();
  const known = new Set(voc.byForm.keys());
  const chapters = b.chapters || [];
  const nextCh = chapters.find((c) => c.n === n + 1);
  const hasAr = !!tr && Object.keys(tr.paragraphs || {}).length > 0;
  let layout = prefs.layout || "both";
  let lastWord = null;

  const narrator = new audio.Narrator([], { onState: updateDock });

  function paraHTML(p, sec) {
    let em = false;
    const sents = splitSentences(p.en).map((s) => { const r = wordify(s, em, known); em = r.em; return `<span class="s">${r.html}</span>`; }).join("");
    const ar = tr?.paragraphs?.[p.id];
    const bm = store.isBookmarked(slug, n, p.id);
    const note = store.noteFor(slug, n, p.id);
    return `<div class="para${bm ? " bookmarked" : ""}" id="${p.id}" data-pid="${p.id}">
      <div class="en-col" lang="en">${sents}</div>
      <div class="ar-col${ar ? "" : " missing"}" lang="ar">${ar ? esc(ar) : t("noTranslation")}</div>
      <div class="para-actions">
        <button class="para-btn" data-act="bm" aria-pressed="${bm}" aria-label="${t("bookmark")}">${ICON.bookmark}</button>
        <button class="para-btn" data-act="note" aria-label="${note ? t("editNote") : t("addNote")}">${ICON.note}</button>
        <button class="para-btn" data-act="listen" aria-label="${t("listen")}">${ICON.speaker}</button>
        <button class="para-btn" data-act="ask" aria-label="${t("askTutor")}">${ICON.ask}<span>${t("askTutor")}</span></button>
        ${p.src ? `<span class="para-btn" style="cursor:default" title="${t("sourceLine")}">#${num(p.src, { useGrouping: false })}</span>` : ""}
      </div>
      ${note ? `<div class="note-text">✎ ${esc(note.text)}</div>` : ""}
    </div>`;
  }

  main.innerHTML = `
    <div class="reader-top">
      <a class="link" href="#/book/${slug}">← ${esc(bookTitle(b))}</a>
    </div>
    <h1 class="display h2" style="margin-bottom:4px">${chapterLabel(ch)}</h1>
    ${ch.part ? `<div class="muted small">${t("part")}: <span lang="en">${esc(ch.part)}</span></div>` : ""}
    <div class="reader-tools" role="toolbar" aria-label="${t("prefs")}">
      <div class="row" role="group" aria-label="${t("language")}">
        ${["both", "en", "ar"].map((k) => `<button class="chip" data-layout="${k}" aria-pressed="${layout === k}">${t(k === "both" ? "showBoth" : k === "en" ? "showEn" : "showAr")}</button>`).join("")}
      </div>
      <button class="icon-btn" data-size="-1" aria-label="${t("fontSize")} −">A−</button>
      <button class="icon-btn" data-size="1" aria-label="${t("fontSize")} +">A+</button>
      <button class="icon-btn" data-lh aria-label="${t("lineSpacing")}">↕</button>
      <button class="icon-btn" data-theme-cycle aria-label="${t("theme")}">${ICON.moon}</button>
      <span class="muted small" id="sec-label" style="margin-inline-start:auto"></span>
    </div>
    ${hasAr ? `<div style="margin:-6px 0 12px">${trStatusBadge(tr.status)}</div>` : `<p class="notice small">${t("noTranslationCh")}</p>`}
    <article class="reader" id="reader" style="--read-size:${prefs.size}px;--read-lh:${prefs.lh}"></article>
    <div id="end-sentinel" style="height:1px"></div>
    <nav class="section-nav" id="sec-nav"></nav>
    <div id="done-box"></div>
    <div class="audio-dock" id="dock" dir="ltr" role="region" aria-label="${t("listen")}">
      <button data-a="prev" aria-label="${t("prevSentence")}">${ICON.prev}</button>
      <button class="play" data-a="play" aria-label="${t("play")}">${ICON.play}</button>
      <button data-a="next" aria-label="${t("nextSentence")}">${ICON.next}</button>
      <button data-a="loop" aria-pressed="false" aria-label="${t("repeatSentence")}" title="${t("repeatSentence")}">${ICON.repeat}</button>
      <button data-a="word" aria-label="${t("repeatWord")}" title="${t("repeatWord")}"><span class="small">Aa</span></button>
      <select data-a="rate" aria-label="${t("speed")}">${audio.RATES.map((r) => `<option value="${r}" ${r === prefs.rate ? "selected" : ""}>${r.toFixed(2).replace(/0$/, "")}×</option>`).join("")}</select>
      <select data-a="accent" aria-label="${t("accent")}"><option value="en-GB" ${prefs.accent === "en-GB" ? "selected" : ""}>GB</option><option value="en-US" ${prefs.accent === "en-US" ? "selected" : ""}>US</option></select>
      <span class="label" id="dock-label"></span>
    </div>`;

  const reader = $("#reader", main);
  const applyLayout = () => {
    reader.classList.toggle("en-only", layout === "en");
    reader.classList.toggle("ar-only", layout === "ar");
    $$("[data-layout]", main).forEach((x) => x.setAttribute("aria-pressed", x.dataset.layout === layout));
  };

  function drawSection() {
    const sec = sections[si];
    reader.innerHTML = sec.paragraphs.map((p) => paraHTML(p, sec)).join("");
    applyLayout();
    $("#sec-label", main).textContent = `${t("section")} ${num(si + 1)} ${t("of")} ${num(sections.length)}`;
    const isLast = si === sections.length - 1;
    $("#sec-nav", main).innerHTML = `
      ${si > 0 ? `<a class="btn ghost" href="#/read/${slug}/${n}/${sections[si - 1].id}">← ${t("prevSection")}</a>` : "<span></span>"}
      ${isLast ? `<button class="btn" id="finish">${t("finishChapter")} ✓</button>` : `<a class="btn" data-next href="#/read/${slug}/${n}/${sections[si + 1].id}">${t("nextSection")} →</a>`}`;
    $("#done-box", main).innerHTML = "";
    narrator.setSentences($$(".s", reader));
    store.setLast(slug, n, sec.id);
    updateDock();
  }
  function markRead() { store.markSection(slug, n, sections[si].id, sections.length); }

  function updateDock() {
    const d = $("#dock", main);
    if (!d) return;
    const play = $('[data-a="play"]', d);
    play.innerHTML = narrator.playing ? ICON.pause : ICON.play;
    play.setAttribute("aria-label", narrator.playing ? t("pause") : t("play"));
    $('[data-a="loop"]', d).setAttribute("aria-pressed", narrator.loop);
    $("#dock-label", main).textContent = narrator.sentences.length ? `${num(narrator.i + 1)} / ${num(narrator.sentences.length)}` : "";
  }

  // ---------- events ----------
  main.addEventListener("click", (e) => {
    const w = e.target.closest(".w");
    if (w && !getSelection().toString().trim()) {
      $$(".w.active", reader).forEach((x) => x.classList.remove("active"));
      w.classList.add("active");
      lastWord = w.textContent;
      const s = w.closest(".s");
      narrator.i = narrator.sentences.indexOf(s);
      updateDock();
      const para = w.closest(".para");
      openWord(w.textContent, { sentence: s.textContent, tutorCtx: ctxFor(para), onClose: () => w.classList.remove("active") });
      return;
    }
    const lay = e.target.closest("[data-layout]");
    if (lay) { layout = lay.dataset.layout; store.setPref("layout", layout); applyLayout(); return; }
    const size = e.target.closest("[data-size]");
    if (size) { const v = Math.max(15, Math.min(28, store.prefs().size + +size.dataset.size)); store.setPref("size", v); reader.style.setProperty("--read-size", v + "px"); return; }
    if (e.target.closest("[data-lh]")) { const opts = [1.6, 1.75, 2]; const v = opts[(opts.indexOf(store.prefs().lh) + 1) % opts.length]; store.setPref("lh", v); reader.style.setProperty("--read-lh", v); return; }
    if (e.target.closest("[data-theme-cycle]")) {
      const opts = ["light", "sepia", "dark"]; const cur = document.documentElement.dataset.theme;
      const v = opts[(opts.indexOf(cur) + 1) % opts.length]; document.documentElement.dataset.theme = v; store.setPref("theme", v); return;
    }
    if (e.target.closest("[data-next]")) { markRead(); return; }
    if (e.target.closest("#finish")) { markRead(); store.markChapterDone(slug, n); finishBox(); return; }
    const act = e.target.closest("[data-act]");
    if (act) {
      const para = act.closest(".para");
      const pid = para.dataset.pid;
      const en = sections[si].paragraphs.find((p) => p.id === pid).en;
      if (act.dataset.act === "bm") {
        const on = store.toggleBookmark(slug, n, pid, sections[si].id, en);
        para.classList.toggle("bookmarked", on); act.setAttribute("aria-pressed", on); toast(on ? t("bookmarked") : t("unbookmarked"));
      } else if (act.dataset.act === "note") noteSheet(pid, en);
      else if (act.dataset.act === "listen") { const ss = $$(".s", para); narrator.play(narrator.sentences.indexOf(ss[0])); }
      else if (act.dataset.act === "ask") { sessionStorage.setItem("lit.tutorCtx", JSON.stringify(ctxFor(para))); location.hash = "#/tutor"; }
      return;
    }
    const a = e.target.closest("[data-a]");
    if (a && a.tagName === "BUTTON") {
      if (!audio.supported || !audio.hasVoices()) { toast(t("noVoices")); }
      const k = a.dataset.a;
      if (k === "play") narrator.toggle();
      else if (k === "prev") narrator.step(-1);
      else if (k === "next") narrator.step(1);
      else if (k === "loop") { narrator.loop = !narrator.loop; updateDock(); }
      else if (k === "word") { if (lastWord) audio.say(lastWord); else toast(lang() === "ar" ? "اضغط كلمة أولًا" : "Tap a word first"); }
    }
  });
  main.addEventListener("change", (e) => {
    const a = e.target.closest("[data-a]");
    if (!a) return;
    if (a.dataset.a === "rate") audio.setRate(+a.value);
    if (a.dataset.a === "accent") audio.setAccent(a.value);
    if (narrator.playing) narrator.play(narrator.i);
  });

  function ctxFor(para) {
    const pid = para?.dataset.pid;
    const p = sections[si].paragraphs.find((x) => x.id === pid);
    return { slug, n, pid, s: sections[si].id, title: b.title, author: b.author, chapterTitle: ch.title || "", text: p?.en || "", ar: tr?.paragraphs?.[pid] || "" };
  }

  function noteSheet(pid, en) {
    const cur = store.noteFor(slug, n, pid);
    const sheet = openSheet(`<h2 class="h2">${cur ? t("editNote") : t("addNote")}</h2>
      <p class="en small muted">${esc(en.slice(0, 220))}${en.length > 220 ? "…" : ""}</p>
      <textarea class="input" id="note-in" rows="5" aria-label="${t("note")}">${esc(cur?.text || "")}</textarea>
      <div class="row" style="margin-top:12px"><button class="btn" id="note-save">${t("saveNote")}</button>${cur ? `<button class="btn ghost" id="note-del">${t("deleteNote")}</button>` : ""}</div>`, { label: t("note") });
    $("#note-save", sheet).onclick = () => { store.setNote(slug, n, pid, sections[si].id, $("#note-in", sheet).value, en); closeSheet(); toast(t("noteSaved")); drawSection(); scrollToP(pid); };
    $("#note-del", sheet)?.addEventListener("click", () => { store.setNote(slug, n, pid, sections[si].id, "", en); closeSheet(); drawSection(); scrollToP(pid); });
  }

  function finishBox() {
    const box = $("#done-box", main);
    box.innerHTML = `<div class="panel fade-in" style="text-align:center">
      <h2 class="display h2">🎉 ${t("chapterDone")}</h2>
      <div class="row" style="justify-content:center;margin-top:12px">
        ${pack?.quiz?.length ? `<a class="btn" href="#/quiz/${slug}/${n}">${t("chapterQuiz")}</a>` : ""}
        ${pack ? `<a class="btn ghost" href="#/study/${slug}/${n}">${t("studyChapter")}</a>` : ""}
        ${nextCh ? `<a class="btn ${pack?.quiz?.length ? "ghost" : ""}" href="#/read/${slug}/${n + 1}">${t("nextChapter")} →</a>` : `<a class="btn ghost" href="#/book/${slug}">${t("backToBook")}</a>`}
      </div></div>`;
    box.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  const scrollToP = (pid) => { const el = document.getElementById(pid); if (el) { el.scrollIntoView({ block: "center" }); el.querySelector(".en-col")?.classList.add("focus"); } };

  // Selecting several words offers listen / ask tutor / note.
  let selBar = null;
  const onSel = () => {
    selBar?.remove(); selBar = null;
    const sel = getSelection();
    const text = sel.toString().trim();
    if (!text || text.split(/\s+/).length < 2 || !sel.rangeCount) return;
    const node = sel.anchorNode?.parentElement?.closest(".en-col");
    if (!node || !reader.contains(node)) return;
    const r = sel.getRangeAt(0).getBoundingClientRect();
    selBar = document.createElement("div");
    selBar.className = "sel-bar";
    selBar.innerHTML = `<button data-s="listen">${t("listen")}</button><button data-s="ask">${t("askTutor")}</button><button data-s="note">${t("addNote")}</button>`;
    selBar.style.top = Math.min(innerHeight - 60, r.bottom + 10) + "px";
    selBar.style.left = Math.max(8, Math.min(innerWidth - 300, r.left)) + "px";
    document.body.append(selBar);
    const para = node.closest(".para");
    selBar.onpointerdown = (e) => e.preventDefault();
    selBar.onclick = (e) => {
      const k = e.target.dataset.s;
      if (k === "listen") audio.say(text);
      if (k === "ask") { sessionStorage.setItem("lit.tutorCtx", JSON.stringify({ ...ctxFor(para), selection: text })); location.hash = "#/tutor"; }
      if (k === "note") noteSheet(para.dataset.pid, para.querySelector(".en-col").textContent);
      selBar?.remove(); selBar = null;
    };
  };
  let selT;
  const selHandler = () => { clearTimeout(selT); selT = setTimeout(onSel, 350); };
  document.addEventListener("selectionchange", selHandler);

  // Mark a section read when its end has been on screen for 4 seconds.
  let seenT;
  const io = new IntersectionObserver(([en]) => { clearTimeout(seenT); if (en.isIntersecting) seenT = setTimeout(markRead, 4000); });
  io.observe($("#end-sentinel", main));

  drawSection();
  if (!hasAr && layout === "ar") { layout = "en"; applyLayout(); }
  if (pId) setTimeout(() => scrollToP(pId), 50);
  else if (sId) window.scrollTo(0, 0);

  return () => { narrator.stop(); io.disconnect(); clearTimeout(seenT); document.removeEventListener("selectionchange", selHandler); selBar?.remove(); };
}
