#!/usr/bin/env bash
# Serve the community at https://isbcommunity.com (and www) through the existing
# global HTTPS load balancer in this project (quarktex-url-map /
# quarktex-https-proxy, IP 34.49.226.175). Adds a backend for the ivi-forum
# Cloud Run service, one host rule, and a Google-managed certificate covering
# both names. Existing hosts and certificates are left untouched; the proxy's
# current certificate list is read and kept. Safe to re-run.
#
# DNS (Hostinger) must point at the load balancer before the certificate can
# be issued:   A  @  34.49.226.175   (www already CNAMEs to the apex)
# The certificate turns ACTIVE 15-60 minutes after that DNS resolves.
set -euo pipefail
P="${GCP_PROJECT:-project-55741ec9-449d-403c-9e5}"
DOMAINS="isbcommunity.com,www.isbcommunity.com"
CERT="cert-isbcommunity"
BACKEND="ivi-forum-be"
NEG="ivi-forum-neg"            # serverless NEG -> Cloud Run service ivi-forum, asia-south1

# 1. Backend service for the Cloud Run service (serverless NEG already exists).
if ! gcloud compute backend-services describe "$BACKEND" --global --project "$P" >/dev/null 2>&1; then
  gcloud compute backend-services create "$BACKEND" --global \
    --load-balancing-scheme=EXTERNAL_MANAGED --protocol=HTTP --project "$P"
  gcloud compute backend-services add-backend "$BACKEND" --global \
    --network-endpoint-group="$NEG" --network-endpoint-group-region=asia-south1 --project "$P"
fi

# 2. Route both hostnames to it.
if ! gcloud compute url-maps describe quarktex-url-map --project "$P" \
     --format='value(hostRules[].hosts)' | grep -q 'isbcommunity.com'; then
  gcloud compute url-maps add-path-matcher quarktex-url-map --global --project "$P" \
    --path-matcher-name=community-paths --default-service="$BACKEND" --new-hosts="$DOMAINS"
fi

# 3. Google-managed certificate for both names.
if ! gcloud compute ssl-certificates describe "$CERT" --global --project "$P" >/dev/null 2>&1; then
  gcloud compute ssl-certificates create "$CERT" --domains="$DOMAINS" --global --project "$P"
fi

# 4. Attach it to the HTTPS proxy, keeping every certificate already there.
CURRENT=$(gcloud compute target-https-proxies describe quarktex-https-proxy --global --project "$P" \
  --format='value(sslCertificates)' | tr ';' '\n' | sed 's#.*/##' | paste -sd, -)
case ",$CURRENT," in
  *",$CERT,"*) ;;
  *) gcloud compute target-https-proxies update quarktex-https-proxy --global --project "$P" \
       --ssl-certificates="$CURRENT,$CERT" ;;
esac

echo "Host rules now:"
gcloud compute url-maps describe quarktex-url-map --project "$P" --format='value(hostRules[].hosts)'
echo "Certificate status (PROVISIONING until DNS points at 34.49.226.175, then ACTIVE):"
gcloud compute ssl-certificates describe "$CERT" --global --project "$P" \
  --format='value(managed.status,managed.domainStatus)'
