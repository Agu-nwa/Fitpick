# FitPick Deployment Phase 8

## Deployment Overview

FitPick is prepared for production deployment on AWS EC2 with a Next.js production build, PM2 process management, and Nginx as the public reverse proxy. The mobile-first app shell, bottom navigation, compact flows, and production error handling remain in place.

Current EC2 validation:

- App transferred to EC2.
- PM2 process can run online.
- Next.js can listen on `0.0.0.0:3000`.
- `curl http://127.0.0.1:3000/home` returned `200 OK`.

Production traffic should go through Nginx on port 80 and, after domain setup, HTTPS on port 443. Do not expose port 3000 publicly except for temporary testing.

## Production Architecture

- Browser or mobile PWA request reaches EC2 security group.
- Nginx listens on port 80 and later 443.
- Nginx proxies requests to `http://127.0.0.1:3000`.
- PM2 keeps the Next.js production server running.
- Next.js serves frontend routes and App Router API routes.
- MongoDB, S3/CloudFront, AI provider, Stripe, and CoinPayments are configured through environment variables.

## EC2 Folder Location

Recommended app folder:

```bash
/home/ec2-user/fitpick
```

If the project was copied elsewhere, run all commands from that deployed project folder.

## Environment Variables

Create `.env.local` on EC2 from `.env.example`. Do not commit `.env.local`.

Required production groups:

- App/session: `NODE_ENV`, `APP_URL`, `NEXT_PUBLIC_APP_URL`, `SESSION_COOKIE_NAME`, `JWT_SECRET`
- Database: `MONGODB_URI`
- S3/CloudFront: `STORAGE_PROVIDER`, `S3_BUCKET`, `S3_REGION`, `S3_PUBLIC_BASE_URL`; optional `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` when not using EC2 IAM role credentials
- AI tagging: `OPENAI_API_KEY`
- Credit purchases: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `COINPAYMENTS_API_BASE_URL`, `COINPAYMENTS_CLIENT_ID`, `COINPAYMENTS_CLIENT_SECRET`, `COINPAYMENTS_WEBHOOK_SECRET`, `COINPAYMENTS_WEBHOOK_URL`, `COINPAYMENTS_USD_CURRENCY_ID`, `COINPAYMENTS_USDT_NETWORK_ALLOWLIST`
- Optional rate limiting: `RATE_LIMIT_REDIS_URL`

See `docs/production-env-checklist.md` for the full checklist.

## Install Commands

Amazon Linux / EC2 baseline:

```bash
sudo dnf update -y
sudo dnf install -y git nginx
```

Install Node.js 20 with your preferred approved method, then install app dependencies:

```bash
cd /home/ec2-user/fitpick
npm ci
```

## Build Commands

```bash
npm run check:routes
npm run test:safety-copy
npm run test:secret-scan
npm run deploy:check
npm run build
```

## PM2 Commands

Install PM2 if it is not already installed:

```bash
sudo npm install -g pm2
```

Start FitPick in production:

```bash
pm2 start npm --name fitpick -- start -- --hostname 0.0.0.0 --port 3000
```

Persist PM2 across restarts:

```bash
pm2 save
pm2 startup
```

Operate the process:

```bash
pm2 status
pm2 logs fitpick --lines 100
pm2 restart fitpick
pm2 delete fitpick
```

## Nginx Setup

Install and start Nginx:

```bash
sudo dnf install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

Create a site config such as `/etc/nginx/conf.d/fitpick.conf`:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_PUBLIC_IP;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Validate and restart:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

## Security Group Rules

Production inbound rules:

- `80` HTTP from `0.0.0.0/0`
- `443` HTTPS from `0.0.0.0/0`
- `22` SSH only from a trusted IP whenever possible

Temporary testing only:

- `3000` Custom TCP from a trusted IP, or briefly from `0.0.0.0/0`

Prefer Nginx on port 80 over public access to port 3000.

## HTTPS and Domain Readiness

Before using real payments, point the domain DNS A record to the EC2 public IP and enable HTTPS.

Placeholder Certbot commands:

```bash
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN
```

HTTPS should be active before live Stripe or CoinPayments purchases. Payment webhook URLs should use HTTPS.

## Payment Webhook Production Notes

Webhook URLs:

- Stripe: `https://YOUR_DOMAIN/api/webhooks/stripe`
- CoinPayments: `https://YOUR_DOMAIN/api/webhooks/coinpayments`

Configure webhook secrets in `.env.local`. Test webhooks in sandbox mode before activating live payments.

## S3 + CloudFront Production Notes

- Set `STORAGE_PROVIDER=s3`.
- On EC2, prefer IAM role credentials and leave `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` empty. If static keys are configured, keep `S3_SECRET_ACCESS_KEY` server-only.
- Test signed upload from `/wardrobe/add`.
- Test image preview on `/wardrobe` and `/wardrobe/[id]`.
- Confirm CloudFront can read uploaded S3 objects.
- Do not show raw S3 errors, signed URLs, or storage internals in customer UI.

## AI Tagging Production Notes

- Production wardrobe analysis uses OpenAI. Missing OpenAI credentials fail closed with clear setup messaging.
- User review must remain required.
- Suggested tags must not auto-save without confirmation.

## Production Smoke Checks

On EC2, after PM2 starts:

```bash
curl -I http://127.0.0.1:3000/home
curl -I http://127.0.0.1:3000/api/health
curl -I http://127.0.0.1:3000/backend-ready
```

From a browser before Nginx, only if port 3000 is temporarily open:

```text
http://PUBLIC_IP/home
http://PUBLIC_IP/onboarding
http://PUBLIC_IP/backend-ready
```

After Nginx:

```text
http://PUBLIC_IP/home
```

After domain and HTTPS:

```text
https://YOUR_DOMAIN/home
```

## Logs and Health

Application logs:

```bash
pm2 logs fitpick --lines 100
```

Nginx logs:

```bash
sudo tail -n 100 /var/log/nginx/access.log
sudo tail -n 100 /var/log/nginx/error.log
```

Health checks:

- `/api/health`
- `/home`
- `/backend-ready`
- `/wardrobe`
- `/outfit`

## Restart Commands

```bash
pm2 restart fitpick
sudo systemctl restart nginx
```

## Rollback Notes

Keep the previous release folder or previous git commit available. If a deployment fails:

```bash
pm2 stop fitpick
git checkout PREVIOUS_SAFE_COMMIT
npm ci
npm run build
pm2 restart fitpick
sudo nginx -t
sudo systemctl restart nginx
```

If Nginx config is the issue, restore the previous `/etc/nginx/conf.d/fitpick.conf`, run `sudo nginx -t`, then restart Nginx.

## Known Production Limitations

- Real domain setup remains.
- HTTPS activation remains.
- Live Stripe activation remains.
- Live CoinPayments activation remains.
- Webhook sandbox and live verification remain.
- Production MongoDB security review remains.
- Production S3/CloudFront delivery hardening remains.
- Production AI provider selection and tuning remain.
- Push notification delivery remains.
- App-store packaging remains.
- Monitoring and alerts remain.
