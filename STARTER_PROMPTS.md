# Starter Prompts — venture-home-expense-tracker

Use these in order. Each one picks up where the last left off. Copy the prompt block, paste it, add any `[PASTE]` values, and go.

---

## New Contributor? Start Here
```
I'm joining an existing project. Read .auto-memory/MEMORY.md first (follow its links), then AGENTS.md, TODO.md, and docs/memory/ (newest first). Give me a status summary: what's done, what's in progress, what's blocked, and what I should work on next.
```

---

## Session 1: Repo Setup & First Deploy

> **Important**: Before reporting status, verify what's actually been done.
> Check git remote -v, git log, and any .auto-memory/ fields marked "TBD".
> If the user already followed the QUICKSTART.pdf, some or all of these steps
> may already be complete. Update .auto-memory/ with real values and skip ahead.

### 1a — Initialize the repo
```
I have the project scaffold for venture-home-expense-tracker. Check what's already been set up (git log, git remote -v, node_modules, .env.local) and pick up from where things left off. The full setup list is:
1. npm install
2. Copy .env.example to .env.local (bash setup.sh)
3. Start the dev server with npm run dev
4. Verify it runs in the browser
5. Initialize git and make the first commit
6. Create a GitHub repo and push
Skip any steps that are already done — update .auto-memory/ with the real values.
```

### 1b — GCP setup and first Cloud Run deploy
```
Let's get this deployed to Cloud Run. First check if any of this is already done (check .auto-memory/reference_venture-home-expense-tracker.md for existing values). The full list is:
1. Create a GCP project: gcloud projects create venture-home-expense-tracker
2. Link a billing account — give me the console URL
3. Enable the required APIs (Cloud Run, Artifact Registry, Cloud Build)
4. Grant deploy permissions (roles/cloudbuild.builds.editor)
5. Deploy to Cloud Run: gcloud run deploy venture-home-expense-tracker --source . --region us-east1 --project venture-home-expense-tracker --allow-unauthenticated
6. Verify it's live at the Cloud Run URL
7. Write the Cloud Run URL and GCP project ID to .auto-memory/reference_venture-home-expense-tracker.md
Skip any steps that are already done. Update .auto-memory/ with real values.
```

---

## Session 2: Build the Core Prototype

### 2a — Build main views with mock data
```
Build the core prototype with mock data. Start with the main view and get it rendering with realistic mock data. Mock mode must continue to work after we wire up real data — don't let me lose the ability to demo without a live connection.

The key objects we're working with:
Employee (name, department, manager relationship), Receipt (image, OCR data, status, upload date), Expense Report (collection of receipts, submission date, approval status), Expense Line Item (amount, category, vendor, date, reimbursable amount), Approval (approver, timestamp, notes, line-by-line decisions)
```

### 2b — Wire up remaining views and deploy
```
The main view is working. Now:
1. Build out the remaining views from our planning discussion
2. Make sure all views work with mock data
3. Deploy the prototype to Cloud Run
4. Write a memory file capturing decisions made and what was built
What's still on the list from Phase 2 in TODO.md?
```

---

## Session 3: Sage Intacct Integration

### 3a — Mock layer
```
Build a Sage Intacct integration module. Start with a mock data layer that mirrors the exact shape of the real Sage Intacct API response. Wire it into the relevant views. Mock must work before we touch real credentials.
```

### 3b — Live integration
```
I've added my Sage Intacct credentials to .env.local. Now:
1. Replace the mock with real Sage Intacct API calls using the env vars
2. Handle auth and error cases (token expiry, rate limits, unexpected responses)
3. Confirm all field names and write them to memory as [Tier 1]
4. Test with live data end-to-end
5. Commit and write a memory file
```

---

## Session 4: CoAdvantage payroll system Integration

### 4a — Mock layer
```
Build a CoAdvantage payroll system integration module. Start with a mock data layer that mirrors the exact shape of the real CoAdvantage payroll system API response. Wire it into the relevant views. Mock must work before we touch real credentials.
```

### 4b — Live integration
```
I've added my CoAdvantage payroll system credentials to .env.local. Now:
1. Replace the mock with real CoAdvantage payroll system API calls using the env vars
2. Handle auth and error cases (token expiry, rate limits, unexpected responses)
3. Confirm all field names and write them to memory as [Tier 1]
4. Test with live data end-to-end
5. Commit and write a memory file
```

---

## Session 5: OCR scanning service Integration

### 5a — Mock layer
```
Build a OCR scanning service integration module. Start with a mock data layer that mirrors the exact shape of the real OCR scanning service API response. Wire it into the relevant views. Mock must work before we touch real credentials.
```

### 5b — Live integration
```
I've added my OCR scanning service credentials to .env.local. Now:
1. Replace the mock with real OCR scanning service API calls using the env vars
2. Handle auth and error cases (token expiry, rate limits, unexpected responses)
3. Confirm all field names and write them to memory as [Tier 1]
4. Test with live data end-to-end
5. Commit and write a memory file
```

---

## Session 6: MVP Features

### 6a — Scope the next feature
```
Read .auto-memory/MEMORY.md, TODO.md, and docs/memory/ (newest first). What's the highest-priority feature from Phase 4? Scope it as the pm agent — what data do we need, what API calls, what UI components, what agents are involved, and how long will it take?
```

### 6b — Build it
```
Let's build [FEATURE NAME]. Mock data first — I want to see it working in the browser before we wire up any real data. Commit at each logical checkpoint.
```

---

## Anytime Prompts

### Status check
```
Read .auto-memory/MEMORY.md (follow its links), then docs/memory/ (newest first) and TODO.md. What's done, in progress, and blocked? What would you recommend working on next?
```

### End session
```
Finalize today's memory file in docs/memory/. If any Tier 1 context changed this session (infra, architecture, field names), update the relevant .auto-memory/ files too. Update TODO.md with completed and new items, commit everything, and push to GitHub. What shipped this session?
```

### Scope an idea
```
Read .auto-memory/MEMORY.md and TODO.md first. I have an idea: [DESCRIBE]. Scope it as the pm agent — data needed, APIs, UI components, which agents are involved, effort estimate, and where it fits in the priority stack.
```

### Deploy
```
Deploy the current state to Cloud Run (service: venture-home-expense-tracker, project: venture-home-expense-tracker). First verify I have gcloud and docker installed (check with which). Walk me through each step from ~/Documents/Claude/projects/venture-home-expense-tracker. Make sure env vars are set (use --update-env-vars, never --set-env-vars) and the service is healthy after deploy. Update .auto-memory/ with the live URL if this is a first deploy.
```

### Debug a problem
```
I'm seeing this issue: [DESCRIBE]. Read .auto-memory/MEMORY.md and relevant memory files, then diagnose the root cause, fix it, write what you found and fixed to today's memory file, and commit.
```

### Chat → Code cutover
```
I've been prototyping in chat and have a working artifact. Decompose the prototype into the proper project structure, set up local dev, and get it running. Don't rewrite from scratch — extract and refactor. Verify it runs with mock data before touching any real data connections.
```
