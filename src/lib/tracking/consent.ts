// Puente Cookiebot → Google Consent Mode v2.
// Cookiebot dispara CustomEvents 'CookiebotOnAccept' / 'CookiebotOnDecline' en window.

export function initConsentBridge(): void {
  if (typeof window === "undefined") return;

  const gtag = (...args: unknown[]) => {
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push(args);
  };

  window.addEventListener("CookiebotOnAccept", () => {
    const c = (window as any).Cookiebot?.consent;
    gtag("consent", "update", {
      ad_storage: c?.marketing ? "granted" : "denied",
      ad_user_data: c?.marketing ? "granted" : "denied",
      ad_personalization: c?.marketing ? "granted" : "denied",
      analytics_storage: c?.statistics ? "granted" : "denied",
      functionality_storage: c?.preferences ? "granted" : "denied",
      personalization_storage: c?.preferences ? "granted" : "denied",
    });
  });

  window.addEventListener("CookiebotOnDecline", () => {
    gtag("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      functionality_storage: "denied",
      personalization_storage: "denied",
    });
  });
}
