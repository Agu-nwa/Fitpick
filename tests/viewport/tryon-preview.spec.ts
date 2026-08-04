import { expect, test } from "@playwright/test";

const devices = [
  { name: "iphone-se", width: 375, height: 667 },
  { name: "iphone-13-14", width: 390, height: 844 },
  { name: "iphone-14-pro-max", width: 430, height: 932 },
  { name: "iphone-15-pro", width: 393, height: 852 },
  { name: "iphone-15-pro-max", width: 430, height: 932 }
] as const;

function previewDocument(textScale = 1) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>
    *{box-sizing:border-box}html{font-size:${16 * textScale}px}body{margin:0;background:#f8f4ec;color:#211d1a;font-family:Arial,sans-serif;overflow-x:clip}.shell{min-width:0;padding:calc(16px + env(safe-area-inset-top)) 16px calc(176px + env(safe-area-inset-bottom))}.content{max-width:1024px;margin:auto;min-width:0}.hero,.card{background:#fff;border:1px solid #dfd4c4;border-radius:28px;padding:24px;min-width:0}.hero h1{font-family:Georgia,serif;font-size:clamp(2rem,11vw,3.5rem);line-height:.95;margin:10px 0;overflow-wrap:anywhere}.grid{display:grid;gap:18px;margin-top:20px;min-width:0}.preview{aspect-ratio:3/4;width:100%;max-width:100%;object-fit:contain;border-radius:24px;background:linear-gradient(135deg,#f4e8da,#faf8f3,#e6ebe4);display:block}.aside{display:grid;gap:16px;min-width:0}.items{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.item{aspect-ratio:1;border-radius:18px;background:#f8f4ec;padding:12px;min-width:0;overflow-wrap:anywhere}.action{min-height:48px;border:0;border-radius:999px;background:#211d1a;color:white;font:inherit}.nav{position:fixed;left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));min-height:80px;border:1px solid #dfd4c4;border-radius:999px;background:rgba(255,255,255,.96);display:flex;align-items:center;justify-content:space-around;padding:8px;z-index:10}.error{line-height:1.5}.loading{min-height:120px;display:flex;align-items:center;justify-content:center}@media(min-width:900px){.grid{grid-template-columns:minmax(0,1.35fr) minmax(340px,.85fr)}}
  </style></head><body><main class="shell"><div class="content"><header class="hero"><small>PREVIEW THIS LOOK</small><h1>A polished wedding guest look with a deliberately long editorial title</h1><p>Styled for the occasion and current weather.</p></header><div class="grid"><section class="card"><img class="preview" alt="Full-body preview" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='800'%3E%3Crect width='600' height='800' fill='%23eee7dc'/%3E%3Ccircle cx='300' cy='170' r='70' fill='%23776b62'/%3E%3Crect x='210' y='245' width='180' height='390' rx='60' fill='%235f877f'/%3E%3C/svg%3E"></section><aside class="aside"><section class="card"><strong>Core outfit preview</strong><p>Your complete look includes all selected pieces. Some small accessories may not appear in the generated preview.</p></section><section class="card"><strong>Styled Look</strong><div class="items"><div class="item">Tailored shirt</div><div class="item">Formal shoes</div><div class="item">Evening bag</div><div class="item">Wrist watch</div></div></section><section class="card loading">Preparing your preview…</section><section class="card error"><strong>Virtual Try-On couldn't be completed.</strong><p>Your Credits were not deducted.</p></section><button class="action">Save Look</button></aside></div></div></main><nav class="nav"><span>Home</span><span>Closet</span><span>Stylist</span><span>Profile</span></nav></body></html>`;
}

async function assertLayout(page: import("@playwright/test").Page) {
  const result = await page.evaluate(() => {
    const nav = document.querySelector(".nav")!.getBoundingClientRect();
    const action = document.querySelector(".action")!.getBoundingClientRect();
    const preview = document.querySelector(".preview")! as HTMLImageElement;
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      actionWidth: action.width,
      navVisible: nav.bottom <= window.innerHeight && nav.top >= 0,
      objectFit: getComputedStyle(preview).objectFit,
      shellPaddingBottom: Number.parseFloat(getComputedStyle(document.querySelector(".shell")!).paddingBottom)
    };
  });
  expect(result.overflow).toBeLessThanOrEqual(0);
  expect(result.actionWidth).toBeGreaterThan(0);
  expect(result.navVisible).toBe(true);
  expect(result.objectFit).toBe("contain");
  expect(result.shellPaddingBottom).toBeGreaterThanOrEqual(176);
}

for (const device of devices) {
  test(`${device.name} portrait preview contract`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: device.width, height: device.height });
    await page.setContent(previewDocument());
    await assertLayout(page);
    await page.screenshot({ path: testInfo.outputPath(`${device.name}.png`), fullPage: true });
  });
}

test("orientation and dynamic text sizing remain usable", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 852, height: 393 });
  await page.setContent(previewDocument(1.25));
  await assertLayout(page);
  await page.screenshot({ path: testInfo.outputPath("iphone-15-pro-landscape-large-text.png"), fullPage: true });
});
