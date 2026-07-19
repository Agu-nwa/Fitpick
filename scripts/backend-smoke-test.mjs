const baseUrl = process.env.BACKEND_SMOKE_BASE_URL || "http://127.0.0.1:3000";

const checks = [
  { method: "GET", path: "/api/health", expected: 200 },
  { method: "GET", path: "/api/payments/providers", expected: 200 },
  { method: "GET", path: "/api/auth/me", expected: 401 },
  { method: "GET", path: "/api/wardrobe", expected: 401 },
  { method: "POST", path: "/api/wardrobe", expected: 401, body: { name: "Test shirt", category: "tops", color: "White" } },
  { method: "POST", path: "/api/wardrobe/upload", expected: 401, body: { filename: "shirt.jpg", mimeType: "image/jpeg", sizeBytes: 1000 } },
  { method: "POST", path: "/api/wardrobe/upload/test/suggest-tags", expected: [401, 404], body: {} },
  { method: "POST", path: "/api/outfits/recommend", expected: 401, body: { occasionName: "Work" } },
  { method: "GET", path: "/api/looks", expected: 401 },
  { method: "GET", path: "/api/payments/purchases", expected: 401 },
  { method: "POST", path: "/api/payments/stripe/checkout", expected: 401, body: { packId: "starter" } },
  { method: "POST", path: "/api/payments/usdt/checkout", expected: 401, body: { packId: "starter", network: "usdt-trc20" } },
  { method: "GET", path: "/api/notifications/preferences", expected: 401 },
  {
    method: "POST",
    path: "/api/uploads/signed-url",
    expected: 401,
    body: { filename: "shirt.jpg", mimeType: "image/jpeg", sizeBytes: 1000 }
  }
];

async function run() {
  const results = [];

  for (const check of checks) {
    try {
      const response = await fetch(`${baseUrl}${check.path}`, {
        method: check.method,
        headers: check.body ? { "content-type": "application/json" } : undefined,
        body: check.body ? JSON.stringify(check.body) : undefined,
        redirect: "manual"
      });
      const body = await response.text();
      const expected = Array.isArray(check.expected) ? check.expected : [check.expected];
      const passed = expected.includes(response.status);
      results.push({ ...check, status: response.status, passed, body: body.slice(0, 160) });
    } catch (error) {
      results.push({
        ...check,
        status: "NETWORK_ERROR",
        passed: false,
        body: error instanceof Error ? error.message : String(error)
      });
    }
  }

  for (const result of results) {
    console.log(`${result.passed ? "PASS" : "FAIL"} ${result.method} ${result.path} -> ${result.status}`);
  }

  const failed = results.filter((result) => !result.passed);
  if (failed.length) {
    console.error(JSON.stringify(failed, null, 2));
    process.exit(1);
  }
}

run().catch((error) => {
  console.error("Backend smoke test failed:", error);
  process.exit(1);
});
