// Content management (editors/admins). Writes to Firestore lit_* collections; static /content stays the baseline.
// Workflow per book: source import → rights → extraction → editorial review → translation → vocabulary → grammar
// → illustrations → audio → educational quality review → publishing. AI drafts stay marked until approved here.
import { t, L, lang, RIGHTS, STAGES, TEXT_ALLOWED } from "../i18n.js";
import { $, $$, esc, num, toast, pad2 } from "../util.js";
import * as fb from "../fb.js";
import * as data from "../data.js";
import { parseNovel, parseChapterText } from "../importer.js";

const RIGHT_KEYS = Object.keys(RIGHTS);
const BI = ["jurisdiction", "translationRights", "audioRights", "distributionRights", "conditions"];

async function ensureBookDoc(slug) {
  const r = await fb.get("lit_books", slug);
  if (r) return r;
  const { books } = await data.catalog({ includeUnpublished: true });
  const b = books.find((x) => x.slug === slug);
  const { source, ...rest } = b;
  await fb.set("lit_books", slug, rest);
  return rest;
}
const saved = () => { data.invalidate(); toast(t("saved")); };
const fail = (e) => { console.error(e); toast(t("error") + " " + (e.code || "")); };

export async function render(main, [section, slug, n]) {
  if (!fb.enabled) { main.innerHTML = `<div class="notice">${t("cmsNeedFb")}</div>`; return; }
  await fb.init();
  const u = fb.currentUser();
  if (!u) { main.innerHTML = `<div class="notice">${t("tutorSignIn")} <a class="link" href="#/profile">${t("signIn")} →</a></div>`; return; }
  if (!fb.isEditor()) {
    const boot = await fb.get("lit_config", "bootstrap");
    main.innerHTML = `<div class="notice">${t("cmsNoRole")}</div>
      ${!boot ? `<button class="btn" id="claim" style="margin-top:12px">${t("claimAdmin")}</button>` : ""}
      <p class="small muted">UID: <code>${esc(u.uid)}</code></p>`;
    $("#claim", main)?.addEventListener("click", async () => {
      try { await fb.claimFirstAdmin(); toast(t("claimed")); location.reload(); } catch (e) { fail(e); }
    });
    return;
  }
  const views = { book: editBook, chapters, text: editText, tr: editTranslation, study: editStudy, vocab: editVocab, team };
  const head = `<div class="row" style="justify-content:space-between"><h1 class="display h1" style="margin:0">${t("cms")}</h1>
    <div class="row"><a class="chip plain" style="min-height:44px;text-decoration:none" href="#/admin">${t("books")}</a>${fb.isAdmin() ? `<a class="chip plain" style="min-height:44px;text-decoration:none" href="#/admin/team">${t("team")}</a>` : ""}</div></div>`;
  main.innerHTML = head + `<div id="adm" style="margin-top:16px"></div>`;
  const el = $("#adm", main);
  if (views[section]) return views[section](el, slug, n ? +n : undefined);
  return dashboard(el);
}

// ---------- dashboard ----------
async function dashboard(el) {
  const { books } = await data.catalog({ includeUnpublished: true });
  el.innerHTML = `
    <table class="admin-table"><thead><tr><th>${t("book")}</th><th>${t("rights")}</th><th>${t("pipeline")}</th><th></th></tr></thead><tbody>
    ${books.map((b) => {
      const si = STAGES.indexOf(b.stage || "import");
      return `<tr><td><b lang="en">${esc(b.title)}</b><br><span class="small muted">${esc(b.slug)} · ${b.published === false ? t("unpublished") : t("publish")}</span></td>
        <td><span class="chip ${RIGHTS[b.rights?.status]?.cls || "warn"}">${t(RIGHTS[b.rights?.status]?.key || "r_awaiting")}</span></td>
        <td><div class="pipeline">${STAGES.map((s, i) => `<span class="${i < si ? "done" : i === si ? "now" : ""}">${t("st_" + s)}</span>`).join("")}</div></td>
        <td><div class="row"><a class="btn ghost small" href="#/admin/book/${b.slug}">${t("edit")}</a><a class="btn ghost small" href="#/admin/chapters/${b.slug}">${t("contents")}</a><a class="btn ghost small" href="#/admin/vocab/${b.slug}">${t("vocabulary")}</a></div></td></tr>`;
    }).join("")}</tbody></table>
    <section class="panel section" style="max-width:640px"><h2 class="h2">${t("addBook")}</h2>
      <form id="nb">
        <div class="field"><label>${t("slug")}</label><input class="input en" name="slug" pattern="[a-z0-9-]{3,60}" required placeholder="pride-and-prejudice"></div>
        <div class="grid-2"><div class="field"><label>${t("titleEn")}</label><input class="input en" name="title" required></div><div class="field"><label>${t("titleAr")}</label><input class="input" name="titleAr"></div>
        <div class="field"><label>${t("authorEn")}</label><input class="input en" name="author" required></div><div class="field"><label>${t("authorAr")}</label><input class="input" name="authorAr"></div></div>
        <button class="btn">${t("addBook")}</button></form></section>`;
  $("#nb", el).onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const slug = f.slug.value.trim();
    if ((await data.catalog({ includeUnpublished: true })).books.some((b) => b.slug === slug)) return toast("slug exists");
    try {
      await fb.set("lit_books", slug, {
        title: f.title.value.trim(), titleAr: f.titleAr.value.trim(), author: f.author.value.trim(), authorAr: f.authorAr.value.trim(),
        year: null, genre: { en: "", ar: "" }, tags: [], level: "B1", studyHours: 10, cover: "assets/icon-512.png", language: "en",
        text: "full", stage: "import", published: false, order: Date.now(), rights: { status: "awaiting", licenseDocs: [] },
      });
      saved();
      location.hash = `#/admin/book/${slug}`;
    } catch (err) { fail(err); }
  };
}

// ---------- book metadata + rights + about ----------
async function editBook(el, slug) {
  const b = await data.book(slug, { includeUnpublished: true });
  if (!b) { el.innerHTML = `<div class="empty">${t("notFound")}</div>`; return; }
  const r = b.rights || {};
  const inp = (name, val, cls = "") => `<input class="input ${cls}" name="${name}" value="${esc(val ?? "")}">`;
  const bi = (name, o) => `<div class="grid-2"><textarea class="input en" name="${name}.en" rows="2">${esc(o?.en || "")}</textarea><textarea class="input ar" name="${name}.ar" rows="2">${esc(o?.ar || "")}</textarea></div>`;
  el.innerHTML = `<a class="link" href="#/admin">← ${t("books")}</a>
    <form id="bf" class="panel"><h2 class="h2" lang="en">${esc(b.title)}</h2>
      <div class="grid-2">
        <div class="field"><label>${t("titleEn")}</label>${inp("title", b.title, "en")}</div><div class="field"><label>${t("titleAr")}</label>${inp("titleAr", b.titleAr)}</div>
        <div class="field"><label>${t("authorEn")}</label>${inp("author", b.author, "en")}</div><div class="field"><label>${t("authorAr")}</label>${inp("authorAr", b.authorAr)}</div>
        <div class="field"><label>${t("year")}</label>${inp("year", b.year)}</div><div class="field"><label>${t("level")}</label>${inp("level", b.level)}</div>
        <div class="field"><label>${t("studyTime")} (${t("hours")})</label>${inp("studyHours", b.studyHours)}</div><div class="field"><label>Cover URL</label>${inp("cover", b.cover, "en")}</div>
        <div class="field"><label>Tags</label>${inp("tags", (b.tags || []).join(", "), "en")}</div>
        <div class="field"><label>Text</label><select class="input" name="text"><option value="full" ${b.text !== "none" ? "selected" : ""}>${t("fullText")}</option><option value="none" ${b.text === "none" ? "selected" : ""}>${t("studyOnly")}</option></select></div>
      </div>
      <div class="field"><label>${t("genre")}</label>${bi("genre", b.genre)}</div>
      <div class="field"><label>${t("pipeline")}</label><select class="input" name="stage">${STAGES.map((s) => `<option value="${s}" ${b.stage === s ? "selected" : ""}>${t("st_" + s)}</option>`).join("")}</select></div>
      <label class="row" style="min-height:44px"><input type="checkbox" name="published" ${b.published !== false ? "checked" : ""}> ${t("publish")}</label>
      <h3 style="margin-top:18px">${t("rights")}</h3>
      <div class="grid-2">
        <div class="field"><label>${t("r_status")}</label><select class="input" name="r.status">${RIGHT_KEYS.map((k) => `<option value="${k}" ${r.status === k ? "selected" : ""}>${t(RIGHTS[k].key)}</option>`).join("")}</select></div>
        <div class="field"><label>${t("r_verified")}</label>${inp("r.verifiedAt", r.verifiedAt)}</div>
        <div class="field"><label>${t("r_died")}</label>${inp("r.authorDied", r.authorDied)}</div><div class="field"><label>${t("r_first")}</label>${inp("r.firstPublished", r.firstPublished)}</div>
      </div>
      <div class="field"><label>${t("r_edition")}</label>${inp("r.sourceEdition", L(r.sourceEdition), "en")}</div>
      <div class="field"><label>Source URL</label>${inp("r.sourceUrl", r.sourceUrl, "en")}</div>
      ${BI.map((k) => `<div class="field"><label>${t({ jurisdiction: "r_juris", translationRights: "r_trans", audioRights: "r_audio", distributionRights: "r_dist", conditions: "r_cond" }[k])}</label>${bi("r." + k, typeof r[k] === "string" ? { en: r[k] } : r[k])}</div>`).join("")}
      <div class="field"><label>${t("r_docs")} (name | URL, one per line)</label><textarea class="input en" name="r.docs" rows="3">${esc((r.licenseDocs || []).map((d) => `${d.name || ""} | ${d.url || d}`).join("\n"))}</textarea></div>
      <h3>${t("about")} (JSON)</h3>
      <textarea class="input en" name="about" rows="10" style="font-family:monospace;font-size:.8rem">${esc(JSON.stringify(b.about || {}, null, 1))}</textarea>
      <button class="btn">${t("save")}</button>
    </form>`;
  $("#bf", el).onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const g = (k) => String(f.get(k) ?? "").trim();
    let about;
    try { about = JSON.parse(g("about") || "{}"); } catch (x) { return toast(t("jsonInvalid") + x.message); }
    const rights = {
      status: g("r.status"), verifiedAt: g("r.verifiedAt"), verifiedBy: fb.currentUser().email || fb.currentUser().uid,
      authorDied: +g("r.authorDied") || null, firstPublished: +g("r.firstPublished") || null,
      sourceEdition: g("r.sourceEdition"), sourceUrl: g("r.sourceUrl"),
      licenseDocs: g("r.docs").split("\n").map((l) => l.split("|").map((s) => s.trim())).filter((x) => x[1] || x[0]).map(([name, url]) => ({ name, url: url || name })),
    };
    for (const k of BI) rights[k] = { en: g(`r.${k}.en`), ar: g(`r.${k}.ar`) };
    try {
      await fb.set("lit_books", slug, {
        title: g("title"), titleAr: g("titleAr"), author: g("author"), authorAr: g("authorAr"), year: +g("year") || null, level: g("level"),
        studyHours: +g("studyHours") || 0, cover: g("cover"), tags: g("tags").split(",").map((s) => s.trim()).filter(Boolean), text: g("text"),
        genre: { en: g("genre.en"), ar: g("genre.ar") }, stage: g("stage"), published: f.get("published") === "on", rights,
      });
      await fb.set("lit_about", slug, about, false);
      saved();
    } catch (x) { fail(x); }
  };
}

// ---------- chapters: list + import ----------
async function chapters(el, slug) {
  const b = await data.book(slug, { includeUnpublished: true });
  const allowed = TEXT_ALLOWED.includes(b.rights?.status);
  const idx = b.chapters || [];
  el.innerHTML = `<a class="link" href="#/admin">← ${t("books")}</a><h2 class="h2" lang="en">${esc(b.title)}</h2>
    ${!allowed ? `<p class="notice red">${t("rightsBlock")}</p>` : ""}
    <table class="admin-table"><tbody>${idx.map((c) => `<tr><td>${num(c.n)}</td><td lang="en">${esc(c.title || "")}<br><span class="small muted">${c.part ? esc(c.part) + " · " : ""}${c.words ? num(c.words) + " " + t("words") : ""}</span></td>
      <td><div class="row">${b.text !== "none" ? `<a class="btn ghost small" href="#/admin/text/${slug}/${c.n}">${t("verifyText")}</a><a class="btn ghost small" href="#/admin/tr/${slug}/${c.n}">${t("translations")}</a>` : ""}<a class="btn ghost small" href="#/admin/study/${slug}/${c.n}">${t("studyPacks")}</a></div></td></tr>`).join("")}</tbody></table>
    ${b.text !== "none" ? `<section class="panel section"><h3>${t("importText")}</h3><p class="small muted">${t("importHint")}</p>
      <form id="imp"><div class="row"><label><input type="radio" name="mode" value="whole" checked> ${t("importWhole")}</label><label><input type="radio" name="mode" value="one"> ${t("importOne")}</label>
        <input class="input" name="n" type="number" min="1" placeholder="${t("chapter")} #" style="width:120px"><input class="input en" name="title" placeholder="${t("titleEn")}" style="flex:1"></div>
        <input type="file" accept=".txt,text/plain" name="file" style="margin:10px 0">
        <textarea class="input en" name="text" rows="8" placeholder="…"></textarea>
        <div id="imp-prev" class="small muted" style="margin:8px 0"></div>
        <button class="btn">${t("runImport")}</button></form></section>` : ""}`;
  const form = $("#imp", el);
  if (!form) return;
  form.file.onchange = async () => { const fl = form.file.files[0]; if (fl) form.text.value = await fl.text(); };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const text = form.text.value;
    if (!text.trim()) return;
    let chs, corrections = [];
    if (form.mode.value === "whole") ({ chapters: chs, corrections } = parseNovel(text));
    else chs = [parseChapterText(text, +form.n.value || idx.length + 1, form.title.value.trim())];
    if (!chs.length) return toast(t("noResults"));
    $("#imp-prev", el).textContent = `${chs.length} ${t("chapters")} · ${chs.reduce((a, c) => a + c.words, 0)} ${t("words")}${corrections.length ? " · " + corrections.join("; ") : ""}`;
    if (!confirm(`${t("runImport")}: ${chs.length} ${t("chapters")}?`)) return;
    try {
      await ensureBookDoc(slug);
      for (const c of chs) await fb.set("lit_chapters", `${slug}_${pad2(c.n)}`, { ...c, slug, verified: false }, false);
      const merged = new Map(idx.map((c) => [c.n, c]));
      for (const c of chs) merged.set(c.n, { n: c.n, title: c.title, part: c.part, words: c.words, sections: c.sections.length });
      await fb.set("lit_chapter_index", slug, { slug, chapters: [...merged.values()].sort((a, b2) => a.n - b2.n) }, false);
      saved();
      toast(t("importDone", { n: chs.length }));
      chapters(el, slug);
    } catch (x) { fail(x); }
  };
}

// ---------- editorial verification of the English text ----------
const SUSPECT = [/\b\w*\d+[a-z]+\w*\b/gi, /\s[,.;:!?]/g, /\b(tbe|tlie|aud|bave|wben|rn|tbat)\b/g, /[^\x20-\x7E\n’‘“”—–…éèêëàâäôöûüçïîñæœ£]/g, / {2,}/g, /\w-\s\w/g];
function suspects(s) { return SUSPECT.reduce((a, re) => a + (s.match(re)?.length || 0), 0); }
async function editText(el, slug, n) {
  const ch = await (async () => { const r = await fb.get("lit_chapters", `${slug}_${pad2(n)}`); return r?.sections ? r : data.chapter(slug, n); })();
  if (!ch) { el.innerHTML = `<div class="empty">${t("notFound")}</div>`; return; }
  const paras = ch.sections.flatMap((s) => s.paragraphs.map((p) => ({ ...p, s: s.id })));
  const bad = paras.filter((p) => suspects(p.en)).length;
  el.innerHTML = `<a class="link" href="#/admin/chapters/${slug}">← ${t("contents")}</a>
    <h2 class="h2">${t("verifyText")} · ${t("chapterN", { n: num(n) })}</h2>
    <p class="row"><span class="chip ${bad ? "warn" : "ok"}">${t("suspect")}: ${num(bad)}</span>${ch.verified ? `<span class="chip ok">✓ ${t("verified")}</span>` : ""}
      <label class="row"><input type="checkbox" id="only-bad"> ${t("suspect")}</label></p>
    <form id="tf">${paras.map((p) => `<div class="tr-row" data-bad="${suspects(p.en) ? 1 : 0}" style="grid-template-columns:70px 1fr"><span class="small muted">${p.id}${p.src ? `<br>#${p.src}` : ""}${suspects(p.en) ? "<br>⚠" : ""}</span>
      <textarea class="input en" name="${p.id}" rows="${Math.min(10, Math.ceil(p.en.length / 90) + 1)}">${esc(p.en)}</textarea></div>`).join("")}
      <div class="row" style="position:sticky;bottom:70px;background:var(--paper);padding:10px 0"><button class="btn" name="save">${t("save")}</button><button class="btn ghost" name="verify" value="1">${t("save")} + ✓ ${t("verified")}</button></div></form>`;
  $("#only-bad", el).onchange = (e) => $$(".tr-row", el).forEach((r) => (r.hidden = e.target.checked && r.dataset.bad !== "1"));
  $("#tf", el).onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const sections = ch.sections.map((s) => ({ ...s, paragraphs: s.paragraphs.map((p) => ({ ...p, en: String(f.get(p.id)).trim() })) }));
    try {
      await ensureBookDoc(slug);
      await fb.set("lit_chapters", `${slug}_${pad2(n)}`, { n, title: ch.title || "", part: ch.part || "", words: ch.words || 0, sections, slug, verified: e.submitter?.name === "verify" || !!ch.verified }, false);
      saved();
    } catch (x) { fail(x); }
  };
}

// ---------- translation review ----------
async function editTranslation(el, slug, n) {
  const [ch, tr] = await Promise.all([fb.get("lit_chapters", `${slug}_${pad2(n)}`).then((r) => (r?.sections ? r : data.chapter(slug, n))), data.translation(slug, n)]);
  if (!ch) { el.innerHTML = `<div class="empty">${t("notFound")}</div>`; return; }
  const paras = ch.sections.flatMap((s) => s.paragraphs);
  const ps = tr?.pstatus || {};
  const opts = (cur) => ["draft", "reviewed", "approved"].map((s) => `<option value="${s}" ${cur === s ? "selected" : ""}>${t("status_" + s)}</option>`).join("");
  el.innerHTML = `<a class="link" href="#/admin/chapters/${slug}">← ${t("contents")}</a>
    <h2 class="h2">${t("translations")} · ${t("chapterN", { n: num(n) })}</h2>
    <form id="trf"><div class="row panel" style="margin-bottom:12px">
      <label>${t("status_draft")}/${t("status_approved")}: <select class="input" name="__status" style="width:auto">${opts(tr?.status || "draft")}</select></label>
      <label>Translator: <input class="input" name="__translator" value="${esc(tr?.translator || "AI draft")}" style="width:auto"></label>
      <button class="btn ghost small" type="button" id="all-ok">${t("approveAll")}</button></div>
    ${paras.map((p) => `<div class="tr-row"><div class="en small" style="white-space:pre-line"><b>${p.id}</b> ${esc(p.en)}</div>
      <div><textarea class="input ar" name="${p.id}" rows="${Math.min(10, Math.ceil(p.en.length / 80) + 1)}">${esc(tr?.paragraphs?.[p.id] || "")}</textarea>
      <select class="input" name="__s_${p.id}" style="margin-top:6px;min-height:40px">${opts(ps[p.id] || (tr?.status === "approved" ? "approved" : "draft"))}</select></div></div>`).join("")}
    <div class="row" style="position:sticky;bottom:70px;background:var(--paper);padding:10px 0"><button class="btn">${t("save")}</button></div></form>`;
  $("#all-ok", el).onclick = () => { $$("select", el).forEach((s) => (s.value = "approved")); };
  $("#trf", el).onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const paragraphs = {}, pstatus = {};
    for (const p of paras) { paragraphs[p.id] = String(f.get(p.id) || "").trim(); pstatus[p.id] = f.get(`__s_${p.id}`); }
    const vals = Object.values(pstatus);
    // The chapter can't be "approved" while any paragraph is still a draft.
    let status = f.get("__status");
    if (status === "approved" && vals.some((v) => v !== "approved")) status = vals.some((v) => v === "draft") ? "draft" : "reviewed";
    try {
      await ensureBookDoc(slug);
      await fb.set("lit_translations", `${slug}_${pad2(n)}`, { slug, n, paragraphs, pstatus, status, translator: f.get("__translator") }, false);
      saved();
    } catch (x) { fail(x); }
  };
}

// ---------- study pack (JSON, validated) ----------
async function editStudy(el, slug, n) {
  const pack = (await data.study(slug, n)) || { chapter: n, summary: { en: "", ar: "" }, objectives: [], vocab: [], grammar: [], culture: [], quiz: [] };
  el.innerHTML = `<a class="link" href="#/admin/chapters/${slug}">← ${t("contents")}</a><h2 class="h2">${t("studyPacks")} · ${t("chapterN", { n: num(n) })}</h2>
    <p class="small muted">content/SCHEMA.md</p>
    <form id="sf"><textarea class="input en" name="j" rows="28" style="font-family:monospace;font-size:.8rem">${esc(JSON.stringify(pack, null, 1))}</textarea><button class="btn">${t("save")}</button></form>`;
  $("#sf", el).onsubmit = async (e) => {
    e.preventDefault();
    let p;
    try { p = JSON.parse(e.target.j.value); } catch (x) { return toast(t("jsonInvalid") + x.message); }
    const bad = (p.quiz || []).find((q) => !Array.isArray(q.options) || q.answer == null || q.answer >= q.options.length);
    if (bad) return toast(t("jsonInvalid") + "quiz answer");
    try { await ensureBookDoc(slug); await fb.set("lit_study", `${slug}_${pad2(n)}`, { slug, pack: p }, false); saved(); } catch (x) { fail(x); }
  };
}

// ---------- vocabulary ----------
async function editVocab(el, slug) {
  const { entries } = await data.vocab();
  const list = [...entries.values()].filter((e) => e.book === slug).sort((a, b) => a.word.localeCompare(b.word));
  const blank = { id: "", word: "", forms: [], ar: "", ipa: "", pos: "", def: "", arExplain: "", example: "", exampleAr: "", exampleRef: null, synonyms: [], antonyms: [], level: "B1", category: "intermediate" };
  el.innerHTML = `<a class="link" href="#/admin">← ${t("books")}</a><h2 class="h2">${t("vocabulary")} · ${num(list.length)}</h2>
    <div class="grid-2" style="align-items:start">
      <div class="word-list" style="max-height:70vh;overflow:auto">${list.map((e) => `<button class="word-row" data-id="${esc(e.id)}"><span class="en">${esc(e.word)}</span><span class="ar">${esc(e.ar)}</span></button>`).join("")}
        <button class="btn ghost small" data-id="">+ ${t("addBook").replace(/.*/, lang() === "ar" ? "كلمة جديدة" : "New word")}</button></div>
      <form id="vf" class="panel"><textarea class="input en" name="j" rows="22" style="font-family:monospace;font-size:.8rem"></textarea>
        <div class="row"><button class="btn">${t("save")}</button><button class="btn ghost" type="button" id="vdel">${t("delete")}</button></div></form></div>`;
  const form = $("#vf", el);
  let cur = null;
  const load = (e) => { cur = e; form.j.value = JSON.stringify({ ...blank, ...e, book: undefined }, null, 1); };
  load(list[0] || blank);
  el.onclick = (e) => { const b = e.target.closest("[data-id]"); if (b) load(b.dataset.id ? entries.get(b.dataset.id) : blank); };
  const write = async (id, value) => { await ensureBookDoc(slug); await fb.set("lit_vocab", slug, { entries: { [id]: value } }, true); data.invalidate(); };
  form.onsubmit = async (e) => {
    e.preventDefault();
    let v;
    try { v = JSON.parse(form.j.value); } catch (x) { return toast(t("jsonInvalid") + x.message); }
    if (!v.id || !v.word) return toast(t("jsonInvalid") + "id/word");
    try { await write(v.id, v); saved(); editVocab(el, slug); } catch (x) { fail(x); }
  };
  $("#vdel", el).onclick = async () => { if (cur?.id && confirm(t("delete") + " " + cur.word + "?")) { try { await write(cur.id, null); saved(); editVocab(el, slug); } catch (x) { fail(x); } } };
}

// ---------- team ----------
async function team(el) {
  if (!fb.isAdmin()) { el.innerHTML = `<div class="notice">${t("cmsNoRole")}</div>`; return; }
  const roles = await fb.list("lit_roles");
  el.innerHTML = `<table class="admin-table"><tbody>${roles.map((r) => `<tr><td>${esc(r.name || "")}<br><span class="small muted">${esc(r.email || "")} · <code>${esc(r.id)}</code></span></td><td>${esc(r.role)}</td>
    <td>${r.id !== fb.currentUser().uid ? `<button class="btn ghost small" data-rm="${esc(r.id)}">${t("delete")}</button>` : ""}</td></tr>`).join("")}</tbody></table>
    <form id="tm" class="panel section" style="max-width:560px"><h3>${t("addMember")}</h3>
      <div class="field"><label>UID</label><input class="input en" name="uid" required></div>
      <div class="field"><label>${t("email")}</label><input class="input en" name="email"></div>
      <div class="field"><label>${t("role")}</label><select class="input" name="role"><option value="editor">editor</option><option value="admin">admin</option></select></div>
      <button class="btn">${t("save")}</button></form>`;
  $("#tm", el).onsubmit = async (e) => { e.preventDefault(); const f = e.target; try { await fb.set("lit_roles", f.uid.value.trim(), { role: f.role.value, email: f.email.value.trim() }); saved(); team(el); } catch (x) { fail(x); } };
  el.onclick = async (e) => { const b = e.target.closest("[data-rm]"); if (b && confirm(t("delete") + "?")) { try { await fb.del("lit_roles", b.dataset.rm); team(el); } catch (x) { fail(x); } } };
}
