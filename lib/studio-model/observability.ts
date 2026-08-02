export const studioModelEvents = ["appearance_setup_started", "appearance_setup_completed", "appearance_updated", "appearance_resolution_fallback"] as const;
export type StudioModelEvent = typeof studioModelEvents[number];

export function safeStudioModelEvent(event: StudioModelEvent, input: { appearanceKey?: string | null; source?: string; completed?: boolean } = {}) {
  return { event, appearanceKey: input.appearanceKey?.slice(0, 40) || "", source: String(input.source || "").slice(0, 40), completed: Boolean(input.completed) };
}

export function logStudioModelEvent(event: StudioModelEvent, input: { appearanceKey?: string | null; source?: string; completed?: boolean } = {}) {
  console.info("fitpick.studio-model", safeStudioModelEvent(event, input));
}
