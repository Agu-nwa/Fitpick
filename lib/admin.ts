import { apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";

export async function requireAdmin() {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  if (auth.user.role !== "admin") {
    return {
      ok: false as const,
      response: apiError("FORBIDDEN", "Admin access is required.")
    };
  }

  return auth;
}
