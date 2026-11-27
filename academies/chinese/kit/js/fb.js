// Optional Firebase layer shared by all academies (one project, one account per learner).
// Collections (all prefixed ac_): ac_roles/{uid} {admin?, academies:{<id>: "editor"}}, ac_config/bootstrap,
// ac_profiles/{uid} (shared public-ish profile), ac_progress/{academy}__{uid} (independent per academy),
// ac_content/{academy}__{file} (CMS overrides), ac_media/{academy}__{hash} (pronunciation video library + queue).
import { FIREBASE_CONFIG, AI_MODEL } from "./firebase-config.js";
import { A } from "./ctx.js";

const V = "13.1.0";
const CDN = `https://www.gstatic.com/firebasejs/${V}`;
export const enabled = !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey);

let ready = null;
let M = {};
let app, auth, db;
let user = null;
let roleDoc = null;
const listeners = new Set();

export function init() {
  if (!enabled) return Promise.resolve(false);
  if (ready) return ready;
  ready = (async () => {
    const [a, au, fs] = await Promise.all([import(`${CDN}/firebase-app.js`), import(`${CDN}/firebase-auth.js`), import(`${CDN}/firebase-firestore.js`)]);
    M = { ...a, ...au, ...fs };
    app = M.initializeApp(FIREBASE_CONFIG);
    auth = M.getAuth(app);
    db = M.initializeFirestore(app, { localCache: M.persistentLocalCache({ tabManager: M.persistentMultipleTabManager() }) });
    try { await M.getRedirectResult(auth); } catch (e) { console.warn(e); }
    await new Promise((res) => {
      let first = true;
      M.onAuthStateChanged(auth, async (u) => {
        user = u;
        roleDoc = null;
        if (u) {
          try { const r = await M.getDoc(M.doc(db, "ac_roles", u.uid)); roleDoc = r.exists() ? r.data() : null; } catch (e) { roleDoc = null; }
          touchProfile(u).catch(() => {});
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
export const isAdmin = () => !!roleDoc?.admin;
export const isEditor = () => isAdmin() || roleDoc?.academies?.[A.id] === "editor";
export const onUser = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

// The shared profile records which academies the learner has joined (for "switch academy" and the central admin).
async function touchProfile(u) {
  const ref = M.doc(db, "ac_profiles", u.uid);
  await M.setDoc(ref, { name: u.displayName || "", photo: u.photoURL || "", academies: { [A.id]: M.serverTimestamp() }, updatedAt: M.serverTimestamp() }, { merge: true });
}

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

// ---- Firestore helpers: plain data; read failures return null/[] so static content keeps working ----
export async function get(col, id) {
  if (!(await init())) return null;
  try { const s = await M.getDoc(M.doc(db, col, id)); return s.exists() ? { id: s.id, ...s.data() } : null; }
  catch (e) { if (e.code !== "permission-denied") console.warn(col, id, e.code || e); return null; }
}
export async function list(col, ...wheres) {
  if (!(await init())) return [];
  try {
    const q = wheres.length ? M.query(M.collection(db, col), ...wheres.map((w) => M.where(...w))) : M.collection(db, col);
    const s = await M.getDocs(q);
    return s.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) { if (e.code !== "permission-denied") console.warn(col, e.code || e); return []; }
}
export async function set(col, id, data, merge = true) {
  await init();
  return M.setDoc(M.doc(db, col, id), { ...data, updatedAt: M.serverTimestamp(), updatedBy: user?.uid || null }, { merge });
}
export async function create(col, id, data) {
  await init();
  return M.setDoc(M.doc(db, col, id), { ...data, createdAt: M.serverTimestamp(), by: user?.uid || null });
}
export async function del(col, id) { await init(); return M.deleteDoc(M.doc(db, col, id)); }

// The first signed-in user may claim the global admin role once.
export async function claimFirstAdmin() {
  await init();
  await M.runTransaction(db, async (tx) => {
    const ref = M.doc(db, "ac_config", "bootstrap");
    const snap = await tx.get(ref);
    if (snap.exists()) throw new Error("already-claimed");
    tx.set(ref, { uid: user.uid, at: M.serverTimestamp() });
    tx.set(M.doc(db, "ac_roles", user.uid), { admin: true, academies: {}, email: user.email || "", name: user.displayName || "" });
  });
  roleDoc = { admin: true, academies: {} };
}

// ---- AI tutor (Firebase AI Logic → Gemini Developer API) ----
let aiMod = null;
export async function aiChat(history, systemInstruction) {
  if (!(await init())) throw new Error("ai-off");
  aiMod ||= await import(`${CDN}/firebase-ai.js`);
  const m = aiMod.getGenerativeModel(aiMod.getAI(app, { backend: new aiMod.GoogleAIBackend() }), {
    model: AI_MODEL, systemInstruction, generationConfig: { temperature: 0.4, maxOutputTokens: 1200 },
  });
  const chat = m.startChat({ history: history.slice(0, -1).map((h) => ({ role: h.role === "ai" ? "model" : "user", parts: [{ text: h.text }] })) });
  const res = await chat.sendMessage(history.at(-1).text);
  return res.response.text();
}
