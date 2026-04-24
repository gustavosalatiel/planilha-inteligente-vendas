# Runbook — Setup Tracking Server-Side

Executá los pasos en orden. Copiá cada ID que te pida y pegalo acá abajo en la sección **VALORES COLECTADOS**. Al final corremos `node scripts/apply-ids.mjs` para sustituir todo automáticamente en el repo.

Leyenda: 🟢 = se puede hacer ahora · 🟡 = depende del paso anterior · 🔴 = requiere pago/tarjeta

---

## VALORES COLECTADOS (pegá acá)

```bash
# --- Passo 1 · Stape ---
STAPE_CONTAINER_ID=ephcwucw                    # ✅ ya creado
STAPE_SERVER_URL=                              # ej: https://xxxxxxxx.stape.io   — Settings → Server container URL
STAPE_HOST=                                    # el URL de arriba SIN el https:// — ej: xxxxxxxx.stape.io
STAPE_CONTAINER_CONFIG=                        # largo string — Settings → Container config
STAPE_CNAME_TARGET=                            # ej: xxx.customdomain.stape.io — Custom Domain → después de crear tracking.helenarodriguez.site

# --- Passo 2 · GTM ---
GTM_WEB_ID=                                    # ej: GTM-XXXXXXX
GTM_SERVER_ID=                                 # ej: GTM-YYYYYYY

# --- Passo 3 · GA4 ---
GA4_MEASUREMENT_ID=                            # ej: G-ABC123XYZ
GA4_API_SECRET=                                # generado en Admin → Data Streams → API secrets

# --- Passo 4 · Meta ---
FB_PIXEL_ID=                                   # ej: 1234567890123456
FB_ACCESS_TOKEN=                               # System User token (ads_management), ~200 chars

# --- Passo 5 · Cookiebot ---
COOKIEBOT_CBID=                                # UUID ej: 12345678-1234-1234-1234-123456789abc

# --- Passo 6 · Upstash ---
UPSTASH_REDIS_REST_URL=                        # ej: https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=                      # ej: AbCd... (~80 chars)

# --- Passo 7 · Kiwify ---
KIWIFY_WEBHOOK_SECRET=                         # whsec_... del panel Kiwify

# --- Passo 7b · UTMify ---
UTMIFY_PIXEL_ID=69eb02f35a495b63bf076849       # ✅ ya recibido — hardcodeado en index.html
```

---

## 🔴 Passo 1 — Stape (USD 20/mo)

**Estado:** container ya creado (`ephcwucw`, región SA East/Brazil).
**Pendiente:** plan Pro + cartão + Custom Domain + Power Ups.

### 1.1 Completar checkout Pro (USD 20/mo)
1. Abrí https://app.stape.io/container/ephcwucw/show
2. Vas a ver la pantalla "Subscription plan".
3. "Pro $20/month" ya viene pre-seleccionado (borde verde).
4. Scroll hasta abajo. Click en **"Continue with Pro plan"**.
5. Te va a llevar al checkout de Stape con el form de tarjeta. **Digitá el cartão acá.**
6. Confirmá. Volvés a la página del container.

### 1.2 Capturar Server container URL + Container config
1. Dentro del container → menu izquierdo → **Settings**.
2. Copiá **Server container URL** (ej: `https://abcd1234.stape.io`). Pegá en `STAPE_SERVER_URL` arriba. Quitá `https://` y pegá en `STAPE_HOST`.
3. Copiá **Container config** (string largo). Pegá en `STAPE_CONTAINER_CONFIG`.

### 1.3 Activar Power Ups (todos gratis con Pro)
Menu del container → **Power-ups**. Activá:
- **Custom Loader** (para servir `/gtm.js` same-origin)
- **GEO Headers** (para pasar CF-IPCountry al server)
- **FPID** (First Party ID — cookies 1st party server-side)

### 1.4 Custom Domain
1. Menu del container → **Custom Domain**.
2. Add domain: `tracking.helenarodriguez.site`.
3. Stape te va a mostrar un CNAME target (ej: `xxx.customdomain.stape.io`). Copialo en `STAPE_CNAME_TARGET` arriba.
4. **No** hagas el DNS todavía — eso va en el Passo 8.

---

## 🟢 Passo 2 — GTM (Google Tag Manager)

### 2.1 Web container
1. Abrí https://tagmanager.google.com (tu cuenta Google).
2. Click **"Create Account"** (o usá una existente).
   - Account name: **Helena Rodriguez**
   - Country: **Argentina** (o el que prefieras)
3. Container name: **helenarodriguez.site** · Target: **Web**.
4. Click Create → acepta términos.
5. **Copiá GTM-XXXXXXX de la cabecera** → pegá en `GTM_WEB_ID` arriba.

### 2.2 Server container
1. Mismo account → Admin → **Create container**.
2. Container name: **helenarodriguez.site – Server** · Target: **Server**.
3. Elegí **"Manually provision tagging server"** (no "Automatically provision").
4. Pegá en el campo lo que tenés en `STAPE_CONTAINER_CONFIG` (del Passo 1.2).
5. Create. **Copiá GTM-YYYYYYY** → pegá en `GTM_SERVER_ID`.

### 2.3 Import Web container template
Antes de importar, hay que sustituir placeholders. **No lo hagas manualmente**, corré desde la carpeta del repo en PowerShell/Git Bash:

```bash
# Editá el bloque IDS dentro de scripts/apply-ids.mjs con GTM_WEB_ID, FB_PIXEL_ID, GA4_MEASUREMENT_ID reales
node scripts/apply-ids.mjs
```

Después:
1. GTM Web → Admin → **Import Container**.
2. Choose file: `gtm/web-container.json` (ya sustituido).
3. Workspace: **New** (llamalo "tracking v1").
4. Import option: **Merge → Overwrite conflicting tags**.
5. Confirm → verifica que tags cargaron sin errores.
6. **Publish** con changelog "tracking server-side v1".

### 2.4 Import Server container template
1. GTM Server → Admin → **Import Container**.
2. Choose file: `gtm/server-container.json`.
3. Merge → Overwrite.
4. **No publiques todavía** — necesitamos las Constants del passo 9.

### 2.5 Community Gallery templates
1. GTM Server → Templates → **Tag Templates** → **Search Gallery**.
2. Buscá y añadí: **"Facebook Conversions API"** (by stape-io).
3. Buscá y añadí: **"Data Tag"** (by stape-io).

---

## 🟢 Passo 3 — GA4

1. Abrí https://analytics.google.com.
2. Admin → **Create Property**:
   - Property name: **Planilla Inteligente**
   - Timezone: **(GMT-05:00) Mexico City** (o el que prefieras — región-agnóstico de todos modos)
   - Currency: **USD**
3. **Data Stream → Web**:
   - URL: `https://www.helenarodriguez.site`
   - Stream name: `helenarodriguez.site`
   - **Enhanced measurement: ON**
4. Después de crear, en la cabecera del stream vas a ver **Measurement ID: G-XXXXXXX** → pegá en `GA4_MEASUREMENT_ID`.
5. Dentro del stream → **Measurement Protocol API secrets** → Create → nombre "server-side" → copiá el secret → pegá en `GA4_API_SECRET`.
6. Admin → Data Settings → **Data Collection** → activá Google signals (opcional).
7. Admin → Data Settings → **More Settings** → **List unwanted referrals** → agregá `kiwify.com.br`, `pay.kiwify.com.br` para cross-domain.

---

## 🟢 Passo 4 — Meta (Facebook Business)

1. Abrí https://business.facebook.com.
2. Events Manager → **Connect Data Sources** → **Web** → **Meta Pixel**.
   - Name: **Planilla Inteligente**
   - Website URL: `https://www.helenarodriguez.site`
3. Create → copiá el **Pixel ID** → pegá en `FB_PIXEL_ID`.
4. Pixel → Settings → **Conversions API** → **Generate access token**. Si no aparece ahí:
   - Business Settings → Users → **System Users** → Add → name "planilla-capi" → role **Admin**.
   - Add assets → Pixel Planilla Inteligente → Access: **Manage**.
   - Click **Generate new token** → permisos: `ads_management`, `business_management` → copiá el token (NO SE VUELVE A MOSTRAR) → pegá en `FB_ACCESS_TOKEN`.
5. Events Manager → Pixel → **Test Events** → dejá el campo "Test event code" VACÍO en producción (solo lo usamos para debug).

---

## 🟢 Passo 5 — Cookiebot

1. Abrí https://www.cookiebot.com → **Sign up free**.
2. Signup con tu email. Confirmá email.
3. Dashboard → **Add domain group**:
   - Domain: `helenarodriguez.site`
   - Subdomains: incluí `www.helenarodriguez.site`
4. **Dialog language**: **Auto-detect** + agregá **Spanish (es)** + **Spanish LATAM (es-419)**.
5. Settings → **Google Consent Mode v2** → Enable.
6. Scan → esperá que termine (~5 min).
7. Publish config.
8. Copiá el **CBID** (UUID) → pegá en `COOKIEBOT_CBID`. Lo ves en:
   - Dashboard → tu domain group → **Settings** → **Your Cookiebot ID**.

---

## 🟢 Passo 6 — Upstash Redis

1. Abrí https://upstash.com → Sign up (con Google, Github o email).
2. **Create Database**:
   - Type: **Redis**
   - Name: `planilla-kiwify-idempotency`
   - Region: **São Paulo** (si no está disponible, usá **US East (N. Virginia)**).
   - Plan: **Free**.
3. Create → abrí la DB → pestaña **REST API**.
4. Copiá **UPSTASH_REDIS_REST_URL** y **UPSTASH_REDIS_REST_TOKEN** → pegá en los campos respectivos arriba.

---

## 🟡 Passo 7 — Kiwify

**Importante:** el webhook debe apuntar a tu dominio de producción, por eso este paso idealmente va DESPUÉS del Passo 8 (Cloudflare/DNS listo) y del deploy en Vercel (Passo 11).

### 7.1 Thank you page personalizada
1. Kiwify → Products → **Planilla Inteligente** → **Checkout** → **Thank you page**.
2. Elegí "URL personalizada" y pegá:
   ```
   https://www.helenarodriguez.site/gracias?oid={order_id}&v={charge_amount}&c={currency}&n={first_name}
   ```
3. Save.

### 7.2 Webhook
1. Kiwify → **Apps** → **Webhooks** → **Add webhook**.
2. URL: `https://www.helenarodriguez.site/api/webhook/kiwify`
3. Evento: **order_approved** (único que necesitamos).
4. Create → copiá el **Signature Secret** (`whsec_...`) → pegá en `KIWIFY_WEBHOOK_SECRET`.

---

## 🟢 Passo 7b — UTMify (ya tenemos `UTMIFY_PIXEL_ID`)

**CRÍTICO:** sin estos toggles OFF, Meta recibirá Purchase DUPLICADO y la dedup se rompe.

1. Abrí https://app.utmify.com.br → tu cuenta.
2. **Integrations → Facebook Pixel → toggle OFF** (que no envíe a Meta).
3. **Integrations → Facebook Conversions API → DELETE el token** (campo vacío).
4. **Integrations → Google Analytics → toggle OFF**.
5. **Integrations → Kiwify → MANTENER ON** (esto es para tus reports de atribución).
6. Verificación TRIPLE: andá a Dashboard, buscá cualquier compra tuya anterior; **no debe aparecer marca "enviado a Meta" o "enviado a GA"**.

Opcional — confirmame acá cuando los tengas OFF. Si tenés dudas, mandame screenshot.

---

## 🟡 Passo 8 — Cloudflare

**Requiere:** `STAPE_CNAME_TARGET` del Passo 1.4.

### 8.1 Agregar sitio
1. https://dash.cloudflare.com → **Add a Site**.
2. Domain: `helenarodriguez.site` → Plan: **Free**.
3. Cloudflare te dará 2 nameservers. Andá al panel de tu registrador (donde compraste el dominio) y cambiá los NS por los de Cloudflare. **Puede tardar 1-24h en propagar.** Si ya estás en Cloudflare, saltá al 8.2.

### 8.2 DNS records
En Cloudflare → DNS → **Add record**:

| Type  | Name     | Content                   | Proxy    | TTL  |
|-------|----------|---------------------------|----------|------|
| CNAME | tracking | `<STAPE_CNAME_TARGET>`    | DNS only | Auto |
| CNAME | www      | `cname.vercel-dns.com`    | Proxied  | Auto |

### 8.3 Worker "tracking-proxy"
1. Cloudflare → **Workers & Pages** → **Create application** → **Create Worker** → name `tracking-proxy`.
2. Deploy con el código vacío.
3. Click **Edit code**.
4. Abrí `cloudflare/worker.js` del repo (ya tiene `STAPE_HOST` sustituido después de correr `apply-ids.mjs`). Copialo todo y pegalo en el editor de Cloudflare.
5. **Save and Deploy**.

### 8.4 Triggers/Routes
En el Worker → **Settings** → **Triggers** → **Routes** → **Add route**:

```
www.helenarodriguez.site/gtm/*
www.helenarodriguez.site/gtm.js
www.helenarodriguez.site/tracking/*
www.helenarodriguez.site/g/collect*
```

(Todas las 4 rutas apuntan al mismo Worker. Agregalas una por una.)

---

## 🟡 Passo 9 — Substituir IDs en el repo

Cuando tengas **todos** los valores de arriba, en PowerShell o Git Bash en la carpeta del repo:

```bash
cd "c:\Users\gusta\OneDrive\PASTA CLOUD\PAGINA DE VENDAS - PLANILHA INTELIGENTE"

# Opción A: editá scripts/apply-ids.mjs a mano y llenalo con los IDs reales.
# Opción B: pásalo como env vars (una sola línea):
GTM_WEB_ID=GTM-XXXXXXX \
COOKIEBOT_CBID=12345678-... \
STAPE_HOST=abcd.stape.io \
FB_PIXEL_ID=1234567890123456 \
GA4_MEASUREMENT_ID=G-ABC123 \
node scripts/apply-ids.mjs
```

Esto toca:
- `src/lib/tracking/gtm-loader.ts` — `GTM_ID`
- `index.html` — `data-cbid`
- `cloudflare/worker.js` — `STAPE_HOST`
- `gtm/web-container.json` — `{{FB_PIXEL_ID}}` y `{{GA4_MEASUREMENT_ID}}` (guarda backup en `gtm/web-container.template.json`)

Después corré `npm run build`.

### 9.1 Constants en GTM Server (manual, en UI)
En GTM Server → Variables → **New** → Constant:

| Name                 | Value                       |
|----------------------|-----------------------------|
| FB_PIXEL_ID          | `<FB_PIXEL_ID>`             |
| FB_ACCESS_TOKEN      | `<FB_ACCESS_TOKEN>` (marca **Secret** para que no salga en logs) |
| FB_TEST_CODE         | (vacío en prod — `TEST12345` solo para staging) |
| GA4_MEASUREMENT_ID   | `<GA4_MEASUREMENT_ID>`      |
| GA4_API_SECRET       | `<GA4_API_SECRET>` (marca **Secret**) |

Después **publicá** el GTM Server container.

---

## 🟡 Passo 10 — Vercel env vars

```bash
# En PowerShell/Git Bash:
cd "c:\Users\gusta\OneDrive\PASTA CLOUD\PAGINA DE VENDAS - PLANILHA INTELIGENTE"

# vercel CLI: instalala si no la tenés (`npm i -g vercel`)
vercel env add KIWIFY_WEBHOOK_SECRET production
# (pega el valor cuando pregunte)

vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_URL preview
vercel env add UPSTASH_REDIS_REST_URL development

vercel env add UPSTASH_REDIS_REST_TOKEN production
vercel env add UPSTASH_REDIS_REST_TOKEN preview
vercel env add UPSTASH_REDIS_REST_TOKEN development
```

O via UI: https://vercel.com/<tu-team>/planilha-inteligente-vendas/settings/environment-variables

---

## 🟡 Passo 11 — Build + Deploy

```bash
# PowerShell o Git Bash
cd "c:\Users\gusta\OneDrive\PASTA CLOUD\PAGINA DE VENDAS - PLANILHA INTELIGENTE"

npm run build

# git add SELECTIVO — no metas las PNG/JPG/MP4 sueltas del repo
git add index.html gracias.html
git add src/ api/ scripts/ gtm/ cloudflare/
git add package.json package-lock.json tsconfig.json
git add css/styles.css js/tracking.js
git add RUNBOOK.md README-tracking.md vercel.json
git add .gitignore

git status   # revisá que NO haya PNG/JPG/MP4 en la lista

git commit -m "feat: tracking server-side ponta a ponta + UTMify opción A"
git push origin main
```

Vercel auto-deploya al push. Monitor: https://vercel.com/<tu-team>/planilha-inteligente-vendas/deployments

---

## 🟡 Passo 12 — Validaciones E2E

Cuando el deploy termine (~2 min) y los DNS propagaron:

```bash
# Smoke tests automatizados
KIWIFY_WEBHOOK_SECRET=<secret real> \
GTM_WEB_ID=<GTM-xxx real> \
node scripts/smoke-test.mjs
```

Debe imprimir `7/7 OK` (o similar). Si alguno falla, mirá el detail.

### Chequeos manuales que NO puede automatizar el script:
- [ ] **Lighthouse mobile** (https://pagespeed.web.dev/) → LCP < 2,45s en `https://www.helenarodriguez.site`.
- [ ] **GTM Preview Web**: abrí `https://www.helenarodriguez.site?gtm_debug=x` desde GTM Web → Preview. Deben aparecer eventos `page_view`, `cta_click`, `view_content` con `event_id` UUID v4.
- [ ] **Meta Events Manager → Test Events**: poné un Test event code temporal en `FB_TEST_CODE` (en GTM Server), recargá el sitio y tirá un `view_content`. Verificá:
  - Received via: **Browser + Server = Yes**
  - Deduplicated: **Yes**
  - EMQ ≥ 8 para Purchase cuando hagas compra real
- [ ] **GA4 DebugView** (Admin → DebugView): eventos llegando con `via: /g/collect`.
- [ ] **Compra real USD 1** (o ciclo test Kiwify) → Purchase aparece **UNA SOLA VEZ** en Meta con Dedup = Yes. **Si aparece 2x, UTMify no fue desligado de verdad (volver al 7b).**
- [ ] **UTMify dashboard** muestra la compra con UTMs correctos.

---

## 📎 Referencia rápida

- Estado archivos locales: `npm run build` limpio, `js/tracking.js` 1.6KB gz
- Scripts útiles:
  - `scripts/apply-ids.mjs` — sustituí todos los IDs de un golpe
  - `scripts/smoke-test.mjs` — validaciones end-to-end post-deploy
- Git en Linux de este sandbox está bloqueado por permisos del OneDrive. Corré `git` siempre desde PowerShell/Git Bash en Windows.
