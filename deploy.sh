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
  --max-instances=3 \
  --set-secrets="AUTH_SECRET=ivi-forum-auth-secret:latest,APIFY_API_TOKEN=ivi-forum-apify-token:latest" \
  --set-env-vars="GCP_PROJECT=${PROJECT},AUTH_URL=${APP_URL},AUTH_TRUST_HOST=true,APIFY_LINKEDIN_PROFILE_ACTOR=apimaestro~linkedin-profile-batch-scraper-no-cookies-required"

echo "Done. URL:"
gcloud run services describe "$SERVICE" --project="$PROJECT" --region="$REGION" --format='value(status.url)'
