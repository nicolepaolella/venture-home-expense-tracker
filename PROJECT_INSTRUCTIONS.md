# Project: venture-home-expense-tracker

## What This Is

Mobile-first expense management system for solar field teams with receipt scanning, multi-level approval workflows, and accounting integration.

Venture Home Solar field teams currently track expenses manually, creating approval bottlenecks and payroll processing delays. The solar industry's field-heavy workforce needs mobile-first expense tracking that works in the field. Success means faster reimbursements for employees and streamlined accounting for the back office.


## Repo Setup

- **Local project directory**: `~/Documents/Claude/projects/venture-home-expense-tracker` (extracted from scaffold zip or cloned from GitHub)
- **GitHub repo**: `[your-gh-org]/venture-home-expense-tracker`
- **Cloud Run service**: `venture-home-expense-tracker`
- **GCP project ID**: `venture-home-expense-tracker`
- **Branch strategy**: `main` is production. Work on feature branches (`feature/[name]`) and merge via PR.

When asked to make changes, commit to the current working branch with clear commit messages. Push to GitHub when asked to "push" or "ship it."

## Tech Stack

- **Frontend**: React (JSX), mobile-first responsive design
- **Styling**: Inline styles, dark theme with Venture Home Solar branding
- **Data Sources**: Employee-uploaded receipts, OCR scanning results, manager approvals
- **Integrations**: Sage Intacct, CoAdvantage payroll system, OCR scanning service


## Hosting & Deployment

- **Runtime**: Google Cloud Run (containerized, port 8080)
- **Static/File Storage**: Google Cloud Storage
- **Container Registry**: Google Artifact Registry
- **Region**: us-east1

### Key deployment rules:
- Cloud Run URL format: `https://venture-home-expense-tracker-HASH-ue.a.run.app`
- Environment variables are set via Cloud Run service configuration — never baked into the container
- `.env.local` is for local dev only — never deployed, never committed
- For server-side API calls, use the Cloud Run service URL as the base, not localhost
- Always test Docker builds locally before deploying: `docker build -t venture-home-expense-tracker . && docker run -p 8080:8080 venture-home-expense-tracker`

### Deployment Commands
All commands run from the repo root (`~/Documents/Claude/projects/venture-home-expense-tracker`).

```bash
# Verify required tools first
which node && which npm && which git && which docker && which gcloud
# If any are missing, install before proceeding

# First-time GCP setup (run once)
gcloud auth login
gcloud config set project venture-home-expense-tracker
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com storage.googleapis.com

# Create Artifact Registry repo (once)
gcloud artifacts repositories create venture-home-expense-tracker --repository-format=docker --location=us-east1

# Build and deploy
gcloud builds submit --tag us-east1-docker.pkg.dev/venture-home-expense-tracker/venture-home-expense-tracker/venture-home-expense-tracker:latest .
gcloud run deploy venture-home-expense-tracker \
  --image us-east1-docker.pkg.dev/venture-home-expense-tracker/venture-home-expense-tracker/venture-home-expense-tracker:latest \
  --region us-east1 --platform managed --allow-unauthenticated

# Update environment variables
gcloud run services update venture-home-expense-tracker --region us-east1 \
  --update-env-vars="KEY=value,KEY2=value2"
```

## Project Structure

```
venture-home-expense-tracker/
├── .auto-memory/
│   ├── MEMORY.md                  # Canonical index — read first every session
│   ├── reference_venture-home-expense-tracker.md       # Infra: GCP project, Cloud Run URL, env vars
│   └── project_venture-home-expense-tracker.md         # Tech stack, components, architecture decisions
├── src/
│   ├── main.jsx
│   ├── app.jsx
│   ├── components/                 # React (JSX), mobile-first responsive design components (.jsx)
│   ├── views/
│   ├── data/
│   ├── auth/
│   └── utils/
├── docs/
│   └── memory/
│       └── planning.md            # Bootstrap planning artifact from Ignition
├── PROJECT_INSTRUCTIONS.md
├── AGENTS.md
├── TODO.md
├── STARTER_PROMPTS.md
├── USER_GUIDE.md                  # Living user-facing reference — updated as features ship
├── Dockerfile
├── .dockerignore
├── .gcloudignore
├── .env.example
├── .env.local                     # Local dev only — git-ignored
├── .gitignore
├── package.json
├── vite.config.js
├── index.html
└── README.md
```

## Current State

✅ Manager approval dashboard with pending expense queue
✅ Employee receipt library interface
✅ Monthly expense report submission workflow
✅ Line-by-line approval system
✅ Violation warning system (monthly limits, duplicates)
✅ Mobile-optimized photo upload interface

## Design

- **Theme**: Professional, mobile-optimized, field-worker friendly
- **Fonts**: JetBrains Mono for data, Outfit for UI text

- **Visual rules**: Violation warnings shown prominently but never block workflow, receipt status clearly indicated with color coding, mobile photo upload prominent on all screens

## Data Model

### Objects
Employee (name, department, manager relationship), Receipt (image, OCR data, status, upload date), Expense Report (collection of receipts, submission date, approval status), Expense Line Item (amount, category, vendor, date, reimbursable amount), Approval (approver, timestamp, notes, line-by-line decisions)

### Relationships
Employee belongs to Department and reports to Manager; Receipt belongs to Employee and can be in one Expense Report; Expense Report contains multiple Receipts and has Approval records; Manager can approve reports from direct reports; Admin can approve all reports

### Fields to Confirm Before Going Live
- [ ] Exact Sage Intacct GL account mapping for expense categories
- [ ] CoAdvantage API capabilities vs file upload requirements
- [ ] OCR service provider (Google Vision, AWS Textract, etc.)
- [ ] User authentication system (SSO, local accounts, etc.)

### Known Data Issues
EZPass statements contain mix of tolls, payments, and credits that need manual employee confirmation; duplicate detection only applies to submitted expenses, not unreported receipts; violation warnings never block submission, only flag for review

## Architecture Notes

Phase 1: React frontend with mock data and manual processes; Phase 2: Add backend for data persistence and OCR integration; Phase 3: Add accounting system integrations; Mobile-first responsive design throughout


## Multi-User Collaboration

These docs are **AI-agnostic** — they work with Claude, GPT, Gemini, Copilot, or any LLM.
- **Team**: solo


## How to Work in This Project

1. **Read in this order every session**: `.auto-memory/MEMORY.md` (follow its links) → `AGENTS.md` → `docs/memory/` (newest first) → `TODO.md` → this file → `USER_GUIDE.md` (to see the current feature surface area from the user's perspective). The project spec is distributed across these files — no single file has the complete picture. Give a brief status summary before starting work.

2. **Follow AGENTS.md.** It defines agent roles, the memory system (tiers, auto-memory, golden snapshots), and session lifecycle. Read it and follow it.

3. **Keep mock data working at all times.** Every feature must be testable with mock/demo data before live data is wired up. The mock mode should always work.

4. **Field names and API names are placeholders until confirmed.** Keep them as configurable constants. When a field name is confirmed, update the constant, write it to today's session file in `docs/memory/` as `[Tier 1]`, and update `.auto-memory/project_venture-home-expense-tracker.md`.

5. **Design rules are not suggestions.** Violation warnings shown prominently but never block workflow, receipt status clearly indicated with color coding, mobile photo upload prominent on all screens

6. **Ambiguous or multi-step work goes through the PM agent first.** When a feature is described in business terms, scope it before building: data source needed, API calls required, UI components to build, which agents are involved, and what goes in TODO.md as follow-up. See AGENTS.md → Fast Path for when to skip PM.

7. **Write to memory incrementally.** The moment a field name is confirmed, a decision is made, or a bug is fixed — write it to today's session file in `docs/memory/YYYY-MM-DD.md`. If it's a Tier 1 fact (infra, architecture, confirmed field name, deployment state), also update the relevant `.auto-memory/` file. See AGENTS.md → Memory System for the full rules.

8. **Commit often in small chunks.** After each logical unit of work (a component, a data integration, a view), commit with a descriptive message.

9. **Memory files and TODO.md are committed to GitHub.** They are project artifacts, not ephemeral notes. Every session should end with a commit and push that includes updated memory and TODO files.

10. **Keep USER_GUIDE.md current as features ship.** `USER_GUIDE.md` is the living, user-facing reference for this product. Every time a user-facing feature ships or changes, add or update an entry in the **same commit** as the feature — name, what it does (user terms), how to use it (step-by-step), and anything important to know. When the project is done, this file is publishable as-is. See AGENTS.md → "User Guide Maintenance" for the full rules and entry template.

11. **End every session the same way.** Finalize today's session file in `docs/memory/`. If any Tier 1 context changed, update the relevant `.auto-memory/` files. If any user-facing feature shipped or changed, update `USER_GUIDE.md`. Update TODO.md, commit everything, push to GitHub, confirm what was shipped. (Ultra-fast-path fixes can bundle into the next real commit — see AGENTS.md.)

12. **Cloud Run deploys**: test locally in Docker first. `docker build -t venture-home-expense-tracker . && docker run -p 8080:8080 venture-home-expense-tracker`

13. **Environment variables**: `.env.local` for local dev. Set production vars via `gcloud run services update --update-env-vars` (never `--set-env-vars` — it wipes all existing vars). Never commit secrets.

## Reference Data

Expense categories: Gas/Fuel, Tolls, Electric Vehicle Charging, Miscellaneous Expenses, Team Outings/Meals; Monthly limit: $400 for combined EV charging and gas fuel; Receipt requirements: Gas (receipt required), EV charging (digital receipt/confirmation), Tolls (breakdown required); Departments: CT Sales, MA/RI Sales; Status flow: Uploaded → Unreported → Submitted → Approved/Rejected → Paid/Reimbursed
