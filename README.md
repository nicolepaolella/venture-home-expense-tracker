# venture-home-expense-tracker

Mobile-first expense management system for solar field teams with receipt scanning, multi-level approval workflows, and accounting integration.

## Getting Started

**First time?** Open **QUICKSTART.pdf** — it walks you through everything step by step.

```bash
npm install
bash setup.sh   # creates .env.local, prints next steps
npm run dev
```

## Deploy to Cloud Run

See PROJECT_INSTRUCTIONS.md for full deployment commands.

## User-Facing Documentation

`USER_GUIDE.md` is the living, user-facing reference for this product. As features ship, a new entry is added describing what the feature does, how users interact with it, and anything important to know. When the project is ready to launch, `USER_GUIDE.md` is intended to be publishable as-is.

## For AI Assistants

Read these files in order:
1. `.auto-memory/MEMORY.md` — canonical project index (follow its links)
2. `AGENTS.md` — role definitions, memory system, session lifecycle
3. `docs/memory/` — session history (newest first)
4. `TODO.md` — current project state and roadmap
5. `PROJECT_INSTRUCTIONS.md` — project context and rules
6. `STARTER_PROMPTS.md` — sequenced prompts for first sessions

**Shipping a user-facing feature?** Update `USER_GUIDE.md` in the same commit. See AGENTS.md → "User Guide Maintenance" for the rules.
