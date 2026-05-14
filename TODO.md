# TODO — venture-home-expense-tracker

## Project Summary

Mobile-first expense management system for solar field teams with receipt scanning, multi-level approval workflows, and accounting integration.

Venture Home Solar field teams currently track expenses manually, creating approval bottlenecks and payroll processing delays. The solar industry's field-heavy workforce needs mobile-first expense tracking that works in the field. Success means faster reimbursements for employees and streamlined accounting for the back office.


## Release Strategy
**MVP → Iterative releases**
- MVP: Employee receipt upload/library, monthly expense report submission, manager approval workflow with line-by-line control, admin dashboard with export capabilities, violation warnings (no blocks), basic OCR receipt scanning
- Success: Field employees can submit monthly expenses in under 2 minutes, managers can approve/reject within 24 hours, admin can export to Excel for payroll processing, receipt scanning auto-populates basic fields

---

## Data Model

### Objects
Employee (name, department, manager relationship), Receipt (image, OCR data, status, upload date), Expense Report (collection of receipts, submission date, approval status), Expense Line Item (amount, category, vendor, date, reimbursable amount), Approval (approver, timestamp, notes, line-by-line decisions)

### Relationships
Employee belongs to Department and reports to Manager; Receipt belongs to Employee and can be in one Expense Report; Expense Report contains multiple Receipts and has Approval records; Manager can approve reports from direct reports; Admin can approve all reports

### Fields & API Names to Confirm
These must be confirmed before going to production. Each confirmed value should be written to `docs/memory/YYYY-MM-DD.md` as `[Tier 1]`, updated in `.auto-memory/project_venture-home-expense-tracker.md`, and updated in code as a named constant.

- [ ] Exact Sage Intacct GL account mapping for expense categories
- [ ] CoAdvantage API capabilities vs file upload requirements
- [ ] OCR service provider (Google Vision, AWS Textract, etc.)
- [ ] User authentication system (SSO, local accounts, etc.)

### Known Data Issues
EZPass statements contain mix of tolls, payments, and credits that need manual employee confirmation; duplicate detection only applies to submitted expenses, not unreported receipts; violation warnings never block submission, only flag for review

---

## Phase 0: Planning ✅
- [x] Brainstorm and discovery conversation
- [x] Scope and release strategy defined
- [x] Project docs generated
- [x] Planning memory file created

## Phase 1: Setup

### Tool Verification (run these first)
- [x] Verify Node.js: `node --version` (requires v18+)
- [x] Verify npm: `npm --version`
- [x] Verify git: `git --version`
- [ ] Verify Docker: `docker --version`
- [ ] Verify gcloud: `gcloud --version` (install from https://cloud.google.com/sdk/docs/install if missing)

### Project Initialization
- [ ] Extract scaffold zip to `~/Documents/Claude/projects/venture-home-expense-tracker`
- [x] `cd ~/Documents/Claude/projects/venture-home-expense-tracker && npm install`
- [ ] Copy `.env.example` → `.env.local` and fill in values
- [x] Verify local dev server: `npm run dev`
- [x] Initialize git: `git init && git add -A && git commit -m "initial scaffold from Ignition"`
- [x] Create GitHub repo and push: `gh repo create venture-home-expense-tracker --source . --push`
- [x] Set up `.auto-memory/` directory and `MEMORY.md` index
- [x] Update `.auto-memory/reference_venture-home-expense-tracker.md` with GitHub URL
- [x] Configure GitHub Actions build checks for pushes and pull requests

### GCP & Cloud Run
- [ ] Test Docker build: `docker build -t venture-home-expense-tracker . && docker run -p 8080:8080 venture-home-expense-tracker`
- [ ] Create GCP project: `gcloud projects create venture-home-expense-tracker --name="venture-home-expense-tracker"`
- [ ] Link billing: https://console.cloud.google.com/billing/linkedaccount?project=venture-home-expense-tracker
- [ ] Enable APIs: `gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com storage.googleapis.com --project venture-home-expense-tracker`
- [ ] Create Artifact Registry: `gcloud artifacts repositories create venture-home-expense-tracker --repository-format=docker --location=us-east1 --project venture-home-expense-tracker`
- [ ] First Cloud Run deploy: `gcloud run deploy venture-home-expense-tracker --source . --region us-east1 --project venture-home-expense-tracker --allow-unauthenticated` (use `--update-env-vars`, never `--set-env-vars`)
- [ ] Update `.auto-memory/reference_venture-home-expense-tracker.md` with Cloud Run URL + GCP project ID
- [ ] Write first session file: `docs/memory/YYYY-MM-DD.md`

### Sage Intacct Setup
- [ ] Obtain API credentials for Sage Intacct
- [ ] Add to `.env.example` as placeholder + `.env.local` with real values
- [ ] Build mock data layer that mirrors the real API response shape
- [ ] Implement real API calls after mock is working
- [ ] Write confirmed endpoints and auth details to `docs/memory/YYYY-MM-DD.md` as `[Tier 1]`

### CoAdvantage payroll system Setup
- [ ] Obtain API credentials for CoAdvantage payroll system
- [ ] Add to `.env.example` as placeholder + `.env.local` with real values
- [ ] Build mock data layer that mirrors the real API response shape
- [ ] Implement real API calls after mock is working
- [ ] Write confirmed endpoints and auth details to `docs/memory/YYYY-MM-DD.md` as `[Tier 1]`

### OCR scanning service Setup
- [ ] Obtain API credentials for OCR scanning service
- [ ] Add to `.env.example` as placeholder + `.env.local` with real values
- [ ] Build mock data layer that mirrors the real API response shape
- [ ] Implement real API calls after mock is working
- [ ] Write confirmed endpoints and auth details to `docs/memory/YYYY-MM-DD.md` as `[Tier 1]`

## Phase 2: Prototype
- [ ] Build core UI with mock data
- [ ] Implement main views and interactions
- [ ] Verify mock mode works end-to-end
- [ ] Deploy prototype to Cloud Run for review

### What the prototype already covers:
✅ Manager approval dashboard with pending expense queue
✅ Employee receipt library interface
✅ Monthly expense report submission workflow
✅ Line-by-line approval system
✅ Violation warning system (monthly limits, duplicates)
✅ Mobile-optimized photo upload interface


## Phase 3: Live Data
- [ ] Confirm all field names and API names — write each to `docs/memory/YYYY-MM-DD.md` as `[Tier 1]` and update `.auto-memory/project_venture-home-expense-tracker.md`
- [ ] Connect Sage Intacct integration
- [ ] Connect CoAdvantage payroll system integration
- [ ] Connect OCR scanning service integration
- [ ] Set production env vars on Cloud Run (`--update-env-vars`, never `--set-env-vars`)
- [ ] Run with live data end-to-end
- [ ] Verify in production

## Phase 4: MVP Features
- [ ] Employee receipt upload/library, monthly expense report submission, manager approval workflow with line-by-line control, admin dashboard with export capabilities, violation warnings (no blocks), basic OCR receipt scanning

## Phase 5: MVP Deploy
- [ ] All env vars confirmed on Cloud Run
- [ ] Tested with real users in production
- [ ] Memory finalized, TODO updated
- [ ] Ship

## Phase 6+: Post-MVP
- [ ] Advanced OCR with fake receipt detection, Sage Intacct integration, CoAdvantage payroll integration, trend analysis, company-wide rollout to other departments
---

## Known Challenges & Open Questions

EZPass statement parsing complexity (mixed transaction types), fake receipt detection algorithm, mobile photo optimization for storage/performance, offline receipt capture capability, maintaining audit trail for compliance

---

## Brainstorm Notes
Building an expense management system for Venture Home Solar's field teams to replace manual expense tracking. MVP focuses on mobile receipt upload, monthly expense reports, manager approval workflows, and admin export capabilities. Key features include OCR receipt scanning, violation warnings (no blocks), line-by-line approval control, and receipt library management. System designed for 90% mobile usage by field employees with integration plans for Sage Intacct and CoAdvantage payroll. Future phases will add advanced OCR fraud detection and company-wide rollout beyond the initial sales department implementation.

---

## Reference Data

Expense categories: Gas/Fuel, Tolls, Electric Vehicle Charging, Miscellaneous Expenses, Team Outings/Meals; Monthly limit: $400 for combined EV charging and gas fuel; Receipt requirements: Gas (receipt required), EV charging (digital receipt/confirmation), Tolls (breakdown required); Departments: CT Sales, MA/RI Sales; Status flow: Uploaded → Unreported → Submitted → Approved/Rejected → Paid/Reimbursed
