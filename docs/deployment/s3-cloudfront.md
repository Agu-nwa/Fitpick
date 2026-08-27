# FitPick private S3 storage

FitPick stores user wardrobe photos, reference photos, Studio Model photos, and generated previews as private S3 objects. Authenticated app routes serve those images with ownership checks and `private, no-store` caching. External AI or Virtual Try-On providers receive short-lived signed URLs only when the user has enabled the relevant processing consent.

Only non-user-specific assets under `studio-model/catalog/*` may use a public CloudFront URL.

## Required Environment

Do not commit real credentials.

```env
STORAGE_PROVIDER=s3
S3_BUCKET=your-fitpick-production-bucket
S3_REGION=your-aws-region
# Optional: public base URL used only for studio-model/catalog/* assets.
S3_PUBLIC_BASE_URL=https://your-cloudfront-distribution-domain
NEXT_PUBLIC_APP_URL=https://your-app-domain
# Optional for local/static-key deployments. Leave both empty on EC2 when using an IAM role.
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

`S3_PUBLIC_BASE_URL`, `CLOUDFRONT_URL`, or `NEXT_PUBLIC_CLOUDFRONT_URL` must never be used to expose user-owned prefixes.

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

## Bucket and CloudFront access

Enable S3 Block Public Access for the bucket. Do not attach a public-read bucket policy or public object ACLs.

If CloudFront is used for the public Studio Model catalogue, use Origin Access Control and restrict the distribution behavior to `studio-model/catalog/*`. Do not create public CloudFront cache behaviors for:

- `wardrobe/*`
- `generated-previews/*`
- `avatar-previews/*`
- `support/*`

Existing objects that were previously public remain an infrastructure exposure until the bucket policy/ACLs are corrected. Deploying the application code alone does not revoke an old public S3 policy.

## IAM

Use least privilege. The application only needs object-level `PutObject`, `GetObject`, and `DeleteObject` for the bucket paths it manages. See `docs/deployment/iam-s3-fitpick-policy.json`.

The application should only write server-generated object keys under:

- `wardrobe/<userId>/*`
- `generated-previews/<userId>/*`
- `avatar-previews/<userId>/*`
- `support/<userId>/*`

Browser presigned uploads must not accept arbitrary object keys from the client.

## Key Rotation

If an access key is ever pasted into chat, logs, screenshots, or a shared document, rotate it immediately after testing:

1. Create a new access key in AWS IAM.
2. Update `.env.local` and production environment variables.
3. Restart the app with `pm2 restart fitpick --update-env`.
4. Disable and delete the old key.
