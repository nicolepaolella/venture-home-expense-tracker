---
name: venture-home-expense-tracker infrastructure
description: GCP project, Cloud Run URL, env vars, deploy commands
type: reference
---

## Infrastructure

- **GCP project**: `venture-home-expense-tracker` — confirmed during scaffold config
- **Cloud Run service**: `venture-home-expense-tracker` — confirmed during scaffold config
- **Cloud Run URL**: TBD — set after first deploy
- **Region**: us-east1
- **GCS bucket**: TBD
- **GitHub repo**: TBD — set during Phase 1
- **Local path**: `~/Documents/Claude/projects/venture-home-expense-tracker`

## Environment Variables

See `.env.example` for the full list.

## Deploy Command

```bash
gcloud run deploy venture-home-expense-tracker --source . --region us-east1 --project venture-home-expense-tracker
```

**Important**: Always use `--update-env-vars`, never `--set-env-vars` (the latter wipes all existing vars).
