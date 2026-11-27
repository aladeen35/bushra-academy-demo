// Academy administration (editors of this academy, or global admins): content overrides for every JSON file,
// the pronunciation-video queue / library review, learner counts, and team roles (global admins only).
import { A } from "../ctx.js";
import { t, L } from "../i18n.js";
import { $, esc, num, toast } from "../util.js";
import * as fb from "../fb.js";
import { json, original, publishOverride, removeOverride, invalidate, resetWords } from "../data.js";

const TABS = ["content", "media", "learners", "team"];

export async function render(main, [tab = "content"]) {
  if (!fb.enabled) { main.innerHTML = `<div class="notice">${t("tutorOff")}</div>`; return; }
  await fb.init();
  const u = fb.currentUser();
  if (!u) { main.innerHTML = `<div class="notice">${t("tutorSignIn")} <a class="link" href="#/profile">${t("signIn")}</a></div>`; return; }
  if (!fb.isEditor()) {
    const boot = await fb.get("ac_config", "bootstrap");
    main.innerHTML = `<div class="notice">${t("notAdmin")}</div>${boot ? "" : `<button class="btn" id="claim" style="margin-top:12px">${t("claimAdmin")}</button>`}`;
    $("#claim", main)?.addEventListener("click", async () => { try { await fb.claimFirstAdmin(); render(main, [tab]); } catch (e) { toast(t("error")); } });
    return;
  }
  const tabs = fb.isAdmin() ? TABS : TABS.slice(0, 3);
  main.innerHTML = `<h1 class="display h1">${t("nav_admin")} · ${esc(L(A.short))}</h1><p class="muted">${t("adminIntro")}</p>
    <div class="tabs">${tabs.map((k) => `<a href="#/admin/${k}" aria-selected="${k === tab}">${t({ content: "contentFiles", media: "mediaQueue", learners: "learners", team: "team" }[k])}</a>`).join("")}</div><div id="abody"></div>`;
  const body = $("#abody", main);

  if (tab === "content") {
    const files = A.contentFiles;
    body.innerHTML = `<ul class="lesson-list">${files.map((f) => `<li><a href="#" data-file="${esc(f)}"><span class="lnum">{ }</span><span>${esc(f)}</span></a></li>`).join("")}</ul><div id="editor"></div>`;
    body.onclick = async (e) => {
      const a = e.target.closest("[data-file]");
      if (!a) return;
      e.preventDefault();
      const f = a.dataset.file;
      const cur = await json(f);
      const ed = $("#editor", body);
      ed.innerHTML = `<h2 class="h2" dir="ltr">${esc(f)}</h2><textarea class="input code" id="js" spellcheck="false" dir="ltr">${esc(JSON.stringify(cur, null, 1))}</textarea>
        <div class="row"><button class="btn" id="pub">${t("publish")}</button><button class="btn ghost" id="rev">${t("revert")}</button></div>`;
      ed.scrollIntoView();
      $("#pub", ed).onclick = async () => {
        const txt = $("#js", ed).value;
        try { JSON.parse(txt); } catch (err) { return toast(`${t("invalidJson")}: ${err.message}`); }
        await publishOverride(f, JSON.stringify(JSON.parse(txt)));
        invalidate(); resetWords(); toast(t("published"));
      };
      $("#rev", ed).onclick = async () => { await removeOverride(f); invalidate(); resetWords(); $("#js", ed).value = JSON.stringify(await original(f), null, 1); toast(t("saved2")); };
    };
  }

  if (tab === "media") {
    const items = (await fb.list("ac_media", ["academy", "==", A.id])).sort((a, b) => (a.status === "queued" ? -1 : 1) - (b.status === "queued" ? -1 : 1));
    body.innerHTML = items.length ? items.map((m) => `<article class="panel section media-row" data-id="${esc(m.id)}">
      <div class="row" style="justify-content:space-between"><b class="tl" lang="${A.langTag}" style="font-size:1.4rem">${esc(m.text)}</b><span class="chip gold">${t("st_" + m.status)}</span></div>
      <p class="small muted">${esc(m.reading || "")} · ${esc(m.kind || "")} · ${esc(m.meaning?.ar || "")}</p>
      <div class="field"><label>${t("videoUrl")}</label><input class="input" dir="ltr" value="${esc(m.url || "")}" data-url></div>
      <div class="row"><button class="btn small" data-st="approved">${t("approve")}</button><button class="btn ghost small" data-st="generating">${t("st_generating")}</button>
        <button class="btn ghost small" data-st="review">${t("st_review")}</button><button class="btn ghost small" data-st="rejected">${t("reject")}</button></div></article>`).join("") : `<div class="empty">${t("noItems")}</div>`;
    body.onclick = async (e) => {
      const b = e.target.closest("[data-st]");
      if (!b) return;
      const row = b.closest("[data-id]");
      const url = row.querySelector("[data-url]").value.trim();
      if (b.dataset.st === "approved" && !/^https:\/\//.test(url)) return toast(t("videoUrl"));
      await fb.set("ac_media", row.dataset.id, { status: b.dataset.st, url: url || null });
      row.querySelector(".chip").textContent = t("st_" + b.dataset.st);
      toast(t("saved2"));
    };
  }

  if (tab === "learners") {
    const rows = await fb.list("ac_progress", ["academy", "==", A.id]);
    const sum = (k) => rows.reduce((a, r) => a + (r.summary?.[k] || 0), 0);
    body.innerHTML = `<div class="stat-row"><div class="stat"><b>${num(rows.length)}</b><span>${t("learners")}</span></div>
      <div class="stat"><b>${num(sum("lessons"))}</b><span>${t("lessonsDone")}</span></div>
      <div class="stat"><b>${num(sum("words"))}</b><span>${t("wordsLearned")}</span></div>
      <div class="stat"><b>${num(sum("xp"))}</b><span>${t("xp")}</span></div></div>
      <table class="admin-table" style="margin-top:16px"><tr><th>UID</th><th>${t("lessonsDone")}</th><th>${t("xp")}</th><th>${t("streak")}</th></tr>
      ${rows.slice(0, 200).map((r) => `<tr><td dir="ltr" class="small">${esc(r.uid?.slice(0, 8))}…</td><td>${num(r.summary?.lessons || 0)}</td><td>${num(r.summary?.xp || 0)}</td><td>${num(r.summary?.streak || 0)}</td></tr>`).join("")}</table>`;
  }

  if (tab === "team" && fb.isAdmin()) {
    const rows = await fb.list("ac_roles");
    body.innerHTML = `<table class="admin-table"><tr><th>${t("name")}</th><th>${t("role")}</th></tr>
      ${rows.map((r) => `<tr><td>${esc(r.name || r.email || r.id)}</td><td>${r.admin ? "admin" : esc(Object.entries(r.academies || {}).map(([k, v]) => `${k}:${v}`).join(", "))}</td></tr>`).join("")}</table>
      <form id="addm" class="row" style="margin-top:16px"><input class="input" name="uid" placeholder="${t("uidLabel")}" dir="ltr" style="max-width:320px" required>
        <button class="btn">${t("addMember")} (${esc(A.id)} editor)</button></form>`;
    $("#addm", body).onsubmit = async (e) => {
      e.preventDefault();
      const id = e.target.uid.value.trim();
      await fb.set("ac_roles", id, { academies: { [A.id]: "editor" } });
      toast(t("saved2"));
      render(main, [tab]);
    };
  }
}
