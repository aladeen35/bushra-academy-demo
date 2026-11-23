// Firebase web config for Albushra Literature (public by design; security comes from firestore.rules).
// The owner pastes the config from Firebase console → Project settings → Your apps → Web app.
// While this is null the app still works: progress is saved on the device, and accounts, CMS and AI tutor stay off.
export const FIREBASE_CONFIG = null;
/* Example:
export const FIREBASE_CONFIG = {
  apiKey: "…",
  authDomain: "albushra-literature.firebaseapp.com",
  projectId: "albushra-literature",
  storageBucket: "albushra-literature.firebasestorage.app",
  messagingSenderId: "…",
  appId: "…",
};
*/
// Gemini model used by the AI tutor through Firebase AI Logic (free tier of the Gemini Developer API).
export const AI_MODEL = "gemini-3.5-flash-lite";
