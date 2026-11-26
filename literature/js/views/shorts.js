// TikTok-style feed of the channel's book videos (YouTube Shorts and regular videos).
// YouTube policy: nothing is drawn on top of the embedded player and it is never cropped. The full-screen look
// comes from a blurred backdrop, with the actions column, channel logo and captions placed around the player.
// Playback starts only when the viewer presses YouTube's own play button, so plays are genuine views.
import { t, lang } from "../i18n.js";
import { $, $$, esc, num, ICON, toast } from "../util.js";
import { catalog, videos } from "../data.js";
import * as store from "../store.js";
import { bookTitle } from "./parts.js";

let apiPromise = null;
function youtubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ||= new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.onerror = () => { apiPromise = null; reject(new Error("youtube-api")); };
    document.head.append(tag);
    setTimeout(() => reject(new Error("youtube-api-timeout")), 15000);
  });
  return apiPromise;
}

const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>';
const SHARE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4l7 7-7 7v-4c-5 0-8.5 1.5-11 5 1-5 4-10 11-11z"/></svg>';
const CHANNEL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9l5 3-5 3z"/></svg>';
const BOOK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.5C5.5 4.5 8.5 4.5 12 6.5c3.5-2 6.5-2 9-1v13c-2.5-1-5.5-1-9 1-3.5-2-6.5-2-9-1z"/><path d="M12 6.5v13"/></svg>';

export async function render(main, [only, focusId]) {
  const [{ books }, data] = await Promise.all([catalog(), videos()]);
  const list = [];
  for (const b of books) for (const v of data?.books?.[b.slug]?.videos || []) list.push({ ...v, book: b });
  const shown = only ? list.filter((v) => v.book.slug === only) : list;
  const withVideos = books.filter((b) => data?.books?.[b.slug]?.videos?.length);
  const ch = data?.channel || {};
  const channelHref = ch.url ? `${ch.url}?sub_confirmation=1` : "";

  main.innerHTML = `
    <div class="reels-head">
      <div class="reels-chips">
        <a class="chip ${only ? "plain" : ""}" href="#/shorts">${t("allShorts")}</a>
        ${withVideos.map((b) => `<a class="chip ${only === b.slug ? "" : "plain"}" href="#/shorts/${b.slug}">${esc(bookTitle(b))}</a>`).join("")}
      </div>
    </div>
    <div class="reels" id="reels">
      ${shown.length ? shown.map((v, i) => {
        const thumb = `https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg`;
        const [main_, sub] = v.title.split(/\s*\|\s*/);
        const liked = store.isLiked(v.id);
        return `
      <section class="reel" data-id="${esc(v.id)}" data-slug="${v.book.slug}">
        <div class="reel-bg" style="background-image:url('${thumb}')" aria-hidden="true"></div>
        <div class="reel-stage">
          <div class="reel-media ${v.vertical ? "vertical" : "landscape"}" data-id="${esc(v.id)}">
            <img src="${thumb}" alt="" loading="${i < 2 ? "eager" : "lazy"}">
            <button class="reel-play" aria-label="${t("play")}: ${esc(v.title)}">${ICON.play}</button>
          </div>
        </div>
        ${ch.avatar ? `<a class="reel-logo" href="${esc(channelHref)}" target="_blank" rel="noopener" aria-label="${esc(ch.name || "")}">
          <span class="orbit" aria-hidden="true"></span><img src="${esc(ch.avatar)}" alt="" width="56" height="56"></a>` : ""}
        <div class="reel-actions">
          <button class="reel-act like" aria-pressed="${liked}" data-act="like">${HEART}<span>${t("like")}</span></button>
          <button class="reel-act" data-act="share">${SHARE}<span>${t("share")}</span></button>
          ${channelHref ? `<a class="reel-act" href="${esc(channelHref)}" target="_blank" rel="noopener">${CHANNEL}<span>${t("openChannel")}</span></a>` : ""}
          <a class="reel-act" href="#/book/${v.book.slug}">${BOOK}<span>${t("read")}</span></a>
        </div>
        <div class="reel-info">
          <div class="reel-progress" role="slider" aria-label="${t("progress")}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0"><i></i><b></b></div>
          <div class="row" style="gap:6px"><span class="chip">${esc(bookTitle(v.book))}</span>${v.ep ? `<span class="chip plain">${t("episode", { n: num(v.ep) })}</span>` : ""}</div>
          <h2 class="reel-title" dir="auto">${esc(main_)}</h2>
          ${sub ? `<p class="reel-sub" dir="auto">${esc(sub)}</p>` : ""}
          <div class="reel-buttons">
            <a class="btn" href="#/book/${v.book.slug}">${t("readBook")}</a>
            ${channelHref ? `<a class="btn ghost" href="${esc(channelHref)}" target="_blank" rel="noopener">${t("openChannel")}</a>` : ""}
          </div>
        </div>
      </section>`;
      }).join("") : `<div class="empty" style="margin:24px">${t("noVideos")}</div>`}
    </div>`;

  const reels = $("#reels", main);
  const players = new Map(); // .reel-media → YT.Player | null while loading
  let ticker = null;

  const progressOf = (media) => media.closest(".reel").querySelector(".reel-progress");
  const setProgress = (media, f) => {
    const p = progressOf(media);
    p.style.setProperty("--p", `${Math.max(0, Math.min(1, f)) * 100}%`);
    p.setAttribute("aria-valuenow", Math.round(f * 100));
  };
  const stop = (media) => {
    if (!players.has(media)) return;
    const pl = players.get(media);
    try { pl?.destroy(); } catch (e) {}
    players.delete(media);
    media.querySelector(".reel-frame")?.remove();
    media.querySelector(".reel-fallback")?.remove();
    media.querySelector("img").hidden = false;
    media.querySelector(".reel-play").hidden = false;
    setProgress(media, 0);
  };
  const fallback = (media) => {
    if (media.querySelector(".reel-fallback")) return;
    media.insertAdjacentHTML("beforeend", `<a class="reel-fallback btn" href="https://www.youtube.com/watch?v=${esc(media.dataset.id)}" target="_blank" rel="noopener">${ICON.play} ${t("watchOnYT")}</a>`);
  };
  const mount = async (media) => {
    if (players.has(media)) return;
    players.set(media, null);
    const holder = document.createElement("div");
    holder.className = "reel-frame";
    media.append(holder);
    let YT;
    try { YT = await youtubeApi(); } catch (err) { fallback(media); return; }
    if (!players.has(media)) { holder.remove(); return; }
    const pl = new YT.Player(holder, {
      videoId: media.dataset.id, width: "100%", height: "100%",
      playerVars: { playsinline: 1, rel: 0, hl: lang(), origin: location.origin },
      events: {
        onReady: () => { media.querySelector("img").hidden = true; media.querySelector(".reel-play").hidden = true; },
        onError: () => fallback(media),
        onStateChange: (ev) => {
          clearInterval(ticker);
          if (ev.data === YT.PlayerState.PLAYING) {
            ticker = setInterval(() => { const d = pl.getDuration?.() || 0; if (d) setProgress(media, (pl.getCurrentTime?.() || 0) / d); }, 250);
          } else if (ev.data === YT.PlayerState.ENDED) setProgress(media, 1);
        },
      },
    });
    players.set(media, pl);
  };

  reels.addEventListener("click", async (e) => {
    const play = e.target.closest(".reel-play");
    if (play) return mount(play.closest(".reel-media"));
    const bar = e.target.closest(".reel-progress");
    if (bar) {
      const media = bar.closest(".reel").querySelector(".reel-media");
      const pl = players.get(media);
      const d = pl?.getDuration?.();
      if (!d) return;
      const r = bar.getBoundingClientRect();
      let f = (e.clientX - r.left) / r.width;
      if (getComputedStyle(bar).direction === "rtl") f = 1 - f;
      pl.seekTo(f * d, true);
      setProgress(media, f);
      return;
    }
    const act = e.target.closest("[data-act]");
    if (!act) return;
    const reel = act.closest(".reel");
    const id = reel.dataset.id;
    if (act.dataset.act === "like") {
      const on = store.toggleLike(id);
      act.setAttribute("aria-pressed", on);
      act.classList.remove("pop"); void act.offsetWidth; act.classList.add("pop");
    } else if (act.dataset.act === "share") {
      const url = `${location.origin}${location.pathname}#/shorts/${reel.dataset.slug}/${id}`;
      const title = reel.querySelector(".reel-title").textContent;
      try {
        if (navigator.share) await navigator.share({ title, text: `${title} — ${t("appName")}`, url });
        else { await navigator.clipboard.writeText(url); toast(t("linkCopied")); }
      } catch (err) { /* share sheet dismissed */ }
    }
  });

  // Only the reel on screen holds a (paused) player; leaving it removes the player.
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    const media = en.target.querySelector(".reel-media");
    if (en.isIntersecting) mount(media); else stop(media);
  }), { threshold: 0.6 });
  $$(".reel", reels).forEach((r) => io.observe(r));

  // The player area ends above the caption block, whatever its height (long titles, wrapped buttons),
  // so the captions never cover the player.
  const fit = () => $$(".reel", reels).forEach((r) => r.style.setProperty("--info-h", `${r.querySelector(".reel-info").offsetHeight + 22}px`));
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(reels);

  if (focusId) {
    const target = $$(".reel", reels).find((r) => r.dataset.id === focusId);
    if (target) reels.scrollTop = target.offsetTop;
  }
  document.body.classList.add("reels-mode");
  return () => { io.disconnect(); ro.disconnect(); clearInterval(ticker); [...players.keys()].forEach(stop); document.body.classList.remove("reels-mode"); };
}
