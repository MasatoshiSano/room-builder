#!/usr/bin/env bash
# Bootstrap an S3 bucket for Room Builder.
#
# Usage:
#   ./scripts/aws-setup.sh [bucket-name] [region]
#
# Defaults:
#   bucket = room-builder-data-<account-id>
#   region = ap-northeast-1
#
# After running this script, copy .env.example to .env and fill in:
#   VITE_BACKEND_MODE=s3
#   VITE_AWS_REGION=<region>
#   VITE_AWS_BUCKET=<bucket>
#   VITE_AWS_ACCESS_KEY_ID=<your IAM access key>
#   VITE_AWS_SECRET_ACCESS_KEY=<your IAM secret>
set -euo pipefail

REGION="${2:-ap-northeast-1}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="${1:-room-builder-data-${ACCOUNT_ID}}"

echo ">> Account:  ${ACCOUNT_ID}"
echo ">> Region:   ${REGION}"
echo ">> Bucket:   ${BUCKET}"
echo

# 1) Create bucket (idempotent)
if aws s3api head-bucket --bucket "${BUCKET}" --region "${REGION}" 2>/dev/null; then
  echo "[1/4] Bucket already exists — skipping create."
else
  echo "[1/4] Creating bucket ${BUCKET} in ${REGION}..."
  if [ "${REGION}" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "${BUCKET}" --region "${REGION}"
  else
    aws s3api create-bucket \
      --bucket "${BUCKET}" \
      --region "${REGION}" \
      --create-bucket-configuration "LocationConstraint=${REGION}"
  fi
fi

# 2) Block public access
echo "[2/4] Enforcing public-access block..."
aws s3api put-public-access-block \
  --bucket "${BUCKET}" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# 3) Apply CORS (allow browser requests from common dev/prod origins)
echo "[3/4] Applying CORS for browser access..."
TMP_CORS="$(mktemp)"
trap 'rm -f "${TMP_CORS}"' EXIT
cat > "${TMP_CORS}" <<'JSON'
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD", "PUT", "POST", "DELETE"],
      "AllowedOrigins": [
        "http://localhost:5173",
        "http://localhost:4173",
        "http://localhost:3000",
        "http://127.0.0.1:5173"
      ],
      "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
      "MaxAgeSeconds": 600
    }
  ]
}
JSON
aws s3api put-bucket-cors --bucket "${BUCKET}" --cors-configuration "file://${TMP_CORS}"

# 4) Print sample IAM policy
echo "[4/4] Done."
echo
echo "==============================================================="
echo "Recommended least-privilege IAM policy for the app's IAM user:"
echo "==============================================================="
cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:GetBucketLocation"],
      "Resource": "arn:aws:s3:::${BUCKET}"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::${BUCKET}/*"
    }
  ]
}
JSON
echo
echo "Next steps:"
echo "  1. Attach the policy above to your IAM user (e.g. scheduler-ai-app)."
echo "  2. cp .env.example .env"
echo "  3. Edit .env:"
echo "       VITE_BACKEND_MODE=s3"
echo "       VITE_AWS_REGION=${REGION}"
echo "       VITE_AWS_BUCKET=${BUCKET}"
echo "       VITE_AWS_ACCESS_KEY_ID=<your access key>"
echo "       VITE_AWS_SECRET_ACCESS_KEY=<your secret>"
echo "  4. npm run client     # only the client; no need for npm run dev (no local server)"
