
import React, { useMemo, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider, useAuth } from "./auth.jsx";
import {
  useUsers, useReceipts, useReports,
  addUser as fsAddUser, updateUser as fsUpdateUser,
  addReceipt as fsAddReceipt, updateReceipt as fsUpdateReceipt,
  addReport as fsAddReport, updateReport as fsUpdateReport,
} from "./firestore.js";
import ReceiptUpload from "./ReceiptUpload.jsx";
import MobileLayout, { useIsMobile } from "./Mobile.jsx";
import { InviteTemplateEditor, ComposeInviteModal, renderInviteEmail, useInviteTemplate } from "./InviteTemplate.jsx";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";

const expenseTypes = ["Gas/Fuel", "Tolls", "Electric Vehicle Charging", "Miscellaneous Expenses", "Team Outings/Meals"];

const statuses = [
  "Expense Report Submitted, Awaiting Manager Review",
  "Needs More Info",
  "Manager Approved, Awaiting Payroll Review",
  "Payroll Approved, Awaiting Reimbursement",
  "Reimbursed",
  "Rejected",
  "Unreported",
  "Reported",
  "Rejected Receipt"
];

const statusStyles = {
  "Expense Report Submitted, Awaiting Manager Review": "bg-sky-500/15 text-sky-200 border-sky-400/30",
  "Needs More Info": "bg-amber-500/15 text-amber-200 border-amber-400/30",
  "Manager Approved, Awaiting Payroll Review": "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
  "Payroll Approved, Awaiting Reimbursement": "bg-violet-500/15 text-violet-200 border-violet-400/30",
  "Reimbursed": "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-400/30",
  "Rejected": "bg-rose-500/15 text-rose-200 border-rose-400/30",
  "Rejected Receipt": "bg-rose-500/15 text-rose-200 border-rose-400/30",
  "Unreported": "bg-cyan-500/15 text-cyan-200 border-cyan-400/30",
  "Reported": "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
};

const exportFields = [
  "Report ID", "Employee", "Manager", "Team / Location", "Report Name", "Created Date",
  "Receipt Date Range", "Submitted Date/Time", "Categories", "Receipt Count",
  "Report Total", "Reimbursable Amount", "Status", "Manager Decision",
  "Payroll Decision", "Reimbursement Date", "Receipt Links"
];

function cn(...classes) { return classes.filter(Boolean).join(" "); }
function money(value) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0); }
function iconFor(category) {
  if (category === "Gas/Fuel") return "⛽";
  if (category === "Tolls") return "🛣️";
  if (category === "Electric Vehicle Charging") return "⚡";
  if (category === "Team Outings/Meals") return "🍽️";
  return "💳";
}
function receiptDateRange(receipts) {
  if (!receipts.length) return "No receipts selected";
  const dates = receipts.map((r) => r.expenseDate).sort();
  return dates[0] === dates[dates.length - 1] ? dates[0] : `${dates[0]} - ${dates[dates.length - 1]}`;
}

function Card({ children, className = "" }) {
  return <div className={cn("rounded-2xl border border-cyan-300/15 bg-slate-950/60 shadow-2xl backdrop-blur-xl", className)}>{children}</div>;
}
function Pill({ children, status }) {
  return <span className={cn("inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium", statusStyles[status] || statusStyles.Unreported)}>{children}</span>;
}
function Metric({ title, value, sub, icon, tone = "cyan" }) {
  const toneClass = tone === "violet" ? "from-violet-500/25 to-fuchsia-500/5 text-violet-200" : tone === "emerald" ? "from-emerald-500/20 to-cyan-500/5 text-emerald-200" : tone === "amber" ? "from-amber-500/20 to-orange-500/5 text-amber-200" : "from-cyan-500/20 to-blue-500/5 text-cyan-200";
  return (
    <Card className={cn("relative overflow-hidden bg-gradient-to-br p-5", toneClass)}>
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-current opacity-10 blur-2xl" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-black text-white">{value}</p>
          <p className="mt-2 text-sm text-slate-400">{sub}</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-current/10 text-xl">{icon}</div>
      </div>
    </Card>
  );
}
function Field({ label, value, onChange, disabled = false, type = "text" }) {
  return (
    <label className="text-sm">
      <span className="mb-2 block text-slate-300">{label}</span>
      <input type={type} className={cn("field", disabled && "opacity-70")} disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Sidebar({ active, setActive, perspective }) {
  const employeeItems = ["Dashboard", "Receipt Library", "Create Expense Report", "Reports / Export", "Audit Trail", "Rules & Settings"];
  const managerItems = ["Dashboard", "Receipt Library", "Create Expense Report", "Approvals", "Reports / Export", "Audit Trail", "Rules & Settings"];
  const adminItems = ["Dashboard", "Payroll Review", "All Expense Reports", "Reports / Export", "Invite Users", "Invite Template", "Users & Settings", "Developer Setup", "Audit Trail", "Rules & Settings"];
  const icons = { Dashboard: "▦", "Receipt Library": "📥", "Create Expense Report": "🧾", Approvals: "✅", "Reports / Export": "📊", "Audit Trail": "🕘", "Rules & Settings": "⚙️", "Payroll Review": "🛡️", "All Expense Reports": "📄", "Invite Users": "✉️", "Invite Template": "✏️", "Users & Settings": "👥", "Developer Setup": "🧩" };
  const items = perspective === "admin" ? adminItems : perspective === "manager" ? managerItems : employeeItems;
  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-cyan-300/10 bg-slate-950/80 p-5 lg:block">
      <div className="mb-9 flex items-center gap-3">
        <svg viewBox="0 0 290 54" xmlns="http://www.w3.org/2000/svg" aria-label="venture home" className="h-12 w-auto">
          <g transform="translate(2, 6)">
            <path d="M 5 24 L 22 6 L 39 24 M 9 21 L 9 42 L 35 42 L 35 21" stroke="#6EE7B7" strokeWidth="3" fill="none" strokeLinejoin="round" strokeLinecap="round" />
            <path d="M 16 20 c -2 -2.2 1.4 -5.4 3.4 -2.4 c 2 -3 5.4 0.2 3.4 2.4 l -3.4 3.6 z" fill="#6EE7B7" />
          </g>
          <text x="54" y="38" fontSize="30" fontWeight="600" fontFamily="Poppins, Outfit, system-ui, -apple-system, sans-serif" letterSpacing="-0.5">
            <tspan fill="white">venture</tspan><tspan fill="#6EE7B7">home.</tspan>
          </text>
        </svg>
      </div>
      <nav className="space-y-2">
        {items.map((label) => (
          <button key={label} onClick={() => setActive(label)} className={cn("flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition", active === label ? "border border-cyan-300/30 bg-gradient-to-r from-blue-600/50 to-cyan-500/20 text-white shadow-lg" : "text-slate-400 hover:bg-white/5 hover:text-white")}>
            <span className="flex items-center gap-3"><span>{icons[label]}</span>{label}</span><span>›</span>
          </button>
        ))}
      </nav>
      <Card className="mt-12 p-4"><p className="font-semibold text-white">🔐 Role-based access</p><p className="text-xs text-slate-400">Employee · Manager · Payroll/Admin</p></Card>
    </aside>
  );
}

function Topbar({ active, perspective, setPerspective, setActive }) {
  const { profile, signOut } = useAuth();
  const isAdmin = profile?.role === "Payroll/Admin";
  function switchRole(role) { setPerspective(role); setActive("Dashboard"); }
  const initials = (profile?.name || "?").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <header className="sticky top-0 z-20 border-b border-cyan-300/10 bg-slate-950/75 px-4 py-4 backdrop-blur-xl md:px-8">
      <div className="flex items-center justify-between gap-4">
        <div><p className="text-xs uppercase tracking-widest text-cyan-300">Venture Home Expense OS</p><h1 className="text-2xl font-black text-white md:text-3xl">{perspective === "admin" && active === "Dashboard" ? "Admin Dashboard" : perspective === "manager" && active === "Dashboard" ? "Manager Dashboard" : active}</h1></div>
        <div className="hidden flex-1 items-center justify-end gap-4 md:flex">
          {isAdmin && (
            <div className="flex items-center rounded-2xl border border-cyan-300/15 bg-white/5 p-1" title="Admins can preview the app from each role">
              {["employee", "manager", "admin"].map((role) => (
                <button key={role} onClick={() => switchRole(role)} className={cn("rounded-xl px-4 py-2 text-sm font-bold capitalize transition", perspective === role ? (role === "employee" ? "bg-cyan-400" : role === "manager" ? "bg-violet-400" : "bg-emerald-300") + " text-slate-950" : "text-slate-300 hover:text-white")}>{role} View</button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 rounded-xl border border-cyan-300/15 bg-white/5 px-3 py-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-orange-200 to-sky-400 font-bold text-slate-950">{initials}</div>
            <div className="text-sm">
              <p className="font-semibold text-white">{profile?.name || profile?.email}</p>
              <p className="text-xs text-emerald-300 capitalize">{perspective} View</p>
            </div>
            <button onClick={signOut} className="ml-2 rounded-lg border border-rose-300/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-100" title="Sign out">Sign out</button>
          </div>
        </div>
      </div>
    </header>
  );
}

function QuickActions({ actions, setActive }) {
  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold text-white">Quick Actions</h2><span className="text-cyan-300">✦</span></div>
      {actions.map((a) => (
        <button key={a.title} onClick={() => setActive(a.go)} className="mb-3 flex w-full items-center justify-between rounded-2xl border border-cyan-300/10 bg-white/[0.04] p-4 text-left hover:border-cyan-300/35">
          <span><p className="font-semibold text-white">{a.icon} {a.title}</p><p className="text-sm text-slate-400">{a.sub}</p></span><span>›</span>
        </button>
      ))}
    </Card>
  );
}

function Dashboard({ reports, receipts, setActive, currentName }) {
  const pending = reports.filter((r) => ["Expense Report Submitted, Awaiting Manager Review", "Manager Approved, Awaiting Payroll Review", "Needs More Info"].includes(r.status)).length;
  const reimbursed = reports.filter((r) => r.status === "Reimbursed").reduce((a, r) => a + (r.reimbursable || 0), 0);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Unreported Receipts" value={receipts.filter((r) => r.status === "Unreported" && r.employee === currentName).length} sub="Waiting in receipt library" icon="📥" />
        <Metric title="Reports This Month" value={money(reports.filter((r) => r.employee === currentName).reduce((a, r) => a + (r.amount || 0), 0))} sub={`${reports.filter((r) => r.employee === currentName).length} reports`} icon="$" />
        <Metric title="Pending Reviews" value={pending} sub="Awaiting manager/payroll" icon="⏱" tone="violet" />
        <Metric title="Reimbursed" value={money(reimbursed)} sub="Completed payments" icon="✓" tone="emerald" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-5 text-lg font-bold text-white">Receipt-to-Report Workflow</h2>
          <div className="grid gap-3 md:grid-cols-4">
            {[["1","Upload anytime","Receipt goes into library"],["2","Auto-scan","Vendor, date, amount, category"],["3","Create report","Select unreported receipts"],["4","Submit","Manager then payroll approval"]].map((s) => (
              <div key={s[0]} className="min-w-0 overflow-hidden rounded-2xl border border-cyan-300/15 bg-white/[0.03] p-4"><div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-cyan-400 font-black text-slate-950">{s[0]}</div><p className="font-semibold text-white break-words">{s[1]}</p><p className="text-xs text-slate-400 break-words">{s[2]}</p></div>
            ))}
          </div>
        </Card>
        <QuickActions setActive={setActive} actions={[{title:"Upload / Autoscan Receipt", sub:"Save receipt to your library", icon:"📥", go:"Receipt Library"}, {title:"Create Expense Report", sub:"Select receipts and submit", icon:"+", go:"Create Expense Report"}, {title:"Download My Reports", sub:"Export my history", icon:"⬇", go:"Reports / Export"}]} />
      </div>
    </div>
  );
}

function ManagerDashboard({ reports, receipts, setActive, currentName }) {
  const teamReports = reports.filter((r) => r.manager === currentName || ["Expense Report Submitted, Awaiting Manager Review", "Needs More Info"].includes(r.status));
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Team Reports Pending" value={teamReports.filter((r) => ["Expense Report Submitted, Awaiting Manager Review", "Needs More Info"].includes(r.status)).length} sub="Awaiting manager action" icon="✅" tone="violet" />
        <Metric title="Team Expense Total" value={money(teamReports.reduce((a,r)=>a+(r.amount||0),0))} sub="Reports visible to manager" icon="$" />
        <Metric title="Approved / Reimbursed" value={teamReports.filter((r)=>["Manager Approved, Awaiting Payroll Review","Reimbursed"].includes(r.status)).length} sub="Completed manager reviews" icon="✓" tone="emerald" />
        <Metric title="My Receipts" value={receipts.filter((r)=>r.employee===currentName && r.status==="Unreported").length} sub="Manager's own library" icon="📥" />
      </div>
      <QuickActions setActive={setActive} actions={[{title:"Approve Team Reports", sub:"Review submitted reports", icon:"✅", go:"Approvals"}, {title:"Submit My Own Report", sub:"Managers submit expenses too", icon:"+", go:"Create Expense Report"}, {title:"Export Team Reports", sub:"Download team activity", icon:"⬇", go:"Reports / Export"}]} />
    </div>
  );
}

function AdminDashboard({ reports, setActive }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Awaiting Payroll Approval" value={reports.filter((r)=>r.status==="Manager Approved, Awaiting Payroll Review").length} sub="Ready for admin review" icon="🛡️" tone="emerald" />
        <Metric title="Awaiting Reimbursement" value={reports.filter((r)=>r.status==="Payroll Approved, Awaiting Reimbursement").length} sub="Approved, not reimbursed" icon="💵" tone="violet" />
        <Metric title="Reimbursed" value={reports.filter((r)=>r.status==="Reimbursed").length} sub="Completed reimbursements" icon="✓" />
        <Metric title="Total Reports" value={reports.length} sub="Company-wide" icon="📄" tone="amber" />
      </div>
      <QuickActions setActive={setActive} actions={[{title:"Payroll Review Queue", sub:"Final review and reimbursements", icon:"🛡️", go:"Payroll Review"}, {title:"All Expense Reports", sub:"Search and override statuses", icon:"📄", go:"All Expense Reports"}, {title:"Invite Users", sub:"Create accounts and assign teams", icon:"✉️", go:"Invite Users"}, {title:"Developer Setup", sub:"Technical build blueprint", icon:"🧩", go:"Developer Setup"}]} />
    </div>
  );
}

function EmployeeReceiptModal({ receipt, onClose }) {
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

  // Block edits once the receipt is part of a submitted/approved/paid report.
  const locked = ["Reported", "Manager Approved, Awaiting Payroll Review", "Payroll Approved, Awaiting Reimbursement", "Reimbursed"].includes(receipt.status);

  async function save() {
    const amt = parseFloat(edit.amount);
    if (!edit.vendor.trim() || !edit.expenseDate || !Number.isFinite(amt) || amt <= 0) {
      setError("Vendor, date, and a non-zero amount are all required.");
      return;
    }
    setSaving(true);
    setError("");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="my-8 w-full max-w-3xl rounded-3xl border border-cyan-300/20 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-cyan-300/10 p-5">
          <div>
            <h2 className="text-xl font-black text-white">Receipt {receipt.id?.slice(0,8)}</h2>
            <p className="text-xs text-slate-400">{receipt.fileName}</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-100">Close</button>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-cyan-300/15 bg-black/30 p-3">
            {receipt.downloadUrl ? (
              <a href={receipt.downloadUrl} target="_blank" rel="noopener noreferrer">
                <img src={receipt.downloadUrl} alt="Receipt" className="mx-auto max-h-[480px] rounded-xl object-contain" />
              </a>
            ) : (
              <div className="grid h-72 place-items-center text-sm text-slate-500">No image available for this receipt.</div>
            )}
            {receipt.ocrText && (
              <details className="mt-3 text-xs text-slate-400">
                <summary className="cursor-pointer">Raw OCR text</summary>
                <pre className="mt-2 max-h-48 overflow-auto rounded-xl border border-white/5 bg-black/40 p-3 text-[11px] text-slate-300 whitespace-pre-wrap">{String(receipt.ocrText)}</pre>
              </details>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <Pill status={receipt.status}>{receipt.status}</Pill>
              {locked && <p className="mt-2 text-xs text-amber-200">This receipt is on a submitted report — fields are read-only.</p>}
            </div>
            <Field label="Vendor" value={edit.vendor} disabled={locked} onChange={(v)=>setEdit({...edit,vendor:v})}/>
            <Field label="Date" type="date" value={edit.expenseDate} disabled={locked} onChange={(v)=>setEdit({...edit,expenseDate:v})}/>
            <Field label="Amount (USD)" type="number" value={edit.amount} disabled={locked} onChange={(v)=>setEdit({...edit,amount:v})}/>
            <label className="text-sm"><span className="mb-2 block text-slate-300">Category</span>
              <select className="field" value={edit.category} disabled={locked} onChange={(e)=>setEdit({...edit,category:e.target.value})}>
                {expenseTypes.map((c)=><option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-sm"><span className="mb-2 block text-slate-300">Payment Method</span>
              <select className="field" value={edit.paymentMethod} disabled={locked} onChange={(e)=>setEdit({...edit,paymentMethod:e.target.value})}>
                <option>Personal Card</option><option>Company Card</option><option>Cash</option>
              </select>
            </label>
            <Field label="Location" value={edit.location} disabled={locked} onChange={(v)=>setEdit({...edit,location:v})}/>
            {error && <div className="rounded-xl border border-rose-300/20 bg-rose-500/10 p-3 text-xs text-rose-100">{error}</div>}
            {!locked && (
              <button onClick={save} disabled={saving} className="mt-2 w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-60">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiptLibrary({ receipts, currentName, profile }) {
  const [viewing, setViewing] = useState(null); // receipt currently open in modal
  // Only show this employee's receipts that have completed the upload flow.
  const mine = receipts.filter((r) => r.employee === currentName && r.status !== "Uploaded");
  const unreported = mine.filter((r)=>r.status==="Unreported" || r.status==="Rejected Receipt");
  // Keep `viewing` in sync if the underlying receipt updates while the modal is open.
  const liveViewing = viewing ? mine.find((r) => r.id === viewing.id) || viewing : null;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Metric title="Unreported / Rejected Receipts" value={unreported.length} sub="Available for next report" icon="📥" />
        <Metric title="Available Total" value={money(unreported.reduce((a,r)=>a+(r.amount||0),0))} sub="Not submitted yet" icon="$" tone="violet" />
      </div>
      <Card className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Receipt Library</h2>
            <p className="text-sm text-slate-400">Upload receipts any time. We'll auto-scan the vendor, date, and amount. Click any row to view the photo or edit the details.</p>
          </div>
          <div className="w-full md:w-auto md:max-w-md">
            <ReceiptUpload profile={profile} />
          </div>
        </div>
      </Card>
      <Card className="overflow-hidden"><Table headers={["Receipt","Date","Vendor","Category","Location","Amount","Status","Action"]} rows={mine.map((r)=>[
        <button onClick={()=>setViewing(r)} className="text-left"><p className="font-semibold text-cyan-200 underline">{r.id?.slice(0, 8) || "—"}</p><p className="text-xs text-slate-500">{r.fileName}</p></button>,
        r.expenseDate, r.vendor, <>{iconFor(r.category)} {r.category}</>, r.location, money(r.amount), <Pill status={r.status}>{r.status}</Pill>,
        <button onClick={()=>setViewing(r)} className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200">View / Edit</button>
      ])}/></Card>
      {liveViewing && <EmployeeReceiptModal receipt={liveViewing} onClose={()=>setViewing(null)} /> }
    </div>
  );
}

function CreateExpenseReport({ receipts, currentProfile }) {
  const available = receipts.filter((r)=>r.employee === currentProfile.name && ["Unreported","Rejected Receipt"].includes(r.status));
  const [selected, setSelected] = useState([]);
  const [name, setName] = useState("");
  useEffect(() => { setSelected(available.map((r)=>r.id)); }, [available.length]);
  useEffect(() => {
    const month = new Date().toLocaleDateString("en-US", { month: "long" });
    setName(`VH-${month.slice(0,3)}-${String(new Date().getFullYear()).slice(2)}-${Math.random().toString(36).toUpperCase().slice(2,6)}`);
  }, []);
  const selectedReceipts = available.filter((r)=>selected.includes(r.id));
  const total = selectedReceipts.reduce((a,r)=>a+(r.amount||0),0);
  const reimb = selectedReceipts.filter((r)=>r.paymentMethod!=="Company Card").reduce((a,r)=>a+(r.amount||0),0);
  const flags = useMemo(()=> {
    const list = [];
    const gasEv = selectedReceipts.filter((r)=>["Gas/Fuel","Electric Vehicle Charging"].includes(r.category)).reduce((a,r)=>a+(r.amount||0),0);
    selectedReceipts.forEach((r)=> {
      if (r.category==="Gas/Fuel") list.push(`${r.vendor}: Receipt required for gas/fuel.`);
      if (r.category==="Electric Vehicle Charging") list.push(`${r.vendor}: Digital confirmation required for EV.`);
      if (r.category==="Tolls") list.push(`${r.vendor}: Toll breakdown required.`);
    });
    if (gasEv > 400) list.push("Monthly gas/EV combined limit warning: $400.");
    return list;
  }, [selectedReceipts]);
  async function submit() {
    if (!selectedReceipts.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const report = { employee:currentProfile.name, manager:currentProfile.manager || "", location:currentProfile.team || "", reportName:name, createdDate:today, dateRange:receiptDateRange(selectedReceipts), receiptIds:selectedReceipts.map(r=>r.id), categories:[...new Set(selectedReceipts.map(r=>r.category))].join(", "), amount:total, reimbursable:reimb, status:"Expense Report Submitted, Awaiting Manager Review", risk:flags[0] || "No flags", submitted: new Date().toLocaleString(), managerDecision:"Waiting", payrollDecision:"Not ready" };
    await fsAddReport(report);
    await Promise.all(selectedReceipts.map(r => fsUpdateReceipt(r.id, { status: "Reported", note: "Included on submitted report" })));
    setSelected([]);
  }
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-black text-white">Create Expense Report</h2>
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Field label="Employee Name" value={currentProfile.name || ""} disabled onChange={()=>{}} />
          <Field label="Report Name" value={name} onChange={setName} />
          <Field label="Approver / Manager" value={currentProfile.manager || "—"} disabled onChange={()=>{}} />
          <Field label="Sales Team" value={currentProfile.team || "—"} disabled onChange={()=>{}} />
        </div>
        <h3 className="mb-3 font-bold text-white">Select Unreported / Rejected Receipts</h3>
        {available.length === 0 && <p className="rounded-xl border border-cyan-300/10 bg-white/[0.03] p-6 text-sm text-slate-400">No unreported receipts yet — upload some from the Receipt Library first.</p>}
        <div className="space-y-3">
          {available.map((r)=>(
            <label key={r.id} className={cn("flex cursor-pointer items-center justify-between rounded-xl border p-4", selected.includes(r.id) ? "border-cyan-300/40 bg-cyan-500/10" : "border-white/5 bg-white/[0.03]")}>
              <span className="flex items-center gap-3"><input type="checkbox" checked={selected.includes(r.id)} onChange={()=>setSelected((cur)=>cur.includes(r.id)?cur.filter(x=>x!==r.id):cur.concat(r.id))}/><span>{iconFor(r.category)}</span><span><p className="font-semibold text-white">{r.vendor} · {money(r.amount)}</p><p className="text-xs text-slate-400">{r.expenseDate} · {r.fileName}</p></span></span><span className="text-xs text-cyan-300">{r.status}</span>
            </label>
          ))}
        </div>
      </Card>
      <Card className="p-5"><h3 className="mb-4 text-lg font-bold text-white">Report Summary</h3><div className="space-y-3">
        <Summary label="Selected Receipts" value={selectedReceipts.length}/>
        <Summary label="Auto Date Range" value={receiptDateRange(selectedReceipts)}/>
        <Summary label="Report Total" value={money(total)}/>
        <Summary label="Reimbursable Amount" value={money(reimb)}/>
        {flags.map((f)=><div key={f} className="rounded-xl border border-amber-300/20 bg-amber-500/10 p-3 text-sm text-amber-100">⚠ {f}</div>)}
        <button onClick={submit} className="mt-4 w-full rounded-2xl bg-blue-600 hover:bg-blue-700 px-6 py-4 text-lg font-black text-white shadow-lg shadow-blue-600/30 transition">Review Complete → Submit Expense Report</button>
      </div></Card>
    </div>
  );
}

function Summary({ label, value }) { return <div className="rounded-xl border border-cyan-300/15 bg-white/[0.03] p-4"><p className="text-xs text-slate-400">{label}</p><p className="text-xl font-black text-white">{value}</p></div>; }

function ReceiptModal({ receipt, onClose, onReject, onRestore, note, setNote }) {
  if (!receipt) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-3xl border border-cyan-300/20 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-cyan-300/10 p-6"><div><h2 className="text-2xl font-black text-white">Receipt Preview</h2><p className="text-sm text-slate-400">{receipt.fileName}</p></div><button onClick={onClose} className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-100">✕ Close</button></div>
        <div className="grid gap-6 p-6 xl:grid-cols-[1fr_320px]">
          <div className="flex h-[500px] flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300/20 bg-white/[0.03] text-center">
            <div className="mb-6 text-7xl">🧾</div><p className="text-xl font-bold text-white">Sample Receipt Preview</p><p className="mt-3 text-sm text-slate-400">Uploaded receipt/PDF would display here.</p>
            <div className="mt-8 w-full max-w-sm rounded-2xl border border-cyan-300/15 bg-black/30 p-5 text-left"><p className="font-bold text-white">{receipt.vendor} <span className="float-right text-cyan-300">{money(receipt.amount)}</span></p><p className="mt-3 text-sm text-slate-300">Date: {receipt.expenseDate}<br/>Location: {receipt.location}<br/>Category: {receipt.category}</p></div>
          </div>
          <div className="space-y-4">
            <Card className="p-5"><h3 className="text-lg font-bold text-white">Auto-Scanned Data</h3><div className="mt-4 space-y-3 text-sm"><p>Vendor: <b>{receipt.vendor}</b></p><p>Date: <b>{receipt.expenseDate}</b></p><p>Amount: <b>{money(receipt.amount)}</b></p><p>Status: <Pill status={receipt.status}>{receipt.status}</Pill></p></div></Card>
            <Card className="p-5"><h3 className="text-lg font-bold text-white">Receipt Decision</h3><textarea className="field mt-4 min-h-28 text-sm" placeholder="Add rejection note" value={note} onChange={(e)=>setNote(e.target.value)} />
              {receipt.status==="Rejected Receipt" ? <button onClick={()=>onRestore(receipt)} className="mt-4 w-full rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100">Restore Receipt</button> : <button onClick={()=>onReject(receipt)} className="mt-4 w-full rounded-xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-100">Reject This Receipt</button>}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Approvals({ reports, receipts, mode = "manager" }) {
  const [tab, setTab] = useState("All");
  const [selectedId, setSelectedId] = useState(null);
  const [viewReceipt, setViewReceipt] = useState(null);
  const [notes, setNotes] = useState({});
  const [bulk, setBulk] = useState([]);
  const queue = reports.filter((r)=> {
    if (tab==="Awaiting Approval") return ["Expense Report Submitted, Awaiting Manager Review","Needs More Info","Manager Approved, Awaiting Payroll Review"].includes(r.status);
    if (tab==="Awaiting Reimbursement") return r.status==="Payroll Approved, Awaiting Reimbursement";
    if (tab==="Reimbursed") return r.status==="Reimbursed";
    return true;
  });
  const selected = queue.find((r)=>r.id===selectedId) || queue[0] || null;
  const related = selected ? receipts.filter((r)=>selected.receiptIds?.includes(r.id)) : [];
  const rejectedTotal = related.filter((r)=>r.status==="Rejected Receipt").reduce((a,r)=>a+(r.amount||0),0);
  const adjusted = related.filter((r)=>r.status!=="Rejected Receipt" && r.paymentMethod!=="Company Card").reduce((a,r)=>a+(r.amount||0),0);
  function rejectReceipt(r) {
    const note = (notes[r.id] || "").trim();
    if (!note) { setNotes((n)=>({...n,[r.id]:"Please add a rejection note before rejecting."})); return; }
    fsUpdateReceipt(r.id,{status:"Rejected Receipt", note:`Rejected from ${selected.id}: ${note}`, rejectionNote:note});
    const newReimb = related.filter((x)=>x.id!==r.id && x.status!=="Rejected Receipt" && x.paymentMethod!=="Company Card").reduce((a,x)=>a+(x.amount||0),0);
    fsUpdateReport(selected.id, { reimbursable: newReimb });
  }
  function restoreReceipt(r) { fsUpdateReceipt(r.id,{status:"Reported", note:"Included on submitted expense report", rejectionNote:""}); }
  const reimbursementQueue = queue.filter((r)=>r.status==="Payroll Approved, Awaiting Reimbursement");
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden"><div className="border-b border-cyan-300/10 px-6 pt-5"><h2 className="text-2xl font-black text-white">Reports</h2><div className="mt-5 flex gap-6 border-b border-white/5 text-sm">{["All","Awaiting Approval","Awaiting Reimbursement","Reimbursed"].map((t)=><button key={t} onClick={()=>setTab(t)} className={cn("border-b-2 pb-3 font-medium", tab===t ? "border-cyan-300 text-white" : "border-transparent text-slate-400")}>{t}</button>)}</div></div></Card>
      {tab==="Awaiting Reimbursement" && <Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-white">Bulk Reimbursement Actions</h2><p className="text-sm text-slate-400">Select payroll-approved reports and mark reimbursed together.</p></div><div className="flex flex-wrap gap-3"><Pill status="Payroll Approved, Awaiting Reimbursement">{bulk.length} selected</Pill><button className="btn" onClick={()=>setBulk(reimbursementQueue.map(r=>r.id))}>Select All</button><button className="btn" onClick={()=>setBulk([])}>Clear</button><button className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-500/15 px-4 py-2 text-sm font-bold text-fuchsia-100" onClick={()=>{bulk.forEach(id=>fsUpdateReport(id, { status: "Reimbursed" })); setBulk([])}}>💵 Mark Selected Reimbursed</button></div></div></Card>}
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card className="overflow-hidden"><div className="border-b border-cyan-300/10 p-5"><h2 className="text-lg font-bold text-white">{mode==="payroll" ? "Payroll Review Queue" : "Approval Queue"}</h2><p className="text-sm text-slate-400">Open a report before taking action.</p></div><div className="divide-y divide-white/5">{queue.length===0 && <div className="p-5 text-sm text-slate-400">No reports are currently in this queue.</div>}{queue.map((r)=><button key={r.id} onClick={()=>setSelectedId(r.id)} className={cn("w-full p-5 text-left hover:bg-white/[0.03]", selected?.id===r.id && "bg-cyan-500/10")}><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-3">{tab==="Awaiting Reimbursement" && <input type="checkbox" checked={bulk.includes(r.id)} onClick={(e)=>e.stopPropagation()} onChange={()=>setBulk((b)=>b.includes(r.id)?b.filter(x=>x!==r.id):b.concat(r.id))}/>}<Pill status={r.status}>{r.status}</Pill></span><span className="text-xs text-slate-500">{r.id?.slice(0,8)}</span></div><h3 className="mt-3 text-lg font-bold text-white">{r.reportName}</h3><p className="text-sm text-slate-400">{r.employee} · {money(r.amount)}</p></button>)}</div></Card>
        {selected ? <Card className="overflow-hidden"><div className="border-b border-cyan-300/10 p-6"><div className="flex justify-between gap-4"><div><Pill status={selected.status}>{selected.status}</Pill><h2 className="mt-3 text-2xl font-black text-white">{selected.reportName}</h2><p className="text-sm text-slate-400">{selected.employee} · {selected.location} · {selected.dateRange}</p></div><div className="text-right"><p className="text-xs text-slate-400">Adjusted Reimbursable</p><p className="text-3xl font-black text-white">{money(adjusted)}</p><p className="text-xs text-rose-300">Rejected: {money(rejectedTotal)}</p></div></div></div><div className="p-6"><h3 className="mb-4 text-lg font-bold text-white">Receipt Review</h3><div className="space-y-4">{related.map((r)=><div key={r.id} className="rounded-2xl border border-cyan-300/15 bg-white/[0.03] p-5"><div className="flex justify-between gap-4"><div><p className="font-bold text-white">{iconFor(r.category)} {r.vendor}</p><p className="text-xs text-slate-400">{r.id?.slice(0,8)} · {r.fileName}</p><p className="mt-3 text-sm text-slate-300">{r.expenseDate} · {r.location} · {r.paymentMethod} · {money(r.amount)}</p>{r.status==="Rejected Receipt" && <p className="mt-3 rounded-xl border border-rose-300/20 bg-rose-500/10 p-3 text-sm text-rose-100">Rejected: {r.rejectionNote || r.note}</p>}</div><div className="flex flex-col items-end gap-3"><Pill status={r.status}>{r.status}</Pill><button onClick={()=>setViewReceipt(r)} className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200">View Receipt</button></div></div></div>)}</div><div className="mt-6 flex flex-wrap gap-3 border-t border-white/5 pt-6">{mode==="payroll" ? <><button onClick={()=>fsUpdateReport(selected.id, { status: "Payroll Approved, Awaiting Reimbursement" })} className="btn good">Payroll Approve</button><button onClick={()=>fsUpdateReport(selected.id, { status: "Needs More Info" })} className="btn warn">More Info</button><button onClick={()=>fsUpdateReport(selected.id, { status: "Rejected" })} className="btn bad">Reject</button><button onClick={()=>fsUpdateReport(selected.id, { status: "Reimbursed" })} className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-500/15 px-4 py-3 text-sm font-bold text-fuchsia-100">💵 Mark Reimbursed</button></> : <><button onClick={()=>fsUpdateReport(selected.id, { status: "Manager Approved, Awaiting Payroll Review" })} className="btn good">Approve Report</button><button onClick={()=>fsUpdateReport(selected.id, { status: "Needs More Info" })} className="btn warn">Request More Info</button><button onClick={()=>fsUpdateReport(selected.id, { status: "Rejected" })} className="btn bad">Reject Report</button></>}</div></div></Card> : <Card className="grid min-h-[500px] place-items-center"><p className="text-slate-400">No report selected.</p></Card>}
      </div>
      <ReceiptModal receipt={viewReceipt} onClose={()=>setViewReceipt(null)} note={viewReceipt ? notes[viewReceipt.id] || "" : ""} setNote={(v)=>viewReceipt && setNotes((n)=>({...n,[viewReceipt.id]:v}))} onReject={(r)=>{rejectReceipt(r); setViewReceipt(null)}} onRestore={(r)=>{restoreReceipt(r); setViewReceipt(null)}}/>
    </div>
  );
}

function Table({ headers, rows }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-500"><tr>{headers.map((h)=><th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i} className="border-t border-white/5 text-slate-300">{row.map((cell,j)=><td key={j} className="px-5 py-4">{cell}</td>)}</tr>)}</tbody></table></div>;
}

function AllExpenseReports({ reports }) {
  return <div className="space-y-5"><Card className="p-6"><h2 className="text-xl font-black text-white">All Expense Reports</h2><p className="text-sm text-slate-400">Admin view of every submission with status override.</p></Card><ReportTable reports={reports} admin /></div>;
}

function ReportTable({ reports, admin=false }) {
  return <Card className="overflow-hidden"><Table headers={["Report ID","Employee","Report","Date Range","Receipts","Categories","Amount","Status", admin ? "Admin Action" : "Risk"]} rows={reports.map((r)=>[r.id?.slice(0,8),r.employee,<><p className="font-semibold text-white">{r.reportName}</p><p className="text-xs text-slate-500">{r.location}</p></>,r.dateRange,r.receiptIds?.length || 0,r.categories,money(r.amount),<Pill status={r.status}>{r.status}</Pill>, admin ? <select className="field min-w-44" value={r.status} onChange={(e)=>fsUpdateReport(r.id, { status: e.target.value })}>{statuses.map((s)=><option key={s}>{s}</option>)}</select> : r.risk])}/></Card>;
}

function ReportsExport({ reports, perspective, receipts }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [fields, setFields] = useState(["Report ID","Employee","Manager","Team / Location","Report Name","Receipt Date Range","Report Total","Reimbursable Amount","Status"]);
  const filtered = reports.filter((r)=>!search || [r.employee,r.reportName,r.id||""].some((v)=>(v||"").toLowerCase().includes(search.toLowerCase())));
  const selected = reports.find((r)=>r.id===selectedId);
  function val(r,f){ return {"Report ID":r.id,Employee:r.employee,Manager:r.manager,"Team / Location":r.location,"Report Name":r.reportName,"Created Date":r.createdDate,"Receipt Date Range":r.dateRange,"Submitted Date/Time":r.submitted,Categories:r.categories,"Receipt Count":r.receiptIds?.length||0,"Report Total":r.amount,"Reimbursable Amount":r.reimbursable,Status:r.status,"Manager Decision":r.managerDecision,"Payroll Decision":r.payrollDecision,"Reimbursement Date":r.status==="Reimbursed"?"Reimbursed in payroll":"","Receipt Links":(r.receiptIds||[]).join(" | ")}[f] ?? ""; }
  const csv = "data:text/csv;charset=utf-8," + encodeURIComponent([fields.join(",")].concat(filtered.map((r)=>fields.map((f)=>val(r,f)).join(","))).join("\n"));
  if (perspective==="employee") return <Card className="p-8 text-center"><h2 className="text-2xl font-black text-white">Download My Expense Reports</h2><p className="mt-3 text-slate-400">Export a CSV containing only your own reports.</p><a href={csv} download="my-expense-reports.csv" className="mt-8 inline-flex rounded-2xl bg-gradient-to-r from-emerald-300 to-cyan-400 px-8 py-4 text-lg font-black text-slate-950">⬇ Download My Reports CSV</a></Card>;
  if (selected) {
    const recs = receipts.filter((r)=>selected.receiptIds?.includes(r.id));
    return <div className="space-y-5"><button onClick={()=>setSelectedId(null)} className="btn">← Back to Reports Search</button><Card className="p-6"><div className="flex justify-between"><div><Pill status={selected.status}>{selected.status}</Pill><h2 className="mt-3 text-2xl font-black text-white">{selected.reportName}</h2><p className="text-sm text-slate-400">{selected.employee} · {selected.location} · {selected.dateRange}</p></div><div className="text-right"><p className="text-slate-400">Report Total</p><p className="text-3xl font-black text-white">{money(selected.amount)}</p></div></div></Card><Card className="p-5"><h3 className="mb-4 text-lg font-bold text-white">Expense Report Information</h3><div className="grid gap-4 md:grid-cols-2">{["employee","manager","location","createdDate","dateRange","submitted","categories"].map((k)=><div key={k}><p className="text-xs text-slate-500">{k}</p><p className="font-semibold text-white">{String(selected[k] || "")}</p></div>)}</div></Card><Card className="p-5"><h3 className="mb-4 text-lg font-bold text-white">Receipts on this Report</h3><div className="space-y-3">{recs.map((r)=><div className="rounded-xl border border-cyan-300/15 bg-white/[0.03] p-4" key={r.id}><p className="font-bold text-white">{iconFor(r.category)} {r.vendor} · {money(r.amount)}</p><p className="text-xs text-slate-400">{r.id?.slice(0,8)} · {r.fileName} · {r.expenseDate}</p></div>)}</div></Card></div>;
  }
  return <div className="space-y-5"><Card className="p-6"><h2 className="text-xl font-black text-white">Reports / Export</h2><p className="text-slate-400">Search by employee and click any report to open it.</p><div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]"><input className="field" placeholder="Search by employee, report name, or ID" value={search} onChange={(e)=>setSearch(e.target.value)}/><a href={csv} download="custom-expense-export.csv" className="rounded-2xl bg-gradient-to-r from-emerald-300 to-cyan-400 px-5 py-3 font-bold text-slate-950">⬇ Export Selected Fields CSV</a></div><div className="mt-5 grid gap-2 md:grid-cols-3 xl:grid-cols-4">{exportFields.map((f)=><label key={f} className="flex gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-sm text-slate-200"><input type="checkbox" checked={fields.includes(f)} onChange={()=>setFields((cur)=>cur.includes(f)?cur.filter(x=>x!==f):cur.concat(f))}/>{f}</label>)}</div></Card><Card className="overflow-hidden"><Table headers={["Report ID","Employee","Report","Date Range","Receipts","Amount","Status"]} rows={filtered.map((r)=>[<button className="font-bold text-cyan-200 underline" onClick={()=>setSelectedId(r.id)}>{r.id?.slice(0,8)}</button>,r.employee,r.reportName,r.dateRange,r.receiptIds?.length||0,money(r.amount),<Pill status={r.status}>{r.status}</Pill>])}/></Card></div>;
}

function InviteUsers({ users }) {
  const [form, setForm] = useState({ name: "", email: "", role: "Employee", manager: "", team: "" });
  const [composeFor, setComposeFor] = useState(null);
  const [toast, setToast] = useState("");
  const { template } = useInviteTemplate();
  const isEmployee = form.role === "Employee";
  const managerProfile = users.find(u => u.name === form.manager);
  const autoTeam = managerProfile?.team || "";
  const teamShownForEmployee = autoTeam || (form.manager ? "(manager has no team set yet)" : "Pick a manager first");

  // Adds a doc to the `mail` collection. The Firebase "Trigger Email" extension
  // watches this collection and sends the actual SMTP email. If the extension
  // isn't installed yet, this doc just sits there harmlessly — no error.
  async function sendInviteEmail(user) {
    const html = renderInviteEmail(template, user);
    const text = `Hi ${(user.name || "").split(" ")[0] || "there"},\n\nYou've been invited to Venture Home Expense Tracker. Sign in at: ${template?.ctaUrl || ""}\n\nQuestions? Email payroll@venturehome.com.`;
    await addDoc(collection(db, "mail"), {
      to: [user.email],
      message: {
        subject: template?.subject || "You're invited to Venture Home Expense Tracker",
        html,
        text,
      },
      createdAt: serverTimestamp(),
      inviteUserId: user.id || null,
    });
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function invite() {
    if (!form.name || !form.email) return;
    const finalTeam = isEmployee ? (autoTeam || "Unassigned") : ((form.team || "").trim() || "Unassigned");
    try {
      const ref = await fsAddUser({ name: form.name, email: form.email, role: form.role, manager: form.manager, team: finalTeam });
      // Best-effort: queue the welcome email. If Trigger Email isn't set up
      // yet, the doc accumulates in `mail` until the extension is installed.
      try {
        await sendInviteEmail({ id: ref?.id, name: form.name, email: form.email });
        showToast(`Invite queued for ${form.email}`);
      } catch (e) {
        console.warn("queue invite email failed", e);
        showToast("User added — email queue failed (check Trigger Email setup)");
      }
      setForm({ name: "", email: "", role: "Employee", manager: "", team: "" });
    } catch (e) {
      alert("Invite failed: " + e.message);
    }
  }

  async function resend(user) {
    try {
      await sendInviteEmail(user);
      showToast(`Re-queued invite for ${user.email}`);
    } catch (e) {
      alert("Re-send failed: " + e.message);
    }
  }

  const managers = users.filter(u => u.role === "Manager" || u.role === "Payroll/Admin").map(u => u.name);

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <h2 className="text-xl font-black text-white">Invite Users</h2>
        <p className="text-sm text-slate-400">Add an account. When you click Send Invite, the welcome email (set in <b>Invite Template</b>) is automatically sent. Employees inherit their team from the manager you choose.</p>
      </Card>
      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Employee Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Email (must end @venturehome.com)" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <label><span className="mb-2 block text-slate-300">Role</span>
            <select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option>Employee</option><option>Manager</option><option>Payroll/Admin</option>
            </select>
          </label>
          <label><span className="mb-2 block text-slate-300">Manager / Approver</span>
            <select className="field" value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })}>
              <option value="">— None —</option>{managers.map(m => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label><span className="mb-2 block text-slate-300">Team / Location {isEmployee && <span className="text-cyan-300 text-xs">(auto from manager)</span>}</span>
            {isEmployee
              ? <input className="field opacity-60 cursor-not-allowed" disabled value={teamShownForEmployee} />
              : <input className="field" placeholder="e.g., Hartford Sales Team" value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} />}
          </label>
        </div>
        <button onClick={invite} className="mt-6 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 px-6 py-3 font-bold text-slate-950">Send Invite</button>
        {toast && <p className="mt-3 text-sm text-emerald-300">{toast}</p>}
      </Card>
      <Card className="overflow-hidden">
        <Table headers={["Name", "Email", "Role", "Manager", "Team", "Status", "Action"]} rows={users.map(u => [
          u.name, u.email, u.role, u.manager || "—", u.team || "—",
          <Pill status={u.status === "Active" ? "Reimbursed" : "Unreported"}>{u.status}</Pill>,
          <div className="flex gap-2">
            <button onClick={() => setComposeFor(u)} className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-100">Preview email</button>
            <button onClick={() => resend(u)} className="rounded-xl border border-violet-300/20 bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-100">Resend</button>
            <button onClick={() => { if (confirm(`Remove ${u.name}?`)) fsUpdateUser(u.id, { status: "Removed" }) }} className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-100">Remove</button>
          </div>
        ])} />
      </Card>
      {composeFor && <ComposeInviteModal user={composeFor} onClose={() => setComposeFor(null)} />}
    </div>
  );
}

function UsersSettings() {
  return <div className="space-y-5"><Card className="p-6"><h2 className="text-xl font-black text-white">Users & Settings</h2><p className="text-sm text-slate-400">Admin setup for branding, users, teams, rules, and exports.</p></Card><div className="grid gap-5 xl:grid-cols-[420px_1fr]"><Card className="p-6"><h3 className="text-lg font-bold text-white">Company Logo</h3><label className="mt-5 grid cursor-pointer place-items-center rounded-2xl border border-dashed border-cyan-300/30 bg-cyan-500/5 p-8 text-center hover:bg-cyan-500/10"><span className="text-5xl">🏢</span><span className="mt-3 font-semibold text-white">Upload Logo</span><input type="file" className="hidden"/></label></Card><div className="grid gap-4 md:grid-cols-2">{["Manager → Team Mapping","Expense Categories","Approval Rules","CoAdvantage Quantum Export Setup"].map(x=><Card key={x} className="p-5"><h3 className="font-bold text-white">⚙️ {x}</h3><p className="mt-2 text-sm text-slate-400">Prototype admin configuration area.</p></Card>)}</div></div></div>;
}

function AuditTrail({ reports, receipts }) {
  const events = [];
  receipts.forEach((r,i)=>events.push({time:`${r.uploadDate || ""} · ${["8:14 AM","9:36 AM","11:08 AM","2:42 PM"][i%4]}`,action:"Receipt Uploaded + Auto-scanned",item:`${r.id?.slice(0,8)} · ${r.vendor}`,user:r.employee}));
  reports.forEach((r)=>{events.push({time:r.submitted,action:"Expense Report Created",item:`${r.id?.slice(0,8)} · ${r.reportName}`,user:r.employee}); events.push({time:r.submitted,action:"Expense Report Submitted, Awaiting Manager Review",item:r.id?.slice(0,8),user:r.employee}); events.push({time:r.createdDate,action:r.status==="Rejected"?"Manager Rejected":"Manager Approved, Awaiting Payroll Review",item:r.id?.slice(0,8),user:r.manager});});
  return <Card className="overflow-hidden"><div className="p-6"><h2 className="text-xl font-black text-white">Audit Trail</h2><p className="text-sm text-slate-400">Timestamped activity history.</p></div><Table headers={["Timestamp","Action","Receipt / Report","User"]} rows={events.map(e=>[e.time,e.action,e.item,e.user])}/></Card>;
}

function DeveloperSetup() {
  const tables = ["users","teams","receipts","expense_reports","report_receipts","approvals","reimbursements","audit_logs","export_templates","notifications"];
  const checklist = ["Build responsive web app/PWA","Connect invite-link auth","Connect database/role permissions","Secure receipt/PDF storage forever","High-accuracy OCR provider","Real audit log entries","Custom CoAdvantage Quantum CSV exports","Email notifications","Duplicate + monthly limit warnings","End-to-end testing"];
  return <div className="space-y-5"><Card className="p-6"><h2 className="text-2xl font-black text-white">Developer Setup Blueprint</h2><p className="text-sm text-slate-400">Technical blueprint for turning this prototype into a real website/app.</p></Card><div className="grid gap-5 xl:grid-cols-3"><Metric title="Recommended Build" value="Next.js/React" sub="Web app + PWA first" icon="🌐"/><Metric title="Authentication" value="Google SSO" sub="Firebase Auth, @venturehome.com" icon="🔐" tone="emerald"/><Metric title="Payroll Export" value="Custom CSV" sub="CoAdvantage Quantum" icon="📤" tone="violet"/></div><Card className="p-6"><h3 className="mb-4 text-lg font-bold text-white">Database Tables Needed</h3><div className="grid gap-3 md:grid-cols-2">{tables.map(t=><div key={t} className="rounded-xl border border-cyan-300/15 bg-white/[0.03] p-3 font-semibold text-white">{t}</div>)}</div></Card><Card className="p-6"><h3 className="mb-4 text-lg font-bold text-white">Launch Checklist</h3><div className="space-y-2">{checklist.map(c=><div key={c} className="rounded-xl border border-emerald-300/15 bg-emerald-500/5 p-3 text-sm text-slate-200">✓ {c}</div>)}</div></Card></div>;
}

function Rules() {
  const rules = ["Receipts can be uploaded anytime before report creation.","Unreported and Rejected receipts can be selected for reports.","Receipt required for gas/fuel.","Digital receipt required for EV charging.","Toll breakdown required for tolls.","All expense reports require manager approval.","$400 monthly combined warning for gas + EV.","Duplicate expense warning.","30-day late submission warning."];
  return <div className="grid gap-5 xl:grid-cols-2"><Card className="p-6"><h2 className="text-xl font-black text-white">Approval Rules</h2><div className="mt-5 space-y-3">{rules.map(r=><div key={r} className="rounded-xl border border-cyan-300/15 bg-white/[0.03] p-3 text-slate-200">✓ {r}</div>)}</div></Card><Card className="p-6"><h2 className="text-xl font-black text-white">Notification Settings</h2><div className="mt-5 space-y-3">{["Employee notified when manager approves.","Employee notified when payroll approves.","Manager notified when review needed.","Payroll alerted when reports ready."].map(n=><div key={n} className="rounded-xl border border-violet-300/15 bg-violet-500/5 p-3 text-slate-200">✉ {n}</div>)}</div></Card></div>;
}

// ----- Auth gate screens -----------------------------------------------------

function LoginScreen() {
  const { signIn, error } = useAuth();
  return (
    <div className="grid min-h-screen place-items-center bg-[#020617] p-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-cyan-300/15 bg-slate-950/60 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-3">
          <svg viewBox="0 0 290 54" xmlns="http://www.w3.org/2000/svg" className="h-12 w-auto">
            <g transform="translate(2, 6)">
              <path d="M 5 24 L 22 6 L 39 24 M 9 21 L 9 42 L 35 42 L 35 21" stroke="#6EE7B7" strokeWidth="3" fill="none" strokeLinejoin="round" strokeLinecap="round" />
              <path d="M 16 20 c -2 -2.2 1.4 -5.4 3.4 -2.4 c 2 -3 5.4 0.2 3.4 2.4 l -3.4 3.6 z" fill="#6EE7B7" />
            </g>
            <text x="54" y="38" fontSize="30" fontWeight="600" fontFamily="Poppins, Outfit, system-ui, sans-serif" letterSpacing="-0.5">
              <tspan fill="white">venture</tspan><tspan fill="#6EE7B7">home.</tspan>
            </text>
          </svg>
        </div>
        <h1 className="text-2xl font-black">Sign in</h1>
        <p className="mt-2 text-sm text-slate-400">Use your <strong className="text-white">@venturehome.com</strong> Google account to continue.</p>
        <button onClick={signIn} className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 font-bold text-slate-900 shadow-lg hover:bg-slate-100">
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/><path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/><path fill="#EA4335" d="M24 9.5c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 2.84 29.93 1 24 1 15.4 1 7.96 5.93 4.34 13.12l7.35 5.7C13.42 13.37 18.27 9.5 24 9.5z"/></svg>
          Sign in with Google
        </button>
        {error && <p className="mt-4 rounded-xl border border-rose-300/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error.message || String(error)}</p>}
        <p className="mt-6 text-xs text-slate-500">Don't have an account? Ask your admin to invite you.</p>
      </div>
    </div>
  );
}

function BlockedScreen({ title, message }) {
  const { signOut } = useAuth();
  return (
    <div className="grid min-h-screen place-items-center bg-[#020617] p-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-amber-300/20 bg-slate-950/60 p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="mb-4 text-5xl">🔒</div>
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="mt-3 text-sm text-slate-300">{message}</p>
        <button onClick={signOut} className="mt-6 rounded-xl border border-cyan-300/30 bg-cyan-500/10 px-5 py-2 text-sm font-bold text-cyan-100">Sign out</button>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#020617] p-6 text-white">
      <div className="text-center">
        <div className="mb-3 text-3xl">⌛</div>
        <p className="text-slate-300">Signing you in…</p>
      </div>
    </div>
  );
}

// ----- Main authenticated app -----------------------------------------------

function MainApp() {
  const { profile } = useAuth();
  const { items: users } = useUsers();
  const { items: receipts } = useReceipts();
  const { items: reports } = useReports();

  const defaultPerspective =
    profile.role === "Payroll/Admin" ? "admin" :
    profile.role === "Manager" ? "manager" : "employee";
  const [perspective, setPerspective] = useState(defaultPerspective);
  const [active, setActive] = useState("Dashboard");
  useEffect(() => { setPerspective(defaultPerspective); }, [defaultPerspective]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <style>{`.field{width:100%;border-radius:.9rem;border:1px solid rgba(103,232,249,.16);background:rgba(255,255,255,.05);padding:.75rem .9rem;color:white;outline:none}.field option{background:#020617}.btn{display:inline-flex;align-items:center;gap:.4rem;border-radius:.9rem;padding:.7rem 1rem;font-size:.85rem;font-weight:700;border:1px solid rgba(255,255,255,.12)}.good{background:rgba(16,185,129,.14);color:#a7f3d0}.warn{background:rgba(245,158,11,.14);color:#fde68a}.bad{background:rgba(244,63,94,.14);color:#fecdd3}`}</style>
      <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute left-1/3 top-0 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl"/><div className="absolute right-10 top-36 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl"/></div>
      <div className="relative flex">
        <Sidebar active={active} setActive={setActive} perspective={perspective}/>
        <main className="min-w-0 flex-1">
          <Topbar active={active} perspective={perspective} setPerspective={setPerspective} setActive={setActive}/>
          <div className="p-4 md:p-8">
            {active==="Dashboard" && perspective==="employee" && <Dashboard reports={reports} receipts={receipts} setActive={setActive} currentName={profile.name}/>}
            {active==="Dashboard" && perspective==="manager" && <ManagerDashboard reports={reports} receipts={receipts} setActive={setActive} currentName={profile.name}/>}
            {active==="Dashboard" && perspective==="admin" && <AdminDashboard reports={reports} setActive={setActive}/>}
            {active==="Receipt Library" && <ReceiptLibrary receipts={receipts} currentName={profile.name} profile={profile}/>}
            {active==="Create Expense Report" && <CreateExpenseReport receipts={receipts} currentProfile={profile}/>}
            {active==="Approvals" && <Approvals reports={reports} receipts={receipts}/>}
            {active==="Payroll Review" && <Approvals mode="payroll" reports={reports} receipts={receipts}/>}
            {active==="All Expense Reports" && <AllExpenseReports reports={reports}/>}
            {active==="Invite Users" && <InviteUsers users={users}/>}
            {active==="Invite Template" && <InviteTemplateEditor/>}
            {active==="Users & Settings" && <UsersSettings/>}
            {active==="Developer Setup" && <DeveloperSetup/>}
            {active==="Reports / Export" && <ReportsExport reports={reports} perspective={perspective} receipts={receipts}/>}
            {active==="Audit Trail" && <AuditTrail reports={reports} receipts={receipts}/>}
            {active==="Rules & Settings" && <Rules/>}
          </div>
        </main>
      </div>
    </div>
  );
}

function AuthGate() {
  const { status } = useAuth();
  const isMobile = useIsMobile();
  if (status === "loading") return <LoadingScreen />;
  if (status === "unauthenticated") return <LoginScreen />;
  if (status === "wrong-domain")
    return <BlockedScreen title="Wrong account" message="Only @venturehome.com Google accounts can sign in. Please sign out and try with your work email." />;
  if (status === "not-invited")
    return <BlockedScreen title="Not invited yet" message="Your account hasn't been set up in the system. Ask your admin to invite you, then sign in again." />;
  return isMobile ? <MobileLayout /> : <MainApp />;
}

function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

createRoot(document.getElementById("root")).render(<App />);
