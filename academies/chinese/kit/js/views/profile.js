// Profile: one Albushra account across academies, this academy's settings and data.
import { A } from "../ctx.js";
import { t, L } from "../i18n.js";
import { $, esc, num, toast } from "../util.js";
import * as fb from "../fb.js";
import * as store from "../store.js";
import { ACADEMIES } from "../ecosystem.js";

export async function render(main) {
  if (fb.enabled) await fb.init();
  const u = fb.currentUser();
  const p = store.prefs();
  const goal = store.state().goal || 20;
  main.innerHTML = `<h1 class="display h1">${t("profile")}</h1>
    <section class="panel section">
      <p class="small muted" style="margin-top:0">${t("oneAccount")}</p>
      ${!fb.enabled ? `<div class="notice">${t("noFirebase")}</div>` : u ? `
        <p>${t("signedInAs")} <b>${esc(u.displayName || u.email)}</b></p>
        <button class="btn ghost" id="out">${t("signOut")}</button>` : `
        <button class="btn" id="g">${t("google")}</button>
        <form id="em" style="margin-top:16px;max-width:420px">
          <div class="field"><label for="nm">${t("name")}</label><input class="input" id="nm" autocomplete="name"></div>
          <div class="field"><label for="e">${t("email")}</label><input class="input" id="e" type="email" required autocomplete="email"></div>
          <div class="field"><label for="pw">${t("password")}</label><input class="input" id="pw" type="password" required minlength="6" autocomplete="current-password"></div>
          <div class="row"><button class="btn" name="in">${t("signIn")}</button><button class="btn ghost" type="button" id="up">${t("createAccount")}</button><button class="link" type="button" id="fg" style="background:none;border:0">${t("forgot")}</button></div>
        </form>`}
    </section>
    <section class="panel section">
      <h2 class="h2">${t("settings")}</h2>
      <div class="field" style="max-width:240px"><label for="goal">${t("goal")}</label>
        <select class="input" id="goal">${[10, 20, 30, 50].map((n) => `<option value="${n}" ${n === goal ? "selected" : ""}>${num(n)}</option>`).join("")}</select></div>
      <label class="row"><input type="checkbox" id="rd" ${p.showReading ? "checked" : ""}> ${t("showReadingPref")}</label>
      <label class="row"><input type="checkbox" id="ar" ${p.showAr ? "checked" : ""}> ${t("showArPref")}</label>
    </section>
    <section class="panel section">
      <h2 class="h2">${t("otherAcademies")}</h2>
      <div class="eco-grid">${ACADEMIES.map((x) => `<a class="eco-card ${x.id === A.id ? "current" : ""}" href="${x.id === A.id ? "#/" : esc(x.url)}"><b>${esc(x.native)}</b><span>${esc(L(x.name))}</span></a>`).join("")}</div>
    </section>
    <section class="section row">
      <button class="btn ghost small" id="exp">${t("exportData")}</button>
      <button class="btn ghost small" id="rst">${t("resetData")}</button>
    </section>`;
  const err = (e) => toast(e?.code ? e.code.replace("auth/", "") : t("error"));
  $("#out", main)?.addEventListener("click", () => fb.signOut());
  $("#g", main)?.addEventListener("click", () => fb.signInGoogle().catch(err));
  $("#em", main)?.addEventListener("submit", (e) => { e.preventDefault(); fb.signInEmail($("#e", main).value, $("#pw", main).value).catch(err); });
  $("#up", main)?.addEventListener("click", () => fb.signUpEmail($("#e", main).value, $("#pw", main).value, $("#nm", main).value).catch(err));
  $("#fg", main)?.addEventListener("click", () => fb.resetPassword($("#e", main).value).then(() => toast(t("resetSent"))).catch(err));
  $("#goal", main).onchange = (e) => store.setGoal(+e.target.value);
  $("#rd", main).onchange = (e) => store.setPref("showReading", e.target.checked);
  $("#ar", main).onchange = (e) => store.setPref("showAr", e.target.checked);
  $("#exp", main).onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([store.exportData()], { type: "application/json" }));
    a.download = `albushra-${A.id}-progress.json`;
    a.click();
  };
  $("#rst", main).onclick = () => { if (confirm(t("confirmReset"))) { store.reset(); render(main); } };
}
