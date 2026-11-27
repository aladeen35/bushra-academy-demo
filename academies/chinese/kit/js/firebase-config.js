// One Firebase project for every Albushra academy ("albushra-academies"): one account works in all of them,
// while each academy keeps its own progress documents and its own editor roles (see academies/firestore.rules).
// The web config is public by design. While it is null every academy still works fully on the device;
// accounts, sync, the content CMS, the video queue and the AI tutor stay off.
export const FIREBASE_CONFIG = null;
/* Example (owner pastes it from Firebase console → Project settings → Your apps → Web app):
export const FIREBASE_CONFIG = {
  apiKey: "…",
  authDomain: "albushra-academies.firebaseapp.com",
  projectId: "albushra-academies",
  storageBucket: "albushra-academies.firebasestorage.app",
  messagingSenderId: "…",
  appId: "…",
};
*/
// Gemini model used by the AI tutors through Firebase AI Logic (Gemini Developer API, free tier, no secret in the client).
export const AI_MODEL = "gemini-3.5-flash-lite";
