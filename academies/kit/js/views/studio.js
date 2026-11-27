// AI Pronunciation Studio. Audio first, always: device voices (female/male/others), slow and normal speed,
// repeat, syllable breakdown, record-and-compare and speech-recognition scoring work immediately.
// Video is a separate layer: an approved video from the reusable media library (ac_media) plays when one exists;
// otherwise the learner can queue a request for the background generation pipeline. A missing or failed
// video never blocks audio. The animated "pronunciation clip" is generated live in the browser.
import { A } from "../ctx.js";
import { t, L, lang } from "../i18n.js";
import { $, esc, num, ICON, toast } from "../util.js";
import { allWords } from "../data.js";
import * as store from "../store.js";
import * as fb from "../fb.js";
import { say, stop, sayParts, listVoices, setVoice, hasVoices, SLOW, listen, similarity, asrSupported, recorder } from "../speech.js";
import { termOf, readingOf, meaning, term } from "./parts.js";

async function sha(text) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(b)].slice(0, 10).map((x) => x.toString(16).padStart(2, "0")).join("");
}
export const mediaId = async (text) => `${A.id}__${await sha(text.trim())}`;

function videoEmbed(url) {
  const yt = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  if (yt) return `<div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0" title="${t("aiVideo")}" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  return `<video class="video-frame" src="${esc(url)}" controls playsinline preload="metadata"></video>`;
}

export async function render(main, [arg]) {
  const words = await allWords();
  const text = (arg || "").trim();
  const voices = listVoices();
  const prefs = store.prefs();
  const examples = A.studioExamples || [];

  main.innerHTML = `<h1 class="display h1">${t("nav_studio")}</h1>
    <p class="muted">${t("studioIntro")}</p>
    <form class="studio-form" id="sform"><input class="input tl" lang="${A.langTag}" name="q" value="${esc(text)}" placeholder="${t("studioPh")}" autocomplete="off">
      <button class="btn">${ICON.arrow}</button></form>
    <div class="quick" style="margin-top:10px">${examples.map((x) => `<a class="chip plain" href="#/studio/${encodeURIComponent(x.text)}"><span lang="${A.langTag}">${esc(x.text)}</span>&nbsp;<span class="small">${esc(L(x.label))}</span></a>`).join("")}</div>
    <div id="sbody"></div>`;
  $("#sform", main).onsubmit = (e) => { e.preventDefault(); const q = e.target.q.value.trim(); if (q) location.hash = `#/studio/${encodeURIComponent(q)}`; };
  if (!text) return;

  // Item: a known word, or free text with a reading the academy can derive.
  const item = [...words.values()].find((w) => termOf(w) === text) || { [A.fields.term]: text, [A.fields.reading]: A.readingFor ? A.readingFor(text, words) : "", ar: "", en: "" };
  const parts = A.breakdown ? A.breakdown(text, words) : [...text].map((c) => ({ text: c, label: "" }));
  const body = $("#sbody", main);
  const voiceOpts = voices.map((v, i) => `<option value="${esc(v.id)}" ${v.id === prefs.voice ? "selected" : ""}>${v.g === "f" ? "♀ " + t("female") : v.g === "m" ? "♂ " + t("male") : t("voiceN", { n: num(i + 1) })} · ${esc(v.name.replace(/^(Google|Microsoft)\s*/i, "").slice(0, 28))}</option>`).join("");

  body.innerHTML = `
  <section class="studio-card panel fade-in">
    <div class="studio-term">${term(item, { size: "xxl", reading: true })}</div>
    ${meaning(item) ? `<p class="studio-meaning">${esc(meaning(item))}</p>` : ""}
    ${hasVoices() ? "" : `<div class="notice red">${t("noVoices", { lang: L(A.short) })}</div>`}
    <div class="studio-controls">
      <label class="small">${t("voice")} <select class="input" id="voice">${voiceOpts || `<option value="">—</option>`}</select></label>
      <div class="row" style="justify-content:center">
        <button class="btn" data-act="normal">${ICON.speaker} ${t("normal")}</button>
        <button class="btn ghost" data-act="slow">${ICON.slow} ${t("slow")}</button>
        <button class="btn ghost" data-act="repeat">${ICON.repeat} ${t("repeat")} ×${num(3)}</button>
      </div>
      <p class="small muted" style="text-align:center;margin:0">${t("voicesNote")}</p>
    </div>
  </section>

  ${parts.length > 1 ? `<section class="section"><h2 class="h2">${t("breakdown")}</h2>
    <div class="syllables">${parts.map((p, i) => `<button class="syl" data-part="${i}"><span class="tl" lang="${A.langTag}">${esc(p.text)}</span><span class="reading">${esc(p.label || "")}</span>${p.hint ? `<span class="small muted">${esc(L(p.hint))}</span>` : ""}</button>`).join("")}</div>
    <div class="row" style="justify-content:center;margin-top:10px"><button class="btn ghost small" data-act="parts">${ICON.play} ${t("breakdown")}</button></div></section>` : ""}

  <section class="section"><h2 class="h2">${t("clip")}</h2>
    <div class="clip" id="clip" aria-live="polite">
      <div class="clip-stage"><div class="clip-write" id="clip-write"></div>
        <div class="clip-term tl" lang="${A.langTag}">${esc(text)}</div>
        <div class="clip-reading reading">${esc(readingOf(item))}</div>
        <div class="clip-sub" id="clip-sub"></div></div>
      <div class="clip-bar"><i id="clip-prog"></i></div>
    </div>
    <div class="row" style="justify-content:center;margin-top:10px"><button class="btn" data-act="clip">${ICON.play} ${t("playClip")}</button></div>
  </section>

  <section class="section"><h2 class="h2">${t("compare")}</h2>
    <div class="row" style="justify-content:center">
      ${asrSupported ? `<button class="btn" data-act="asr">${ICON.mic} ${t("tapSpeak")}</button>` : ""}
      ${navigator.mediaDevices?.getUserMedia && window.MediaRecorder ? `<button class="btn ghost" data-act="rec">${ICON.mic} ${t("record")}</button>` : ""}
      <button class="btn ghost" data-act="normal">${ICON.speaker} ${t("playModel")}</button>
    </div>
    <div id="cmp" class="small" style="text-align:center;margin-top:10px"></div>
    ${asrSupported ? "" : `<p class="small muted" style="text-align:center">${t("noSpeechRec")}</p>`}
  </section>

  ${A.pronTips ? `<section class="section" id="tips">${A.pronTips(text, item, words)}</section>` : ""}

  <section class="section"><h2 class="h2">${ICON.video} ${t("aiVideo")}</h2><div id="vid" class="panel"><div class="spinner"></div></div></section>`;

  $("#voice", body).onchange = (e) => setVoice(e.target.value);
  let recUrl = null, recording = null;
  const runClip = async () => {
    const sub = $("#clip-sub", body), prog = $("#clip-prog", body), clip = $("#clip", body);
    clip.classList.add("playing");
    const steps = [
      { label: t("slow"), run: () => say(text, { rate: SLOW }) },
      ...(parts.length > 1 ? [{ label: t("breakdown"), run: () => sayParts(parts.map((p) => p.text), { rate: 0.8 }) }] : []),
      { label: t("normal"), run: () => say(text, { rate: 1 }) },
    ];
    const writer = A.clipWriter ? A.clipWriter($("#clip-write", body), text) : null;
    for (let i = 0; i < steps.length; i++) {
      sub.innerHTML = `${esc(steps[i].label)}${meaning(item) ? ` · ${esc(meaning(item))}` : ""}`;
      prog.style.width = `${((i + 0.5) / steps.length) * 100}%`;
      if (i === 0) writer?.start?.();
      await steps[i].run();
      await new Promise((r) => setTimeout(r, 400));
    }
    prog.style.width = "100%";
    clip.classList.remove("playing");
  };
  body.addEventListener("click", async (e) => {
    const p = e.target.closest("[data-part]");
    if (p) return say(parts[+p.dataset.part].text, { rate: 0.8 });
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act;
    if (act === "normal") say(text);
    if (act === "slow") say(text, { rate: SLOW });
    if (act === "repeat") { for (let i = 0; i < 3; i++) { if (!(await say(text))) break; await new Promise((r) => setTimeout(r, 500)); } }
    if (act === "parts") sayParts(parts.map((x) => x.text), { rate: 0.8 });
    if (act === "clip") runClip();
    if (act === "asr") {
      const out = $("#cmp", body);
      out.textContent = "🎙 …";
      try {
        const heard = await listen();
        const s = similarity(text, heard);
        store.addPron(text, s);
        out.innerHTML = `${t("heard")}: <b lang="${A.langTag}">${esc(heard[0] || "—")}</b><br>${t("similarity")}: <b>${Math.round(s * 100)}%</b> — ${s >= 0.85 ? t("pronGood") : s >= 0.6 ? t("pronOk") : t("pronBad")}`;
      } catch (err) { out.textContent = t("micDenied"); }
    }
    if (act === "rec") {
      if (recording) { recUrl = await recording.stop(); recording = null; b.innerHTML = `${ICON.mic} ${t("record")}`;
        $("#cmp", body).innerHTML = `<audio src="${recUrl}" controls></audio><br><button class="btn ghost small" data-act="ab">${t("playModel")} → ${t("playMine")}</button>`; return; }
      try { recording = await recorder(); b.innerHTML = `■ ${t("stopRec")}`; } catch (err) { toast(t("micDenied")); }
    }
    if (act === "ab" && recUrl) { await say(text); const a = new Audio(recUrl); a.play(); }
  });

  // Video layer: library lookup → approved video, queued request, or a request button.
  const vid = $("#vid", body);
  const mid = await mediaId(text);
  const doc = fb.enabled ? await fb.get("ac_media", mid) : null;
  const drawVid = (d) => {
    if (d?.status === "approved" && d.url) { vid.innerHTML = `<span class="chip ok">${t("videoReady")}</span>${videoEmbed(d.url)}`; return; }
    if (d) { vid.innerHTML = `<p>${t("videoStatus")}: <span class="chip gold">${t("st_" + d.status)}</span></p><p class="small muted">${t("videoQueued")}</p>`; return; }
    vid.innerHTML = `<p class="small muted">${t("videoNone")}</p>${!fb.enabled ? `<p class="small muted">${t("tutorOff")}</p>` : fb.currentUser() ? `<button class="btn ghost small" id="vreq">${ICON.video} ${t("videoRequest")}</button>` : `<a class="link small" href="#/profile">${t("videoSignIn")}</a>`}`;
    $("#vreq", vid)?.addEventListener("click", async () => {
      try {
        await fb.create("ac_media", mid, { academy: A.id, text, reading: readingOf(item) || "", meaning: { ar: item.ar || "", en: item.en || "" }, kind: [...text].length === 1 ? "char" : text.length < 6 ? "word" : "sentence", status: "queued", requests: 1 });
        drawVid({ status: "queued" });
        toast(t("videoQueued"));
      } catch (err) { console.warn(err); toast(t("error")); }
    });
  };
  drawVid(doc);
  return () => stop();
}
