import { t, lang, setLang } from "../i18n.js";
import { $, esc, toast, ICON } from "../util.js";
import * as fb from "../fb.js";
import * as store from "../store.js";
import * as audio from "../audio.js";

export async function render(main) {
  const ready = fb.enabled && (await fb.init());
  const u = fb.currentUser();
  const p = store.prefs();
  const account = !fb.enabled || !ready
    ? `<p class="notice small">${t("accountsOff")}</p>`
    : u ? `<div class="row"><div class="avatar" style="width:56px;height:56px">${u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : esc((u.displayName || u.email || "?")[0].toUpperCase())}</div>
          <div><b>${esc(u.displayName || "")}</b><div class="small muted">${esc(u.email || "")}</div><div class="small" style="color:var(--ok)">✓ ${t("synced")}</div></div></div>
          <div class="row" style="margin-top:12px">${fb.isEditor() ? `<a class="btn ghost small" href="#/admin">${ICON.admin} ${t("cms")}</a>` : ""}<button class="btn ghost small" id="out">${t("signOut")}</button></div>`
      : `<p class="small muted">${t("guestNote")}</p>
        <button class="btn" id="g">${t("google")}</button>
        <form id="ef" style="margin-top:16px;max-width:420px">
          <div class="field"><label for="em">${t("email")}</label><input class="input en" id="em" name="email" type="email" autocomplete="email" required></div>
          <div class="field"><label for="pw">${t("password")}</label><input class="input en" id="pw" name="pass" type="password" autocomplete="current-password" minlength="6" required></div>
          <div class="field" id="nm-f" hidden><label for="nm">${t("name")}</label><input class="input" id="nm" name="name" autocomplete="name"></div>
          <div class="row"><button class="btn ghost" name="in">${t("signIn")}</button><button class="btn ghost" type="button" id="up">${t("signUp")}</button><button class="link" type="button" id="forgot" style="background:none;border:0;cursor:pointer">${t("forgot")}</button></div>
        </form>`;

  main.innerHTML = `
    <h1 class="display h1">${t("profile")}</h1>
    <div class="grid-2" style="align-items:start">
      <section class="panel"><h2 class="h2">${u ? esc(u.displayName || t("profile")) : t("guest")}</h2>${account}</section>
      <section class="panel"><h2 class="h2">${t("level")}</h2>
        <p class="display" style="font-size:2.4rem;color:var(--red);margin:0">${esc(store.level() || "—")}</p>
        <p class="small muted">${store.level() ? t("levelNote") : t("noLevel")}</p>
        <a class="btn small" href="#/placement">${store.level() ? t("retest") : t("startTest")}</a></section>
    </div>
    <section class="panel section"><h2 class="h2">${t("prefs")}</h2>
      <div class="grid-2">
        <div class="field"><label for="pl">${t("language")}</label><select class="input" id="pl"><option value="ar" ${lang() === "ar" ? "selected" : ""}>العربية</option><option value="en" ${lang() === "en" ? "selected" : ""}>English</option></select></div>
        <div class="field"><label for="pt">${t("theme")}</label><select class="input" id="pt">${["light", "sepia", "dark"].map((k) => `<option value="${k}" ${document.documentElement.dataset.theme === k ? "selected" : ""}>${t(k)}</option>`).join("")}</select></div>
        <div class="field"><label for="pa">${t("voiceAccent")}</label><select class="input" id="pa"><option value="en-GB" ${p.accent === "en-GB" ? "selected" : ""}>${t("listenGB")}</option><option value="en-US" ${p.accent === "en-US" ? "selected" : ""}>${t("listenUS")}</option></select></div>
        <div class="field"><label for="pr">${t("voiceRate")}</label><select class="input" id="pr">${audio.RATES.map((r) => `<option value="${r}" ${r === p.rate ? "selected" : ""}>${r}×</option>`).join("")}</select></div>
      </div>
      ${audio.supported && !audio.hasVoices() ? `<p class="notice small">${t("noVoices")}</p>` : ""}
      <div class="row"><a class="btn ghost small" href="privacy.html">${t("privacy")}</a><button class="btn ghost small" id="exp">${t("exportData")}</button><button class="btn ghost small" id="rst">${t("resetData")}</button></div>
    </section>`;

  const err = (e) => toast(t("authErr") + (e.code || e.message || e));
  $("#out", main)?.addEventListener("click", () => fb.signOut());
  $("#g", main)?.addEventListener("click", () => fb.signInGoogle().catch(err));
  const ef = $("#ef", main);
  if (ef) {
    ef.onsubmit = (e) => { e.preventDefault(); fb.signInEmail(ef.email.value, ef.pass.value).catch(err); };
    $("#up", main).onclick = () => {
      const nf = $("#nm-f", main);
      if (nf.hidden) { nf.hidden = false; $("#nm", main).focus(); return; }
      if (!ef.reportValidity()) return;
      fb.signUpEmail(ef.email.value, ef.pass.value, ef.name.value).catch(err);
    };
    $("#forgot", main).onclick = () => { if (!ef.email.value) return ef.email.focus(); fb.resetPassword(ef.email.value).then(() => toast(t("resetSent")), err); };
  }
  $("#pl", main).onchange = (e) => { setLang(e.target.value); store.setPref("lang", e.target.value); dispatchEvent(new HashChangeEvent("hashchange")); };
  $("#pt", main).onchange = (e) => { document.documentElement.dataset.theme = e.target.value; store.setPref("theme", e.target.value); };
  $("#pa", main).onchange = (e) => { audio.setAccent(e.target.value); audio.say("Courage", { accent: e.target.value }); };
  $("#pr", main).onchange = (e) => { audio.setRate(+e.target.value); audio.say("Learn English through literature.", { rate: +e.target.value }); };
  $("#exp", main).onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([store.exportData()], { type: "application/json" }));
    a.download = "albushra-literature-data.json";
    a.click();
  };
  $("#rst", main).onclick = () => { if (confirm(t("confirmReset"))) { store.reset(); render(main); } };
}
