// Reels-style feed of the channel's book videos (YouTube Shorts and regular videos).
// Videos play in YouTube's official embedded player and only when the viewer taps play,
// so plays are genuine and count as YouTube views under YouTube's own rules (no autoplay, no hidden players).
import { t, lang } from "../i18n.js";
import { $, $$, esc, num, ICON } from "../util.js";
import { catalog, videos } from "../data.js";
import { bookTitle } from "./parts.js";

export async function render(main, [only]) {
  const [{ books }, data] = await Promise.all([catalog(), videos()]);
  const list = [];
  for (const b of books) for (const v of data?.books?.[b.slug]?.videos || []) list.push({ ...v, book: b });
  const shown = only ? list.filter((v) => v.book.slug === only) : list;
  const withVideos = books.filter((b) => data?.books?.[b.slug]?.videos?.length);
  const ch = data?.channel;

  main.innerHTML = `
    <div class="reels-head">
      <div class="row" style="gap:6px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none">
        <a class="chip ${only ? "plain" : ""}" href="#/shorts" style="min-height:40px;text-decoration:none">${t("allShorts")}</a>
        ${withVideos.map((b) => `<a class="chip ${only === b.slug ? "" : "plain"}" href="#/shorts/${b.slug}" style="min-height:40px;text-decoration:none">${esc(bookTitle(b))}</a>`).join("")}
      </div>
    </div>
    <div class="reels" id="reels">
      ${shown.length ? shown.map((v, i) => `
      <section class="reel" data-i="${i}">
        <div class="reel-media ${v.vertical ? "vertical" : "landscape"}" data-id="${esc(v.id)}">
          <img src="https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg" alt="" loading="${i < 2 ? "eager" : "lazy"}">
          <button class="reel-play" aria-label="${t("play")}: ${esc(v.title)}">${ICON.play}</button>
        </div>
        <div class="reel-info">
          <div class="row" style="gap:6px"><span class="chip">${esc(bookTitle(v.book))}</span>${v.ep ? `<span class="chip plain">${t("episode", { n: num(v.ep) })}</span>` : ""}</div>
          <h2 class="reel-title" dir="auto">${esc(v.title)}</h2>
          <div class="row" style="gap:8px">
            <a class="btn small" href="#/book/${v.book.slug}">${t("readBook")}</a>
            <a class="btn ghost small" href="https://www.youtube.com/watch?v=${esc(v.id)}" target="_blank" rel="noopener">${t("watchOnYT")}</a>
            ${ch?.url ? `<a class="btn ghost small" href="${esc(ch.url)}?sub_confirmation=1" target="_blank" rel="noopener">${t("subscribe")}</a>` : ""}
          </div>
        </div>
      </section>`).join("") : `<div class="empty" style="margin:24px">${t("noVideos")}</div>`}
    </div>`;

  const reels = $("#reels", main);
  const stop = (media) => {
    if (!media.querySelector("iframe")) return;
    media.querySelector("iframe").remove();
    media.querySelector("img").hidden = false;
    media.querySelector(".reel-play").hidden = false;
  };
  reels.addEventListener("click", (e) => {
    const btn = e.target.closest(".reel-play");
    if (!btn) return;
    const media = btn.closest(".reel-media");
    $$(".reel-media", reels).forEach((m) => m !== media && stop(m));
    const f = document.createElement("iframe");
    // Official embed; autoplay only after the viewer's own tap.
    f.src = `https://www.youtube.com/embed/${media.dataset.id}?autoplay=1&playsinline=1&rel=0&hl=${lang()}`;
    f.title = btn.getAttribute("aria-label");
    f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    f.allowFullscreen = true;
    f.referrerPolicy = "strict-origin-when-cross-origin";
    media.querySelector("img").hidden = true;
    btn.hidden = true;
    media.append(f);
  });
  // Leaving a reel stops its player, like a reels feed.
  const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (!en.isIntersecting) stop(en.target); }), { threshold: 0.4 });
  $$(".reel-media", reels).forEach((m) => io.observe(m));
  document.body.classList.add("reels-mode");
  return () => { io.disconnect(); document.body.classList.remove("reels-mode"); };
}
