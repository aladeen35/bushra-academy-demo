// The academy currently running. Every academy (Chinese, Korean, Japanese, …) passes its own config to start();
// kit modules read it through this live binding, so the kit itself never names a language.
export let A = null;
export function setAcademy(cfg) { A = cfg; }

// Storage keys are namespaced per academy so two academies on one device never share progress.
export const key = (k) => `ac.${A.id}.${k}`;
