// Simple, labelled Google AdSense display units. Loaded only when configured in ads-config.js.
import { ADSENSE } from "./ads-config.js";
import { t } from "./i18n.js";

export const adsEnabled = () => !!(ADSENSE.client && /^ca-pub-\d{10,}$/.test(ADSENSE.client));

let loader = null;
function loadScript() {
  loader ||= new Promise((resolve) => {
    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE.client}`;
    s.onload = resolve;
    s.onerror = resolve; // blocked by an ad blocker: the slot simply stays collapsed
    document.head.append(s);
  });
  return loader;
}

// Markup for an ad slot; call fillAds(root) after inserting it into the page.
export function adSlot(slot) {
  if (!adsEnabled() || !slot) return "";
  return `<aside class="ad-slot" aria-label="${t("adLabel")}">
    <span class="ad-label">${t("adLabel")}</span>
    <ins class="adsbygoogle" style="display:block" data-ad-client="${ADSENSE.client}" data-ad-slot="${slot}" data-ad-format="auto" data-full-width-responsive="true"></ins>
  </aside>`;
}

export async function fillAds(root) {
  const slots = [...root.querySelectorAll("ins.adsbygoogle:not([data-adsbygoogle-status])")];
  if (!slots.length) return;
  await loadScript();
  for (const ins of slots) {
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { ins.closest(".ad-slot")?.remove(); }
  }
}
