// Firebase initialization for Venture Home Expense Tracker.
// apiKey is a public client identifier (safe to commit) — security is enforced
// by sign-in restrictions, Firestore rules, and the Invited/Registered gate.

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBw9axAaf8HCoYRliehCpa-jFep4m_fOPg",
  authDomain: "venture-home-expense-tracker.firebaseapp.com",
  projectId: "venture-home-expense-tracker",
  storageBucket: "venture-home-expense-tracker.firebasestorage.app",
  messagingSenderId: "70699851630",
  appId: "1:70699851630:web:ac71b652841dbae8bd6b7f",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Restrict the Google sign-in popup to @venturehome.com accounts.
// (Firebase still allows the sign-in API call from other domains, so we
//  also check this in the React layer before letting users in.)
googleProvider.setCustomParameters({
  hd: "venturehome.com",
});
