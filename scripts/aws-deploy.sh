#!/usr/bin/env bash
# Deploy the built SPA (dist/) to an S3 static website with IP-based access
# control. Designed for the cheapest possible AWS hosting (~$0/month for
# personal use).
#
# Usage:
#   ./scripts/aws-deploy.sh [bucket-name] [region]
#
# Defaults:
#   bucket = room-builder-app-<account-id>
#   region = ap-northeast-1
#   IP allowlist = $(curl https://checkip.amazonaws.com)/32
#
# Prereqs:
#   - npm run build was successful and dist/ exists
#   - aws CLI is configured (sts get-caller-identity returns your account)
#
# After deploy, the URL is:
#   http://<bucket>.s3-website-<region>.amazonaws.com
set -euo pipefail

REGION="${2:-ap-northeast-1}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="${1:-room-builder-app-${ACCOUNT_ID}}"
DATA_BUCKET_DEFAULT="room-builder-data-${ACCOUNT_ID}"
DATA_BUCKET="${RB_DATA_BUCKET:-${DATA_BUCKET_DEFAULT}}"
DIST_DIR="$(cd "$(dirname "$0")/.." && pwd)/dist"

if [ ! -d "${DIST_DIR}" ]; then
  echo "ERROR: ${DIST_DIR} does not exist. Run 'npm run build' first." >&2
  exit 1
fi

# Detect IP for allowlist (override with RB_IP env var, e.g. for /24 ranges)
ALLOW_IP="${RB_IP:-$(curl -fsSL https://checkip.amazonaws.com)/32}"
ALLOW_IP="$(echo -n "$ALLOW_IP" | tr -d '[:space:]')"

WEBSITE_ENDPOINT="${BUCKET}.s3-website-${REGION}.amazonaws.com"
WEBSITE_URL="http://${WEBSITE_ENDPOINT}"

echo ">> Account:       ${ACCOUNT_ID}"
echo ">> Region:        ${REGION}"
echo ">> App bucket:    ${BUCKET}"
echo ">> Data bucket:   ${DATA_BUCKET}"
echo ">> Allowed IP:    ${ALLOW_IP}"
echo ">> Site URL:      ${WEBSITE_URL}"
echo

# 1) Create the app bucket (idempotent)
if aws s3api head-bucket --bucket "${BUCKET}" --region "${REGION}" 2>/dev/null; then
  echo "[1/6] App bucket already exists — skipping create."
else
  echo "[1/6] Creating app bucket ${BUCKET}..."
  if [ "${REGION}" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "${BUCKET}" --region "${REGION}"
  else
    aws s3api create-bucket \
      --bucket "${BUCKET}" \
      --region "${REGION}" \
      --create-bucket-configuration "LocationConstraint=${REGION}"
  fi
fi

# 2) Allow public *policy* but keep ACLs blocked.
#    S3 static website hosting needs the policy to be public-eligible.
echo "[2/6] Adjusting Public Access Block (policy allowed, ACLs blocked)..."
aws s3api put-public-access-block \
  --bucket "${BUCKET}" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# 3) Static website hosting (SPA → index.html for both index and error)
echo "[3/6] Enabling static website hosting..."
TMP_WEB="$(mktemp)"
trap 'rm -f "${TMP_WEB}" "${TMP_POL:-}" "${TMP_CORS:-}"' EXIT
cat > "${TMP_WEB}" <<JSON
{
  "IndexDocument": { "Suffix": "index.html" },
  "ErrorDocument": { "Key": "index.html" }
}
JSON
aws s3api put-bucket-website --bucket "${BUCKET}" --website-configuration "file://${TMP_WEB}"

# 4) IP-restricted bucket policy
echo "[4/6] Applying IP-restricted bucket policy (allow ${ALLOW_IP})..."
TMP_POL="$(mktemp)"
cat > "${TMP_POL}" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadFromAllowedIp",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${BUCKET}/*",
      "Condition": {
        "IpAddress": { "aws:SourceIp": "${ALLOW_IP}" }
      }
    }
  ]
}
JSON
aws s3api put-bucket-policy --bucket "${BUCKET}" --policy "file://${TMP_POL}"

# 5) Sync dist/ to the bucket
echo "[5/6] Syncing dist/ → s3://${BUCKET}/ ..."
# Long-cache hashed assets, no-cache for index.html
aws s3 sync "${DIST_DIR}" "s3://${BUCKET}/" \
  --delete \
  --exclude "index.html" \
  --cache-control "public, max-age=31536000, immutable"
aws s3 cp "${DIST_DIR}/index.html" "s3://${BUCKET}/index.html" \
  --cache-control "no-cache" \
  --content-type "text/html; charset=utf-8"

# 6) Update the data bucket CORS so the new website origin is allowed.
echo "[6/6] Updating data bucket CORS to allow ${WEBSITE_URL}..."
TMP_CORS="$(mktemp)"
cat > "${TMP_CORS}" <<JSON
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
        "${WEBSITE_URL}"
      ],
      "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
      "MaxAgeSeconds": 600
    }
  ]
}
JSON
if aws s3api head-bucket --bucket "${DATA_BUCKET}" --region "${REGION}" 2>/dev/null; then
  aws s3api put-bucket-cors --bucket "${DATA_BUCKET}" --cors-configuration "file://${TMP_CORS}"
  echo "    OK — CORS updated on ${DATA_BUCKET}"
else
  echo "    WARN — data bucket ${DATA_BUCKET} not found. Run scripts/aws-setup.sh first."
fi

echo
echo "==============================================================="
echo "Deployed.  Open in your browser:"
echo "    ${WEBSITE_URL}"
echo "==============================================================="
echo
echo "Notes:"
echo " - Access is restricted to ${ALLOW_IP}. If your IP changes, re-run"
echo "   this script (it picks up the new IP automatically) or set RB_IP=..."
echo " - To allow a /24 range:  RB_IP=192.168.1.0/24 ./scripts/aws-deploy.sh"
echo " - HTTPS is NOT provided by S3 website endpoints. If you need HTTPS,"
echo "   put CloudFront in front (separate task)."
