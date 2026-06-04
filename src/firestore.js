// Firestore data layer. Hooks return live-updating arrays; mutators write to
// Firestore. The rest of the app uses these in place of the in-memory mock arrays.

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase.js";

function useCollection(name) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, name),
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error(`useCollection(${name})`, err);
        setLoading(false);
      }
    );
    return unsub;
  }, [name]);
  return { items, loading };
}

export const useUsers = () => useCollection("users");
export const useReceipts = () => useCollection("receipts");
export const useReports = () => useCollection("reports");

// Users
export const addUser = (data) =>
  addDoc(collection(db, "users"), {
    status: "Invited",
    createdAt: serverTimestamp(),
    ...data,
    email: (data.email || "").toLowerCase(),
  });
export const updateUser = (id, patch) => updateDoc(doc(db, "users", id), patch);
export const deleteUser = (id) => deleteDoc(doc(db, "users", id));

// Receipts
export const addReceipt = (data) =>
  addDoc(collection(db, "receipts"), { createdAt: serverTimestamp(), ...data });
export const updateReceipt = (id, patch) =>
  updateDoc(doc(db, "receipts", id), patch);

// Reports
export const addReport = (data) =>
  addDoc(collection(db, "reports"), { createdAt: serverTimestamp(), ...data });
export const updateReport = (id, patch) =>
  updateDoc(doc(db, "reports", id), patch);
