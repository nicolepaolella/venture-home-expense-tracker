# venture-home-expense-tracker — AI Assistant Instructions

This file is read automatically by your AI tool (Claude Code, Cursor, Windsurf, Copilot, etc.).
Full detail is in AGENTS.md and PROJECT_INSTRUCTIONS.md.

## Start of every session — do this first, without being asked:
1. Read `.auto-memory/MEMORY.md` — canonical project index. Follow its links.
2. Read `AGENTS.md` — role definitions, memory system, session lifecycle
3. Read `docs/memory/` — newest first, prioritize Tier 1 entries
4. Read `TODO.md`, `PROJECT_INSTRUCTIONS.md`, and `STARTER_PROMPTS.md`
5. **Verify actual state** — don't trust "TBD" fields at face value. Check:
   - `git remote -v` and `git log --oneline -3` for repo status
   - `package.json` for installed dependencies
   - If any .auto-memory/ fields say "TBD", try to verify the real state and update them

## Autonomous execution — this is critical:
This project was planned in detail through Ignition. The planning is done. Your job is **execution**.

1. Give a brief status summary (2-3 lines max)
2. **Determine what to work on next** — in priority order:
   a. If the user gave a specific request → do that
   b. If there are uncompleted sessions in `STARTER_PROMPTS.md` → start the next one
   c. If all starter sessions are done → pick the next unchecked item from `TODO.md`
3. **Start working immediately.** Don't ask "where should I start?" or "what would you like to focus on?" — the plan already answers that. Just say what you're doing and do it.
4. When you finish a task, move to the next one. Keep going until the session ends or you need a decision only the user can make.
5. Only pause for user input when you hit a genuine decision point (e.g. choosing between two architectural approaches, needing an API key, unclear business requirement).

## During every session — update docs automatically:
When any of these happen, write to `docs/memory/YYYY-MM-DD.md` immediately:
- A field name, API name, or schema detail is confirmed → tag as `[Tier 1]`
- An architectural decision is made (include the reasoning)
- A bug is found and fixed (include: what it was, root cause, fix)
- An integration endpoint, auth method, or credential name is confirmed
- A business rule or threshold is agreed on (include the exact agreed value)
- Any infrastructure detail changes (URL, bucket name, branch, env var)

If it's a **Tier 1 fact** (infra, architecture, confirmed field name, deployment state), also update the relevant `.auto-memory/` file.

Do NOT ask the user to update the docs. Do it yourself the moment it's known.

## When a user-facing feature ships — update USER_GUIDE.md:
`USER_GUIDE.md` is the living, user-facing reference for this product. Any time you ship a feature a real person can see, click, or configure, add an entry **in the same commit as the feature**. Each entry must include: feature name, what it does (user terms), how to use it (step-by-step), and anything important to know (limitations, tips, edge cases). Remove or revise entries when features change or get deprecated. See AGENTS.md → "User Guide Maintenance" for the full rules and entry template.

## End of every session — do this before closing:
1. Finalize today's session file in `docs/memory/`
2. If any Tier 1 context changed, update relevant `.auto-memory/` files
3. If any user-facing feature shipped or changed, update `USER_GUIDE.md`
4. Update `TODO.md` — check off completed items, add new ones
5. `git add -A && git commit -m "[what shipped]"`
6. Push to the current branch: `git push`
7. Tell the user what shipped

(Ultra-fast-path fixes can bundle into the next real commit — see AGENTS.md.)

## Project context:
- **Description**: Mobile-first expense management system for solar field teams with receipt scanning, multi-level approval workflows, and accounting integration.
- **Stack**: React (JSX), mobile-first responsive design + Cloud Run
- **Integrations**: Sage Intacct, CoAdvantage payroll system, OCR scanning service
- **Canonical memory**: `.auto-memory/MEMORY.md` — read first, trust first
- **Session memory**: `docs/memory/YYYY-MM-DD.md` — one per session day
- **Full instructions**: See AGENTS.md and PROJECT_INSTRUCTIONS.md

## Never:
- Ask the user to "update the memory file" — do it yourself
- Skip the session-start read — always read `.auto-memory/MEMORY.md` first
- Commit secrets or `.env.local` — it's in .gitignore for a reason
- Use `--set-env-vars` on Cloud Run — always use `--update-env-vars`
- Run `gcloud` or `docker` commands without first verifying the tool is installed

## Quick commands (run from repo root: `~/Documents/Claude/projects/venture-home-expense-tracker`):
```bash
npm run dev                                       # local dev server
docker build -t venture-home-expense-tracker .                        # test Docker build locally
gcloud run deploy venture-home-expense-tracker --source . --region us-east1 --project venture-home-expense-tracker
```
