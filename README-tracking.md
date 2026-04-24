# Tracking Server-Side — Planilla Inteligente

Tracking end-to-end con GA4 + Meta CAPI + Consent Mode v2, vía Stape + Cloudflare Worker (Same Origin) + Vercel Functions.

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│  Navegador (helenarodriguez.site)                       │
│   ├─ Consent default (denied) en <head>                 │
│   ├─ Cookiebot CMP (ES/es-419)                          │
│   ├─ /js/tracking.js (lazy, post-LCP)                   │
│   └─ GTM Web (Same Origin /gtm.js) → pixel + GA4        │
└────────────────┬────────────────────────────────────────┘
                 │ Cloudflare Worker (Same Origin proxy)
                 │ Rutas: /gtm/*, /tracking/*, /g/collect
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Stape (GTM Server, São Paulo, Power USD 20/mo)         │
│   ├─ GA4 Client → GA4 Measurement Protocol              │
│   ├─ GTM Cloud Client (eventos del Web container)       │
│   └─ Meta CAPI (template Stape, SHA-256 + fbp/fbc/IP)   │
└─────────────────────────────────────────────────────────┘

          ┌────────────────────────────┐
          │  Kiwify  order.paid        │
          └────────────┬───────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Vercel Function  /api/webhook/kiwify                   │
│   ├─ Valida HMAC-SHA1 del raw body                      │
│   ├─ Idempotencia vía Upstash Redis (30 días)           │
│   ├─ Hash SHA-256 de user_data (em/ph/fn/ln/ext_id)     │
│   └─ POST al GTM Server con event_id = order_id         │
└─────────────────────────────────────────────────────────┘
```

## Variables de entorno

### Vercel → Project → Settings → Environment Variables

| Variable | Scope | Ejemplo |
|---|---|---|
| `KIWIFY_WEBHOOK_SECRET` | Production | `whsec_xxxxx` (panel Kiwify) |
| `UPSTASH_REDIS_REST_URL` | All | `https://xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | All | `AXXX...` |
| `STAPE_SERVER_URL` | All | `https://xyz.stape.io` |

### GTM Server (Stape) → Variables

| Variable | Tipo | Valor |
|---|---|---|
| `FB_PIXEL_ID` | Constant | `1234567890` |
| `FB_ACCESS_TOKEN` | Constant (Secret) | `EAAXxx...` |
| `FB_TEST_CODE` | Constant | vazio en prod, `TEST12345` en staging |
| `GA4_MEASUREMENT_ID` | Constant | `G-XXXXXX` |
| `GA4_API_SECRET` | Constant (Secret) | generar en GA4 → Admin → Data Streams |

## Comandos

```bash
# Local dev
npm run build            # CSS + tracking bundle
npm run dev              # Tailwind en modo watch
vercel dev               # simula Functions localmente (requires vercel CLI)

# Deploy
vercel --prod            # push a producción
# o vía git push origin main (auto-deploy por GitHub integration)

# Rollback
vercel rollback          # lista deployments e rollback interactivo
```

## Costos mensuales

| Servicio | Plan | USD/mo |
|---|---|---|
| Stape | Power (10M req/mo) | 20 |
| Cookiebot | Free (<100 pv/mo) | 0 |
| Vercel | Hobby | 0 |
| Cloudflare | Free (Workers 100k req/día) | 0 |
| Upstash Redis | Free (10k cmd/día) | 0 |
| **Total** | | **20** |

## Runbook de debug

### Síntoma: EMQ Purchase < 7
1. Events Manager → Diagnostics → inspect Purchase
2. Verificar user_data: em, ph, fn, ln, external_id, fbp, fbc, ip, ua debén estar
3. Si fbp/fbc faltan → revisar Cloudflare Worker (Set-Cookie reescrito)
4. Si em falta → webhook Kiwify no tiene email — revisar pedido en Kiwify

### Síntoma: Deduplicated = No
1. Confirmar que event_id del pixel (browser /gracias) === order_id enviado al CAPI (webhook)
2. En /gracias, inspeccionar `dataLayer.push({event_id: oid})` en console
3. Meta recibe el Browser event primero; si el Server llega >7 días después, dedup falla
4. Webhook Kiwify debe disparar en <1 min post-compra

### Síntoma: Eventos no llegan a GA4
1. GA4 → DebugView → filtro por Debug Mode
2. Chrome DevTools → Network → filtro `g/collect` → verificar 204
3. Si falla: Cloudflare Worker no está haciendo proxy → testar curl en /g/collect
4. Verificar `GA4_API_SECRET` en GTM Server

### Síntoma: LCP subió post-instalación
1. Lighthouse mobile con throttling
2. DevTools → Performance → buscar scripts bloqueando main thread en el primer segundo
3. Si `gtm.js` aparece antes de `window.load` → bug en `gtm-loader.ts`, revisar `scheduleGTMLoad()`
4. Rollback rápido: remover `<script src="/js/tracking.js">` de `index.html`

## Setup reproducible en < 4h

1. Fork repo, copiar env vars (30 min)
2. Stape account + container SP Power (15 min)
3. GTM Web + Server — import JSONs de `gtm/` (30 min)
4. Meta Pixel ID + Access Token + configurar tags (30 min)
5. Cloudflare Worker deploy + routes (20 min)
6. DNS records + propagación (60 min, en paralelo)
7. Cookiebot setup + scan (30 min)
8. Kiwify webhook endpoint + test (15 min)
9. E2E test (Meta Test Events + curl webhook) (30 min)
