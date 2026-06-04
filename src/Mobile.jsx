// Mobile layout for Venture Home Expense Tracker.
//
// Field employees use phones, so the mobile site is its own UX, not just a
// shrunken desktop. Three big tappable buttons on the home screen, an
// instant-camera upload flow, a one-thumb expense report builder, and an
// even simpler approvals queue for managers.
//
// Activated automatically when the viewport is <= 1024px. Desktop layout
// (existing App.jsx) takes over above that.

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth.jsx";
import ReceiptUpload from "./ReceiptUpload.jsx";
import {
  useReceipts,
  useReports,
  addReport as fsAddReport,
  updateReceipt as fsUpdateReceipt,
  updateReport as fsUpdateReport,
} from "./firestore.js";

// ------- helpers -------

function money(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n) || 0);
}
function iconFor(category) {
  if (category === "Gas/Fuel") return "⛽";
  if (category === "Tolls") return "🛣️";
  if (category === "Electric Vehicle Charging") return "⚡";
  if (category === "Team Outings/Meals") return "🍽️";
  return "💳";
}
function dateRange(receipts) {
  if (!receipts.length) return "";
  const dates = receipts.map((r) => r.expenseDate).sort();
  return dates[0] === dates[dates.length - 1] ? dates[0] : `${dates[0]} – ${dates[dates.length - 1]}`;
}

export function useIsMobile() {
  const get = () => typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
  const [m, setM] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const handler = () => setM(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return m;
}

// ------- shell -------

export default function MobileLayout() {
  const { profile, signOut } = useAuth();
  const { items: receipts } = useReceipts();
  const { items: reports } = useReports();
  const [screen, setScreen] = useState("home");
  const [toast, setToast] = useState("");

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(window.__vhToast);
    window.__vhToast = window.setTimeout(() => setToast(""), 2400);
  }

  // Admins can preview from any role. Managers default to "manager", others "employee".
  const isAdmin = profile.role === "Payroll/Admin";
  const defaultPerspective = isAdmin ? "admin" : profile.role === "Manager" ? "manager" : "employee";
  const [perspective, setPerspective] = useState(defaultPerspective);
  const isManagerView = perspective === "manager" || perspective === "admin";

  const mine = receipts.filter((r) => r.employee === profile.name && r.status !== "Uploaded");
  const unreported = mine.filter((r) => ["Unreported", "Rejected Receipt"].includes(r.status));
  const myReports = reports.filter((r) => r.employee === profile.name);
  // Admin perspective sees payroll-stage approvals too; manager perspective sees just manager-stage.
  const pendingApprovals = isManagerView
    ? (perspective === "admin"
        ? reports.filter((r) => ["Expense Report Submitted, Awaiting Manager Review", "Manager Approved, Awaiting Payroll Review"].includes(r.status))
        : reports.filter((r) => r.status === "Expense Report Submitted, Awaiting Manager Review"))
    : [];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <style>{`.field,.mfield{width:100%;border-radius:.9rem;border:1px solid rgba(103,232,249,.2);background:rgba(255,255,255,.05);padding:.75rem .9rem;color:white;font-size:16px;outline:none}.mfield{padding:.95rem 1rem}.field option,.mfield option{background:#020617;color:white}.field:focus,.mfield:focus{border-color:rgba(103,232,249,.55)}`}</style>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute -right-20 top-40 h-72 w-72 rounded-full bg-violet-600/15 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-md px-5 pb-28 pt-6">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <button onClick={signOut} className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-100">Sign out</button>
        </div>

        {screen === "home" && (
          <MobileHome
            profile={profile}
            unreportedCount={unreported.length}
            unreportedTotal={unreported.reduce((a, r) => a + (r.amount || 0), 0)}
            pendingApprovalsCount={pendingApprovals.length}
            perspective={perspective}
            setPerspective={setPerspective}
            isAdmin={isAdmin}
            isManagerView={isManagerView}
            setScreen={setScreen}
          />
        )}
        {screen === "upload" && (
          <MobileUploadScreen
            profile={profile}
            onBack={() => setScreen("home")}
            onSaved={() => { setScreen("home"); showToast("Receipt saved!"); }}
          />
        )}
        {screen === "library" && (
          <MobileReceiptLibrary
            profile={profile}
            receipts={receipts}
            onBack={() => setScreen("home")}
          />
        )}
        {screen === "report" && (
          <MobileCreateReport
            profile={profile}
            available={unreported}
            onBack={() => setScreen("home")}
            onSubmitted={() => { setScreen("home"); showToast("Report submitted!"); }}
          />
        )}
        {screen === "dashboard" && (
          <MobileDashboard
            profile={profile}
            unreported={unreported}
            myReports={myReports}
            onBack={() => setScreen("home")}
          />
        )}
        {screen === "approvals" && isManagerView && (
          <MobileApprovals
            queue={pendingApprovals}
            receipts={receipts}
            onBack={() => setScreen("home")}
            onAction={(msg) => showToast(msg)}
          />
        )}
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 mx-auto w-fit max-w-[90%] rounded-2xl border border-emerald-300/30 bg-emerald-500/15 px-5 py-3 text-sm font-bold text-emerald-100 shadow-2xl backdrop-blur">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 290 54" xmlns="http://www.w3.org/2000/svg" className="h-10 w-auto">
      <g transform="translate(2, 6)">
        <path d="M 5 24 L 22 6 L 39 24 M 9 21 L 9 42 L 35 42 L 35 21" stroke="#6EE7B7" strokeWidth="3" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M 16 20 c -2 -2.2 1.4 -5.4 3.4 -2.4 c 2 -3 5.4 0.2 3.4 2.4 l -3.4 3.6 z" fill="#6EE7B7" />
      </g>
      <text x="54" y="38" fontSize="30" fontWeight="600" fontFamily="Poppins, Outfit, system-ui, -apple-system, sans-serif" letterSpacing="-0.5">
        <tspan fill="white">venture</tspan><tspan fill="#6EE7B7">home.</tspan>
      </text>
    </svg>
  );
}

// ------- home -------

function MobileHome({ profile, unreportedCount, unreportedTotal, pendingApprovalsCount, perspective, setPerspective, isAdmin, isManagerView, setScreen }) {
  const firstName = (profile.name || "").split(" ")[0] || "there";
  return (
    <div>
      <h1 className="text-3xl font-black text-white">Hi, {firstName}</h1>
      <p className="mt-2 text-base text-slate-400">
        {unreportedCount > 0
          ? <>You have <span className="font-bold text-cyan-300">{unreportedCount} unreported receipt{unreportedCount === 1 ? "" : "s"}</span> waiting · {money(unreportedTotal)}</>
          : <>No receipts waiting. Snap a new one below.</>}
      </p>

      {isAdmin && (
        <div className="mt-5 rounded-2xl border border-cyan-300/15 bg-white/[0.04] p-1.5">
          <p className="px-2 pb-2 pt-1 text-[10px] uppercase tracking-wider text-slate-500">Preview as</p>
          <div className="flex gap-1">
            {[
              { id: "employee", label: "Employee", color: "bg-cyan-400" },
              { id: "manager", label: "Manager", color: "bg-violet-400" },
              { id: "admin", label: "Admin", color: "bg-emerald-300" },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setPerspective(r.id)}
                className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition ${
                  perspective === r.id ? `${r.color} text-slate-950` : "text-slate-300"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-7 space-y-4">
        <BigButton
          onClick={() => setScreen("upload")}
          tone="cyan-primary"
          icon={
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-3xl">＋</span>
          }
          title="Upload Receipt"
          sub="Tap to snap a photo or pick from your library"
        />
        <BigButton
          onClick={() => setScreen("library")}
          tone="slate"
          icon={<span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-3xl">📂</span>}
          title="Receipt Library"
          sub={unreportedCount > 0 ? unreportedCount + " unreported · " + money(unreportedTotal) : "Browse your uploaded receipts"}
        />
        <BigButton
          onClick={() => setScreen("report")}
          tone="violet"
          icon={<span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-3xl">🧾</span>}
          title="Create Expense Report"
          sub={unreportedCount > 0 ? `${unreportedCount} ready to submit` : "Build & submit a report"}
        />
        <BigButton
          onClick={() => setScreen("dashboard")}
          tone="slate"
          icon={<span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-3xl">📊</span>}
          title="My Dashboard"
          sub="See your reports & reimbursements"
        />
        {isManagerView && (
          <BigButton
            onClick={() => setScreen("approvals")}
            tone="emerald"
            icon={<span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-3xl">✅</span>}
            title={perspective === "admin" ? "Payroll Review" : "Approvals"}
            sub={pendingApprovalsCount > 0 ? `${pendingApprovalsCount} report${pendingApprovalsCount === 1 ? "" : "s"} need review` : "Nothing waiting"}
            badge={pendingApprovalsCount > 0 ? pendingApprovalsCount : null}
          />
        )}
      </div>

      <div className="mt-10 text-center text-xs text-slate-500">
        Need help? <a href="mailto:payroll@venturehome.com" className="text-cyan-300 underline">Email payroll@venturehome.com</a>
      </div>
    </div>
  );
}

function BigButton({ onClick, icon, title, sub, tone, badge }) {
  const toneClass =
    tone === "cyan-primary"
      ? "border-cyan-300/50 bg-gradient-to-br from-cyan-500/30 via-blue-600/20 to-cyan-500/10 shadow-cyan-500/20"
      : tone === "violet"
      ? "border-violet-300/40 bg-gradient-to-br from-violet-500/25 via-fuchsia-500/15 to-violet-500/5"
      : tone === "emerald"
      ? "border-emerald-300/40 bg-gradient-to-br from-emerald-500/25 via-cyan-500/10 to-emerald-500/5"
      : "border-white/10 bg-white/[0.04]";
  return (
    <button
      onClick={onClick}
      className={`relative flex w-full items-center gap-4 rounded-3xl border ${toneClass} p-5 text-left shadow-xl active:scale-[0.98] transition`}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-lg font-black text-white">{title}</p>
        <p className="mt-1 text-sm text-slate-300">{sub}</p>
      </div>
      {badge != null && (
        <span className="grid h-7 min-w-7 place-items-center rounded-full bg-rose-500 px-2 text-xs font-black text-white">{badge}</span>
      )}
      <span className="text-2xl text-slate-400">›</span>
    </button>
  );
}

// ------- upload -------

function MobileUploadScreen({ profile, onBack, onSaved }) {
  return (
    <div>
      <BackHeader title="Upload Receipt" onBack={onBack} />
      <div className="mt-4 rounded-3xl border border-cyan-300/15 bg-slate-950/60 p-5 shadow-2xl">
        <p className="mb-4 text-sm text-slate-400">
          Take a clear photo of the full receipt with good lighting. The numbers must be readable — we'll auto-scan vendor, date, and amount.
        </p>
        <ReceiptUpload profile={profile} onUploaded={onSaved} />
      </div>
    </div>
  );
}

// ------- create expense report -------

function MobileCreateReport({ profile, available, onBack, onSubmitted }) {
  const [selectedIds, setSelectedIds] = useState(() => available.map((r) => r.id));
  const [name, setName] = useState(() => {
    const month = new Date().toLocaleDateString("en-US", { month: "long" });
    return `VH-${month.slice(0,3)}-${String(new Date().getFullYear()).slice(2)}-${Math.random().toString(36).toUpperCase().slice(2,6)}`;
  });
  const [submitting, setSubmitting] = useState(false);

  const selected = available.filter((r) => selectedIds.includes(r.id));
  const total = selected.reduce((a, r) => a + (r.amount || 0), 0);
  const reimbursable = selected.filter((r) => r.paymentMethod !== "Company Card").reduce((a, r) => a + (r.amount || 0), 0);
  // $400/month combined gas + EV limit warning (informational only — doesn't block submit)
  const fuelEvTotal = selected
    .filter((r) => r.category === "Gas/Fuel" || r.category === "Electric Vehicle Charging")
    .reduce((a, r) => a + (r.amount || 0), 0);
  const overFuelLimit = fuelEvTotal > 400;

  function toggle(id) {
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.concat(id)));
  }

  async function submit() {
    if (!selected.length || submitting) return;
    setSubmitting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await fsAddReport({
        employee: profile.name,
        manager: profile.manager || "",
        location: profile.team || "",
        reportName: name,
        createdDate: today,
        dateRange: dateRange(selected),
        receiptIds: selected.map((r) => r.id),
        categories: [...new Set(selected.map((r) => r.category))].join(", "),
        amount: total,
        reimbursable,
        status: "Expense Report Submitted, Awaiting Manager Review",
        risk: "No flags",
        submitted: new Date().toLocaleString(),
        managerDecision: "Waiting",
        payrollDecision: "Not ready",
      });
      await Promise.all(selected.map((r) => fsUpdateReceipt(r.id, { status: "Reported", note: "Included on submitted report" })));
      onSubmitted();
    } catch (err) {
      console.error("submit failed", err);
      alert("Submit failed: " + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <BackHeader title="New Expense Report" onBack={onBack} />

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">Report name</span>
          <input className="mfield" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setSelectedIds(available.map((r) => r.id))} className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-100">Select all</button>
          <button onClick={() => setSelectedIds([])} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-300">Clear</button>
        </div>
      </div>

      {overFuelLimit && (
        <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <strong>Monthly fuel + EV limit warning.</strong> Selected gas/EV total is ${fuelEvTotal.toFixed(2)} — over the $400 combined monthly cap. Manager will likely flag this.
        </div>
      )}

      <h3 className="mt-6 mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
        Receipts ({available.length})
      </h3>

      {available.length === 0 && (
        <div className="rounded-2xl border border-cyan-300/15 bg-white/[0.03] p-6 text-center text-sm text-slate-400">
          No unreported receipts yet. Upload one first.
        </div>
      )}

      <div className="space-y-3 pb-32">
        {available.map((r) => {
          const isSelected = selectedIds.includes(r.id);
          return (
            <button
              key={r.id}
              onClick={() => toggle(r.id)}
              className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
                isSelected ? "border-cyan-300/50 bg-cyan-500/15 shadow-lg shadow-cyan-500/10" : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <div className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${isSelected ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-white/30"}`}>
                {isSelected && <span className="text-sm font-black">✓</span>}
              </div>
              <span className="text-2xl">{iconFor(r.category)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-white">{r.vendor || "—"}</p>
                <p className="text-xs text-slate-400">{r.expenseDate} · {r.category}</p>
              </div>
              <p className="shrink-0 text-base font-black text-white">{money(r.amount)}</p>
            </button>
          );
        })}
      </div>

      {/* Sticky submit footer */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-cyan-300/15 bg-slate-950/95 backdrop-blur-xl">
        <div className="mx-auto max-w-md px-5 py-4">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400">{selected.length} selected · reimburse {money(reimbursable)}</span>
            <span className="text-xl font-black text-white">{money(total)}</span>
          </div>
          <button
            onClick={submit}
            disabled={!selected.length || submitting}
            className="w-full rounded-2xl bg-blue-600 px-6 py-4 text-base font-black text-white shadow-lg shadow-blue-600/30 disabled:opacity-50 active:scale-[0.98] transition"
          >
            {submitting ? "Submitting…" : `Submit ${selected.length} receipt${selected.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ------- dashboard -------

function MobileDashboard({ profile, unreported, myReports, onBack }) {
  const pending = myReports.filter((r) => ["Expense Report Submitted, Awaiting Manager Review", "Needs More Info", "Manager Approved, Awaiting Payroll Review"].includes(r.status));
  const reimbursed = myReports.filter((r) => r.status === "Reimbursed").reduce((a, r) => a + (r.reimbursable || 0), 0);
  const thisMonth = (() => {
    const m = new Date().toISOString().slice(0, 7);
    return myReports.filter((r) => (r.createdDate || "").startsWith(m)).reduce((a, r) => a + (r.amount || 0), 0);
  })();
  const recent = myReports.slice().sort((a, b) => (b.createdDate || "").localeCompare(a.createdDate || "")).slice(0, 5);

  return (
    <div>
      <BackHeader title="My Dashboard" onBack={onBack} />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Unreported" value={unreported.length} sub={`${money(unreported.reduce((a, r) => a + (r.amount || 0), 0))} waiting`} tone="cyan" />
        <Stat label="Pending" value={pending.length} sub="Awaiting review" tone="violet" />
        <Stat label="Reimbursed" value={money(reimbursed)} sub="Total paid back" tone="emerald" />
        <Stat label="This month" value={money(thisMonth)} sub="Submitted" tone="amber" />
      </div>

      <h3 className="mt-7 mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">Recent reports</h3>
      {recent.length === 0 && <p className="text-sm text-slate-500">No reports yet.</p>}
      <div className="space-y-3">
        {recent.map((r) => (
          <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold text-white">{r.reportName}</p>
                <p className="mt-1 text-xs text-slate-400">{r.dateRange} · {r.receiptIds?.length || 0} receipts</p>
              </div>
              <p className="shrink-0 text-base font-black text-white">{money(r.amount)}</p>
            </div>
            <p className="mt-2 text-xs text-cyan-200">{r.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone }) {
  const toneClass =
    tone === "cyan" ? "from-cyan-500/20 to-blue-500/5 text-cyan-200"
    : tone === "violet" ? "from-violet-500/20 to-fuchsia-500/5 text-violet-200"
    : tone === "emerald" ? "from-emerald-500/20 to-cyan-500/5 text-emerald-200"
    : "from-amber-500/20 to-orange-500/5 text-amber-200";
  return (
    <div className={`rounded-2xl border border-white/10 bg-gradient-to-br ${toneClass} p-4`}>
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

// ------- approvals (managers / payroll admins) -------

function MobileApprovals({ queue, receipts, onBack, onAction }) {
  const [acting, setActing] = useState(null); // report id mid-action

  async function approve(r) {
    setActing(r.id);
    try {
      const next = r.status === "Expense Report Submitted, Awaiting Manager Review"
        ? "Manager Approved, Awaiting Payroll Review"
        : "Payroll Approved, Awaiting Reimbursement";
      await fsUpdateReport(r.id, { status: next });
      onAction("Approved");
    } finally {
      setActing(null);
    }
  }
  async function reject(r) {
    setActing(r.id);
    try {
      await fsUpdateReport(r.id, { status: "Needs More Info" });
      onAction("Sent back for more info");
    } finally {
      setActing(null);
    }
  }

  return (
    <div>
      <BackHeader title={`Approvals (${queue.length})`} onBack={onBack} />
      {queue.length === 0 && <p className="mt-6 text-center text-sm text-slate-400">Nothing waiting for review.</p>}
      <div className="mt-4 space-y-4 pb-10">
        {queue.map((r) => {
          const related = receipts.filter((x) => r.receiptIds?.includes(x.id));
          return (
            <div key={r.id} className="rounded-3xl border border-cyan-300/15 bg-slate-950/60 p-5 shadow-2xl">
              <p className="text-xs uppercase tracking-wider text-cyan-300">{r.status}</p>
              <h3 className="mt-1 text-lg font-black text-white">{r.reportName}</h3>
              <p className="text-sm text-slate-400">{r.employee} · {r.location}</p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-300">{r.receiptIds?.length || 0} receipts · {r.dateRange}</span>
                <span className="text-lg font-black text-white">{money(r.amount)}</span>
              </div>
              {/* Receipt thumbnails */}
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {related.slice(0, 6).map((x) => (
                  x.downloadUrl ? (
                    <a key={x.id} href={x.downloadUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <img src={x.downloadUrl} alt="" className="h-16 w-16 rounded-lg border border-white/10 object-cover" />
                    </a>
                  ) : (
                    <div key={x.id} className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-xl">{iconFor(x.category)}</div>
                  )
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => reject(r)}
                  disabled={acting === r.id}
                  className="rounded-xl border border-amber-300/30 bg-amber-500/15 px-3 py-3 text-sm font-bold text-amber-100 disabled:opacity-50"
                >
                  More info
                </button>
                <button
                  onClick={() => approve(r)}
                  disabled={acting === r.id}
                  className="rounded-xl bg-emerald-400 px-3 py-3 text-sm font-black text-slate-950 disabled:opacity-50"
                >
                  {acting === r.id ? "…" : "Approve"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------- shared back header -------

// ------- receipt library (mobile) -------

function MobileReceiptLibrary({ profile, receipts, onBack }) {
  const mine = receipts.filter((r) => r.employee === profile.name && r.status !== "Uploaded");
  const [open, setOpen] = useState(null);
  const live = open ? mine.find((r) => r.id === open.id) || open : null;
  return (
    <div>
      <BackHeader title="Receipt Library" onBack={onBack} />
      <p className="mt-3 text-sm text-slate-400">
        {mine.length} receipt{mine.length === 1 ? "" : "s"} in your library
      </p>
      {mine.length === 0 ? (
        <p className="mt-10 text-center text-sm text-slate-500">
          No receipts yet. Tap Upload Receipt from the home screen to add one.
        </p>
      ) : (
        <div className="mt-4 space-y-3 pb-10">
          {mine.map((r) => (
            <button
              key={r.id}
              onClick={() => setOpen(r)}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left active:scale-[0.99] transition"
            >
              <span className="text-2xl">{iconFor(r.category)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-white">{r.vendor || "—"}</p>
                <p className="text-xs text-slate-400">{r.expenseDate} · {r.category}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-cyan-300">{r.status}</p>
              </div>
              <p className="shrink-0 text-base font-black text-white">{money(r.amount)}</p>
            </button>
          ))}
        </div>
      )}
      {live && <MobileReceiptDetail receipt={live} onClose={() => setOpen(null)} />}
    </div>
  );
}

function MobileReceiptDetail({ receipt, onClose }) {
  const [edit, setEdit] = useState({
    vendor: receipt.vendor || "",
    expenseDate: receipt.expenseDate || receipt.dateOnReceipt || "",
    amount: receipt.amount || "",
    category: receipt.category || "Gas/Fuel",
    paymentMethod: receipt.paymentMethod || "Personal Card",
    location: receipt.location || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const locked = ["Reported", "Manager Approved, Awaiting Payroll Review", "Payroll Approved, Awaiting Reimbursement", "Reimbursed"].includes(receipt.status);

  async function save() {
    const amt = parseFloat(edit.amount);
    if (!edit.vendor.trim() || !edit.expenseDate || !Number.isFinite(amt) || amt <= 0) {
      setError("Vendor, date, and a non-zero amount are all required.");
      return;
    }
    setSaving(true);
    try {
      await fsUpdateReceipt(receipt.id, {
        vendor: edit.vendor.trim(),
        expenseDate: edit.expenseDate,
        dateOnReceipt: edit.expenseDate,
        amount: amt,
        category: edit.category,
        paymentMethod: edit.paymentMethod,
        location: edit.location.trim(),
        note: "Manually edited by employee.",
      });
      onClose();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <div className="mx-auto my-4 w-full max-w-md rounded-3xl border border-cyan-300/20 bg-slate-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-white">Receipt</h3>
          <button onClick={onClose} className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-100">Close</button>
        </div>
        {receipt.downloadUrl ? (
          <a href={receipt.downloadUrl} target="_blank" rel="noopener noreferrer" className="block">
            <img src={receipt.downloadUrl} alt="Receipt" className="mx-auto max-h-72 rounded-xl border border-white/10 object-contain" />
          </a>
        ) : (
          <div className="grid h-40 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-sm text-slate-500">No image</div>
        )}
        <div className="mt-4 space-y-3">
          {locked && <p className="rounded-xl border border-amber-300/30 bg-amber-500/10 p-3 text-xs text-amber-200">This receipt is on a submitted report — fields are read-only.</p>}
          <label className="block text-sm"><span className="mb-1 block text-slate-300">Vendor</span><input className="field" value={edit.vendor} disabled={locked} onChange={(e) => setEdit({ ...edit, vendor: e.target.value })} /></label>
          <label className="block text-sm"><span className="mb-1 block text-slate-300">Date</span><input type="date" className="field" value={edit.expenseDate} disabled={locked} onChange={(e) => setEdit({ ...edit, expenseDate: e.target.value })} /></label>
          <label className="block text-sm"><span className="mb-1 block text-slate-300">Amount (USD)</span><input type="number" step="0.01" className="field" value={edit.amount} disabled={locked} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} /></label>
          <label className="block text-sm"><span className="mb-1 block text-slate-300">Category</span>
            <select className="field" value={edit.category} disabled={locked} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>
              {["Gas/Fuel", "Tolls", "Electric Vehicle Charging", "Miscellaneous Expenses", "Team Outings/Meals"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="block text-sm"><span className="mb-1 block text-slate-300">Payment Method</span>
            <select className="field" value={edit.paymentMethod} disabled={locked} onChange={(e) => setEdit({ ...edit, paymentMethod: e.target.value })}>
              <option>Personal Card</option><option>Company Card</option><option>Cash</option>
            </select>
          </label>
          <label className="block text-sm"><span className="mb-1 block text-slate-300">Location</span><input className="field" value={edit.location} disabled={locked} onChange={(e) => setEdit({ ...edit, location: e.target.value })} /></label>
          {error && <div className="rounded-xl border border-rose-300/20 bg-rose-500/10 p-3 text-xs text-rose-100">{error}</div>}
          {!locked && (
            <button onClick={save} disabled={saving} className="w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-60">{saving ? "Saving…" : "Save Changes"}</button>
          )}
        </div>
      </div>
    </div>
  );
}

function BackHeader({ title, onBack }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} aria-label="Back" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
      <h2 className="text-2xl font-black text-white">{title}</h2>
    </div>
  );
}
