// Pronunciation and narration with the device's speech engine (Web Speech API): free, offline-capable,
// British or American voices, adjustable speed. No recordings are distributed.
import { prefs, setPref, tick } from "./store.js";

const synth = window.speechSynthesis;
export const supported = !!synth;
export const RATES = [0.75, 0.9, 1, 1.15, 1.25];
let voices = [];
function loadVoices() { voices = synth ? synth.getVoices().filter((v) => /^en[-_]/i.test(v.lang)) : []; }
if (synth) { loadVoices(); synth.addEventListener?.("voiceschanged", loadVoices); }

export const hasVoices = () => (loadVoices(), voices.length > 0);
export function voiceFor(accent) {
  loadVoices();
  const want = accent.toLowerCase().replace("_", "-");
  return voices.find((v) => v.lang.toLowerCase().replace("_", "-") === want && /google|natural|enhanced/i.test(v.name))
    || voices.find((v) => v.lang.toLowerCase().replace("_", "-") === want)
    || voices.find((v) => v.lang.toLowerCase().startsWith("en"))
    || null;
}

// One utterance; resolves when finished or cancelled.
export function say(text, { accent = prefs().accent, rate = prefs().rate, onboundary } = {}) {
  return new Promise((resolve) => {
    if (!synth) return resolve(false);
    const u = new SpeechSynthesisUtterance(text.replace(/[_“”]/g, ""));
    const v = voiceFor(accent);
    if (v) u.voice = v;
    u.lang = v?.lang || accent;
    u.rate = rate;
    if (onboundary) u.onboundary = onboundary;
    const t0 = performance.now();
    u.onend = u.onerror = () => { tick("listen", Math.round((performance.now() - t0) / 1000)); resolve(true); };
    synth.speak(u);
  });
}
export function stop() { synth?.cancel(); }

// Narration player over a list of sentence elements; highlights the current sentence.
// Pause is implemented as stop + resume from the current sentence (reliable on Android Chrome).
export class Narrator {
  constructor(sentences, { onState } = {}) {
    this.sentences = sentences;
    this.i = 0;
    this.playing = false;
    this.loop = false;
    this.token = 0;
    this.onState = onState || (() => {});
  }
  setSentences(list) { this.stop(); this.sentences = list; this.i = 0; }
  async play(from = this.i) {
    this.stop();
    const my = ++this.token;
    this.playing = true;
    this.i = Math.max(0, Math.min(from, this.sentences.length - 1));
    this.onState(this);
    while (this.playing && my === this.token && this.i < this.sentences.length) {
      const el = this.sentences[this.i];
      this.highlight(el);
      await say(el.textContent);
      if (my !== this.token) return;
      if (!this.loop) this.i++;
    }
    if (my === this.token) { this.playing = false; this.highlight(null); if (this.i >= this.sentences.length) this.i = 0; this.onState(this); }
  }
  pause() { this.playing = false; this.token++; stop(); this.onState(this); }
  stop() { this.playing = false; this.token++; stop(); }
  toggle() { this.playing ? this.pause() : this.play(); }
  step(d) { const was = this.playing; this.i = Math.max(0, Math.min(this.sentences.length - 1, this.i + d)); was ? this.play(this.i) : (this.highlight(this.sentences[this.i]), this.onState(this)); }
  highlight(el) {
    document.querySelectorAll(".s.speaking, .ar-col.speaking").forEach((x) => x.classList.remove("speaking"));
    if (!el) return;
    el.classList.add("speaking");
    el.closest(".para")?.querySelector(".ar-col")?.classList.add("speaking");
    const r = el.getBoundingClientRect();
    if (r.top < 140 || r.bottom > innerHeight - 120) el.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
}
export function setAccent(a) { setPref("accent", a); }
export function setRate(r) { setPref("rate", r); }
