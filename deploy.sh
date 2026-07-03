#!/usr/bin/env bash
# Deploy iVi Forum to Cloud Run.
# Auth is ADC via the gcloud impersonation already configured in this shell.
# Secrets (AUTH_SECRET, APIFY_API_TOKEN) come from Secret Manager — nothing sensitive here.
set -euo pipefail

PROJECT="${GCP_PROJECT:-project-55741ec9-449d-403c-9e5}"
REGION="${REGION:-asia-south1}"
SERVICE="ivi-forum"
RUNTIME_SA="ivi-forum-run@${PROJECT}.iam.gserviceaccount.com"
# Cloud Run URLs are deterministic per project; verified against sibling services.
APP_URL="${APP_URL:-https://ivi-forum-mzbkxhm73q-el.a.run.app}"

# Membership gate: only ISB emails may join, plus an allowlist for existing
# members who signed up with a personal address.
ALLOWED_EMAIL_DOMAINS="${ALLOWED_EMAIL_DOMAINS:-isb.edu}"
ALLOWED_EMAILS="${ALLOWED_EMAILS:-ayush.vasana@gmail.com}"

SECRETS="AUTH_SECRET=ivi-forum-auth-secret:latest,APIFY_API_TOKEN=ivi-forum-apify-token:latest"
ENV_VARS="GCP_PROJECT=${PROJECT},AUTH_URL=${APP_URL},AUTH_TRUST_HOST=true"
ENV_VARS="${ENV_VARS},APIFY_LINKEDIN_PROFILE_ACTOR=apimaestro~linkedin-profile-batch-scraper-no-cookies-required"
ENV_VARS="${ENV_VARS},ALLOWED_EMAIL_DOMAINS=${ALLOWED_EMAIL_DOMAINS},ALLOWED_EMAILS=${ALLOWED_EMAILS}"

# Email OTP sign-in activates automatically once the Gmail sender is configured.
# GMAIL_USER is the sending address; GMAIL_APP_PASSWORD is a Secret Manager secret.
GMAIL_USER="${GMAIL_USER:-}"
if [ -n "$GMAIL_USER" ] && gcloud secrets describe ivi-forum-gmail-app-password --project="$PROJECT" >/dev/null 2>&1; then
  SECRETS="${SECRETS},GMAIL_APP_PASSWORD=ivi-forum-gmail-app-password:latest"
  ENV_VARS="${ENV_VARS},GMAIL_USER=${GMAIL_USER}"
  echo "Email OTP: ENABLED (Gmail sender ${GMAIL_USER})"
else
  echo "Email OTP: dormant (set GMAIL_USER + create ivi-forum-gmail-app-password to enable)"
fi

gcloud run deploy "$SERVICE" \
  --source . \
  --project="$PROJECT" \
  --region="$REGION" \
  --service-account="$RUNTIME_SA" \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --timeout=300 \
  --concurrency=80 \
  --min-instances=1 \
  --max-instances=3 \
  --cpu-boost \
  --set-secrets="$SECRETS" \
  --set-env-vars="$ENV_VARS"

echo "Done. URL:"
gcloud run services describe "$SERVICE" --project="$PROJECT" --region="$REGION" --format='value(status.url)'
