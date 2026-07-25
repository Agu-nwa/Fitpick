# MyFitPick Support Realtime Deployment

Phase 1 human support uses a dedicated Socket.IO process named `fitpick-realtime` in `ecosystem.config.js`.

## Required Environment

- `SUPPORT_CHAT_ENABLED=true`
- `SUPPORT_REALTIME_PORT=3003`
- `NEXT_PUBLIC_SUPPORT_REALTIME_URL=https://myfitpick.com`
- `SUPPORT_ALLOWED_ORIGINS=https://myfitpick.com`
- `SUPPORT_SOCKET_TOKEN_SECRET=` optional if `JWT_SECRET` is already configured with at least 32 characters
- `SUPPORT_ATTACHMENT_MAX_BYTES=10485760`
- `SUPPORT_MESSAGE_MAX_LENGTH=2000`

Do not expose `SUPPORT_SOCKET_TOKEN_SECRET` as a `NEXT_PUBLIC_` value.

## PM2

```bash
pm2 startOrRestart ecosystem.config.js --update-env
pm2 status
pm2 save
```

If `SUPPORT_CHAT_ENABLED=false`, the realtime process exits cleanly and the launcher stays hidden.

## Load Balancer

Route Socket.IO WebSocket traffic to the realtime target port.

- Target port: `SUPPORT_REALTIME_PORT` (default `3003`)
- Health check path: `/healthz`
- Protocol: HTTP behind the HTTPS load balancer
- WebSocket upgrade: enabled
- Idle timeout: at least 60 seconds
- Allowed origin: production app origin, for example `https://myfitpick.com`

The Next.js app should remain the normal web target. Keep the realtime process behind the same HTTPS origin when possible so browser cookies and CORS remain straightforward.
