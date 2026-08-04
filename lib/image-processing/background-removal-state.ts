export const backgroundRemovalDisabledState = "background_removal_disabled" as const;

let warningEmitted = false;

export function reportBackgroundRemovalDisabled() {
  if (!warningEmitted) {
    warningEmitted = true;
    console.warn("fitpick.upload.background-removal", {
      state: backgroundRemovalDisabledState,
      providerConfigured: Boolean(process.env.BACKGROUND_REMOVAL_PROVIDER),
      action: "Uploads will keep the normalized original; enable a reviewed provider integration before requesting cutouts.",
      timestamp: new Date().toISOString()
    });
  }
  return backgroundRemovalDisabledState;
}
