// Admin invite-email template editor + compose modal.
//
// Stores ONE template per role in Firestore:
//   settings/inviteTemplate-employee   — sent when role = Employee
//   settings/inviteTemplate-manager    — sent when role = Manager
//   settings/inviteTemplate-payrolladmin — sent when role = Payroll/Admin
//
// The admin editor has tabs at the top to switch between role-specific templates.
// On "Send Invite", the right template is chosen automatically based on the
// user's role.

import React, { useEffect, useMemo, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";

const APP_URL = "https://venture-home-expense-tracker.web.app";

export const TEMPLATE_ROLES = ["Employee", "Manager", "Payroll/Admin"];

// Per-role defaults — used when the Firestore doc doesn't exist yet,
// and as the "Reset to default" target in the editor.
const DEFAULT_TEMPLATES = {
  Employee: {
    subject: "You're invited to VentureExpense",
    hero: "Track your field expenses on your phone",
    greeting: "Hi {firstName},",
    body:
      "We're rolling out a new way for the field team to track gas, EV charging, tolls and other expenses — no more paper receipts in the truck.\n\n" +
      "Snap a photo of any receipt from your phone and we'll auto-scan the vendor, date and amount. When you're ready, build a quick expense report and submit it for reimbursement.\n\n" +
      "Sign in with your @venturehome.com Google account to get started.",
    ctaText: "Sign In to Your Account",
    ctaUrl: APP_URL,
    bullets: [
      "Snap receipts on your phone — auto-scanned by Google Vision",
      "Build expense reports in under a minute",
      "Track reimbursement status from your dashboard",
    ],
    attachments: [],
    footerNote: "Questions? Email payroll@venturehome.com — we'll help you get set up.",
    companyName: "Venture Home Solar",
  },
  Manager: {
    subject: "You're a manager on VentureExpense — how to approve your team",
    hero: "Approve your team's expenses from your phone",
    greeting: "Hi {firstName},",
    body:
      "You've been set up as a manager on VentureExpense, the new app where the field team submits gas, EV, tolls and other expenses.\n\n" +
      "As a manager, you can submit your own expenses AND approve your team's reports. Whenever someone on your team submits an expense report, it shows up in your Approvals queue with one-tap approve/reject buttons.\n\n" +
      "Sign in with your @venturehome.com Google account to get started.",
    ctaText: "Sign In to Your Manager Dashboard",
    ctaUrl: APP_URL,
    bullets: [
      "Tap the Approvals button on your home screen to review submitted reports",
      "Each report shows every receipt — tap any photo to verify before approving",
      "One tap to Approve (sends to payroll), More Info (sends back to the employee), or Reject",
      "Reports you approve move to payroll for final reimbursement — you don't have to follow up",
    ],
    attachments: [],
    footerNote: "Questions? Email payroll@venturehome.com — we'll help you get set up.",
    companyName: "Venture Home Solar",
  },
  "Payroll/Admin": {
    subject: "You're an admin on VentureExpense",
    hero: "Manage VentureExpense for the whole team",
    greeting: "Hi {firstName},",
    body:
      "You've been set up as an admin on VentureExpense. You have full access: invite users, edit welcome email templates, run payroll review, and export reports for accounting.\n\n" +
      "Sign in with your @venturehome.com Google account to get started.",
    ctaText: "Sign In to Your Admin Dashboard",
    ctaUrl: APP_URL,
    bullets: [
      "Invite Users — add employees and managers; welcome emails auto-send",
      "Invite Template — edit the welcome emails for each role",
      "Payroll Review — final-approve manager-approved reports and mark them reimbursed",
      "Reports / Export — pull CSVs for CoAdvantage / Sage Intacct",
    ],
    attachments: [],
    footerNote: "Questions? Email payroll@venturehome.com.",
    companyName: "Venture Home Solar",
  },
};

export function docIdForRole(role) {
  // e.g., "Payroll/Admin" -> "inviteTemplate-payrolladmin"
  return "inviteTemplate-" + (role || "Employee").toLowerCase().replace(/[^a-z]/g, "");
}

function defaultFor(role) {
  return DEFAULT_TEMPLATES[role] || DEFAULT_TEMPLATES.Employee;
}

// Load the template for a role on demand (used by sendInviteEmail in App.jsx
// where we can't use hooks because the role is only known at click time).
export async function loadTemplateForRole(role) {
  try {
    const snap = await getDoc(doc(db, "settings", docIdForRole(role)));
    const fallback = defaultFor(role);
    if (snap.exists()) return { ...fallback, ...snap.data() };
    return fallback;
  } catch (e) {
    console.warn("loadTemplateForRole failed, using default", e);
    return defaultFor(role);
  }
}

// ---------- email html renderer ----------

export function renderInviteEmail(template, user) {
  const t = { ...defaultFor("Employee"), ...(template || {}) };
  const firstName = (user?.name || "").split(" ")[0] || "there";
  const greeting = (t.greeting || "Hi {firstName},").replace(/\{firstName\}/g, firstName);
  const bodyHtml = (t.body || "")
    .split(/\n\n+/)
    .map((para) => `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#1f2937">${escapeHtml(para).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
  const bulletsHtml = (t.bullets || []).length
    ? `<ul style="padding-left:20px;margin:0 0 18px 0;color:#1f2937">${(t.bullets || []).map((b) => `<li style="margin:0 0 8px 0;font-size:14px;line-height:1.5">${escapeHtml(b)}</li>`).join("")}</ul>`
    : "";
  const attachmentsHtml = (t.attachments || []).length
    ? `<div style="margin-top:18px;padding:16px;border-radius:12px;background:#f1f5f9;border:1px solid #e2e8f0">
         <p style="margin:0 0 8px 0;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#475569;font-weight:600">Attached resources</p>
         ${(t.attachments || []).map((a) => `<div style="margin:6px 0"><a href="${escapeAttr(a.url)}" style="color:#0e7490;text-decoration:underline;font-size:14px">${escapeHtml(a.name)}</a></div>`).join("")}
       </div>`
    : "";

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;padding:32px 12px">
  <tr><td align="center">
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,.08)">
      <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:28px 32px;color:#ffffff">
        <table width="100%"><tr>
          <td style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#ffffff;letter-spacing:-.5px">
            <span style="color:#ffffff">venture</span><span style="color:#6EE7B7">home.</span>
          </td>
          <td align="right" style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8">VentureExpense</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:36px 32px 8px 32px">
        <h1 style="margin:0 0 8px 0;font-size:26px;line-height:1.2;color:#0f172a;font-weight:800">${escapeHtml(t.hero || "")}</h1>
        <p style="margin:0;font-size:14px;color:#64748b">${escapeHtml(greeting)}</p>
      </td></tr>
      <tr><td style="padding:18px 32px 8px 32px">
        ${bodyHtml}
        ${bulletsHtml}
      </td></tr>
      <tr><td align="center" style="padding:14px 32px 8px 32px">
        <a href="${escapeAttr(t.ctaUrl || APP_URL)}" style="display:inline-block;padding:14px 32px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;border:2px solid #6EE7B7">${escapeHtml(t.ctaText || "Sign In")}</a>
      </td></tr>
      <tr><td style="padding:8px 32px">
        ${attachmentsHtml}
      </td></tr>
      <tr><td style="padding:18px 32px 28px 32px">
        <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5">${escapeHtml(t.footerNote || "")}</p>
      </td></tr>
      <tr><td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
        <p style="margin:0;font-size:11px;color:#94a3b8;letter-spacing:.04em">${escapeHtml(t.companyName || "Venture Home Solar")} &middot; venturehome.com</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function escapeAttr(s) { return escapeHtml(s); }

// ---------- hook ----------

export function useInviteTemplate(role) {
  const safeRole = role || "Employee";
  const docId = docIdForRole(safeRole);
  const [template, setTemplate] = useState(defaultFor(safeRole));
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const snap = await getDoc(doc(db, "settings", docId));
        if (cancelled) return;
        const fallback = defaultFor(safeRole);
        if (snap.exists()) setTemplate({ ...fallback, ...snap.data() });
        else setTemplate(fallback);
      } catch (e) {
        console.error("load template failed", e);
        setTemplate(defaultFor(safeRole));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [docId, safeRole]);
  async function save(next) {
    setTemplate(next);
    await setDoc(doc(db, "settings", docId), { ...next, updatedAt: serverTimestamp() });
  }
  function resetToDefault() {
    setTemplate(defaultFor(safeRole));
  }
  return { template, setTemplate, save, loading, resetToDefault };
}

// ---------- editor page ----------

export function InviteTemplateEditor() {
  const [activeRole, setActiveRole] = useState("Employee");
  const { template, setTemplate, save, loading, resetToDefault } = useInviteTemplate(activeRole);
  const [savedAt, setSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);

  function patch(p) { setTemplate({ ...template, ...p }); }

  async function onSave() {
    setSaving(true);
    try {
      await save(template);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      alert("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  function updateAttachment(i, k, v) {
    const next = (template.attachments || []).map((a, idx) => (idx === i ? { ...a, [k]: v } : a));
    patch({ attachments: next });
  }
  function addAttachment() { patch({ attachments: [...(template.attachments || []), { name: "", url: "" }] }); }
  function removeAttachment(i) { patch({ attachments: (template.attachments || []).filter((_, idx) => idx !== i) }); }
  function updateBullet(i, v) {
    const next = (template.bullets || []).map((b, idx) => (idx === i ? v : b));
    patch({ bullets: next });
  }
  function addBullet() { patch({ bullets: [...(template.bullets || []), ""] }); }
  function removeBullet(i) { patch({ bullets: (template.bullets || []).filter((_, idx) => idx !== i) }); }

  const previewUser = { name: "Sample " + activeRole, email: "sample@venturehome.com" };
  const html = useMemo(() => renderInviteEmail(template, previewUser), [template, activeRole]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-cyan-300/15 bg-slate-950/60 p-6">
        <h2 className="text-xl font-black text-white">Invite Email Templates</h2>
        <p className="mt-1 text-sm text-slate-400">
          One template per role. When you click Send Invite on the Invite Users page,
          the email matching that person's role is sent automatically. Switch tabs below to edit each one.
        </p>
      </div>

      {/* Role tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-cyan-300/15 bg-white/[0.04] p-1.5">
        {TEMPLATE_ROLES.map((r) => (
          <button
            key={r}
            onClick={() => { setActiveRole(r); setSavedAt(null); }}
            className={"rounded-xl px-4 py-2 text-sm font-bold transition " + (activeRole === r ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:text-white")}
          >
            {r}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-slate-400">Loading {activeRole} template…</div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <div className="space-y-4 rounded-2xl border border-cyan-300/15 bg-slate-950/60 p-5">
            <h3 className="text-lg font-bold text-white">Edit {activeRole} email</h3>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">Email subject</span>
              <input className="field" value={template.subject} onChange={(e) => patch({ subject: e.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">Hero title</span>
              <input className="field" value={template.hero} onChange={(e) => patch({ hero: e.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">Greeting (use {`{firstName}`} for the user's first name)</span>
              <input className="field" value={template.greeting} onChange={(e) => patch({ greeting: e.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">Body</span>
              <textarea className="field min-h-32" rows={6} value={template.body} onChange={(e) => patch({ body: e.target.value })} />
              <span className="mt-1 block text-xs text-slate-500">Paragraphs are separated by blank lines.</span>
            </label>

            <div>
              <p className="mb-2 text-sm text-slate-300">Bullet points</p>
              {(template.bullets || []).map((b, i) => (
                <div key={i} className="mb-2 flex gap-2">
                  <input className="field" value={b} onChange={(e) => updateBullet(i, e.target.value)} />
                  <button onClick={() => removeBullet(i)} className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-3 text-xs font-bold text-rose-100">×</button>
                </div>
              ))}
              <button onClick={addBullet} className="text-xs font-bold text-cyan-300 underline">+ Add bullet</button>
            </div>

            <div>
              <p className="mb-2 text-sm text-slate-300">Attachments (links)</p>
              {(template.attachments || []).map((a, i) => (
                <div key={i} className="mb-2 grid grid-cols-[1fr_2fr_auto] gap-2">
                  <input className="field" placeholder="Label" value={a.name} onChange={(e) => updateAttachment(i, "name", e.target.value)} />
                  <input className="field" placeholder="https://..." value={a.url} onChange={(e) => updateAttachment(i, "url", e.target.value)} />
                  <button onClick={() => removeAttachment(i)} className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-3 text-xs font-bold text-rose-100">×</button>
                </div>
              ))}
              <button onClick={addAttachment} className="text-xs font-bold text-cyan-300 underline">+ Add attachment link</button>
              <p className="mt-1 text-xs text-slate-500">Tip: upload PDFs to Google Drive, set link sharing to "Anyone with the link", paste the URL.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-300">CTA button text</span>
                <input className="field" value={template.ctaText} onChange={(e) => patch({ ctaText: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-300">CTA button URL</span>
                <input className="field" value={template.ctaUrl} onChange={(e) => patch({ ctaUrl: e.target.value })} />
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">Footer note</span>
              <textarea className="field" rows={2} value={template.footerNote} onChange={(e) => patch({ footerNote: e.target.value })} />
            </label>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button onClick={onSave} disabled={saving} className="rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-black text-slate-950 disabled:opacity-60">
                {saving ? "Saving…" : "Save " + activeRole + " Template"}
              </button>
              {savedAt && <span className="text-xs text-emerald-300">Saved at {savedAt}</span>}
              <button onClick={resetToDefault} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-slate-300">
                Reset to default
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-300/15 bg-white p-2">
            <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500">Live preview · {activeRole} version</p>
            <iframe title="Email preview" srcDoc={html} className="h-[700px] w-full rounded-xl border-0" />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- compose modal ----------

export function ComposeInviteModal({ user, onClose }) {
  const { template, loading } = useInviteTemplate(user?.role || "Employee");
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => (loading ? "" : renderInviteEmail(template, user)), [template, user, loading]);

  function copyHtml() {
    navigator.clipboard.writeText(html).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  function openGmail() {
    const subject = encodeURIComponent(template.subject || "VentureExpense invite");
    const body = encodeURIComponent(
      "Hi " + ((user.name || "").split(" ")[0] || "there") + ",\n\n" +
      "(For the styled version, click 'Copy email HTML' in the admin compose screen and paste here.)\n\n" +
      "Sign in here: " + (template.ctaUrl || APP_URL) + "\n\n— Venture Home Solar"
    );
    const url = "https://mail.google.com/mail/?view=cm&to=" + encodeURIComponent(user.email) + "&su=" + subject + "&body=" + body;
    window.open(url, "_blank");
  }
  function openMailClient() {
    const subject = encodeURIComponent(template.subject || "VentureExpense invite");
    window.location.href = "mailto:" + encodeURIComponent(user.email) + "?subject=" + subject;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-6 backdrop-blur-sm">
      <div className="my-8 w-full max-w-4xl rounded-3xl border border-cyan-300/20 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-cyan-300/10 p-5">
          <div>
            <h2 className="text-xl font-black text-white">Compose welcome email</h2>
            <p className="text-xs text-slate-400">To: {user.email} · Using <b className="text-cyan-200">{user.role || "Employee"}</b> template</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-100">Close</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-3">
            <button onClick={copyHtml} className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-black text-slate-950">
              {copied ? "✓ HTML copied" : "Copy email HTML"}
            </button>
            <button onClick={openGmail} className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-bold text-slate-200">
              Open in Gmail compose
            </button>
            <button onClick={openMailClient} className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-bold text-slate-200">
              Open default mail app
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Note: this is for manually re-sending. New invites are sent automatically when you click Send Invite on the Invite Users page.
          </p>
          <div className="rounded-2xl border border-cyan-300/15 bg-white p-2">
            <iframe title="Email preview" srcDoc={html} className="h-[640px] w-full rounded-xl border-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
