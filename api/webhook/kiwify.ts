import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyKiwifySignature } from "../_lib/hmac";
import { sha256Normalized, sha256Phone } from "../_lib/hash";
import { sendCAPI } from "../_lib/capi";
import { alreadyProcessed, markProcessed } from "../_lib/idempotency";

export const config = { api: { bodyParser: false } };

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks);
}

type KiwifyOrderPaid = {
  webhook_event_type: string;
  order_id: string;
  order_status: string;
  payment_method: string;
  Customer: {
    email: string;
    first_name: string;
    last_name?: string;
    mobile?: string;
    CPF?: string;
    ip?: string;
  };
  Commissions: { charge_amount: number; currency: string };
  Product: { product_id: string; product_name: string };
  TrackingParameters?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    fbclid?: string;
    fbp?: string;
    fbc?: string;
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const raw = await readRawBody(req);
  const signature = (req.query.signature as string) || "";

  if (!verifyKiwifySignature(raw, signature, process.env.KIWIFY_WEBHOOK_SECRET!)) {
    console.log(JSON.stringify({ level: "warn", msg: "invalid_signature" }));
    return res.status(401).json({ ok: false, reason: "invalid_signature" });
  }

  let body: KiwifyOrderPaid;
  try {
    body = JSON.parse(raw.toString("utf8"));
  } catch {
    return res.status(400).json({ ok: false, reason: "invalid_json" });
  }

  if (body.webhook_event_type !== "order_approved" && body.order_status !== "paid") {
    return res.status(200).json({ ok: true, skipped: "not_paid" });
  }

  if (await alreadyProcessed(body.order_id)) {
    return res.status(200).json({ ok: true, skipped: "duplicate" });
  }

  const userData = {
    em: await sha256Normalized(body.Customer.email),
    ph: body.Customer.mobile ? await sha256Phone(body.Customer.mobile) : undefined,
    fn: await sha256Normalized(body.Customer.first_name),
    ln: body.Customer.last_name ? await sha256Normalized(body.Customer.last_name) : undefined,
    external_id: await sha256Normalized(body.order_id),
    fbp: body.TrackingParameters?.fbp,
    fbc: body.TrackingParameters?.fbc,
    client_ip_address: body.Customer.ip,
    client_user_agent: (req.headers["user-agent"] as string) || undefined,
  };

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await sendCAPI({
        event_name: "Purchase",
        event_id: body.order_id,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_source_url: `https://www.helenarodriguez.site/gracias?oid=${body.order_id}`,
        user_data: userData,
        custom_data: {
          value: body.Commissions.charge_amount,
          currency: body.Commissions.currency,
          content_ids: [body.Product.product_id],
          content_type: "product",
          contents: [
            {
              id: body.Product.product_id,
              quantity: 1,
              item_price: body.Commissions.charge_amount,
            },
          ],
        },
      });
      await markProcessed(body.order_id);
      console.log(
        JSON.stringify({ level: "info", msg: "capi_sent", order_id: body.order_id, attempt })
      );
      return res.status(200).json({ ok: true });
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
    }
  }

  console.log(
    JSON.stringify({
      level: "error",
      msg: "capi_failed",
      order_id: body.order_id,
      error: String(lastErr),
    })
  );
  return res.status(502).json({ ok: false, reason: "capi_failed" });
}
