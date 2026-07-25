export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { dismissChecklist, dismissOnboardingTip, getOnboardingState, markWelcomeComplete } from "@/lib/onboarding/onboarding-state";
import { readJson, validateBody } from "@/lib/validation";

const onboardingPatchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("complete_welcome") }),
  z.object({ action: z.literal("dismiss_checklist") }),
  z.object({ action: z.literal("dismiss_tip"), tipId: z.enum(["closet", "create-look", "match-outfit", "virtual-try-on"]) })
]);

export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const onboarding = await getOnboardingState(auth.user);
    return apiSuccess({ onboarding });
  } catch (error) {
    logSafeError("onboarding.get", error);
    return apiError("INTERNAL_ERROR", "Unable to load onboarding right now.");
  }
}

export async function PATCH(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `onboarding:${meta.ip}`, limit: 40, windowMs: 60_000, operation: "onboarding" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const parsed = validateBody(onboardingPatchSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const onboarding = parsed.data.action === "complete_welcome"
      ? await markWelcomeComplete(auth.user)
      : parsed.data.action === "dismiss_checklist"
        ? await dismissChecklist(auth.user)
        : await dismissOnboardingTip(auth.user, parsed.data.tipId);

    await recordAuditEvent({ request, userId: String(auth.user._id), action: "onboarding.update", entityType: "User", entityId: String(auth.user._id) });
    return apiSuccess({ onboarding });
  } catch (error) {
    logSafeError("onboarding.patch", error);
    return apiError("INTERNAL_ERROR", "Unable to update onboarding right now.");
  }
}
