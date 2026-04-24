#!/usr/bin/env node
// Aplica los IDs reales de Stape/GTM/GA4/Meta/Cookiebot en los archivos del repo.
// Uso:
//   1) Editá el bloque IDS de abajo con tus valores reales.
//   2) node scripts/apply-ids.mjs
//   3) npm run build
//
// Lee env vars si están definidas (override de IDS).

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repo = resolve(__dirname, "..");

const IDS = {
  GTM_WEB_ID:        process.env.GTM_WEB_ID        || "GTM-XXXXXXX",            // passo 2 GTM
  COOKIEBOT_CBID:    process.env.COOKIEBOT_CBID    || "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX", // passo 5
  STAPE_HOST:        process.env.STAPE_HOST        || "xyz.stape.io",            // passo 1 — host sin https://
  FB_PIXEL_ID:       process.env.FB_PIXEL_ID       || "0000000000",              // passo 4
  GA4_MEASUREMENT_ID:process.env.GA4_MEASUREMENT_ID|| "G-XXXXXXX",               // passo 3
};

function patch(path, finder, replacer, label) {
  const full = resolve(repo, path);
  const src = readFileSync(full, "utf8");
  const out = src.replace(finder, replacer);
  if (out === src) {
    console.log(`  skip  ${path} — patrón no encontrado (${label})`);
    return false;
  }
  writeFileSync(full, out, "utf8");
  console.log(`  OK    ${path} — ${label}`);
  return true;
}

function validate() {
  const missing = [];
  if (IDS.GTM_WEB_ID === "GTM-XXXXXXX") missing.push("GTM_WEB_ID");
  if (IDS.COOKIEBOT_CBID.startsWith("XXXX")) missing.push("COOKIEBOT_CBID");
  if (IDS.STAPE_HOST === "xyz.stape.io") missing.push("STAPE_HOST");
  if (IDS.FB_PIXEL_ID === "0000000000") missing.push("FB_PIXEL_ID");
  if (IDS.GA4_MEASUREMENT_ID === "G-XXXXXXX") missing.push("GA4_MEASUREMENT_ID");
  if (missing.length) {
    console.error("✗ Faltan IDs reales:", missing.join(", "));
    console.error("  Definilos como env vars o editá el bloque IDS en este archivo.");
    process.exit(1);
  }
}

validate();
console.log("Aplicando IDs:");
console.log("  GTM_WEB_ID         =", IDS.GTM_WEB_ID);
console.log("  COOKIEBOT_CBID     =", IDS.COOKIEBOT_CBID);
console.log("  STAPE_HOST         =", IDS.STAPE_HOST);
console.log("  FB_PIXEL_ID        =", IDS.FB_PIXEL_ID);
console.log("  GA4_MEASUREMENT_ID =", IDS.GA4_MEASUREMENT_ID);
console.log("");

// 1) gtm-loader.ts → GTM_ID
patch(
  "src/lib/tracking/gtm-loader.ts",
  /const GTM_ID = "GTM-XXXXXXX";/,
  `const GTM_ID = "${IDS.GTM_WEB_ID}";`,
  "GTM_ID"
);

// 2) index.html → Cookiebot data-cbid
patch(
  "index.html",
  /data-cbid="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"/,
  `data-cbid="${IDS.COOKIEBOT_CBID}"`,
  "Cookiebot CBID"
);

// 3) cloudflare/worker.js → STAPE_HOST
patch(
  "cloudflare/worker.js",
  /const STAPE_HOST = "xyz\.stape\.io";.*$/m,
  `const STAPE_HOST = "${IDS.STAPE_HOST}"; // host del GTM Server Stape (sin https://)`,
  "STAPE_HOST"
);

// 4) gtm/web-container.json → placeholders
// Se mantiene una copia original; el archivo que se importa en GTM Web es la versión sustituida.
const gtmWebPath = resolve(repo, "gtm/web-container.json");
const gtmOrigPath = resolve(repo, "gtm/web-container.template.json");
try {
  // Si aún no existe template.json, guardá el original como template antes de sustituir.
  const web = readFileSync(gtmWebPath, "utf8");
  if (web.includes("{{FB_PIXEL_ID}}") || web.includes("{{GA4_MEASUREMENT_ID}}")) {
    try { readFileSync(gtmOrigPath, "utf8"); } catch { writeFileSync(gtmOrigPath, web, "utf8"); console.log("  OK    gtm/web-container.template.json — backup del template"); }
    const replaced = web
      .replace(/\{\{FB_PIXEL_ID\}\}/g, IDS.FB_PIXEL_ID)
      .replace(/\{\{GA4_MEASUREMENT_ID\}\}/g, IDS.GA4_MEASUREMENT_ID);
    writeFileSync(gtmWebPath, replaced, "utf8");
    console.log("  OK    gtm/web-container.json — FB_PIXEL_ID + GA4_MEASUREMENT_ID sustituidos");
  } else {
    console.log("  skip  gtm/web-container.json — ya tiene IDs reales (no hay placeholders)");
  }
} catch (e) {
  console.error("  ERR   gtm/web-container.json —", e.message);
}

console.log("\n✓ Listo. Próximo paso: npm run build && git add -A && git commit && git push");
