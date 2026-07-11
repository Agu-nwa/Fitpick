# FitPick S3 + CloudFront Storage

FitPick stores wardrobe photos and generated outfit previews in S3, then serves public image URLs through CloudFront when configured.

## Required Environment

Do not commit real credentials.

```env
STORAGE_PROVIDER=s3
S3_BUCKET=your-fitpick-production-bucket
S3_REGION=your-aws-region
S3_PUBLIC_BASE_URL=https://your-cloudfront-distribution-domain
NEXT_PUBLIC_APP_URL=https://your-app-domain
# Optional for local/static-key deployments. Leave both empty on EC2 when using an IAM role.
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

`S3_PUBLIC_BASE_URL`, `CLOUDFRONT_URL`, or `NEXT_PUBLIC_CLOUDFRONT_URL` can be used for public image URL generation.

On EC2, prefer an attached IAM role and leave `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` empty. If static credentials are provided, both values must be present.

## S3 CORS

Use this as the starting point for browser uploads. Replace the production origin with the real app domain.

```json
[
  {
    "AllowedHeaders": ["content-type", "x-amz-*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-app-domain"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## CloudFront Access

CloudFront must be allowed to read objects from the configured `S3_BUCKET`. Prefer Origin Access Control (OAC) for production. Do not make the S3 bucket broadly public when CloudFront is the intended public image layer.

Make sure CloudFront caches these prefixes:

- `wardrobe/*`
- `generated-previews/*`

## IAM

Use least privilege. The application only needs object-level `PutObject`, `GetObject`, and `DeleteObject` for the bucket paths it manages. See `docs/deployment/iam-s3-fitpick-policy.json`.

The application should only write server-generated object keys under:

- `wardrobe/<userId>/*`
- `generated-previews/<userId>/*`

Browser presigned uploads must not accept arbitrary object keys from the client.

## Key Rotation

If an access key is ever pasted into chat, logs, screenshots, or a shared document, rotate it immediately after testing:

1. Create a new access key in AWS IAM.
2. Update `.env.local` and production environment variables.
3. Restart the app with `pm2 restart fitpick --update-env`.
4. Disable and delete the old key.
