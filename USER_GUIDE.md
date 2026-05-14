# venture-home-expense-tracker — User Guide

> Mobile-first expense management system for solar field teams with receipt scanning, multi-level approval workflows, and accounting integration.

This is the user-facing guide for **venture-home-expense-tracker**. It documents every feature in the product — what it does, how to use it, and anything important to know about it. When the project is finished, this file is intended to be publishable as-is: paste it into a help center, a README, an onboarding doc, or share it directly with users.

---

## 🤖 For AI Tools Maintaining This File

**This file is NOT optional documentation.** Keeping it current is part of shipping a feature. Before marking any feature "done":

1. **Add a new entry** under _Features_ using the template below
2. **Update the Table of Contents** with a link to the new section
3. **Remove or update** any entry that is being replaced or deprecated
4. **Commit the USER_GUIDE update** in the same commit as the feature itself — not as a separate follow-up

### When to add or update an entry

Add a new entry when:
- A new feature ships that a user can see, click, or interact with
- A new workflow is introduced (sign up, import data, export report, etc.)
- A new setting, preference, or configuration option becomes available
- A new integration is wired up that the user can enable or configure

Update an existing entry when:
- The UI for a feature changes in a way that affects how users interact with it
- Behavior changes (new rules, new defaults, new limits)
- A known limitation is fixed — remove the caveat
- A new limitation is discovered — add a caveat

Remove an entry when:
- A feature is deprecated or removed from the product
- A feature is merged into another feature (consolidate into the surviving entry)

### Writing style for entries

- **Write for the user, not for yourself.** "Click _Export_ to download your data as CSV." Not: "The export handler is wired to the download endpoint."
- **Use present tense and active voice.** "The dashboard shows..." not "The dashboard will show..."
- **Name UI elements exactly as they appear.** If the button says "Export Data", use that label — don't call it "the export option".
- **Keep it concise.** Two to four short paragraphs per feature is usually enough. Link to more detail if needed.
- **No implementation details.** Users don't need to know which API you're calling or what component renders the view. Save that for `PROJECT_INSTRUCTIONS.md` and `docs/memory/`.
- **Screenshots are welcome** — drop them into `docs/screenshots/` and link them inline.

### Entry template (copy this for each new feature)

```markdown
### [Feature Name]

**What it does:** One or two sentences describing the purpose of the feature in user terms.

**How to use it:**
1. Step-by-step instructions a user can follow
2. Name buttons and fields exactly as they appear in the UI
3. Note any prerequisites (e.g. "you must be signed in", "your account must have admin access")

**Good to know:**
- Any limitations, edge cases, or gotchas a user should be aware of
- Keyboard shortcuts or power-user tips
- Known issues, if any, with a link to the tracking item

**Added:** YYYY-MM-DD · **Last updated:** YYYY-MM-DD
```

### When the project is "done"

Before shipping the product publicly, a final pass on this file should:
1. Remove this entire "For AI Tools" section (everything between the 🤖 header and the _Getting Started_ section below)
2. Rewrite the intro at the top to speak directly to the end user
3. Verify every feature entry is accurate and well-written
4. Add screenshots for any feature that benefits from visual reference
5. Publish

---

## Table of Contents

- [Getting Started](#getting-started)
- [Features](#features)
  - [Manager Approval Dashboard](#manager-approval-dashboard)
  - [Expense Report Review](#expense-report-review)
  - [Submit My Expenses](#submit-my-expenses)
- [FAQ](#faq)
- [Support](#support)

---

## Getting Started

The current product is a prototype that runs with mock expense data. It is ready for review in a local preview, but it is not connected to real user accounts, OCR, Sage Intacct, CoAdvantage, or production storage yet.

To start using **venture-home-expense-tracker**:

1. Open the prototype preview URL.
2. Review the **Manager Dashboard**.
3. Use the tabs to switch between **Pending Approvals**, **Recently Approved**, and **Submit My Expenses**.

---

## Features

### Manager Approval Dashboard

**What it does:** The dashboard shows pending expense reports that need manager review, including employee name, submission date, receipt count, total amount, and violation warnings.

**How to use it:**
1. Open the prototype preview.
2. Select **Pending Approvals**.
3. Click **Review Expenses** on a report to inspect its line items.

**Good to know:**
- The current dashboard uses mock data only.
- Violation warnings are visible but do not block review.

**Added:** 2026-05-14 · **Last updated:** 2026-05-14

### Expense Report Review

**What it does:** The report review screen lets a manager inspect every receipt line in an expense report before choosing whether to request more information, reject the report, or approve all items.

**How to use it:**
1. From **Pending Approvals**, click **Review Expenses**.
2. Review the employee, submission date, receipt count, and report total.
3. Check any red violation warnings on the report or individual line items.
4. Use **Request More Info**, **Reject Report**, or **Approve All**.

**Good to know:**
- Line-item action buttons are visible in the prototype, but they do not persist changes yet.
- Duplicate receipt warnings appear in red for quick review.

**Added:** 2026-05-14 · **Last updated:** 2026-05-14

### Submit My Expenses

**What it does:** The submit view gives managers a place to start their own expense report while they also manage team approvals.

**How to use it:**
1. Open the prototype preview.
2. Select **Submit My Expenses**.
3. Click **Start Expense Report**.

**Good to know:**
- The button is part of the prototype flow and does not open a full submission form yet.
- The planned workflow is mobile-first receipt upload followed by monthly report submission.

**Added:** 2026-05-14 · **Last updated:** 2026-05-14

---

## FAQ

_Add common questions as they come up from real users._

---

## Support

_Replace with real support channels when the product has them._

- Email: [support@example.com]
- Docs: [link to full documentation]
- Issues: [link to issue tracker]

---

_This guide is maintained alongside the codebase. Last revised: 2026-05-14._
