import crypto from "crypto";
export function studioModelAssetHash(body: Buffer) { return crypto.createHash("sha256").update(body).digest("hex"); }

