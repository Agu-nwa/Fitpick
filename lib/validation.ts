import { z, ZodError, type ZodTypeAny } from "zod";
import { apiError } from "@/lib/api-response";

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function validateBody<TSchema extends ZodTypeAny>(schema: TSchema, body: unknown) {
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return {
      ok: false as const,
      response: apiError("VALIDATION_ERROR", "Please review the highlighted fields.", {
        details: formatZodError(parsed.error)
      })
    };
  }

  return { ok: true as const, data: parsed.data as z.output<TSchema> };
}

export function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));
}
