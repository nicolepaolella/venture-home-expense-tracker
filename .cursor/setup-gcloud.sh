#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-venture-home-expense-tracker}"

if [[ -n "${GCP_SERVICE_ACCOUNT_KEY_JSON:-}" ]]; then
  KEY_FILE="$(mktemp)"
  trap 'rm -f "$KEY_FILE"' EXIT

  printf '%s' "$GCP_SERVICE_ACCOUNT_KEY_JSON" > "$KEY_FILE"
  chmod 600 "$KEY_FILE"

  gcloud auth activate-service-account --key-file="$KEY_FILE" >/dev/null
  gcloud config set project "$PROJECT_ID" >/dev/null

  echo "Authenticated gcloud for project $PROJECT_ID using GCP_SERVICE_ACCOUNT_KEY_JSON."
  exit 0
fi

if [[ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" && -f "${GOOGLE_APPLICATION_CREDENTIALS}" ]]; then
  gcloud auth activate-service-account --key-file="$GOOGLE_APPLICATION_CREDENTIALS" >/dev/null
  gcloud config set project "$PROJECT_ID" >/dev/null

  echo "Authenticated gcloud for project $PROJECT_ID using GOOGLE_APPLICATION_CREDENTIALS."
  exit 0
fi

echo "No Google Cloud service account credentials were provided."
echo "Set the Cursor cloud-environment secret GCP_SERVICE_ACCOUNT_KEY_JSON"
echo "or mount GOOGLE_APPLICATION_CREDENTIALS before running deploy commands."
