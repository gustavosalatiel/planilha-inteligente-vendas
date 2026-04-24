// Loader de GTM Web en modo "zero impacto en LCP".
// - Dispara solo tras window.load + requestIdleCallback
// - Usa Stape Custom Domain (tracking.helenarodriguez.site) — first-party cookies
//   bajo .helenarodriguez.site, sin proxy Cloudflare (DNS está en Vercel).

const GTM_ID = "GTM-PTQ2CST8";
const LOADER_URL = "https://tracking.helenarodriguez.site/gtm.js";

export function loadGTM(): void {
  if (typeof window === "undefined") return;
  if ((window as any).__gtmLoaded) return;
  (window as any).__gtmLoaded = true;

  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).dataLayer.push({
    "gtm.start": new Date().getTime(),
    event: "gtm.js",
  });

  const s = document.createElement("script");
  s.async = true;
  s.src = `${LOADER_URL}?id=${GTM_ID}`;
  document.head.appendChild(s);
}

export function scheduleGTMLoad(): void {
  const start = () => {
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(loadGTM, { timeout: 3000 });
    } else {
      setTimeout(loadGTM, 1500);
    }
  };

  if (document.readyState === "complete") {
    start();
  } else {
    window.addEventListener("load", start, { once: true });
  }
}
