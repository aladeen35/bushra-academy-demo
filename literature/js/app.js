// App shell: hash router, navigation, language/theme toggles, search, sign-in state, service worker.
import { t, lang, setLang } from "./i18n.js";
import { $, $$, esc, ICON, closeSheet, toast } from "./util.js";
import * as fb from "./fb.js";
import * as store from "./store.js";
import { invalidate } from "./data.js";

const NAV = [
  { id: "home", href: "#/", icon: "home", key: "nav_home", bn: "nav_home" },
  { id: "library", href: "#/library", icon: "library", key: "nav_library", bn: "bn_library" },
  { id: "learning", href: "#/learning", icon: "learning", key: "nav_learning", bn: "bn_learning" },
  { id: "vocab", href: "#/vocab", icon: "vocab", key: "nav_vocab", bn: "bn_vocab" },
  { id: "grammar", href: "#/grammar", icon: "grammar", key: "nav_grammar" },
  { id: "tutor", href: "#/tutor", icon: "tutor", key: "nav_tutor" },
  { id: "profile", href: "#/profile", icon: "profile", key: "nav_profile", bn: "nav_profile" },
];
const ROUTES = [
  [/^\/?$/, "home", () => import("./views/home.js")],
  [/^\/library$/, "library", () => import("./views/library.js")],
  [/^\/book\/([\w-]+)$/, "library", () => import("./views/book.js")],
  [/^\/read\/([\w-]+)\/(\d+)(?:\/(s\d+))?(?:\/(p\d+))?$/, "library", () => import("./views/reader.js")],
  [/^\/study\/([\w-]+)\/(\d+)$/, "library", () => import("./views/study.js")],
  [/^\/quiz\/([\w-]+)\/(\d+|final)$/, "learning", () => import("./views/quiz.js")],
  [/^\/learning$/, "learning", () => import("./views/learning.js")],
  [/^\/vocab(?:\/(\w+))?(?:\?(.*))?$/, "vocab", () => import("./views/vocab.js")],
  [/^\/grammar(?:\/([\w-]+))?$/, "grammar", () => import("./views/grammar.js")],
  [/^\/tutor$/, "tutor", () => import("./views/tutor.js")],
  [/^\/placement$/, "profile", () => import("./views/placement.js")],
  [/^\/profile$/, "profile", () => import("./views/profile.js")],
  [/^\/search\/(.*)$/, "library", () => import("./views/search.js")],
  [/^\/admin(?:\/([\w-]+))?(?:\/([\w-]+))?(?:\/(\d+))?$/, "admin", () => import("./views/admin.js")],
];

let cleanup = null;
let current = "";

function renderChrome(active) {
  const showAdmin = fb.isEditor();
  const items = showAdmin ? [...NAV, { id: "admin", href: "#/admin", icon: "admin", key: "nav_admin" }] : NAV;
  $("#side-nav").innerHTML = items.map((n) => `<a href="${n.href}" ${n.id === active ? 'aria-current="page"' : ""}>${ICON[n.icon]}<span>${t(n.key)}</span></a>`).join("");
  $("#bottom-nav").innerHTML = NAV.filter((n) => n.bn).map((n) => `<a href="${n.href}" ${n.id === active ? 'aria-current="page"' : ""}>${ICON[n.icon]}<span>${t(n.bn)}</span></a>`).join("");
  $("#lang-btn").textContent = t("switchLang");
  $("#lang-btn").setAttribute("aria-label", t("language"));
  const theme = document.documentElement.dataset.theme;
  $("#theme-btn").innerHTML = theme === "dark" ? ICON.sun : ICON.moon;
  $("#theme-btn").setAttribute("aria-label", t("theme"));
  $$("[data-t]").forEach((el) => (el.textContent = t(el.dataset.t)));
  $$("[data-tp]").forEach((el) => (el.placeholder = t(el.dataset.tp)));
  $(".skip").textContent = lang() === "ar" ? "تخطَّ إلى المحتوى" : "Skip to content";
  document.title = `${t("appName")} | ${lang() === "ar" ? "Albushra Literature" : "البشرى للأدب"}`;
  const u = fb.currentUser();
  const av = $("#avatar");
  av.setAttribute("aria-label", t("profile"));
  av.innerHTML = u?.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : esc((u?.displayName || u?.email || (lang() === "ar" ? "ب" : "A")).trim()[0].toUpperCase());
}

async function route() {
  const hash = decodeURIComponent(location.hash.slice(1) || "/");
  closeSheet();
  if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
  const main = $("#main");
  for (const [re, nav, load] of ROUTES) {
    const m = hash.match(re);
    if (!m) continue;
    current = nav;
    renderChrome(nav);
    main.innerHTML = `<div class="spinner" role="progressbar" aria-label="${t("loading")}"></div>`;
    try {
      const mod = await load();
      const token = (route.token = (route.token || 0) + 1);
      const res = await mod.render(main, m.slice(1));
      if (token !== route.token) return;
      cleanup = typeof res === "function" ? res : null;
    } catch (e) {
      console.error(e);
      main.innerHTML = `<div class="empty">${t("error")}<br><button class="btn ghost small" onclick="location.reload()" style="margin-top:12px">${t("tryAgain")}</button></div>`;
    }
    if (!hash.startsWith("/read/")) window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
    return;
  }
  renderChrome("");
  main.innerHTML = `<div class="empty">${t("notFound")} <a class="link" href="#/">${t("nav_home")}</a></div>`;
}
export const rerender = () => route();

// ---------- toggles ----------
$("#lang-btn").addEventListener("click", () => {
  const next = lang() === "ar" ? "en" : "ar";
  setLang(next);
  store.setPref("lang", next);
  route();
});
$("#theme-btn").addEventListener("click", () => {
  const cur = document.documentElement.dataset.theme;
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  store.setPref("theme", next);
  renderChrome(current);
});
$("#search").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = e.target.q.value.trim();
  if (q) location.hash = `#/search/${encodeURIComponent(q)}`;
});

setLang(lang());
window.addEventListener("hashchange", route);
route();

// Firebase (optional): after sign-in, merge progress and refresh content overrides.
if (fb.enabled) {
  fb.init().then(() => {
    fb.onUser(async (u) => {
      invalidate();
      if (u) await store.syncFromRemote().catch(() => {});
      route();
    });
  });
}

// Reading time is counted only while the page is visible and the learner was active in the last minute.
let lastActive = Date.now();
["pointerdown", "keydown", "scroll", "touchstart"].forEach((ev) => addEventListener(ev, () => (lastActive = Date.now()), { passive: true }));
setInterval(() => {
  if (document.visibilityState === "visible" && location.hash.startsWith("#/read/") && Date.now() - lastActive < 60000) store.tick("read", 15);
}, 15000);

addEventListener("offline", () => toast(t("offline")));
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
