import sharp from "sharp";

export async function createPerceptualImageHash(buffer: Buffer) {
  const { data } = await sharp(buffer, { animated: false })
    .rotate()
    .greyscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let bits = "";
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const offset = row * 9 + column;
      bits += data[offset] > data[offset + 1] ? "1" : "0";
    }
  }
  return BigInt(`0b${bits}`).toString(16).padStart(16, "0");
}

export function perceptualHashDistance(left: string, right: string) {
  if (!/^[a-f\d]{16}$/i.test(left) || !/^[a-f\d]{16}$/i.test(right)) return Number.POSITIVE_INFINITY;
  let value = BigInt(`0x${left}`) ^ BigInt(`0x${right}`);
  let distance = 0;
  while (value) {
    distance += Number(value & BigInt(1));
    value >>= BigInt(1);
  }
  return distance;
}
