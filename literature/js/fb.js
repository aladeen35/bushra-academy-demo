// Optional Firebase layer. The app runs fully on this device without it; with it, learners sync progress,
// editors manage content in Firestore, and the AI tutor runs through Firebase AI Logic (no secret in the client).
import { FIREBASE_CONFIG, AI_MODEL } from "./firebase-config.js";

const V = "13.1.0";
const CDN = `https://www.gstatic.com/firebasejs/${V}`;
export const enabled = !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey);

let ready = null;
let M = {}; // loaded SDK modules
let app, auth, db;
let user = null;
let role = null;
const listeners = new Set();

export function init() {
  if (!enabled) return Promise.resolve(false);
  if (ready) return ready;
  ready = (async () => {
    const [a, au, fs] = await Promise.all([
      import(`${CDN}/firebase-app.js`),
      import(`${CDN}/firebase-auth.js`),
      import(`${CDN}/firebase-firestore.js`),
    ]);
    M = { ...a, ...au, ...fs };
    app = M.initializeApp(FIREBASE_CONFIG);
    auth = M.getAuth(app);
    db = M.initializeFirestore(app, { localCache: M.persistentLocalCache({ tabManager: M.persistentMultipleTabManager() }) });
    try { await M.getRedirectResult(auth); } catch (e) { console.warn(e); }
    await new Promise((res) => {
      let first = true;
      M.onAuthStateChanged(auth, async (u) => {
        user = u;
        role = null;
        if (u) {
          try { const r = await M.getDoc(M.doc(db, "lit_roles", u.uid)); role = r.exists() ? r.data().role : null; } catch (e) { role = null; }
        }
        listeners.forEach((fn) => fn(user));
        if (first) { first = false; res(); }
      });
    });
    return true;
  })().catch((e) => { console.error("Firebase init failed", e); return false; });
  return ready;
}

export const currentUser = () => user;
export const currentRole = () => role;
export const isEditor = () => role === "admin" || role === "editor";
export const isAdmin = () => role === "admin";
export const onUser = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export async function signInGoogle() {
  await init();
  const p = new M.GoogleAuthProvider();
  try { await M.signInWithPopup(auth, p); }
  catch (e) {
    if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") return M.signInWithRedirect(auth, p);
    throw e;
  }
}
export async function signInEmail(email, pass) { await init(); return M.signInWithEmailAndPassword(auth, email, pass); }
export async function signUpEmail(email, pass, name) {
  await init();
  const c = await M.createUserWithEmailAndPassword(auth, email, pass);
  if (name) await M.updateProfile(c.user, { displayName: name });
  return c;
}
export async function resetPassword(email) { await init(); return M.sendPasswordResetEmail(auth, email); }
export async function signOut() { await init(); return M.signOut(auth); }

// ---- Firestore helpers (all return plain data; failures return null so static content still renders) ----
export async function get(col, id) {
  if (!(await init())) return null;
  try { const s = await M.getDoc(M.doc(db, col, id)); return s.exists() ? { id: s.id, ...s.data() } : null; }
  catch (e) { if (e.code !== "permission-denied") console.warn(col, id, e.code || e); return null; }
}
export async function list(col, where) {
  if (!(await init())) return [];
  try {
    const q = where ? M.query(M.collection(db, col), M.where(...where)) : M.collection(db, col);
    const s = await M.getDocs(q);
    return s.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) { if (e.code !== "permission-denied") console.warn(col, e.code || e); return []; }
}
export async function set(col, id, data, merge = true) {
  await init();
  return M.setDoc(M.doc(db, col, id), { ...data, updatedAt: M.serverTimestamp(), updatedBy: user?.uid || null }, { merge });
}
export async function del(col, id) { await init(); return M.deleteDoc(M.doc(db, col, id)); }

// First signed-in user may claim admin once (rules allow creating lit_config/bootstrap only if it does not exist).
export async function claimFirstAdmin() {
  await init();
  await M.runTransaction(db, async (tx) => {
    const ref = M.doc(db, "lit_config", "bootstrap");
    const snap = await tx.get(ref);
    if (snap.exists()) throw new Error("already-claimed");
    tx.set(ref, { uid: user.uid, at: M.serverTimestamp() });
    tx.set(M.doc(db, "lit_roles", user.uid), { role: "admin", email: user.email || "", name: user.displayName || "" });
  });
  role = "admin";
}

// ---- AI tutor (Firebase AI Logic, Gemini Developer API) ----
let aiMod = null;
export async function aiChat(history, systemInstruction) {
  if (!(await init())) throw new Error("ai-off");
  aiMod ||= await import(`${CDN}/firebase-ai.js`);
  // The system instruction carries the current reading context, so a fresh model is built per question.
  const m = aiMod.getGenerativeModel(aiMod.getAI(app, { backend: new aiMod.GoogleAIBackend() }), {
    model: AI_MODEL, systemInstruction, generationConfig: { temperature: 0.4, maxOutputTokens: 900 },
  });
  const chat = m.startChat({ history: history.slice(0, -1).map((h) => ({ role: h.role === "ai" ? "model" : "user", parts: [{ text: h.text }] })) });
  const res = await chat.sendMessage(history.at(-1).text);
  return res.response.text();
}
