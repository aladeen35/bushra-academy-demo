// Refreshes content/videos.json from each book's YouTube playlist (book.json → "youtubePlaylist").
// Uses YouTube's public playlist RSS feed and oEmbed: no API key needed.
// Usage (from literature/): node tools/fetch-videos.mjs
// Note: the RSS feed lists at most 15 videos per playlist; longer playlists need the YouTube Data API.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../content");
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const { books } = JSON.parse(readFileSync(join(ROOT, "catalog.json"), "utf8"));
const out = { updated: new Date().toISOString(), channel: null, books: {} };

for (const slug of books) {
  const book = JSON.parse(readFileSync(join(ROOT, "books", slug, "book.json"), "utf8"));
  if (!book.youtubePlaylist) continue;
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${book.youtubePlaylist}`);
  if (!res.ok) { console.error(slug, "feed", res.status); continue; }
  const xml = await res.text();
  out.channel ||= { name: decode(xml.match(/<author>\s*<name>([^<]*)/)?.[1] || ""), url: xml.match(/<author>[\s\S]*?<uri>([^<]*)/)?.[1] || "" };
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => ({
    id: m[1].match(/<yt:videoId>([^<]+)/)[1],
    title: decode(m[1].match(/<title>([^<]*)/)[1]),
    published: m[1].match(/<published>([^<]+)/)?.[1] || "",
  }));
  const videos = [];
  for (const e of entries) {
    const o = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${e.id}&format=json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (!o) { console.error(slug, e.id, "unavailable (private or removed) — skipped"); continue; }
    // Episode number from titles like "جين آير 3: …"; the playlist intro has none.
    const ep = +(e.title.match(/\s(\d{1,3})\s*[:：]/)?.[1] || 0);
    // oEmbed reports 16:9 even for Shorts; youtube.com/shorts/<id> answers 200 only for real Shorts.
    const sh = await fetch(`https://www.youtube.com/shorts/${e.id}`, { redirect: "manual" }).then((r) => r.status === 200).catch(() => false);
    videos.push({ ...e, ep, vertical: sh });
  }
  videos.sort((a, b) => a.ep - b.ep || a.published.localeCompare(b.published));
  out.books[slug] = { playlist: book.youtubePlaylist, videos };
  console.log(`${slug}: ${videos.length} videos`);
}
writeFileSync(join(ROOT, "videos.json"), JSON.stringify(out, null, 1) + "\n");
