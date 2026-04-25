import { scheduleGTMLoad } from "./gtm-loader";
import { initScrollDepth } from "./scroll";
import { initIdentify } from "./identify";
import { initConsentBridge } from "./consent";
import { trackEvent } from "./events";

initConsentBridge();
scheduleGTMLoad();

document.addEventListener("DOMContentLoaded", () => {
  initScrollDepth();
  initIdentify();

  window.addEventListener(
    "load",
    () => setTimeout(() => trackEvent("view_content", { value: 47, currency: "USD" }), 500),
    { once: true }
  );

  document.addEventListener("click", (ev) => {
    const el = (ev.target as HTMLElement)?.closest?.("[data-cta]") as HTMLElement | null;
    if (!el) return;

    const ctaText = el.innerText?.trim().slice(0, 80);
    trackEvent("cta_click", {
      cta_id: el.dataset.cta,
      cta_text: ctaText,
    });

    // Si el CTA va al checkout Kiwify, disparamos initiate_checkout para Meta CAPI.
    // El click no se bloquea: el navegador sigue al href en paralelo (el evento queda
    // en el dataLayer; el GTM lo recoge en cuanto carga, aunque el usuario ya navegó).
    const href = (el as HTMLAnchorElement).href || "";
    if (/pay\.kiwify\.com/i.test(href)) {
      trackEvent("initiate_checkout", {
        value: 19.9,
        currency: "USD",
        cta_id: el.dataset.cta,
      });
    }
  });
});
