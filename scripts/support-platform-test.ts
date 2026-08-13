import assert from "node:assert/strict";
import { getSupportAttachmentMaxBytes, getSupportMessageMaxLength, isSupportChatEnabled } from "../lib/support/config";
import {
  adminSupportListQuerySchema,
  supportAttachmentSchema,
  supportInternalNoteSchema,
  supportMessageBodySchema,
  supportSocketJoinSchema,
  supportStatusPatchSchema
} from "../schemas/support.schema";
import { readFileSync } from "node:fs";

const objectId = "66a1017c73695e254a0811e9";

assert.equal(isSupportChatEnabled(), true, "support chat defaults to enabled unless explicitly disabled");
assert.equal(getSupportMessageMaxLength() > 0, true, "message length limit must be positive");
assert.equal(getSupportAttachmentMaxBytes() > 0, true, "attachment byte limit must be positive");

assert.equal(supportMessageBodySchema.safeParse({ body: "Hello support", idempotencyKey: "support-123" }).success, true, "valid text message should pass");
assert.equal(supportMessageBodySchema.safeParse({ body: "", attachments: [] }).success, false, "empty message without attachment should fail");
assert.equal(supportMessageBodySchema.safeParse({ body: "x".repeat(getSupportMessageMaxLength() + 1) }).success, false, "oversized message should fail");

assert.equal(
  supportAttachmentSchema.safeParse({
    key: `support/${objectId}/image.webp`,
    url: "https://cdn.myfitpick.com/support/image.webp",
    filename: "image.webp",
    mimeType: "image/webp",
    size: 1000,
    width: 800,
    height: 1000
  }).success,
  true,
  "valid attachment metadata should pass"
);
assert.equal(
  supportAttachmentSchema.safeParse({ key: "bad", url: "not-url", filename: "x.exe", mimeType: "application/javascript", size: 1, width: 1, height: 1 }).success,
  false,
  "unsupported attachment metadata should fail"
);

assert.equal(adminSupportListQuerySchema.safeParse({ status: "open", unread: "support", search: "charles" }).success, true, "admin filters should pass");
assert.equal(supportStatusPatchSchema.safeParse({ status: "archived" }).success, false, "unknown statuses should fail");
assert.equal(supportInternalNoteSchema.safeParse({ body: "Customer reported upload trouble after retry." }).success, true, "internal note should pass");
assert.equal(supportInternalNoteSchema.safeParse({ body: "" }).success, false, "blank internal note should fail");
assert.equal(supportSocketJoinSchema.safeParse({ conversationId: objectId }).success, true, "socket join payload should pass");
assert.equal(supportSocketJoinSchema.safeParse({ conversationId: "not-an-id" }).success, false, "socket join must reject invalid conversation ids");

const supportClient = readFileSync("components/support/SupportChatClient.tsx", "utf8");
assert.ok(supportClient.includes('aria-label="Attach image"'), "support attachment control must have an accessible name");
assert.ok(supportClient.includes('aria-label="Support message"'), "support message field must have an accessible name");

console.log("Support platform validation checks passed.");
