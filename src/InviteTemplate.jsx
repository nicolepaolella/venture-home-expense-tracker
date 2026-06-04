// Admin invite-email template editor + compose modal.
//
// Stores a single editable template document at settings/inviteTemplate in
// Firestore. Admin can edit subject, hero title, body, CTA, attachments and
// footer; live preview renders alongside. From the Invite Users page, the
// "Compose welcome email" button opens the rendered email with one-click
// actions to copy the HTML or open Gmail compose.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";

const APP_URL = "https://venture-home-expense-tracker-70699851630.us-east1.run.app";

const DEFAULT_TEMPLATE = {
  subject: "You're invited to Venture Home Expense Tracker",
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
  attachments: [], // [{ name, url }]
  footerNote: "Questions? Email payroll@venturehome.com — we'll help you get set up.",
  companyName: "Venture Home Solar",
};

// ---------- email html renderer ----------

export function renderInviteEmail(template, user) {
  const t = { ...DEFAULT_TEMPLATE, ...(template || {}) };
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
      <!-- header bar -->
      <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:28px 32px;color:#ffffff">
        <table width="100%"><tr>
          <td style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#ffffff;letter-spacing:-.5px">
            <span style="color:#ffffff">venture</span><span style="color:#6EE7B7">home.</span>
          </td>
          <td align="right" style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8">Expense Tracker</td>
        </tr></table>
      </td></tr>
      <!-- hero -->
      <tr><td style="padding:36px 32px 8px 32px">
        <h1 style="margin:0 0 8px 0;font-size:26px;line-height:1.2;color:#0f172a;font-weight:800">${escapeHtml(t.hero || "")}</h1>
        <p style="margin:0;font-size:14px;color:#64748b">${escapeHtml(greeting)}</p>
      </td></tr>
      <!-- body -->
      <tr><td style="padding:18px 32px 8px 32px">
        ${bodyHtml}
        ${bulletsHtml}
      </td></tr>
      <!-- CTA -->
      <tr><td align="center" style="padding:14px 32px 8px 32px">
        <a href="${escapeAttr(t.ctaUrl || APP_URL)}" style="display:inline-block;padding:14px 32px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;border:2px solid #6EE7B7">${escapeHtml(t.ctaText || "Sign In")}</a>
      </td></tr>
      <!-- attachments -->
      <tr><td style="padding:8px 32px">
        ${attachmentsHtml}
      </td></tr>
      <!-- footer note -->
      <tr><td style="padding:18px 32px 28px 32px">
        <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5">${escapeHtml(t.footerNote || "")}</p>
      </td></tr>
      <!-- bottom strip -->
      <tr><td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
        <p style="margin:0;font-size:11px;color:#94a3b8;letter-spacing:.04em">${escapeHtml(t.companyName || "Venture Home Solar")} &middot; venturehome.com</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function escapeAttr(s) { return escapeHtml(s); }

// ---------- hooks ----------

export function useInviteTemplate() {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "inviteTemplate"));
        if (cancelled) return;
        if (snap.exists()) setTemplate({ ...DEFAULT_TEMPLATE, ...snap.data() });
      } catch (e) {
        console.error("load template failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  async function save(next) {
    setTemplate(next);
    await setDoc(doc(db, "settings", "inviteTemplate"), { ...next, updatedAt: serverTimestamp() });
  }
  return { template, setTemplate, save, loading };
}

// ---------- editor page ----------

export function InviteTemplateEditor() {
  const { template, setTemplate, save, loading } = useInviteTemplate();
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
  function addAttachment() {
    patch({ attachments: [...(template.attachments || []), { name: "", url: "" }] });
  }
  function removeAttachment(i) {
    patch({ attachments: (template.attachments || []).filter((_, idx) => idx !== i) });
  }
  function updateBullet(i, v) {
    const next = (template.bullets || []).map((b, idx) => (idx === i ? v : b));
    patch({ bullets: next });
  }
  function addBullet() { patch({ bullets: [...(template.bullets || []), ""] }); }
  function removeBullet(i) { patch({ bullets: (template.bullets || []).filter((_, idx) => idx !== i) }); }

  const previewUser = { name: "Sample Employee", email: "sample@venturehome.com" };
  const html = useMemo(() => renderInviteEmail(template, previewUser), [template]);

  if (loading) return <div className="text-slate-400">Loading template…</div>;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-cyan-300/15 bg-slate-950/60 p-6">
        <h2 className="text-xl font-black text-white">Invite Email Template</h2>
        <p className="mt-1 text-sm text-slate-400">
          Edit how the welcome email looks. Save your changes here, then use the
          "Compose welcome email" button on the Invite Users page to actually
          send (copy the HTML or open Gmail). Updates apply immediately to new
          invites.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-4 rounded-2xl border border-cyan-300/15 bg-slate-950/60 p-5">
          <h3 className="text-lg font-bold text-white">Edit content</h3>
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
            <p className="mb-2 text-sm text-slate-300">Bullet points (optional)</p>
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
                <input className="field" placeholder="Label (e.g., Expense Policy)" value={a.name} onChange={(e) => updateAttachment(i, "name", e.target.value)} />
                <input className="field" placeholder="https://..." value={a.url} onChange={(e) => updateAttachment(i, "url", e.target.value)} />
                <button onClick={() => removeAttachment(i)} className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-3 text-xs font-bold text-rose-100">×</button>
              </div>
            ))}
            <button onClick={addAttachment} className="text-xs font-bold text-cyan-300 underline">+ Add attachment link</button>
            <p className="mt-1 text-xs text-slate-500">Tip: upload PDFs to Google Drive, set link sharing to "Anyone with the link", and paste the URL.</p>
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

          <div className="flex items-center gap-3 pt-2">
            <button onClick={onSave} disabled={saving} className="rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-black text-slate-950 disabled:opacity-60">
              {saving ? "Saving…" : "Save Template"}
            </button>
            {savedAt && <span className="text-xs text-emerald-300">Saved at {savedAt}</span>}
            <button
              onClick={() => setTemplate(DEFAULT_TEMPLATE)}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-slate-300"
            >
              Reset to default
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-300/15 bg-white p-2">
          <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500">Live preview · sent to “Sample Employee”</p>
          <iframe title="Email preview" srcDoc={html} className="h-[700px] w-full rounded-xl border-0" />
        </div>
      </div>
    </div>
  );
}

// ---------- compose modal (used from Invite Users page) ----------

export function ComposeInviteModal({ user, onClose }) {
  const { template, loading } = useInviteTemplate();
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => (loading ? "" : renderInviteEmail(template, user)), [template, user, loading]);

  function copyHtml() {
    navigator.clipboard.writeText(html).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function openGmail() {
    const subject = encodeURIComponent(template.subject || "Venture Home Expense Tracker invite");
    const body = encodeURIComponent(
      `Hi ${user.name?.split(" ")[0] || "there"},\n\n` +
      `(For the styled version, paste the HTML from the admin Compose Invite screen. Quick text fallback below.)\n\n` +
      `Sign in here: ${template.ctaUrl || APP_URL}\n\n` +
      `Questions? Reply to this email.\n\n— Venture Home Solar`
    );
    const url = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(user.email)}&su=${subject}&body=${body}`;
    window.open(url, "_blank");
  }

  function openMailClient() {
    const subject = encodeURIComponent(template.subject || "Venture Home Expense Tracker invite");
    window.location.href = `mailto:${encodeURIComponent(user.email)}?subject=${subject}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-6 backdrop-blur-sm">
      <div className="my-8 w-full max-w-4xl rounded-3xl border border-cyan-300/20 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-cyan-300/10 p-5">
          <div>
            <h2 className="text-xl font-black text-white">Compose welcome email</h2>
            <p className="text-xs text-slate-400">To: {user.email}</p>
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
            To send the styled version: click <b>Copy email HTML</b>, then in your mail composer switch to the
            "Insert HTML" or "HTML source" view (Gmail: 3-dot menu → "Insert from clipboard"). Paste, send.
          </p>
          <div className="rounded-2xl border border-cyan-300/15 bg-white p-2">
            <iframe title="Email preview" srcDoc={html} className="h-[640px] w-full rounded-xl border-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
