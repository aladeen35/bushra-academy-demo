// Chinese module: pinyin system — introduction, tones (with contour diagrams), initials, finals, rules,
// and a tone-recognition drill. Also supplies curriculum lessons (lesson()) and test questions (toneQuestions()).
import { t, L, lang } from "../kit/js/i18n.js";
import { $, esc, num, shuffle, ICON } from "../kit/js/util.js";
import { json } from "../kit/js/data.js";
import { say, SLOW } from "../kit/js/speech.js";
import { run } from "../kit/js/practice.js";
import * as store from "../kit/js/store.js";
import { TONE_COLORS } from "../py.js";

const TABS = ["intro", "tones", "initials", "finals", "rules", "drill"];
const data = () => json("pinyin.json");

// Tone contour on the 1–5 pitch scale (Chao numbers), e.g. "214".
export function contour(c, color) {
  const pts = String(c).match(/\d/g);
  const y = (d) => 64 - (+d - 1) * 13;
  if (!pts) return `<svg viewBox="0 0 96 72" aria-hidden="true"><circle cx="48" cy="${y(2)}" r="6" fill="${color}"/></svg>`;
  const step = 76 / Math.max(1, pts.length - 1);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${10 + i * step} ${y(p)}`).join(" ");
  return `<svg viewBox="0 0 96 72" aria-hidden="true">${[1, 2, 3, 4, 5].map((k) => `<line x1="6" x2="90" y1="${y(k)}" y2="${y(k)}" stroke="currentColor" opacity=".12"/>`).join("")}
    <path d="${d}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

const ex = (x) => (x ? `<button class="chip plain" data-say="${esc(x.hz)}"><span lang="zh-Hans" class="tl">${esc(x.hz)}</span>&nbsp;<span class="reading">${esc(x.py)}</span>&nbsp;${esc(x.ar)}</button>` : "");

function tabHTML(p, tab, l) {
  if (tab === "intro") return `${L(p.intro).map((x) => `<p>${esc(x)}</p>`).join("")}
    <div class="pattern-box"><div class="pattern" dir="ltr">zh + ōng = zhōng · 中</div><div class="small">${lang() === "ar" ? "المقطع = حرف أوّل + حرف أخير + نغمة" : "Syllable = initial + final + tone"}</div></div>`;
  if (tab === "tones") return p.tones.map((x) => `<div class="tone-card" style="color:${TONE_COLORS[x.n]}">
      <div>${contour(x.contour, TONE_COLORS[x.n])}</div>
      <div style="color:var(--ink)"><h3 style="margin:0">${esc(L(x.name))} <span class="reading" style="font-size:1.4rem">${esc(x.mark)}</span></h3>
      <p style="margin:4px 0">${esc(L(x.desc))}</p>${x.tip_ar && lang() === "ar" ? `<p class="small muted" style="margin:0 0 6px">💡 ${esc(x.tip_ar)}</p>` : ""}
      <div class="row">${x.examples.map(ex).join("")}</div></div></div>`).join("") +
    `<h2 class="h2">${t("drill")}</h2><div class="chart">${p.toneSets.slice(0, 4).flatMap((s) => s.items).map((i) => `<button data-say="${esc(i.hz)}"><b>${esc(i.py)}</b><span class="tl" lang="zh-Hans">${esc(i.hz)}</span><span class="small muted">${esc(i.ar)}</span></button>`).join("")}</div>`;
  if (tab === "initials" || tab === "finals") {
    const list = p[tab];
    const groups = [...new Set(list.map((x) => x.group))];
    return groups.map((g) => `<h3 class="h2" style="font-size:1.1rem">${esc(g)}</h3><div class="chart">${list.filter((x) => x.group === g).map((x) =>
      `<button data-detail="${esc(x.p)}" data-say="${esc(x.ex?.hz || "")}"><b>${esc(x.p)}</b><span class="tl" lang="zh-Hans">${esc(x.ex?.hz || "")}</span><span class="small muted reading">${esc(x.ex?.py || "")}</span></button>`).join("")}</div>`).join("") +
      `<div id="detail" class="section"></div>`;
  }
  if (tab === "rules") return p.rules.map((r) => `<div class="rule"><h3>${esc(L(r.title))}</h3><p style="margin:0 0 8px">${esc(L(r.body))}</p><div class="row">${(r.examples || []).map(ex).join("")}</div></div>`).join("");
  if (tab === "drill") return `<p class="muted">${t("whichTone")}</p><div id="drill"></div>`;
  return "";
}

function detail(p, tab, key) {
  const x = p[tab].find((i) => i.p === key);
  if (!x) return "";
  return `<div class="panel"><div class="row" style="justify-content:space-between"><h3 style="margin:0"><span class="reading" style="font-size:2rem">${esc(x.p)}</span> <span class="small muted" dir="ltr">[${esc(x.ipa || "")}]</span></h3>
    ${x.ex ? `<button class="btn small" data-say="${esc(x.ex.hz)}">${ICON.speaker} ${esc(x.ex.hz)}</button>` : ""}</div>
    ${x.desc ? `<p>${esc(L(x.desc))}</p>` : ""}${x.ar_hint && lang() === "ar" ? `<p class="notice"><b>${t("arHint")}:</b> ${esc(x.ar_hint)}</p>` : ""}
    ${x.ex ? `<p><span class="tl" lang="zh-Hans" style="font-size:1.6rem">${esc(x.ex.hz)}</span> <span class="reading">${esc(x.ex.py)}</span> — ${esc(x.ex.ar)}</p>` : ""}</div>`;
}

function wire(root, p, tab) {
  root.addEventListener("click", (e) => {
    const d = e.target.closest("[data-detail]");
    if (d) { const el = $("#detail", root); el.innerHTML = detail(p, tab, d.dataset.detail); }
    const s = e.target.closest("[data-say]");
    if (s && s.dataset.say) say(s.dataset.say, { rate: e.target.closest("[data-detail]") ? SLOW : undefined });
  });
}

// ---- question generators ----
export async function toneQuestions(n = 8) {
  const p = await data();
  const items = shuffle(p.toneSets.flatMap((s) => s.items)).slice(0, n);
  const labels = [1, 2, 3, 4].map((k) => t("toneN", { n: num(k) }));
  return items.map((i) => ({ kind: "tone", audio: i.hz, prompt: t("whichTone"), options: labels, correct: i.t - 1 }));
}
async function soundQuestions(tab, n = 8) {
  const p = await data();
  const list = p[tab].filter((x) => x.ex?.hz);
  return shuffle(list).slice(0, n).map((x) => {
    const opts = shuffle([x, ...shuffle(list.filter((y) => y.p !== x.p && y.group === x.group).concat(shuffle(list.filter((y) => y.group !== x.group)))).slice(0, 3)]);
    return { kind: "tone", audio: x.ex.hz, prompt: t(tab === "initials" ? "whichSound" : "whichFinal") + ` (${x.ex.ar})`, options: opts.map((o) => o.p), correct: opts.indexOf(x) };
  });
}

// Curriculum lesson: render the tab's content into `root`, return a practice-question factory.
export async function lesson(root, l) {
  const p = await data();
  root.innerHTML = tabHTML(p, l.tab === "drill" ? "tones" : l.tab, l);
  wire(root, p, l.tab);
  if (l.tab === "tones" || l.tab === "rules" || l.tab === "drill") { const qs = await toneQuestions(8); return () => qs.map((q) => ({ ...q })); }
  if (l.tab === "initials" || l.tab === "finals") { const qs = await soundQuestions(l.tab, 8); return () => qs; }
  return () => [];
}

export async function render(main, [tab = "intro"]) {
  if (!TABS.includes(tab)) tab = "intro";
  const p = await data();
  main.innerHTML = `<h1 class="display h1">${t("m_pinyin")}</h1>
    <div class="tabs" role="tablist">${TABS.map((k) => `<a role="tab" href="#/m/pinyin/${k}" aria-selected="${k === tab}">${t(k)}</a>`).join("")}</div>
    <div id="pbody">${tabHTML(p, tab)}</div>`;
  const body = $("#pbody", main);
  wire(body, p, tab);
  if (tab === "drill") run($("#drill", body), await toneQuestions(10), { onFinish: (s, n) => store.addQuiz("tones", "drill", s, n) });
}
