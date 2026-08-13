import { expect, test } from "@playwright/test";

const viewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 393, height: 852 },
  { width: 414, height: 896 },
  { width: 430, height: 932 }
] as const;

function composerDocument() {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>
    *{box-sizing:border-box}body{margin:0;background:#faf7f0;color:#211d1a;font-family:Arial,sans-serif;overflow-x:clip}.page{min-height:100svh;padding:24px 16px calc(176px + env(safe-area-inset-bottom))}.intro,.composer,.content{max-width:760px;margin-inline:auto}.intro{padding:56px 0 28px}.intro h1{font-family:Georgia,serif;font-size:clamp(2.8rem,14vw,5rem);line-height:.92;margin:12px 0;overflow-wrap:anywhere}.composer{position:relative;margin-bottom:32px;border:1px solid #ded4c6;border-radius:24px;background:#fffdfa;padding:14px}.composer textarea{display:block;width:100%;min-height:64px;border:0;background:transparent;font:inherit;resize:none}.actions{display:flex;align-items:center;justify-content:space-between;gap:12px}.actions button{min-height:44px;border-radius:14px;border:1px solid #ded4c6;background:white;padding:0 16px}.actions .send{width:44px;padding:0;background:#5f877f;color:white}.content{border-top:1px solid #ded4c6;padding:32px 0;line-height:1.6}.nav{position:fixed;inset-inline:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:10;min-height:76px;border:1px solid #ded4c6;border-radius:28px;background:rgba(255,255,255,.96);display:flex;align-items:center;justify-content:space-around}
  </style></head><body><main class="page"><header class="intro"><small>MYFITPICK AI STYLIST</small><h1>Describe it. I’ll style it.</h1><p>Share an occasion, mood, or weather.</p></header><form class="composer"><textarea placeholder="Ask MyFitPick to style a look..."></textarea><div class="actions"><button type="button">Add image</button><button class="send" type="submit">↑</button></div></form><section class="content"><h2>What are you dressing for?</h2><p>Tell me where you’re going, how you want to feel, and any piece you’d like to wear. This content must remain readable without passing beneath the composer.</p></section></main><nav class="nav"><span>Home</span><span>Closet</span><span>Stylist</span><span>Looks</span><span>Profile</span></nav></body></html>`;
}

for (const viewport of viewports) {
  test(`normal-flow composer at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.setContent(composerDocument());

    const contract = await page.evaluate(() => {
      const composer = document.querySelector(".composer")!.getBoundingClientRect();
      const content = document.querySelector(".content")!.getBoundingClientRect();
      const nav = document.querySelector(".nav")!.getBoundingClientRect();
      return {
        composerPosition: getComputedStyle(document.querySelector(".composer")!).position,
        contentStartsAfterComposer: content.top >= composer.bottom,
        navVisible: nav.top >= 0 && nav.bottom <= window.innerHeight,
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
      };
    });

    expect(contract.composerPosition).toBe("relative");
    expect(contract.contentStartsAfterComposer).toBe(true);
    expect(contract.navVisible).toBe(true);
    expect(contract.horizontalOverflow).toBeLessThanOrEqual(0);
  });
}
