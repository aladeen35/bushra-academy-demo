// Pronunciation audio and speech recognition with the device's engines (Web Speech API): free, works offline
// once the voice pack is installed, several native voices where the device has them, slow and normal speed.
// Audio is independent of video: nothing here waits for the video library.
import { A } from "./ctx.js";
import { prefs, setPref } from "./store.js";

const synth = window.speechSynthesis;
export const ttsSupported = !!synth;
export const SLOW = 0.6;

// Known voice names → gender (desktop/iOS/Edge/Android names). Unknown voices are shown without a gender.
const FEMALE = /female|woman|tingting|ting-ting|meijia|mei-jia|sinji|xiaoxiao|xiaoyi|xiaohan|xiaomo|xiaoqiu|xiaorui|huihui|yaoyao|lili|hanhan|yuna|sora|heami|sunhi|jimin|seoyeon|kyoko|o-ren|nanami|ayumi|haruka|mizuki/i;
const MALE = /\bmale\b|kangkang|yunxi|yunyang|yunjian|yunhao|li-mu|zhiwei|injoon|hyunsu|bongjin|otoya|hattori|keita|ichiro|daichi/i;
export const genderOf = (v) => (FEMALE.test(v.name + " " + v.voiceURI) ? "f" : MALE.test(v.name + " " + v.voiceURI) ? "m" : "");

let voices = [];
function loadVoices() {
  const want = A.speech.voicePrefix.toLowerCase();
  voices = synth ? synth.getVoices().filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith(want)) : [];
  // Prefer the academy's main locale (e.g. zh-CN before zh-TW/zh-HK), then network/natural voices.
  const main = A.speech.lang.toLowerCase();
  voices.sort((a, b) => (b.lang.toLowerCase().replace("_", "-") === main) - (a.lang.toLowerCase().replace("_", "-") === main) || /natural|online|google/i.test(b.name) - /natural|online|google/i.test(a.name));
}
if (synth) { loadVoices(); synth.addEventListener?.("voiceschanged", loadVoices); }
export const listVoices = () => (loadVoices(), voices.map((v, i) => ({ id: v.voiceURI || v.name, name: v.name, lang: v.lang, g: genderOf(v), i })));
export const hasVoices = () => (loadVoices(), voices.length > 0);
function pick(id) {
  loadVoices();
  return voices.find((v) => (v.voiceURI || v.name) === id) || voices[0] || null;
}
// Picks a voice of the requested gender when the device has one (used by dialogues for each speaker).
export function voiceForGender(g) { const v = listVoices(); return (v.find((x) => x.g === g) || v[0])?.id || ""; }

let playing = 0;
export function say(text, { rate = prefs().rate, voice = prefs().voice } = {}) {
  return new Promise((resolve) => {
    if (!synth || !text) return resolve(false);
    synth.cancel();
    const my = ++playing;
    const u = new SpeechSynthesisUtterance(text);
    const v = pick(voice);
    if (v) u.voice = v;
    u.lang = v?.lang || A.speech.lang;
    u.rate = rate;
    u.onend = u.onerror = () => resolve(my === playing);
    // Chrome on Android sometimes needs a tick after cancel() before speaking.
    setTimeout(() => synth.speak(u), 30);
  });
}
export function stop() { playing++; synth?.cancel(); }
export const setVoice = (id) => setPref("voice", id);
export const setRate = (r) => setPref("rate", r);
export async function sayParts(parts, opts) { for (const p of parts) { if (!(await say(p, opts))) return; await new Promise((r) => setTimeout(r, 350)); } }

// ---------- speech recognition ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const asrSupported = !!SR;
export function listen({ lang = A.speech.lang, maxAlternatives = 5 } = {}) {
  return new Promise((resolve, reject) => {
    if (!SR) return reject(new Error("no-asr"));
    const r = new SR();
    r.lang = lang;
    r.interimResults = false;
    r.maxAlternatives = maxAlternatives;
    let done = false;
    r.onresult = (e) => { done = true; resolve([...e.results[0]].map((x) => x.transcript)); };
    r.onerror = (e) => { if (!done) { done = true; reject(new Error(e.error || "asr")); } };
    r.onend = () => { if (!done) { done = true; resolve([]); } };
    r.start();
    setTimeout(() => { try { r.stop(); } catch (e) {} }, 8000);
  });
}

// Similarity 0..1 between the target and what the recognizer heard (best of the alternatives).
// The academy can normalise text first (e.g. strip punctuation, convert numbers to characters).
export function similarity(target, heardList) {
  const norm = A.speech.normalize || ((s) => s.toLowerCase().replace(/[\s\p{P}]/gu, ""));
  const a = norm(target);
  let best = 0;
  for (const h of heardList || []) {
    const b = norm(h);
    if (!a || !b) continue;
    const d = lev(a, b);
    best = Math.max(best, 1 - d / Math.max(a.length, b.length));
  }
  return best;
}
function lev(a, b) {
  const m = [...a], n = [...b];
  let prev = Array.from({ length: n.length + 1 }, (_, i) => i);
  for (let i = 1; i <= m.length; i++) {
    const cur = [i];
    for (let j = 1; j <= n.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (m[i - 1] === n[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n.length];
}

// ---------- record yourself (MediaRecorder) for listening comparison ----------
export async function recorder() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  const stopped = new Promise((res) => (rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); res(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType }))); }));
  rec.start();
  return { stop: () => { if (rec.state !== "inactive") rec.stop(); return stopped; } };
}
