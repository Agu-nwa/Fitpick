import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  outputDir: "test-results/viewport",
  reporter: "line",
  use: {
    browserName: "chromium",
    screenshot: "only-on-failure"
  }
});
