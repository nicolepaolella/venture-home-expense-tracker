// Authentication context for Venture Home Expense Tracker.
// Wraps the app, listens to Firebase auth state, looks up the signed-in user's
// profile in the Firestore `users` collection, and exposes status + sign-in/out.
//
// Status meanings:
//   loading        — Firebase is still resolving who is signed in (initial load)
//   unauthenticated — nobody signed in yet (show Login screen)
//   wrong-domain    — signed in but not @venturehome.com (block)
//   not-invited     — signed in with right domain but not in users collection (block)
//   authenticated   — signed in, in users collection, profile loaded (show app)

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  updateDoc,
  setDoc,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setError(null);
      if (!user) {
        setFirebaseUser(null);
        setProfile(null);
        setStatus("unauthenticated");
        return;
      }
      setFirebaseUser(user);

      // Domain restriction. The Google popup is hinted to @venturehome.com via
      // googleProvider.setCustomParameters({hd:...}) but Firebase will accept
      // sign-in tokens from other domains too — so double-check here.
      const email = (user.email || "").toLowerCase();
      if (!email.endsWith("@venturehome.com")) {
        setStatus("wrong-domain");
        return;
      }

      try {
        // Look up the profile in the users collection by email.
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const data = { id: docSnap.id, ...docSnap.data() };

          // Flip Invited -> Active on first successful sign-in.
          const patch = {
            lastSignInAt: serverTimestamp(),
            firebaseUid: user.uid,
          };
          if (data.status === "Invited") {
            patch.status = "Active";
            data.status = "Active";
          }
          await updateDoc(doc(db, "users", docSnap.id), patch);

          setProfile(data);
          setStatus("authenticated");
          return;
        }

        // No matching profile — check whether this is the very first sign-in
        // (users collection is empty). If so, bootstrap this person as the
        // first Payroll/Admin so they can invite everyone else.
        const anyUsers = await getDocs(query(usersRef, limit(1)));
        if (anyUsers.empty) {
          const bootstrapId = email.replace(/[^a-z0-9]/g, "_");
          await setDoc(doc(db, "users", bootstrapId), {
            email,
            name: user.displayName || email.split("@")[0],
            role: "Payroll/Admin",
            manager: "",
            team: "Payroll/Admin",
            status: "Active",
            firebaseUid: user.uid,
            createdAt: serverTimestamp(),
            lastSignInAt: serverTimestamp(),
            bootstrap: true,
          });
          setProfile({
            id: bootstrapId,
            email,
            name: user.displayName || email,
            role: "Payroll/Admin",
            team: "Payroll/Admin",
            status: "Active",
          });
          setStatus("authenticated");
          return;
        }

        // Otherwise, blocked until invited.
        setProfile(null);
        setStatus("not-invited");
      } catch (err) {
        console.error("auth profile lookup failed", err);
        setError(err);
        setStatus("not-invited");
      }
    });
    return unsub;
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("sign-in error", err);
      setError(err);
    }
  };

  const signOut = () => fbSignOut(auth);

  return (
    <AuthContext.Provider
      value={{ firebaseUser, profile, status, error, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
