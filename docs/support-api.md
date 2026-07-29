# MyFitPick Support API Foundation

This is the first standalone API boundary for selling the inbuilt support chat as a service.

The existing MyFitPick user support inbox remains unchanged. External API customers use separate tenant, customer, conversation, and message collections.

## Admin Setup

Create a tenant and first API key from an authenticated admin session:

```http
POST /api/admin/support-api/tenants
Content-Type: application/json

{
  "name": "Example SaaS",
  "slug": "example-saas",
  "apiKeyName": "Production key",
  "allowedOrigins": ["https://example.com"],
  "rateLimitPerMinute": 120,
  "monthlyUsageLimit": 10000,
  "apiKeyScopes": [
    "conversations:read",
    "conversations:write",
    "messages:read",
    "messages:write"
  ]
}
```

The response includes `secret` once. Store it securely. Only the key hash is saved.

The response also includes `webhookSigningSecret` once. Store it securely if the tenant uses webhooks.

List tenants:

```http
GET /api/admin/support-api/tenants
```

## Public API Authentication

Use either:

```http
Authorization: Bearer fsp_xxx
```

or:

```http
x-api-key: fsp_xxx
```

## API Key Scopes

API keys are scoped. A key can only perform actions explicitly granted by its `scopes` array.

Supported scopes:

- `conversations:read`
- `conversations:write`
- `messages:read`
- `messages:write`
- `webhooks:read`

Endpoint requirements:

| Endpoint | Method | Required scope |
| --- | --- | --- |
| `/api/v1/support/conversations` | `GET` | `conversations:read` |
| `/api/v1/support/conversations` | `POST` | `conversations:write` |
| `/api/v1/support/conversations/{conversationId}` | `GET` | `conversations:read` |
| `/api/v1/support/conversations/{conversationId}/messages` | `GET` | `messages:read` |
| `/api/v1/support/conversations/{conversationId}/messages` | `POST` | `messages:write` |

If a key is valid but lacks the required scope, the API returns a safe `FORBIDDEN` response.

## Create Or Reuse A Conversation

```http
POST /api/v1/support/conversations
Authorization: Bearer fsp_xxx
Content-Type: application/json

{
  "customer": {
    "externalId": "user_123",
    "name": "Ada",
    "email": "ada@example.com",
    "metadata": {
      "plan": "starter"
    }
  },
  "subject": "Upload issue",
  "initialMessage": "I need help with an upload.",
  "idempotencyKey": "msg_12345678"
}
```

If no `externalConversationId` is provided, the API reuses the customer's latest open or pending conversation.

## List Conversations

```http
GET /api/v1/support/conversations?status=open&customerExternalId=user_123
Authorization: Bearer fsp_xxx
```

## Get Conversation

```http
GET /api/v1/support/conversations/{conversationId}
Authorization: Bearer fsp_xxx
```

## List Messages

```http
GET /api/v1/support/conversations/{conversationId}/messages
Authorization: Bearer fsp_xxx
```

## Send Customer Message

```http
POST /api/v1/support/conversations/{conversationId}/messages
Authorization: Bearer fsp_xxx
Content-Type: application/json

{
  "body": "Here is more detail.",
  "senderName": "Ada",
  "idempotencyKey": "msg_87654321"
}
```

## Current Limits

- No external hosted agent dashboard yet.
- No attachment support yet.
- No customer-side browser widget package yet.

Those should be implemented as later phases on top of this tenant/key boundary.

## Webhooks

If a tenant has `webhookUrl` configured, MyFitPick sends signed webhook events when external support activity changes.

Current events:

- `conversation.created`
- `message.created`
- `conversation.updated`

Webhook headers:

```http
x-myfitpick-event-id: 64f...
x-myfitpick-event-type: message.created
x-myfitpick-timestamp: 178...
x-myfitpick-signature: v1=...
```

Signature payload:

```text
timestamp.raw_request_body
```

Verification:

```ts
const expected = crypto
  .createHmac("sha256", webhookSigningSecret)
  .update(`${timestamp}.${rawBody}`)
  .digest("hex");
```

Compare `expected` with the value after `v1=` using a timing-safe comparison.

Admin webhook inspection:

```http
GET /api/admin/support-api/webhooks?status=failed
```

Retry a webhook:

```http
POST /api/admin/support-api/webhooks/{eventId}/retry
```

Delivery rules:

- Webhook events are stored before delivery.
- Successful `2xx` responses mark events as delivered.
- Non-`2xx` responses are retried with backoff.
- Permanent failures move to `dead_letter`.
- Secrets are never included in event payloads.

## Usage Metering

Authenticated support API calls create lightweight usage events. Events store:

- tenant id
- API key id
- operation
- method
- path
- response status
- billable units
- timestamp

Request and response payloads are not stored in usage events.

Admin usage inspection:

```http
GET /api/admin/support-api/usage?tenantId={tenantId}&limit=100
```

Optional filter:

```http
GET /api/admin/support-api/usage?operation=messages.create
```

The admin support API console also shows recent usage so the team can see tenant activity before formal billing plans are added.

## Tenant Quotas

Each tenant has a `monthlyUsageLimit`.

Default:

```text
10000 units per calendar month
```

Successful authenticated support API calls count toward the monthly limit. Forbidden, not found, validation, and over-quota events are recorded with `0` billable units where the API key is known.

When a tenant reaches its monthly allowance, public API endpoints return:

```json
{
  "ok": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "This support API tenant has reached its monthly usage limit."
  }
}
```

The admin usage endpoint returns both raw events and the current-month summary:

```json
{
  "usageEvents": [],
  "summary": {
    "periodStart": "2026-07-01T00:00:00.000Z",
    "periodEnd": "2026-08-01T00:00:00.000Z",
    "totalUnits": 42,
    "totalCalls": 42
  }
}
```
