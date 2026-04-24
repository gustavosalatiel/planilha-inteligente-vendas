// [DEPRECATED — no desplegado]
// Este Worker era el proxy Same Origin original cuando pensábamos tener DNS en Cloudflare.
// Cambiamos la arquitectura: DNS está en Vercel, Stape tiene Custom Domain
// (tracking.helenarodriguez.site → sad.stape.io) y los clientes llaman Stape directo.
// - gtm-loader.ts ya carga https://tracking.helenarodriguez.site/gtm.js
// - api/_lib/capi.ts ya POSTea a https://tracking.helenarodriguez.site/capi
// Mantenemos este archivo solo como referencia por si algún día pasamos DNS a Cloudflare.

// Cloudflare Worker — Same Origin proxy hacia Stape
// Ruta /gtm/*       → /gtm.js + /gtag/js (loader de GTM Web vía Stape Custom Loader)
// Ruta /tracking/*  → endpoint del GTM Server (Meta CAPI, GA4 MP, etc.)
// Ruta /g/collect   → GA4 Measurement Protocol vía server-side

const STAPE_HOST = "ephcwucw.sad.stape.io"; // host del GTM Server Stape (sin https://)
const ORIGIN_HOST = "www.helenarodriguez.site";
const UPSTREAM_TIMEOUT_MS = 2000;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const upstream = new URL(url.pathname + url.search, `https://${STAPE_HOST}`);

    if (url.pathname.startsWith("/tracking/")) {
      upstream.pathname = url.pathname.replace(/^\/tracking/, "") || "/";
    }

    const reqHeaders = new Headers(request.headers);
    reqHeaders.set("Host", STAPE_HOST);
    reqHeaders.set("X-Forwarded-Host", ORIGIN_HOST);
    reqHeaders.set("X-Forwarded-Proto", "https");

    const clientIp =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("X-Forwarded-For") ||
      "";
    if (clientIp) reqHeaders.set("X-Forwarded-For", clientIp);

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
      const upstreamResp = await fetch(upstream.toString(), {
        method: request.method,
        headers: reqHeaders,
        body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
        redirect: "manual",
        signal: controller.signal,
      });
      clearTimeout(t);

      const respHeaders = new Headers(upstreamResp.headers);
      const setCookies = upstreamResp.headers.getAll
        ? upstreamResp.headers.getAll("Set-Cookie")
        : (respHeaders.get("Set-Cookie")?.split(/,(?=\s*[A-Za-z0-9_-]+=)/g) || []);

      respHeaders.delete("Set-Cookie");
      for (const c of setCookies) {
        const rewritten = c
          .replace(/Domain=[^;]+;?\s*/i, `Domain=.${ORIGIN_HOST.replace(/^www\./, "")}; `)
          .replace(/SameSite=None/i, "SameSite=Lax");
        respHeaders.append("Set-Cookie", rewritten);
      }

      if (url.pathname === "/gtm.js" || url.pathname.startsWith("/gtag/js")) {
        respHeaders.set("Cache-Control", "public, max-age=300");
      } else {
        respHeaders.set("Cache-Control", "no-store");
      }

      return new Response(upstreamResp.body, {
        status: upstreamResp.status,
        headers: respHeaders,
      });
    } catch (err) {
      clearTimeout(t);
      return new Response(null, { status: 204 });
    }
  },
};
