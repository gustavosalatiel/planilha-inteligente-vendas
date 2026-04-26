// Endpoint público de tracking server-side (Edge runtime).
// Chamado via navigator.sendBeacon() do <head> para disparar PageView/ViewContent
// no Meta CAPI antes de qualquer JS pesado carregar (GTM, Cookiebot, fbevents.js).
//
// Recursos:
// - Anti-bot: valida Origin/Referer same-origin
// - Geo enrichment: usa headers Vercel (country/region/city/zip) → hash SHA-256
// - Cookies _fbp/_fbc da requisição (fallback se inline script não setou)
// - external_id persistente do visitor (vem do localStorage no client)
// - Warmup endpoint via GET ?warmup=1

import { sendCAPI } from "./_lib/capi.js";
import { waitUntil } from "@vercel/functions";

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
const ALLOWED_HOSTS = new Set([
  "https://www.helenarodriguez.site",
  "https://helenarodriguez.site",
]);

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  const ip = xff.split(",")[0]?.trim();
  if (ip) return ip;
  return req.headers.get("x-real-ip") || "";
}

async function sha256Hex(input: string): Promise<string> {
  const clean = String(input || "").trim().toLowerCase();
  if (!clean) return "";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clean));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Lê cookie do request header (fallback se body não passou _fbp/_fbc)
function readCookie(req: Request, name: string): string {
  const cookieHeader = req.headers.get("cookie") || "";
  const m = cookieHeader.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : "";
}

// Valida que a requisição veio do nosso domínio (anti-bot básico)
function originValid(req: Request): boolean {
  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";

  if (origin) return ALLOWED_HOSTS.has(origin);
  if (referer) {
    try {
      const o = new URL(referer).origin;
      return ALLOWED_HOSTS.has(o);
    } catch {
      return false;
    }
  }
  // Sem Origin nem Referer (privacy extension agressiva): permite passar.
  // sendBeacon sempre manda Origin, então quem chega aqui sem header é raro.
  return true;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  // Warmup do cron: GET ?warmup=1
  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.searchParams.get("warmup") === "1") {
      return new Response("ok", {
        status: 200,
        headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=1" },
      });
    }
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Anti-bot: valida origem
  if (!originValid(req)) {
    return new Response("Forbidden", { status: 403 });
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
  if (!ua || ua.length < 10) {
    return new Response("", { status: 204 });
  }

  // Captura SÍNCRONA mínima (~1ms): cookies + headers de geo + IP.
  // Os hashes SHA-256 e o fetch pra Meta vão pro background.
  const fbp = body.fbp || readCookie(req, "_fbp");
  const fbc = body.fbc || readCookie(req, "_fbc");
  const country = req.headers.get("x-vercel-ip-country") || "";
  const region = req.headers.get("x-vercel-ip-country-region") || "";
  const city = req.headers.get("x-vercel-ip-city") || "";
  const zip = req.headers.get("x-vercel-ip-postal-code") || "";
  const ip = clientIp(req);
  const referer = req.headers.get("referer") || "";
  const url = body.url || referer || "";
  const externalIdRaw = body.external_id || "";

  // Background task: hashes + dispatch CAPI. Handler retorna 204 em ~5ms.
  const dispatch = (async () => {
    const [ctHash, stHash, zpHash, countryHash, externalIdHash] = await Promise.all([
      city ? sha256Hex(city.replace(/\s+/g, "")) : "",
      region ? sha256Hex(region) : "",
      zip ? sha256Hex(zip.replace(/\D/g, "")) : "",
      country ? sha256Hex(country) : "",
      externalIdRaw ? sha256Hex(externalIdRaw) : "",
    ]);

    await sendCAPI({
      event_name: eventName as Body["event_name"] extends infer T ? T : never,
      event_id: eventId,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      event_source_url: url,
      user_data: {
        client_ip_address: ip || undefined,
        client_user_agent: ua,
        fbp: fbp || undefined,
        fbc: fbc || undefined,
        external_id: externalIdHash || undefined,
        country: countryHash || undefined,
        st: stHash || undefined,
        ct: ctHash || undefined,
        zp: zpHash || undefined,
      },
    } as never);
  })().catch((err) => {
    console.error("CAPI error:", err);
  });

  waitUntil(dispatch);

  return new Response("", { status: 204 });
}
