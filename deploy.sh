#!/usr/bin/env bash
# Deploy iVi Forum to Cloud Run.
# Auth is ADC via the gcloud impersonation already configured in this shell.
# Secrets (AUTH_SECRET, APIFY_API_TOKEN, RESEND_API_KEY) come from Secret Manager — nothing sensitive here.
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

# Private GCS bucket for forum image uploads (public access prevention enforced;
# runtime SA has objectAdmin). Images are served back through /api/uploads.
UPLOADS_BUCKET="${UPLOADS_BUCKET:-ivi-forum-uploads-891711670395}"

SECRETS="AUTH_SECRET=ivi-forum-auth-secret:latest,APIFY_API_TOKEN=ivi-forum-apify-token:latest"
ENV_VARS="GCP_PROJECT=${PROJECT},AUTH_URL=${APP_URL},AUTH_TRUST_HOST=true"
ENV_VARS="${ENV_VARS},UPLOADS_BUCKET=${UPLOADS_BUCKET}"
ENV_VARS="${ENV_VARS},APIFY_LINKEDIN_PROFILE_ACTOR=apimaestro~linkedin-profile-batch-scraper-no-cookies-required"
ENV_VARS="${ENV_VARS},ALLOWED_EMAIL_DOMAINS=${ALLOWED_EMAIL_DOMAINS},ALLOWED_EMAILS=${ALLOWED_EMAILS}"

# Email (OTP sign-in + notifications) activates automatically once the Resend
# API key secret exists. EMAIL_FROM must be an address on a Resend-verified
# domain — isb.quarktex.com is verified on the account this key belongs to.
# NOTE: --set-env-vars splits its value on commas, so EMAIL_FROM must NEVER
# contain a comma (e.g. no `Forum, iVi <...>` display names).
EMAIL_FROM="${EMAIL_FROM:-iVi Forum <forum@isb.quarktex.com>}"
if gcloud secrets describe ivi-forum-resend-api-key --project="$PROJECT" >/dev/null 2>&1; then
  SECRETS="${SECRETS},RESEND_API_KEY=ivi-forum-resend-api-key:latest"
  ENV_VARS="${ENV_VARS},EMAIL_FROM=${EMAIL_FROM}"
  echo "Email (OTP sign-in + notifications): ENABLED (from: $EMAIL_FROM)"
else
  echo "Email (OTP sign-in + notifications): dormant — create the Resend API key secret to enable:"
  echo "  printf '%s' \"\$KEY\" | gcloud secrets create ivi-forum-resend-api-key --data-file=-"
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
