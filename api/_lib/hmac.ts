import crypto from "node:crypto";

// Kiwify firma el webhook con HMAC-SHA1 sobre el raw body, usando el secret del panel.
// El valor viene en la query string: ?signature=<hex>
export function verifyKiwifySignature(
  rawBody: Buffer,
  providedHex: string,
  secret: string
): boolean {
  if (!providedHex || !secret) return false;
  const expected = crypto.createHmac("sha1", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(providedHex, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
