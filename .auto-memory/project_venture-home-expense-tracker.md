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

- **Prototype baseline**: The current prototype runs as a client-only React/Vite app with mock data in `src/app.jsx`. This keeps the expense workflow viewable in Cursor before live backend, OCR, Sage Intacct, or CoAdvantage integrations are connected.

## Component Map

- `src/app.jsx` — monolithic mobile-first manager dashboard prototype with pending approvals, recently approved reports, submit-my-expenses view, mock expense report data, and line-item violation warnings.
- `src/main.jsx` — React entry point that mounts `App`.

## Current State

Phase 1 local setup is verified in Cursor Cloud. Phase 2 prototype is viewable with mock data through Vite on port 3000; Cloud Run deployment is still pending.
