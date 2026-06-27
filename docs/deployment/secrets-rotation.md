# FitPick Secrets Rotation

Some development secrets were previously exposed during local setup. Do not reuse old credentials.

## Rotate Immediately Before Production

- OpenAI API key
- MongoDB database user password
- AWS access key
- any Cloudinary key that was ever used
- Stripe/Paystack live keys if pasted into chat, docs, logs, or screenshots
- `JWT_SECRET` if copied into any shared channel

## OpenAI

1. Create a new API key in the OpenAI dashboard.
2. Update `OPENAI_API_KEY` in local and production environments.
3. Restart PM2 with `pm2 restart fitpick --update-env`.
4. Revoke the old key.
5. Run a wardrobe analysis and stylist chat smoke test.

## MongoDB

1. Create a new database user or rotate the existing password.
2. Update `MONGODB_URI`.
3. Restart the app and worker.
4. Remove the old credential.
5. Confirm login, wardrobe list, and outfit recommendation still work.

## AWS S3

1. Create a new least-privilege IAM access key.
2. Update `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`.
3. Restart app and worker.
4. Test signed wardrobe upload and generated preview upload.
5. Disable and delete the old key.

## Session Secret

Rotating `JWT_SECRET` signs everyone out.

1. Generate a new random value of at least 32 characters.
2. Update `JWT_SECRET`.
3. Restart the app.
4. Verify login and logout.

## Handling Future Exposure

- Assume exposed secrets are compromised.
- Rotate first, then investigate.
- Do not paste secrets into chat, tickets, screenshots, or docs.
- Keep `.env.local`, `.env.*.local`, `.env.local.save`, and `.env.*.save` ignored.
