---
name: venture-home-expense-tracker project context
description: Tech stack, component map, architecture decisions, current state
type: project
---

## Tech Stack

- **Frontend**: React (JSX), mobile-first responsive design
- **Styling**: Inline styles, dark theme with Venture Home Solar branding
- **Hosting**: Google Cloud Run
- **Storage**: Google Cloud Storage
- **Integrations**: Sage Intacct, CoAdvantage payroll system, OCR scanning service

## Architecture Decisions

- **CI baseline**: GitHub Actions runs `npm ci` and `npm run check` on pull requests and pushes to `main` and `cursor/**` branches. Reasoning: the current prototype has no automated test suite yet, so production build verification is the fastest useful regression check without introducing brittle placeholder tests.
- **Cloud agent environment**: Repo-level Cursor environment is defined in `.cursor/environment.json` and `.cursor/Dockerfile`, with `bash .cursor/setup-gcloud.sh && npm install` as the install step. Reasoning: deployment tooling belongs in the reusable cloud environment so future agents do not reinstall `google-cloud-cli` or re-discover auth setup on every run.

## Component Map

- `src/app.jsx` — single-file React prototype for the manager dashboard and report detail flow
- `server.js` — production static server for the built Vite app with a `/healthz` endpoint
- `.github/workflows/ci.yml` — CI workflow that verifies dependency installation and production build health
- `.cursor/Dockerfile` — Cursor cloud-agent environment image with Node 22 and `google-cloud-cli`
- `.cursor/environment.json` — repo-level Cursor environment definition
- `.cursor/setup-gcloud.sh` — cloud-agent bootstrap script that activates a deploy service account when credentials are provided

## Current State

Phase 0 complete. Prototype UI exists and builds successfully.
GitHub repo is connected and CI build checks are configured.
Production runtime now exists and starts successfully via `node server.js`.
Cloud Run deployment is blocked by missing Google Cloud credentials in the cloud agent environment, not by missing repo code.
