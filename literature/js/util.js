// Small DOM and formatting helpers shared by every view.
import { lang } from "./i18n.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
// Escapes text and isolates Latin runs inside Arabic sentences so mixed-direction text renders in the right order.
export const mix = (s) => /[\u0600-\u06FF]/.test(s || "") ? esc(s).replace(/[A-Za-z][A-Za-z0-9 ,.;:'’"“”…?!()\-]*[A-Za-z0-9.…?!)’”"]/g, (m) => `<bdi dir="ltr">${m}</bdi>`) : esc(s);

// Numbers use Arabic-Indic digits in Arabic mode.
export const num = (n, opts) => new Intl.NumberFormat(lang() === "ar" ? "ar-SA" : "en-US", opts).format(n ?? 0);
export const pct = (x) => num(Math.round(x * 100)) + (lang() === "ar" ? "٪" : "%");
export function duration(sec) {
  const m = Math.round((sec || 0) / 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (lang() === "ar") return h ? `${num(h)} س ${num(mm)} د` : `${num(mm)} د`;
  return h ? `${h}h ${mm}m` : `${mm}m`;
}
export const today = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const pad2 = (n) => String(n).padStart(2, "0");
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

let toastTimer;
export function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

// Seeded shuffle so "word of the day" is stable for everyone on a given day.
export function seeded(seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
}
export function shuffle(arr, rnd = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Bottom sheet (mobile) / dialog. Returns the sheet element; close() removes it.
export function openSheet(html, { label = "", onClose } = {}) {
  closeSheet();
  const root = $("#sheet-root");
  root.innerHTML = `<div class="sheet-backdrop" data-close></div>
    <section class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}">
      <div class="grab" aria-hidden="true"></div>
      <button class="icon-btn sheet-close" data-close aria-label="${lang() === "ar" ? "إغلاق" : "Close"}">${ICON.close}</button>
      <div class="sheet-body">${html}</div>
    </section>`;
  const sheet = $(".sheet", root);
  root._onClose = onClose;
  root.onclick = (e) => { if (e.target.closest("[data-close]")) closeSheet(); };
  root._key = (e) => { if (e.key === "Escape") closeSheet(); };
  document.addEventListener("keydown", root._key);
  setTimeout(() => ($("button:not(.sheet-close), a, input, textarea", sheet) || sheet).focus?.(), 30);
  return sheet;
}
export function closeSheet() {
  const root = $("#sheet-root");
  if (!root || !root.innerHTML) return;
  document.removeEventListener("keydown", root._key);
  root.innerHTML = "";
  const cb = root._onClose;
  root._onClose = null;
  cb?.();
}

const svg = (d, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
export const ICON = {
  home: svg('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),
  library: svg('<path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="M16.5 4.5l3.8 1-3.8 14.5-3.8-1z"/>'),
  learning: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  vocab: svg('<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'),
  grammar: svg('<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>'),
  tutor: svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/>'),
  profile: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
  admin: svg('<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/><path d="M9 12l2 2 4-4"/>'),
  play: svg('<path d="M7 4l13 8-13 8z" fill="currentColor"/>'),
  pause: svg('<path d="M7 4h3v16H7zM14 4h3v16h-3z" fill="currentColor"/>'),
  prev: svg('<path d="M18 6l-8 6 8 6zM6 6v12"/>'),
  next: svg('<path d="M6 6l8 6-8 6zM18 6v12"/>'),
  repeat: svg('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'),
  speaker: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>'),
  bookmark: svg('<path d="M6 3h12v18l-6-4-6 4z"/>'),
  note: svg('<path d="M4 4h16v12l-4 4H4z"/><path d="M16 20v-4h4M8 9h8M8 13h5"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 'class="flip-rtl"'),
  check: svg('<path d="M5 12l5 5 9-10"/>'),
  mic: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  ask: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01"/>'),
};
