// Reels-style feed of the channel's book videos (YouTube Shorts and regular videos).
// Videos play in YouTube's official embedded player and only when the viewer presses YouTube's play button,
// so plays are genuine and count as YouTube views under YouTube's own rules (no autoplay on load, no hidden players).
import { t, lang } from "../i18n.js";
import { $, $$, esc, num, ICON } from "../util.js";
import { catalog, videos } from "../data.js";
import { bookTitle } from "./parts.js";

// Loads YouTube's IFrame Player API once.
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
  const players = new Map(); // media element -> YT.Player
  const stop = (media) => {
    if (!players.has(media)) return;
    const pl = players.get(media);
    try { pl?.destroy(); } catch (e) {}
    players.delete(media);
    media.querySelector(".reel-frame")?.remove();
    media.querySelector(".reel-fallback")?.remove();
    media.querySelector("img").hidden = false;
    media.querySelector(".reel-play").hidden = false;
  };
  const fallback = (media) => {
    if (media.querySelector(".reel-fallback")) return;
    media.insertAdjacentHTML("beforeend", `<a class="reel-fallback btn" href="https://www.youtube.com/watch?v=${esc(media.dataset.id)}" target="_blank" rel="noopener">${ICON.play} ${t("watchOnYT")}</a>`);
  };
  // The player for the reel on screen is prepared in advance (no autoplay). The viewer starts it with
  // YouTube's own play button: one tap, and a genuine user-started play that YouTube counts as a view.
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
      },
    });
    players.set(media, pl);
  };
  // Tapping the thumbnail before the player is ready just prepares it.
  reels.addEventListener("click", (e) => { const btn = e.target.closest(".reel-play"); if (btn) mount(btn.closest(".reel-media")); });
  // Only the reel on screen holds a player; leaving it removes the player, like a reels feed.
  const io = new IntersectionObserver((entries) => entries.forEach((en) => (en.isIntersecting ? mount(en.target) : stop(en.target))), { threshold: 0.6 });
  $$(".reel-media", reels).forEach((m) => io.observe(m));
  document.body.classList.add("reels-mode");
  return () => { io.disconnect(); [...players.keys()].forEach(stop); document.body.classList.remove("reels-mode"); };
}
