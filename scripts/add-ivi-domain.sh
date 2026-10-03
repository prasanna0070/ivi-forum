#!/usr/bin/env bash
# Put the forum on https://ivi.quarktex.com via the existing quarktex.com
# global load balancer (quarktex-url-map / quarktex-https-proxy, IP 34.49.226.175).
# Adds a backend for the ivi-forum Cloud Run service, a host rule, and a
# Google-managed cert. Nothing existing is changed except appending the cert
# to the proxy's list. Afterwards add the DNS record in Hostinger:
#   type A, name ivi, value 34.49.226.175
# The cert goes ACTIVE 15-60 min after DNS resolves.
set -euo pipefail
P=project-55741ec9-449d-403c-9e5

gcloud compute backend-services create ivi-forum-be --global \
  --load-balancing-scheme=EXTERNAL_MANAGED --protocol=HTTP --project "$P"
gcloud compute backend-services add-backend ivi-forum-be --global \
  --network-endpoint-group=ivi-forum-neg --network-endpoint-group-region=asia-south1 --project "$P"
gcloud compute url-maps add-path-matcher quarktex-url-map --global --project "$P" \
  --path-matcher-name=ivi-paths --default-service=ivi-forum-be --new-hosts=ivi.quarktex.com
gcloud compute ssl-certificates create cert-ivi --domains=ivi.quarktex.com --global --project "$P"
gcloud compute target-https-proxies update quarktex-https-proxy --global --project "$P" \
  --ssl-certificates=cert-root-v2,cert-www-v2,cert-a2,cert-ivi

gcloud compute url-maps describe quarktex-url-map --project "$P" --format='value(hostRules[].hosts)'
echo "Now add DNS in Hostinger: A  ivi  34.49.226.175"
