// Chinese module: Hanzi — introduction, basic strokes, stroke-order rules, radicals, first characters with
// animated stroke order and writing practice (Hanzi Writer, MIT; stroke data from hanzi-writer-data,
// derived from Make Me a Hanzi / Arphic PL — see CREDITS.md). Data loads from jsDelivr on demand.
import { t, L, lang } from "../kit/js/i18n.js";
import { $, esc, num, shuffle, ICON, toast } from "../kit/js/util.js";
import { json } from "../kit/js/data.js";
import { say } from "../kit/js/speech.js";
import { run, vocabQuestions } from "../kit/js/practice.js";
import * as store from "../kit/js/store.js";
import { addReadings } from "../academy.js";

const TABS = ["intro", "strokes", "rules", "radicals", "chars"];
const WRITER = "https://cdn.jsdelivr.net/npm/hanzi-writer@3.7.3/dist/hanzi-writer.min.js";
const DATA = (c) => `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/${encodeURIComponent(c)}.json`;
const data = async () => { const h = await json("hanzi.json"); h.starter.forEach((s) => (s.id ||= `c-${s.hz}`)); addReadings(h.starter); return h; };

let writerP = null;
function loadWriter() {
  if (window.HanziWriter) return Promise.resolve(window.HanziWriter);
  return (writerP ||= new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = WRITER; s.crossOrigin = "anonymous";
    s.onload = () => res(window.HanziWriter);
    s.onerror = () => { writerP = null; rej(new Error("writer")); };
    document.head.append(s);
  }));
}
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const opts = (size) => ({ width: size, height: size, padding: 8, showOutline: true, strokeColor: css("--ink") || "#1b1514", radicalColor: css("--red") || "#b3121b",
  outlineColor: css("--line") || "#e6dccf", drawingColor: css("--red") || "#b3121b", strokeAnimationSpeed: 1, delayBetweenStrokes: 220,
  charDataLoader: (c, onLoad, onErr) => fetch(DATA(c)).then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then(onLoad).catch(onErr) });

// Animate one or two characters (used by the studio clip).
export async function animateChars(el, chars) {
  try {
    const HW = await loadWriter();
    el.innerHTML = "";
    el.style.display = "flex"; el.style.gap = "6px"; el.style.width = "auto";
    const size = chars.length > 1 ? 120 : 150;
    for (const c of chars) {
      const box = document.createElement("div");
      el.append(box);
      const w = HW.create(box, c, { ...opts(size), strokeColor: "#ffffff", outlineColor: "rgba(255,255,255,.15)", radicalColor: "#d8b35e" });
      await w.animateCharacter();
    }
  } catch (e) { el.innerHTML = ""; }
}

function charPanel(c, info) {
  return `<div class="panel" style="text-align:center">
    <div class="writer-box" id="wbox" role="img" aria-label="${esc(c)}"></div>
    <p style="margin:8px 0"><span class="reading" style="font-size:1.4rem">${esc(info?.py || "")}</span> · ${esc(info ? (lang() === "ar" ? info.ar : info.en) : "")}
      ${info?.strokes ? ` · <span class="small muted">${t("strokesN", { n: num(info.strokes) })}</span>` : ""}</p>
    <div class="row" style="justify-content:center"><button class="btn" id="anim">${ICON.play} ${t("animate")}</button>
      <button class="btn ghost" id="quiz">${ICON.write} ${t("practiceWrite")}</button>
      <button class="btn ghost" data-say="${esc(c)}">${ICON.speaker}</button>
      <a class="btn ghost" href="#/studio/${encodeURIComponent(c)}">${ICON.studio}</a></div>
    ${info?.words?.length ? `<div class="row" style="justify-content:center;margin-top:10px">${info.words.map((w) => `<button class="chip plain" data-say="${esc(w.hz)}"><span class="tl" lang="zh-Hans">${esc(w.hz)}</span>&nbsp;<span class="reading">${esc(w.spoken || w.py)}</span>&nbsp;${esc(w.ar)}</button>`).join("")}</div>` : ""}
    <p class="small muted" id="wmsg"></p></div>`;
}
async function mountWriter(root, c, onDone) {
  const box = $("#wbox", root);
  try {
    const HW = await loadWriter();
    const w = HW.create(box, c, opts(220));
    $("#anim", root).onclick = () => w.animateCharacter();
    $("#quiz", root).onclick = () => { $("#wmsg", root).textContent = ""; w.quiz({ onComplete: () => { $("#wmsg", root).textContent = "✓ " + t("writeDone"); store.xp(2); onDone?.(); } }); };
    w.animateCharacter();
  } catch (e) { box.outerHTML = `<div class="tl" lang="zh-Hans" style="font-size:6rem">${esc(c)}</div>`; $("#wmsg", root).textContent = t("writerOff"); }
}

function tabHTML(h, tab, l) {
  if (tab === "intro") return L(h.intro).map((x) => `<p>${esc(x)}</p>`).join("");
  if (tab === "strokes") return `<div class="chart">${h.strokes.map((s) => `<button data-char="${esc(s.ex)}"><span class="tl" lang="zh-Hans" style="font-size:1.6rem">${esc(s.zh)}</span><b style="font-size:1rem">${esc(s.py)}</b><span class="small">${esc(L(s.name))}</span></button>`).join("")}</div>
    <div class="section">${h.strokes.map((s) => `<div class="rule"><h3><span lang="zh-Hans">${esc(s.zh)}</span> · ${esc(L(s.name))}</h3><p style="margin:0">${esc(L(s.desc))} <span class="small muted">— <span lang="zh-Hans">${esc(s.ex)}</span></span></p></div>`).join("")}</div>`;
  if (tab === "rules") return h.rules.map((r) => `<div class="rule"><h3>${esc(L(r.title))}</h3><p style="margin:0 0 8px">${esc(L(r.body))}</p>
    <div class="row">${(r.ex || []).map((c) => `<button class="btn ghost small" data-char="${esc(c)}"><span class="tl" lang="zh-Hans" style="font-size:1.4rem">${esc(c)}</span> ${ICON.play}</button>`).join("")}</div></div>`).join("");
  if (tab === "radicals") return `<div class="vocab-grid">${h.radicals.map((r) => `<div class="vcard"><div class="row" style="justify-content:space-between"><span class="tl xl" lang="zh-Hans">${esc(r.hz)}</span><span class="reading">${esc(r.py)} · <span lang="zh-Hans">${esc(r.full || "")}</span></span></div>
    <div class="vmeaning">${esc(L(r.name))}</div><div class="row">${r.ex.map((c) => `<button class="chip plain" data-char="${esc(c)}"><span class="tl" lang="zh-Hans">${esc(c)}</span></button>`).join("")}</div></div>`).join("")}</div>`;
  if (tab === "chars") {
    const list = l?.range ? h.starter.slice(...l.range) : h.starter;
    return `<div class="char-grid">${list.map((s) => `<button data-char="${esc(s.hz)}"><span class="tl" lang="zh-Hans">${esc(s.hz)}</span><span class="reading small">${esc(s.py)}</span></button>`).join("")}</div>`;
  }
  return "";
}

function wire(root, h) {
  root.addEventListener("click", (e) => {
    const s = e.target.closest("[data-say]"); if (s) return say(s.dataset.say);
    const c = e.target.closest("[data-char]");
    if (c) openChar(c.dataset.char, h);
  });
}
async function openChar(c, h) {
  const { openSheet } = await import("../kit/js/util.js");
  const info = h.starter.find((s) => s.hz === c);
  const sheet = openSheet(charPanel(c, info), { label: c });
  sheet.addEventListener("click", (e) => { const s = e.target.closest("[data-say]"); if (s) say(s.dataset.say); });
  mountWriter(sheet, c);
  say(c);
}

export async function lesson(root, l) {
  const h = await data();
  root.innerHTML = tabHTML(h, l.tab, l);
  wire(root, h);
  if (l.tab === "chars") {
    const list = h.starter.slice(...(l.range || [0, 40]));
    return () => vocabQuestions(list, h.starter, 10, ["meaning", "listen", "term", "meaning", "match"]);
  }
  if (l.tab === "radicals") {
    return () => shuffle(h.radicals).slice(0, 8).map((r) => {
      const o = shuffle([r, ...shuffle(h.radicals.filter((x) => x !== r)).slice(0, 3)]);
      return { kind: "mcq", ex: { q: r.hz, options: o.map((x) => L(x.name)), answer: o.indexOf(r), plain: true } };
    });
  }
  if (l.tab === "strokes") {
    return () => shuffle(h.strokes).slice(0, 8).map((s) => {
      const o = shuffle([s, ...shuffle(h.strokes.filter((x) => x !== s)).slice(0, 3)]);
      return { kind: "mcq", ex: { q: s.zh, py: s.py, options: o.map((x) => L(x.name)), answer: o.indexOf(s), plain: true } };
    });
  }
  return () => [];
}

export async function render(main, [tab = "intro", arg]) {
  const h = await data();
  if (tab === "char" && arg) {
    const c = decodeURIComponent(arg);
    main.innerHTML = `<a class="link small" href="#/m/hanzi/chars">${lang() === "ar" ? "→" : "←"} ${t("chars")}</a><h1 class="display h1" lang="zh-Hans">${esc(c)}</h1>${charPanel(c, h.starter.find((s) => s.hz === c))}`;
    main.addEventListener("click", (e) => { const s = e.target.closest("[data-say]"); if (s) say(s.dataset.say); });
    mountWriter(main, c);
    return;
  }
  if (!TABS.includes(tab)) tab = "intro";
  main.innerHTML = `<h1 class="display h1">${t("m_hanzi")}</h1>
    <div class="tabs" role="tablist">${TABS.map((k) => `<a role="tab" href="#/m/hanzi/${k}" aria-selected="${k === tab}">${t(k === "rules" ? "strokeOrder" : k)}</a>`).join("")}</div>
    <div id="hbody">${tabHTML(h, tab)}</div>`;
  wire($("#hbody", main), h);
}
