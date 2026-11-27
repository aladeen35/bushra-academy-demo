// Academy shell: hash router, navigation, language/theme toggles, search, sign-in state, service worker.
// Usage (in <academy>/index.html):  import cfg from "./academy.js"; import { start } from "./kit/js/app.js"; start(cfg);
import { setAcademy, A } from "./ctx.js";
import { t, L, lang, setLang, extend } from "./i18n.js";
import { $, $$, esc, ICON, closeSheet, toast } from "./util.js";
import * as fb from "./fb.js";
import * as store from "./store.js";
import { invalidate, resetWords } from "./data.js";
import { ACADEMIES } from "./ecosystem.js";

const V = 1;
const view = (name) => import(`./views/${name}.js?v=${V}`);

let NAV = [];
let ROUTES = [];
let cleanup = null;
let current = "";

function buildNav() {
  const mods = (A.modules || []).filter((m) => m.nav !== false);
  NAV = [
    { id: "home", href: "#/", icon: "home", key: "nav_home", bn: "bn_home" },
    { id: "path", href: "#/path", icon: "path", key: "nav_path", bn: "bn_path" },
    ...mods.map((m) => ({ id: `m-${m.id}`, href: `#/m/${m.id}`, icon: m.icon || "script", label: m.title })),
    { id: "vocab", href: "#/vocab", icon: "vocab", key: "nav_vocab", bn: "nav_vocab" },
    { id: "grammar", href: "#/grammar", icon: "grammar", key: "nav_grammar" },
    { id: "dialogues", href: "#/dialogues", icon: "chat2", key: "nav_dialogues" },
    { id: "studio", href: "#/studio", icon: "studio", key: "nav_studio", bn: "bn_studio", center: true },
    { id: "tutor", href: "#/tutor", icon: "tutor", key: "nav_tutor", bn: "nav_tutor" },
    { id: "tests", href: "#/tests", icon: "test", key: "nav_tests" },
    { id: "profile", href: "#/profile", icon: "profile", key: "nav_profile" },
  ];
  ROUTES = [
    [/^\/?$/, "home", () => view("home")],
    [/^\/path(?:#[\w-]+)?$/, "path", () => view("path")],
    [/^\/lesson\/([\w-]+)$/, "path", () => view("lesson")],
    [/^\/m\/([\w-]+)(?:\/([\w-]+))?(?:\/([^/]+))?$/, null, null],
    [/^\/vocab(?:\/(review|mine|practice))?$/, "vocab", () => view("vocab")],
    [/^\/vocab\/cat\/([\w-]+)$/, "vocab", () => view("vocab-cat")],
    [/^\/grammar(?:\/([\w-]+))?$/, "grammar", () => view("grammar")],
    [/^\/dialogues(?:\/([\w-]+))?$/, "dialogues", () => view("dialogues")],
    [/^\/studio(?:\/(.+))?$/, "studio", () => view("studio")],
    [/^\/tutor$/, "tutor", () => view("tutor")],
    [/^\/tests(?:\/([\w-]+))?$/, "tests", () => view("tests")],
    [/^\/cert\/([\w-]+)$/, "tests", () => view("cert")],
    [/^\/profile$/, "profile", () => view("profile")],
    [/^\/search\/(.*)$/, "vocab", () => view("search")],
    [/^\/admin(?:\/([\w-]+))?$/, "admin", () => view("admin")],
  ];
}

function label(n) { return n.label ? L(n.label) : t(n.key); }
function renderChrome(active) {
  const items = fb.isEditor() ? [...NAV, { id: "admin", href: "#/admin", icon: "admin", key: "nav_admin" }] : NAV;
  $("#side-nav").innerHTML = items.map((n) => `<a href="${n.href}" ${n.id === active ? 'aria-current="page"' : ""}>${ICON[n.icon] || ICON.script}<span>${label(n)}</span></a>`).join("");
  const BN = ["home", "path", "studio", "vocab", "tutor"].map((id) => NAV.find((n) => n.id === id));
  $("#bottom-nav").innerHTML = BN.map((n) => `<a href="${n.href}" class="${n.center ? "center" : ""}" ${n.id === active ? 'aria-current="page"' : ""}>${n.center ? `<i>${ICON[n.icon]}</i>` : ICON[n.icon]}<span>${t(n.bn)}</span></a>`).join("");
  $("#eco").innerHTML = `<div class="eco-title">${t("otherAcademies")}</div>` + ACADEMIES.map((x) => x.id === A.id
    ? `<span class="eco-item current"><b lang="${esc(x.id === "literature" ? "en" : A.langTag)}">${esc(x.native)}</b>${esc(L(x.name))}</span>`
    : `<a class="eco-item" href="${esc(x.url)}" rel="noopener"><b>${esc(x.native)}</b>${esc(L(x.name))}${x.status === "soon" ? ` <i class="chip plain">${lang() === "ar" ? "قريبًا" : "Soon"}</i>` : ""}</a>`).join("");
  $("#lang-btn").textContent = t("switchLang");
  $("#lang-btn").setAttribute("aria-label", t("language"));
  const theme = document.documentElement.dataset.theme;
  $("#theme-btn").innerHTML = theme === "dark" ? ICON.sun : ICON.moon;
  $("#theme-btn").setAttribute("aria-label", t("theme"));
  $$("[data-t]").forEach((el) => (el.textContent = t(el.dataset.t)));
  $$("[data-tp]").forEach((el) => (el.placeholder = t(el.dataset.tp)));
  $(".skip").textContent = lang() === "ar" ? "تخطَّ إلى المحتوى" : "Skip to content";
  $(".mini-brand b").textContent = L(A.short);
  document.title = `${L(A.name)} | ${L(A.name) === A.name.ar ? A.name.en : A.name.ar}`;
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
    let navId = nav, loader = load, args = m.slice(1);
    if (!load) { // academy module
      const mod = (A.modules || []).find((x) => x.id === m[1]);
      if (!mod) break;
      navId = `m-${mod.id}`;
      loader = mod.load;
      args = m.slice(2);
    }
    current = navId;
    renderChrome(navId);
    main.innerHTML = `<div class="spinner" role="progressbar" aria-label="${t("loading")}"></div>`;
    try {
      const mod = await loader();
      const token = (route.token = (route.token || 0) + 1);
      const res = await mod.render(main, args);
      if (token !== route.token) return;
      cleanup = typeof res === "function" ? res : null;
    } catch (e) {
      console.error(e);
      main.innerHTML = `<div class="empty">${t("error")}<br><button class="btn ghost small" onclick="location.reload()" style="margin-top:12px">${t("tryAgain")}</button></div>`;
    }
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
    return;
  }
  renderChrome("");
  main.innerHTML = `<div class="empty">${t("notFound")} <a class="link" href="#/">${t("nav_home")}</a></div>`;
}
export const rerender = () => route();

export function start(cfg) {
  setAcademy(cfg);
  extend(cfg.dict, cfg.short);
  store.load();
  setLang(store.prefs().lang);
  document.documentElement.dataset.academy = cfg.id;
  buildNav();

  $("#lang-btn").addEventListener("click", () => {
    const next = lang() === "ar" ? "en" : "ar";
    setLang(next);
    store.setPref("lang", next);
    route();
  });
  $("#theme-btn").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    store.setPref("theme", next);
    renderChrome(current);
  });
  $("#search").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = e.target.q.value.trim();
    if (q) location.hash = `#/search/${encodeURIComponent(q)}`;
  });
  window.addEventListener("hashchange", route);
  route();

  if (fb.enabled) {
    fb.init().then(() => fb.onUser(async (u) => {
      invalidate();
      resetWords();
      if (u) await store.syncFromRemote().catch(() => {});
      route();
    }));
  }
  addEventListener("offline", () => toast(t("offline")));
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch(() => {});
}
