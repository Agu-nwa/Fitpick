const baseUrl = process.env.BACKEND_SMOKE_BASE_URL || "http://127.0.0.1:3000";
const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;
const name = process.env.TEST_USER_NAME || "QA User";

if (!email || !password) {
  console.error("Set TEST_USER_EMAIL and TEST_USER_PASSWORD to run authenticated QA.");
  process.exit(1);
}

let cookie = "";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    redirect: "manual"
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function run() {
  let result = await request("/api/auth/login", { method: "POST", body: { email, password } });
  if (result.response.status === 401) {
    result = await request("/api/auth/register", { method: "POST", body: { email, password, name } });
  }
  if (!result.payload?.ok) throw new Error("Could not authenticate test user.");

  const checks = [
    ["session", () => request("/api/auth/me")],
    ["wardrobe", () => request("/api/wardrobe")],
    ["wallet", () => request("/api/wallet")],
    ["purchases", () => request("/api/payments/purchases")],
    ["looks", () => request("/api/looks")],
    ["notifications", () => request("/api/notifications/preferences")]
  ];

  for (const [label, fn] of checks) {
    const check = await fn();
    console.log(`${check.payload?.ok ? "PASS" : "FAIL"} ${label} -> ${check.response.status}`);
    if (!check.payload?.ok) process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error("Authenticated QA failed:", error.message);
  process.exit(1);
});
