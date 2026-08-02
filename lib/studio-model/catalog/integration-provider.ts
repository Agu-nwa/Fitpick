import sharp from "sharp";
export type StudioModelGenerationProvider = { name: string; generate(prompt: string): Promise<{ body: Buffer; requestId?: string; model?: string }> };
let stubCalls = 0;
export function resetStudioModelStubCalls(){stubCalls=0;} export function studioModelStubCalls(){return stubCalls;}
export const deterministicStudioModelStub: StudioModelGenerationProvider = {
  name: "deterministic_stub",
  async generate() {
    stubCalls += 1;
    const body = await sharp({ create: { width: 1024, height: 1536, channels: 3, background: { r: 238, g: 232, b: 221 } } }).png().toBuffer();
    return { body, requestId: "stub-request", model: "fixture-v1" };
  }
};
