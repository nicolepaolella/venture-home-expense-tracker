// Real receipt upload + OCR flow.
//
// Flow:
//   1. User picks an image (camera or library on mobile).
//   2. Pre-flight quality check: must be image/*, >= 50 KB, width >= 800 px.
//   3. Create an empty Firestore receipt doc to get a receiptId.
//   4. Upload to Firebase Storage at receipts/{authUid}/{receiptId}__{filename}.
//   5. Cloud Function `scanReceipt` reads the image, calls Vision API, writes
//      ocrStatus / ocrConfidence / ocrFields back to the same Firestore doc.
//   6. We watch the doc with onSnapshot; when ocrStatus arrives we either
//      show extracted fields for the user to confirm, or flag for review.

import React, { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, updateDoc, deleteDoc, addDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "./firebase.js";

// Look for a receipt that already exists with the same vendor + amount within 7 days.
async function findDuplicate(profile, vendor, amount, dateStr, currentId) {
  try {
    const q = query(
      collection(db, "receipts"),
      where("employeeEmail", "==", profile.email),
      where("vendor", "==", vendor)
    );
    const snap = await getDocs(q);
    const targetDate = new Date(dateStr).getTime();
    if (Number.isNaN(targetDate)) return null;
    for (const d of snap.docs) {
      if (d.id === currentId) continue;
      const data = d.data();
      if (Math.abs((data.amount || 0) - amount) > 0.01) continue;
      const t = new Date(data.expenseDate || data.dateOnReceipt || "").getTime();
      if (Number.isNaN(t)) continue;
      const days = Math.abs(targetDate - t) / (1000 * 60 * 60 * 24);
      if (days <= 7) return { id: d.id, ...data };
    }
  } catch (e) {
    console.warn("dup check failed", e);
  }
  return null;
}

const MIN_BYTES = 50 * 1024;
const MIN_WIDTH = 800;
const MAX_BYTES = 10 * 1024 * 1024;

function getImageWidth(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      URL.revokeObjectURL(url);
      resolve(w);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    img.src = url;
  });
}

export default function ReceiptUpload({ profile, onUploaded }) {
  const inputRef = useRef(null);

  // phase: idle | preflight | uploading | scanning | review | error
  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [receiptId, setReceiptId] = useState(null);
  const [scanResult, setScanResult] = useState(null);

  const [draft, setDraft] = useState({
    vendor: "",
    dateOnReceipt: "",
    amount: "",
    category: "Gas/Fuel",
    paymentMethod: "Personal Card",
    location: "",
  });

  function reset() {
    setPhase("idle");
    setProgress(0);
    setErrorMsg("");
    setReceiptId(null);
    setScanResult(null);
    setDraft({ vendor: "", dateOnReceipt: "", amount: "", category: "Gas/Fuel", paymentMethod: "Personal Card", location: "" });
    if (inputRef.current) inputRef.current.value = "";
  }

  // Listen for the Cloud Function to write OCR results back to the doc.
  useEffect(() => {
    if (!receiptId || phase !== "scanning") return;
    const unsub = onSnapshot(doc(db, "receipts", receiptId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.ocrStatus === "ok" || data.ocrStatus === "needs_review" || data.ocrStatus === "failed") {
        setScanResult({ id: snap.id, ...data });
        setDraft({
          vendor: data.vendor || data.ocrFields?.vendor?.value || "",
          dateOnReceipt: data.dateOnReceipt || data.ocrFields?.date?.value || "",
          amount: data.amount || data.ocrFields?.amount?.value || "",
          category: data.category || data.inferredCategory || "Miscellaneous Expenses",
          paymentMethod: data.paymentMethod || "Personal Card",
          location: data.location || "",
        });
        setPhase("review");
      }
    }, (err) => {
      console.error("watch receipt failed", err);
      setErrorMsg("Lost connection while scanning. Try again.");
      setPhase("error");
    });
    return unsub;
  }, [receiptId, phase]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhase("preflight");
    setErrorMsg("");

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Pick an image (JPG, PNG, HEIC). PDFs are not yet supported.");
      setPhase("error");
      return;
    }
    if (file.size > MAX_BYTES) {
      setErrorMsg(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 10 MB.`);
      setPhase("error");
      return;
    }
    if (file.size < MIN_BYTES) {
      setErrorMsg("Image looks too small or compressed to read reliably. Retake with better lighting and full receipt in frame.");
      setPhase("error");
      return;
    }

    const width = await getImageWidth(file);
    if (width && width < MIN_WIDTH) {
      setErrorMsg(`Image is only ${width}px wide. Need at least ${MIN_WIDTH}px for accurate scanning — move closer or use a higher-quality camera setting.`);
      setPhase("error");
      return;
    }

    let newId;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const docRef = await addDoc(collection(db, "receipts"), {
        employee: profile.name,
        employeeEmail: profile.email,
        employeeUid: profile.firebaseUid || null,
        uploadDate: today,
        expenseDate: today,
        vendor: "",
        category: "",
        amount: 0,
        paymentMethod: "Personal Card",
        location: "",
        fileName: file.name,
        status: "Uploaded",
        ocrStatus: "pending",
        note: "Uploaded — scanning…",
        createdAt: serverTimestamp(),
      });
      newId = docRef.id;
      setReceiptId(newId);
    } catch (err) {
      console.error("create receipt doc failed", err);
      setErrorMsg("Could not save receipt record. Check your connection and try again.");
      setPhase("error");
      return;
    }

    try {
      setPhase("uploading");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const uid = auth.currentUser?.uid;
      if (!uid) {
        throw new Error("Not signed in. Refresh and try again.");
      }
      const path = `receipts/${uid}/${newId}__${safeName}`;
      const task = uploadBytesResumable(storageRef(storage, path), file, {
        contentType: file.type,
        customMetadata: { receiptId: newId, employee: profile.name },
      });
      await new Promise((resolve, reject) => {
        task.on(
          "state_changed",
          (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          resolve
        );
      });
      const downloadUrl = await getDownloadURL(task.snapshot.ref);
      await updateDoc(doc(db, "receipts", newId), { storagePath: path, downloadUrl });
      setPhase("scanning");
    } catch (err) {
      console.error("upload failed", err);
      setErrorMsg(`Upload failed: ${err.code || err.message}. Try again.`);
      try { await deleteDoc(doc(db, "receipts", newId)); } catch (_) { }
      setPhase("error");
    }
  }

  async function confirmReceipt() {
    if (!receiptId) return;
    const amount = parseFloat(draft.amount);
    if (!draft.vendor.trim() || !draft.dateOnReceipt || !Number.isFinite(amount) || amount <= 0) {
      setErrorMsg("Vendor, date, and a non-zero amount are all required before confirming.");
      return;
    }
    // Duplicate check (warn-only; user can override)
    const dup = await findDuplicate(profile, draft.vendor.trim(), amount, draft.dateOnReceipt, receiptId);
    if (dup) {
      const ok = window.confirm(
        `Possible duplicate: you already have a ${draft.vendor} receipt for $${amount.toFixed(2)} dated ${dup.expenseDate || dup.dateOnReceipt}. Save anyway?`
      );
      if (!ok) return;
    }
    await updateDoc(doc(db, "receipts", receiptId), {
      vendor: draft.vendor.trim(),
      dateOnReceipt: draft.dateOnReceipt,
      expenseDate: draft.dateOnReceipt,
      amount: amount,
      category: draft.category,
      paymentMethod: draft.paymentMethod,
      location: draft.location.trim(),
      status: "Unreported",
      note: scanResult?.ocrStatus === "ok" ? "Auto-scanned, confirmed by employee." : "Manually entered after low-confidence scan.",
      confirmedAt: serverTimestamp(),
    });
    onUploaded?.(receiptId);
    reset();
  }

  async function discardReceipt() {
    if (receiptId) {
      try { await deleteDoc(doc(db, "receipts", receiptId)); } catch (_) { }
    }
    reset();
  }

  // -------- Render --------

  if (phase === "idle") {
    return (
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
        <button
          onClick={() => inputRef.current?.click()}
          className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 px-6 py-3 font-bold text-slate-950"
        >
          Upload + Autoscan Receipt
        </button>
      </div>
    );
  }

  if (phase === "preflight") {
    return <Banner tone="cyan">Checking image quality…</Banner>;
  }

  if (phase === "uploading") {
    return (
      <Banner tone="cyan">
        <div className="flex items-center justify-between gap-3">
          <span>Uploading… {progress}%</span>
          <div className="h-2 w-40 rounded-full bg-cyan-300/15">
            <div className="h-2 rounded-full bg-cyan-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </Banner>
    );
  }

  if (phase === "scanning") {
    return (
      <Banner tone="violet">
        <div className="flex items-center gap-3">
          <span className="animate-pulse">Scanning</span>
          <span>Reading the receipt with Google Vision… this usually takes 5–15 seconds.</span>
        </div>
      </Banner>
    );
  }

  if (phase === "error") {
    return (
      <Banner tone="rose">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>{errorMsg}</span>
          <button onClick={reset} className="rounded-xl border border-rose-300/30 bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-100">
            Try again
          </button>
        </div>
      </Banner>
    );
  }

  if (phase === "review" && scanResult) {
    const ok = scanResult.ocrStatus === "ok";
    const conf = scanResult.ocrConfidence;
    const mathConflict = scanResult.ocrFields?.amount?.mathCheck?.applicable && !scanResult.ocrFields.amount.mathCheck.matches;
    return (
      <div className="space-y-4 rounded-2xl border border-cyan-300/15 bg-slate-950/60 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-white">
              {ok ? "Scan complete — confirm details" : "Needs your review"}
            </h3>
            <p className="text-sm text-slate-400">
              {ok
                ? "We were confident in the scan. Double-check the fields below before saving."
                : scanResult.ocrStatus === "failed"
                ? "We could not read this receipt automatically. Fill the fields in manually."
                : "Some fields were unclear or below our confidence threshold. Please verify or edit before saving."}
            </p>
          </div>
          <ConfidencePill confidence={conf} />
        </div>

        {scanResult.downloadUrl && (
          <a href={scanResult.downloadUrl} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={scanResult.downloadUrl}
              alt="Uploaded receipt"
              className="max-h-72 rounded-xl border border-cyan-300/15 object-contain"
            />
          </a>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <FieldRow
            label="Vendor"
            value={draft.vendor}
            onChange={(v) => setDraft({ ...draft, vendor: v })}
            confidence={scanResult.ocrFields?.vendor?.confidence}
            placeholder="e.g., Mobil, Tesla Supercharger"
          />
          <FieldRow
            label="Date on receipt"
            type="date"
            value={draft.dateOnReceipt}
            onChange={(v) => setDraft({ ...draft, dateOnReceipt: v })}
            confidence={scanResult.ocrFields?.date?.confidence}
          />
          <FieldRow
            label="Amount (USD)"
            type="number"
            step="0.01"
            value={draft.amount}
            onChange={(v) => setDraft({ ...draft, amount: v })}
            confidence={scanResult.ocrFields?.amount?.confidence}
            placeholder="0.00"
          />
          {mathConflict && (
            <div className="md:col-span-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">
              <strong>Math conflict on the receipt total.</strong> {scanResult.ocrFields.amount.mathCheck.explanation} Please verify the amount on the photo before saving.
            </div>
          )}
          <label className="text-sm">
            <span className="mb-2 block text-slate-300">Category</span>
            <select
              className="field"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            >
              {["Gas/Fuel", "Tolls", "Electric Vehicle Charging", "Miscellaneous Expenses", "Team Outings/Meals"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-slate-300">Payment Method</span>
            <select
              className="field"
              value={draft.paymentMethod}
              onChange={(e) => setDraft({ ...draft, paymentMethod: e.target.value })}
            >
              <option>Personal Card</option>
              <option>Company Card</option>
              <option>Cash</option>
            </select>
          </label>
          <FieldRow
            label="Location (optional)"
            value={draft.location}
            onChange={(v) => setDraft({ ...draft, location: v })}
            placeholder="City, ST"
          />
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-rose-300/20 bg-rose-500/10 p-3 text-sm text-rose-100">{errorMsg}</div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button onClick={discardReceipt} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200">
            Discard
          </button>
          <button onClick={confirmReceipt} className="rounded-xl bg-emerald-400 px-5 py-2 text-sm font-black text-slate-950">
            Confirm + Save to Library
          </button>
        </div>

        {scanResult.ocrText && (
          <details className="text-xs text-slate-400">
            <summary className="cursor-pointer">Show raw OCR text (what Google Vision actually saw)</summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-xl border border-white/5 bg-black/30 p-3 text-xs text-slate-300 whitespace-pre-wrap">
              {Array.isArray(scanResult.ocrText) ? scanResult.ocrText.join("\n") : String(scanResult.ocrText)}
            </pre>
          </details>
        )}
      </div>
    );
  }

  return null;
}

function Banner({ tone, children }) {
  const toneClass =
    tone === "rose"
      ? "border-rose-300/30 bg-rose-500/10 text-rose-100"
      : tone === "violet"
      ? "border-violet-300/30 bg-violet-500/10 text-violet-100"
      : "border-cyan-300/30 bg-cyan-500/10 text-cyan-100";
  return <div className={`rounded-2xl border p-4 text-sm ${toneClass}`}>{children}</div>;
}

function FieldRow({ label, value, onChange, confidence, type, step, placeholder }) {
  return (
    <label className="text-sm">
      <span className="mb-2 flex items-center justify-between text-slate-300">
        <span>{label}</span>
        {typeof confidence === "number" && <ConfidencePill confidence={confidence} small />}
      </span>
      <input
        type={type || "text"}
        step={step}
        placeholder={placeholder}
        className="field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function ConfidencePill({ confidence, small }) {
  if (typeof confidence !== "number") {
    return (
      <span className={`inline-flex items-center rounded-lg border border-slate-300/20 bg-slate-300/10 ${small ? "px-2 py-0.5" : "px-2.5 py-1"} text-xs font-medium text-slate-300`}>
        no confidence
      </span>
    );
  }
  const pct = Math.round(confidence * 100);
  const tone =
    pct >= 85
      ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
      : pct >= 70
      ? "border-amber-400/30 bg-amber-500/15 text-amber-200"
      : "border-rose-400/30 bg-rose-500/15 text-rose-200";
  return (
    <span className={`inline-flex items-center rounded-lg border ${tone} ${small ? "px-2 py-0.5" : "px-2.5 py-1"} text-xs font-medium`}>
      {pct}% confident
    </span>
  );
}
