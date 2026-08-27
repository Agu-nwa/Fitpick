import { AccountDeletionRequest } from "@/models/AccountDeletionRequest";
import { AuditEvent } from "@/models/AuditEvent";
import { BackgroundJob } from "@/models/BackgroundJob";
import { EmailOtp } from "@/models/EmailOtp";
import { PrivacyRequest } from "@/models/PrivacyRequest";

function days(value: string | undefined, fallback: number) {
  const parsed = Number(value || fallback);
  return Math.max(1, Math.min(Number.isFinite(parsed) ? parsed : fallback, 3650));
}

export async function runRetentionCleanup(now = new Date()) {
  const terminalJobCutoff = new Date(now.getTime() - days(process.env.TERMINAL_JOB_RETENTION_DAYS, 30) * 86_400_000);
  const auditCutoff = new Date(now.getTime() - days(process.env.AUDIT_RETENTION_DAYS, 730) * 86_400_000);
  const deletionCutoff = new Date(now.getTime() - days(process.env.DELETION_REQUEST_RETENTION_DAYS, 730) * 86_400_000);
  const [otps, jobs, audits, privacyRequests, deletionRequests] = await Promise.all([
    EmailOtp.deleteMany({ expiresAt: { $lt: now } }),
    BackgroundJob.deleteMany({ status: { $in: ["completed", "failed", "cancelled", "dead_letter"] }, updatedAt: { $lt: terminalJobCutoff } }),
    AuditEvent.deleteMany({ createdAt: { $lt: auditCutoff } }),
    PrivacyRequest.deleteMany({ expiresAt: { $lt: now } }),
    AccountDeletionRequest.deleteMany({ completedAt: { $ne: null, $lt: deletionCutoff } })
  ]);
  return { expiredOtps: otps.deletedCount, terminalJobs: jobs.deletedCount, auditEvents: audits.deletedCount, privacyRequests: privacyRequests.deletedCount, deletionRequests: deletionRequests.deletedCount };
}
