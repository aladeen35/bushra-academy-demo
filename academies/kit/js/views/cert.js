// Printable completion certificate (print → "Save as PDF" on the phone).
import { A } from "../ctx.js";
import { t, L, lang } from "../i18n.js";
import { $, esc, pct } from "../util.js";
import * as store from "../store.js";
import * as fb from "../fb.js";
import { back } from "./parts.js";

export async function render(main, [id]) {
  const lv = (A.levels || []).find((x) => x.id === id);
  const c = store.cert(id);
  if (!lv || !c) { main.innerHTML = `<div class="empty">${t("notFound")}</div>`; return; }
  const draw = () => {
    const name = store.prefs().certName || c.name || fb.currentUser()?.displayName || "—";
    const date = new Intl.DateTimeFormat(lang() === "ar" ? "ar-SA-u-ca-gregory" : "en-GB", { dateStyle: "long" }).format(c.t);
    main.innerHTML = `${back("#/tests", "nav_tests")}
      <div class="field no-print" style="max-width:420px;margin-top:12px"><label for="cn">${t("certName")}</label><input class="input" id="cn" value="${esc(name === "—" ? "" : name)}"></div>
      <div class="certificate" id="cert">
        <img src="assets/logo.webp" alt="" class="cert-logo" width="120" height="120">
        <div class="cert-title">${t("certTitle")}</div>
        <p>${t("certBody", { academy: L(A.name) })}</p>
        <div class="cert-name">${esc(name)}</div>
        <p>${t("certFor")}</p>
        <div class="cert-level">${esc(L(lv.title))}</div>
        <p>${t("certScore")} <b>${pct(c.score)}</b> · ${esc(date)}</p>
        <div class="cert-foot"><span>${t("serial")}: <b dir="ltr">${esc(c.serial)}</b></span><span>${esc(L(A.name))} · albushra.app</span></div>
        <p class="cert-note">${t("certNote")}</p>
      </div>
      <div class="row no-print" style="justify-content:center;margin-top:16px"><button class="btn" id="print">${t("printCert")}</button></div>`;
    $("#cn", main).onchange = (e) => { store.setPref("certName", e.target.value.trim()); draw(); };
    $("#print", main).onclick = () => window.print();
  };
  draw();
}
