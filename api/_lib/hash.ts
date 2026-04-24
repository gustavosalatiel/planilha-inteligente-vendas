import crypto from "node:crypto";

export async function sha256Normalized(input: string): Promise<string> {
  const clean = String(input || "").trim().toLowerCase();
  if (!clean) return "";
  return crypto.createHash("sha256").update(clean, "utf8").digest("hex");
}

export async function sha256Phone(input: string): Promise<string> {
  const digits = String(input || "").replace(/\D/g, "");
  if (!digits) return "";
  return crypto.createHash("sha256").update(digits, "utf8").digest("hex");
}
