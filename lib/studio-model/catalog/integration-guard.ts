export function assertStudioModelIntegrationEnvironment() {
  if (process.env.STUDIO_MODEL_INTEGRATION_TEST_ENABLED !== "true") throw new Error("studio_model_integration_disabled");
  const uri = process.env.MONGODB_URI || "";
  let database = "";
  try { database = new URL(uri).pathname.replace(/^\//, "").split("?")[0]; } catch { throw new Error("studio_model_integration_database_invalid"); }
  if (!/(test|staging|integration)/i.test(database)) throw new Error("studio_model_integration_database_unsafe");
  const prefix = String(process.env.STUDIO_MODEL_INTEGRATION_TEST_PREFIX || "").replace(/^\/+/, "");
  if (!prefix.startsWith("studio-model-integration/")) throw new Error("studio_model_integration_prefix_unsafe");
  return { database, prefix };
}
