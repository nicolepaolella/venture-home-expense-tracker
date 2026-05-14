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
- **Cloud agent environment config**: `.cursor/environment.json` builds from `.cursor/Dockerfile` and runs `bash .cursor/setup-gcloud.sh && npm install`
- **Cloud agent deploy secret**: `GCP_SERVICE_ACCOUNT_KEY_JSON` — environment-scoped Cursor secret containing the deploy service account key JSON
- **Optional cloud env override**: `GCP_PROJECT_ID` — defaults to `venture-home-expense-tracker`
- **Deployment tooling status**: Repo-level cloud environment now provisions Node 22 and `google-cloud-cli`; authenticated Cloud Run deploys still depend on `GCP_SERVICE_ACCOUNT_KEY_JSON` or `GOOGLE_APPLICATION_CREDENTIALS`

## Environment Variables

See `.env.example` for the full list.

## Deploy Command

```bash
gcloud run deploy venture-home-expense-tracker --source . --region us-east1 --project venture-home-expense-tracker
```

**Important**: Always use `--update-env-vars`, never `--set-env-vars` (the latter wipes all existing vars).
