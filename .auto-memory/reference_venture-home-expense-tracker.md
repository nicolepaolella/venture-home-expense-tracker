---
name: venture-home-expense-tracker infrastructure
description: GCP project, Cloud Run URL, env vars, deploy commands
type: reference
---

## Infrastructure

- **GCP project**: `venture-home-expense-tracker` — confirmed during scaffold config
- **Cloud Run service**: `venture-home-expense-tracker` — confirmed during scaffold config
- **Cloud Run URL**: TBD — deployment blocked until Google Cloud credentials are configured for the agent environment
- **Region**: us-east1
- **GCS bucket**: TBD
- **GitHub repo**: `https://github.com/nicolepaolella/venture-home-expense-tracker` — confirmed from `git remote -v`
- **Workspace path**: `/workspace` — confirmed in Cursor cloud agent
- **CI checks**: GitHub Actions workflow at `.github/workflows/ci.yml` runs `npm ci` and `npm run check` on pull requests and pushes to `main` and `cursor/**` branches
- **Deployment tooling status**: Google Cloud CLI installed in the cloud agent, but `gcloud auth list` is empty so Cloud Run deploys are currently blocked on credentials

## Environment Variables

See `.env.example` for the full list.

## Deploy Command

```bash
gcloud run deploy venture-home-expense-tracker --source . --region us-east1 --project venture-home-expense-tracker
```

**Important**: Always use `--update-env-vars`, never `--set-env-vars` (the latter wipes all existing vars).
