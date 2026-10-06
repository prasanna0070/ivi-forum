#!/usr/bin/env bash
# Deploy iVi Forum to Cloud Run.
# Auth is ADC via the gcloud impersonation already configured in this shell.
# Secrets (AUTH_SECRET, AUTH_GOOGLE_ID/SECRET, APIFY_API_TOKEN, SMTP_PASS, RESEND_API_KEY) come from Secret Manager — nothing sensitive here.
set -euo pipefail

PROJECT="${GCP_PROJECT:-project-55741ec9-449d-403c-9e5}"
REGION="${REGION:-asia-south1}"
SERVICE="ivi-forum"
RUNTIME_SA="ivi-forum-run@${PROJECT}.iam.gserviceaccount.com"
# Canonical URL: the community's own domain, served through the global HTTPS
# load balancer (scripts/add-isbcommunity-domain.sh). www and both Cloud Run
# hostnames redirect here (src/proxy.ts). Google sign-in's callback is
# registered on this URL.
APP_URL="${APP_URL:-https://isbcommunity.com}"

# Membership gate: only ISB emails may join, plus an allowlist for existing
# members who signed up with a personal address.
ALLOWED_EMAIL_DOMAINS="${ALLOWED_EMAIL_DOMAINS:-isb.edu}"
ALLOWED_EMAILS="${ALLOWED_EMAILS:-ayush.vasana@gmail.com}"

# Private GCS bucket for forum image uploads (public access prevention enforced;
# runtime SA has objectAdmin). Images are served back through /api/uploads.
UPLOADS_BUCKET="${UPLOADS_BUCKET:-ivi-forum-uploads-891711670395}"

SECRETS="AUTH_SECRET=ivi-forum-auth-secret:latest,APIFY_API_TOKEN=ivi-forum-apify-token:latest"
# Google sign-in (the only way in): OAuth client "iVi Forum" in this project,
# redirect URI ${APP_URL}/api/auth/callback/google.
SECRETS="${SECRETS},AUTH_GOOGLE_ID=ivi-forum-google-id:latest,AUTH_GOOGLE_SECRET=ivi-forum-google-secret:latest"
ENV_VARS="GCP_PROJECT=${PROJECT},AUTH_URL=${APP_URL},AUTH_TRUST_HOST=true"
ENV_VARS="${ENV_VARS},UPLOADS_BUCKET=${UPLOADS_BUCKET}"
ENV_VARS="${ENV_VARS},APIFY_LINKEDIN_PROFILE_ACTOR=apimaestro~linkedin-profile-batch-scraper-no-cookies-required"
ENV_VARS="${ENV_VARS},ALLOWED_EMAIL_DOMAINS=${ALLOWED_EMAIL_DOMAINS},ALLOWED_EMAILS=${ALLOWED_EMAILS}"

# Email (OTP sign-in + notifications). Primary transport is Gmail SMTP from the
# cohort mailbox: it activates once the app-password secret exists. Resend
# (forum@isb.quarktex.com) is kept only as a fallback; ISB's Microsoft 365 was
# quarantining it. With SMTP, EMAIL_FROM must use the SMTP_USER address or
# Gmail rewrites it.
# NOTE: --set-env-vars splits its value on commas, so EMAIL_FROM and
# EMAIL_REPLY_TO must NEVER contain a comma (e.g. no `Forum, iVi <...>`).
SMTP_USER="${SMTP_USER:-isbivico4@gmail.com}"
# Reply-To: a mailbox a human reads. Repliable mail scores better with
# Microsoft EOP, and gives a confused member somewhere to go other than the
# "report phishing" button. Unset = header omitted.
EMAIL_REPLY_TO="${EMAIL_REPLY_TO:-}"
EMAIL_ON=""
if gcloud secrets describe ivi-forum-smtp-pass --project="$PROJECT" >/dev/null 2>&1; then
  EMAIL_FROM="${EMAIL_FROM:-iVi Forum <${SMTP_USER}>}"
  SECRETS="${SECRETS},SMTP_PASS=ivi-forum-smtp-pass:latest"
  ENV_VARS="${ENV_VARS},SMTP_USER=${SMTP_USER}"
  EMAIL_ON="Gmail SMTP"
else
  echo "Gmail SMTP: dormant — store the ${SMTP_USER} app password to enable:"
  echo "  printf '%s' \"\$APP_PASSWORD\" | gcloud secrets create ivi-forum-smtp-pass --data-file=-"
fi
if gcloud secrets describe ivi-forum-resend-api-key --project="$PROJECT" >/dev/null 2>&1; then
  SECRETS="${SECRETS},RESEND_API_KEY=ivi-forum-resend-api-key:latest"
  EMAIL_ON="${EMAIL_ON:-Resend}"
fi
EMAIL_FROM="${EMAIL_FROM:-iVi Forum <forum@isb.quarktex.com>}"
if [ -n "$EMAIL_ON" ]; then
  ENV_VARS="${ENV_VARS},EMAIL_FROM=${EMAIL_FROM}"
  [ -n "$EMAIL_REPLY_TO" ] && ENV_VARS="${ENV_VARS},EMAIL_REPLY_TO=${EMAIL_REPLY_TO}"
  echo "Email (OTP sign-in + notifications): ENABLED via $EMAIL_ON (from: $EMAIL_FROM)"
else
  echo "Email (OTP sign-in + notifications): dormant"
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
