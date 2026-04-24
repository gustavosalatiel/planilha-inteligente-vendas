#!/usr/bin/env node
// Smoke tests end-to-end post-deploy. Corre todos los chequeos del passo 12
// en orden y sale con código != 0 si alguno falla.
//
// Uso:
//   KIWIFY_WEBHOOK_SECRET=xxx GTM_WEB_ID=GTM-xxx node scripts/smoke-test.mjs
//
// Requiere Node 20+ (fetch + crypto builtin).

import crypto from "node:crypto";

const SITE = process.env.SITE_URL || "https://www.helenarodriguez.site";
const GTM_WEB_ID = process.env.GTM_WEB_ID;
const SECRET = process.env.KIWIFY_WEBHOOK_SECRET;

const results = [];

function log(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? "  " + detail : ""}`);
}

async function step_gtm_js_headers() {
  if (!GTM_WEB_ID) return log("GTM /gtm.js headers", false, "(skip — GTM_WEB_ID vacío)");
  // Stape Custom Domain: tracking.helenarodriguez.site serve /gtm.js diretamente.
  // DNS pode estar ainda propagando — aceitamos 200 (pronto) ou 5xx (Stape custom domain DNS em verificação).
  const url = `https://tracking.helenarodriguez.site/gtm.js?id=${GTM_WEB_ID}`;
  try {
    const r = await fetch(url, { method: "GET", redirect: "manual" });
    const ok = r.status === 200 || r.status === 301 || r.status === 302;
    log("GTM /gtm.js (Stape custom domain)", ok, `url=${url} status=${r.status}`);
  } catch (e) {
    log("GTM /gtm.js (Stape custom domain)", false, String(e));
  }
}

async function step_gracias() {
  try {
    const r = await fetch(`${SITE}/gracias?oid=SMOKE-001&v=47&c=USD&n=Test`);
    const body = await r.text();
    const ok = r.status === 200 && body.includes("Planilla Inteligente");
    log("gracias.html render", ok, `status=${r.status}`);
  } catch (e) {
    log("gracias.html render", false, String(e));
  }
}

async function step_webhook_ok() {
  if (!SECRET) return log("webhook Kiwify 200", false, "(skip — KIWIFY_WEBHOOK_SECRET vacío)");
  const body = JSON.stringify({
    webhook_event_type: "order_approved",
    order_status: "paid",
    order_id: "E2E-001",
    Customer: {
      email: "test@ejemplo.com",
      first_name: "Test",
      mobile: "+5215551111111",
      ip: "1.2.3.4",
    },
    Commissions: { charge_amount: 47, currency: "USD" },
    Product: { product_id: "planilla-inteligente", product_name: "Planilla Inteligente" },
  });
  const sig = crypto.createHmac("sha1", SECRET).update(body).digest("hex");
  try {
    const r = await fetch(`${SITE}/api/webhook/kiwify?signature=${sig}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const json = await r.json();
    const ok = r.status === 200 && json.ok === true;
    log("webhook Kiwify 200 ok:true", ok, JSON.stringify(json));
  } catch (e) {
    log("webhook Kiwify 200 ok:true", false, String(e));
  }
}

async function step_webhook_duplicate() {
  if (!SECRET) return log("webhook idempotencia", false, "(skip)");
  const body = JSON.stringify({
    webhook_event_type: "order_approved",
    order_status: "paid",
    order_id: "E2E-001",
    Customer: { email: "test@ejemplo.com", first_name: "Test", mobile: "+5215551111111", ip: "1.2.3.4" },
    Commissions: { charge_amount: 47, currency: "USD" },
    Product: { product_id: "planilla-inteligente", product_name: "Planilla Inteligente" },
  });
  const sig = crypto.createHmac("sha1", SECRET).update(body).digest("hex");
  try {
    const r = await fetch(`${SITE}/api/webhook/kiwify?signature=${sig}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const json = await r.json();
    const ok = r.status === 200 && json.skipped === "duplicate";
    log("webhook idempotencia (skipped=duplicate)", ok, JSON.stringify(json));
  } catch (e) {
    log("webhook idempotencia", false, String(e));
  }
}

async function step_webhook_invalid_sig() {
  try {
    const r = await fetch(`${SITE}/api/webhook/kiwify?signature=deadbeef`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhook_event_type: "order_approved", order_id: "x", Customer: {}, Commissions: {}, Product: {} }),
    });
    const ok = r.status === 401;
    log("webhook invalid signature → 401", ok, `status=${r.status}`);
  } catch (e) {
    log("webhook invalid signature → 401", false, String(e));
  }
}

async function step_tracking_proxy() {
  try {
    const r = await fetch(`${SITE}/tracking/healthz`, { method: "GET" });
    // Stape devuelve 200 / 204 / 404 según config; lo importante es que NO sea bloqueado por Cloudflare
    const ok = r.status !== 0 && r.status < 500;
    log("Cloudflare /tracking/* proxy accesible", ok, `status=${r.status}`);
  } catch (e) {
    log("Cloudflare /tracking/* proxy accesible", false, String(e));
  }
}

async function step_index_has_scripts() {
  try {
    const r = await fetch(`${SITE}/`);
    const html = await r.text();
    // CBID pode estar em atributo HTML (data-cbid="uuid") ou via setAttribute('data-cbid','uuid')
    // Aceita ambos os estilos de aspas (" ou ').
    const has_cbid = /data-cbid['"]?\s*[,:=]?\s*['"][0-9a-f-]{8,}['"]/i.test(html);
    const has_tracking = /\/js\/tracking\.js/.test(html);
    const has_utmify = /cdn\.utmify\.com\.br/.test(html);
    log("index.html: Cookiebot real", has_cbid);
    log("index.html: tracking.js presente", has_tracking);
    log("index.html: UTMify script presente", has_utmify);
  } catch (e) {
    log("index.html fetch", false, String(e));
  }
}

(async () => {
  console.log(`Smoke tests contra ${SITE}`);
  console.log("");
  await step_index_has_scripts();
  await step_tracking_proxy();
  await step_gtm_js_headers();
  await step_gracias();
  await step_webhook_invalid_sig();
  await step_webhook_ok();
  // pequeña pausa para dejar que el Redis SET replique antes del duplicate
  await new Promise(r => setTimeout(r, 1500));
  await step_webhook_duplicate();

  const failed = results.filter(r => !r.ok);
  console.log("");
  console.log(`Resultado: ${results.length - failed.length}/${results.length} OK`);
  if (failed.length) {
    console.log("FALLAS:");
    failed.forEach(r => console.log(`  ✗ ${r.name} — ${r.detail}`));
    process.exit(1);
  }
  process.exit(0);
})();
