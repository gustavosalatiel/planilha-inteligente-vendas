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
    trackEvent("cta_click", {
      cta_id: el.dataset.cta,
      cta_text: el.innerText?.trim().slice(0, 80),
    });
  });
});
