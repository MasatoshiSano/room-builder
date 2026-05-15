#!/usr/bin/env bash
# Add HTTPS to the room-builder S3 static site by fronting it with
# CloudFront, Origin Access Control (OAC), and an AWS WAF Web ACL that
# restricts viewers to a single IP.
#
# Usage:
#   ./scripts/aws-https-setup.sh
#
# Env overrides:
#   RB_APP_BUCKET    static site bucket  (default: room-builder-app-<account>)
#   RB_DATA_BUCKET   data bucket         (default: room-builder-data-<account>)
#   RB_REGION        bucket region       (default: ap-northeast-1)
#   RB_IP            allowed CIDR        (default: $(curl checkip)/32)
#
# Idempotent: re-run after IP changes; it updates the WAF IP set without
# rebuilding the distribution.
#
# Cost (low-traffic personal use):
#   CloudFront:  free tier (then ~$0/mo for low traffic)
#   WAF Web ACL: $5/month
#   WAF Rule:    $1/month  (1 IP rule)
#   Total:       ~$6/month
set -euo pipefail

REGION="${RB_REGION:-ap-northeast-1}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
APP_BUCKET="${RB_APP_BUCKET:-room-builder-app-${ACCOUNT_ID}}"
DATA_BUCKET="${RB_DATA_BUCKET:-room-builder-data-${ACCOUNT_ID}}"

ALLOW_IP="${RB_IP:-$(curl -fsSL https://checkip.amazonaws.com)/32}"
ALLOW_IP="$(echo -n "$ALLOW_IP" | tr -d '[:space:]')"

OAC_NAME="rb-oac-${APP_BUCKET}"
DIST_COMMENT="room-builder ${APP_BUCKET}"
IPSET_NAME="rb-allow-${APP_BUCKET}"
WACL_NAME="rb-acl-${APP_BUCKET}"

echo ">> Account:       ${ACCOUNT_ID}"
echo ">> Region:        ${REGION}"
echo ">> App bucket:    ${APP_BUCKET}"
echo ">> Data bucket:   ${DATA_BUCKET}"
echo ">> Allowed IP:    ${ALLOW_IP}"
echo

cleanup_files=()
cleanup() { for f in "${cleanup_files[@]}"; do rm -f "$f"; done; }
trap cleanup EXIT
mktmp() { local f; f="$(mktemp)"; cleanup_files+=("$f"); echo "$f"; }

# ---------------- 1. Origin Access Control --------------------------------
echo "[1/7] Origin Access Control..."
OAC_ID="$(aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='${OAC_NAME}'].Id" \
  --output text 2>/dev/null || true)"

if [ -z "${OAC_ID}" ] || [ "${OAC_ID}" = "None" ]; then
  OAC_FILE="$(mktmp)"
  cat > "${OAC_FILE}" <<JSON
{
  "Name": "${OAC_NAME}",
  "Description": "OAC for ${APP_BUCKET}",
  "OriginAccessControlOriginType": "s3",
  "SigningBehavior": "always",
  "SigningProtocol": "sigv4"
}
JSON
  OAC_ID="$(aws cloudfront create-origin-access-control \
    --origin-access-control-config "file://${OAC_FILE}" \
    --query 'OriginAccessControl.Id' --output text)"
  echo "    Created OAC ${OAC_ID}"
else
  echo "    Found existing OAC ${OAC_ID}"
fi

# ---------------- 2. WAF IP Set + Web ACL  (us-east-1) --------------------
echo "[2/7] WAF (us-east-1) IP set + Web ACL..."

# IP set
IPSET_INFO="$(aws wafv2 list-ip-sets --scope CLOUDFRONT --region us-east-1 \
  --query "IPSets[?Name=='${IPSET_NAME}'].[Id,LockToken]" --output text || true)"
IPSET_ID="$(echo "${IPSET_INFO}" | awk '{print $1}')"
IPSET_LOCK="$(echo "${IPSET_INFO}" | awk '{print $2}')"

if [ -z "${IPSET_ID}" ] || [ "${IPSET_ID}" = "None" ]; then
  IPSET_ID="$(aws wafv2 create-ip-set \
    --name "${IPSET_NAME}" \
    --scope CLOUDFRONT \
    --region us-east-1 \
    --ip-address-version IPV4 \
    --addresses "${ALLOW_IP}" \
    --query 'Summary.Id' --output text)"
  echo "    Created IP set ${IPSET_ID}"
else
  # Update addresses (handles the IP-rotated case)
  aws wafv2 update-ip-set \
    --name "${IPSET_NAME}" \
    --scope CLOUDFRONT \
    --region us-east-1 \
    --id "${IPSET_ID}" \
    --addresses "${ALLOW_IP}" \
    --lock-token "${IPSET_LOCK}" >/dev/null
  echo "    Updated IP set ${IPSET_ID} → ${ALLOW_IP}"
fi
IPSET_ARN="arn:aws:wafv2:us-east-1:${ACCOUNT_ID}:global/ipset/${IPSET_NAME}/${IPSET_ID}"

# Web ACL
WACL_INFO="$(aws wafv2 list-web-acls --scope CLOUDFRONT --region us-east-1 \
  --query "WebACLs[?Name=='${WACL_NAME}'].[Id,LockToken,ARN]" --output text || true)"
WACL_ID="$(echo "${WACL_INFO}" | awk '{print $1}')"
WACL_LOCK="$(echo "${WACL_INFO}" | awk '{print $2}')"
WACL_ARN="$(echo "${WACL_INFO}" | awk '{print $3}')"

WACL_RULES_FILE="$(mktmp)"
cat > "${WACL_RULES_FILE}" <<JSON
[
  {
    "Name": "AllowSpecificIp",
    "Priority": 0,
    "Statement": {
      "IPSetReferenceStatement": {
        "ARN": "${IPSET_ARN}"
      }
    },
    "Action": { "Allow": {} },
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "AllowSpecificIp"
    }
  }
]
JSON
WACL_VIS_FILE="$(mktmp)"
cat > "${WACL_VIS_FILE}" <<JSON
{
  "SampledRequestsEnabled": true,
  "CloudWatchMetricsEnabled": true,
  "MetricName": "${WACL_NAME}"
}
JSON

if [ -z "${WACL_ID}" ] || [ "${WACL_ID}" = "None" ]; then
  WACL_ARN="$(aws wafv2 create-web-acl \
    --name "${WACL_NAME}" \
    --scope CLOUDFRONT \
    --region us-east-1 \
    --default-action "Block={}" \
    --rules "file://${WACL_RULES_FILE}" \
    --visibility-config "file://${WACL_VIS_FILE}" \
    --query 'Summary.ARN' --output text)"
  echo "    Created Web ACL ${WACL_ARN}"
else
  aws wafv2 update-web-acl \
    --name "${WACL_NAME}" \
    --scope CLOUDFRONT \
    --region us-east-1 \
    --id "${WACL_ID}" \
    --default-action "Block={}" \
    --rules "file://${WACL_RULES_FILE}" \
    --visibility-config "file://${WACL_VIS_FILE}" \
    --lock-token "${WACL_LOCK}" >/dev/null
  echo "    Updated Web ACL ${WACL_ARN}"
fi

# ---------------- 3. CloudFront Distribution -------------------------------
echo "[3/7] CloudFront distribution..."
S3_REST_DOMAIN="${APP_BUCKET}.s3.${REGION}.amazonaws.com"

DIST_ID="$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='${DIST_COMMENT}'].Id" \
  --output text 2>/dev/null || true)"

DIST_CONFIG_FILE="$(mktmp)"
cat > "${DIST_CONFIG_FILE}" <<JSON
{
  "CallerReference": "rb-$(date +%s)",
  "Comment": "${DIST_COMMENT}",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "s3-${APP_BUCKET}",
        "DomainName": "${S3_REST_DOMAIN}",
        "OriginAccessControlId": "${OAC_ID}",
        "S3OriginConfig": { "OriginAccessIdentity": "" },
        "CustomHeaders": { "Quantity": 0 },
        "ConnectionAttempts": 3,
        "ConnectionTimeout": 10
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-${APP_BUCKET}",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] }
    },
    "Compress": true,
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "OriginRequestPolicyId": "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf",
    "ResponseHeadersPolicyId": "67f7725c-6f97-4210-82d7-5512b31e9d03"
  },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      { "ErrorCode": 403, "ResponseCode": "200", "ResponsePagePath": "/index.html", "ErrorCachingMinTTL": 10 },
      { "ErrorCode": 404, "ResponseCode": "200", "ResponsePagePath": "/index.html", "ErrorCachingMinTTL": 10 }
    ]
  },
  "PriceClass": "PriceClass_200",
  "WebACLId": "${WACL_ARN}",
  "HttpVersion": "http2",
  "IsIPV6Enabled": true
}
JSON

if [ -z "${DIST_ID}" ] || [ "${DIST_ID}" = "None" ]; then
  DIST_INFO="$(aws cloudfront create-distribution \
    --distribution-config "file://${DIST_CONFIG_FILE}" \
    --query 'Distribution.[Id,DomainName]' --output text)"
  DIST_ID="$(echo "${DIST_INFO}" | awk '{print $1}')"
  DIST_DOMAIN="$(echo "${DIST_INFO}" | awk '{print $2}')"
  echo "    Created distribution ${DIST_ID}"
else
  echo "    Found existing distribution ${DIST_ID} — leaving config as-is."
  DIST_DOMAIN="$(aws cloudfront get-distribution --id "${DIST_ID}" \
    --query 'Distribution.DomainName' --output text)"
fi

DIST_URL="https://${DIST_DOMAIN}"
DIST_ARN="arn:aws:cloudfront::${ACCOUNT_ID}:distribution/${DIST_ID}"

# ---------------- 4. App bucket policy: OAC + remove old IP rule -----------
echo "[4/7] App bucket policy → OAC only..."
BPOL_FILE="$(mktmp)"
cat > "${BPOL_FILE}" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOAC",
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${APP_BUCKET}/*",
      "Condition": {
        "StringEquals": { "AWS:SourceArn": "${DIST_ARN}" }
      }
    }
  ]
}
JSON
aws s3api put-bucket-policy --bucket "${APP_BUCKET}" --policy "file://${BPOL_FILE}"
echo "    OK"

# ---------------- 5. Public Access Block — keep policy enforcement -----------
echo "[5/7] Public Access Block (re-tighten now that OAC is the only path)..."
aws s3api put-public-access-block \
  --bucket "${APP_BUCKET}" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false"
echo "    OK"

# ---------------- 6. Data bucket CORS — add HTTPS origin -------------------
echo "[6/7] Data bucket CORS (add ${DIST_URL})..."
CORS_FILE="$(mktmp)"
cat > "${CORS_FILE}" <<JSON
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD", "PUT", "POST", "DELETE"],
      "AllowedOrigins": [
        "http://localhost:5173",
        "http://localhost:4173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://${APP_BUCKET}.s3-website-${REGION}.amazonaws.com",
        "${DIST_URL}"
      ],
      "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
      "MaxAgeSeconds": 600
    }
  ]
}
JSON
if aws s3api head-bucket --bucket "${DATA_BUCKET}" --region "${REGION}" 2>/dev/null; then
  aws s3api put-bucket-cors --bucket "${DATA_BUCKET}" --cors-configuration "file://${CORS_FILE}"
  echo "    OK"
else
  echo "    WARN — data bucket ${DATA_BUCKET} not found; skipping CORS."
fi

# ---------------- 7. Wait for distribution to deploy -----------------------
echo "[7/7] Waiting for CloudFront to deploy (this typically takes 5-10 min)..."
START_T="$(date +%s)"
while true; do
  STATUS="$(aws cloudfront get-distribution --id "${DIST_ID}" \
    --query 'Distribution.Status' --output text)"
  ELAPSED=$(( $(date +%s) - START_T ))
  echo "    [${ELAPSED}s] status=${STATUS}"
  if [ "${STATUS}" = "Deployed" ]; then break; fi
  sleep 30
done

echo
echo "========================================================="
echo "HTTPS deployed."
echo "    URL:         ${DIST_URL}"
echo "    Distribution: ${DIST_ID}"
echo "    Allowed IP:  ${ALLOW_IP}"
echo "========================================================="
echo
echo "Next steps:"
echo " - Open ${DIST_URL} in your browser."
echo " - To rotate the allowed IP, simply re-run this script (or set RB_IP=...)."
echo " - To invalidate cached files after the next deploy:"
echo "     aws cloudfront create-invalidation --distribution-id ${DIST_ID} --paths '/*'"
