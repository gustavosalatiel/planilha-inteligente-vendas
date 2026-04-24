// Idempotencia vía Upstash Redis REST (free tier: 10k cmd/día).
// Key: kw:<order_id>  TTL: 30 días.

const TTL_SECONDS = 60 * 60 * 24 * 30;

async function upstash(cmd: string[]): Promise<unknown> {
  const base = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) throw new Error("upstash env missing");

  const url = `${base}/${cmd.map(encodeURIComponent).join("/")}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`upstash ${resp.status}`);
  const j = (await resp.json()) as { result: unknown };
  return j.result;
}

export async function alreadyProcessed(orderId: string): Promise<boolean> {
  const r = (await upstash(["GET", `kw:${orderId}`])) as string | null;
  return r !== null;
}

export async function markProcessed(orderId: string): Promise<void> {
  await upstash(["SET", `kw:${orderId}`, "1", "EX", String(TTL_SECONDS)]);
}
