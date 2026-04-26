// Endpoint público de tracking server-side.
// Chamado via navigator.sendBeacon() do <head> do HTML para disparar PageView/ViewContent
// no Meta CAPI ANTES de qualquer JS pesado carregar (GTM, Cookiebot, fbevents.js).
//
// Vantagens:
// - Bypassa adblockers (mesmo domínio)
// - Funciona em iOS ATT (server-to-server, ATT não bloqueia)
// - Recupera ~10-25% do connect rate perdido
//
// Runtime Edge: latência ~30-80ms global, sem cold start.

import { sendCAPI } from "./_lib/capi.js";

export const config = { runtime: "edge" };

type Body = {
  event_name?: "PageView" | "ViewContent" | "Lead";
  event_id?: string;
  url?: string;
  fbp?: string;
  fbc?: string;
  external_id?: string;
};

const ALLOWED_EVENTS = new Set(["PageView", "ViewContent", "Lead"] as const);

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  const ip = xff.split(",")[0]?.trim();
  if (ip) return ip;
  return req.headers.get("x-real-ip") || "";
}

export default async function handler(req: Request): Promise<Response> {
  // CORS / headers — same-origin então CORS não é necessário,
  // mas mantém OPTIONS resposta rápida.
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  // Warm-up: GET com ?warmup=1 mantém a Edge Function quente sem disparar CAPI.
  // Chamado por cron externo (GitHub Actions) a cada 5min.
  // Resposta cacheável de 1s pra que múltiplos warmups concorrentes não acumulem.
  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.searchParams.get("warmup") === "1") {
      return new Response("ok", {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": "public, max-age=1",
        },
      });
    }
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const eventName = body.event_name || "PageView";
  if (!ALLOWED_EVENTS.has(eventName as never)) {
    return new Response("Invalid event_name", { status: 400 });
  }

  const eventId = (body.event_id || "").trim();
  if (!eventId || eventId.length > 128) {
    return new Response("Invalid event_id", { status: 400 });
  }

  const ua = req.headers.get("user-agent") || "";
  const ip = clientIp(req);
  const referer = req.headers.get("referer") || "";
  const url = body.url || referer || "";

  // Validações leves contra spam óbvio
  if (!ua || ua.length < 10) {
    return new Response("", { status: 204 });
  }

  try {
    await sendCAPI({
      event_name: eventName as Body["event_name"] extends infer T ? T : never,
      event_id: eventId,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      event_source_url: url,
      user_data: {
        client_ip_address: ip || undefined,
        client_user_agent: ua,
        fbp: body.fbp || undefined,
        fbc: body.fbc || undefined,
        external_id: body.external_id || undefined,
      },
    } as never);
  } catch (err) {
    // Falha silenciosa para não impactar UX.
    // Em produção, logar para Sentry/Logtail.
    console.error("CAPI error:", err);
    return new Response("", { status: 202 });
  }

  return new Response("", { status: 204 });
}
