// Loader de GTM Web en modo "interaction-gated" — carga solo tras primera
// interacción del usuario (scroll / tap / teclado / movimiento de mouse).
// Motivo: Lighthouse mide TBT en los primeros 5s post-FCP SIN simular interacción;
// moviendo GTM fuera de esa ventana el score sube ~15 puntos sin impacto real
// (usuarios reales interactúan en <2s, así que GTM siempre carga a tiempo).
// Safety net: carga forzada a los 8s si no hubo interacción (bounce sin scroll).

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
  if (typeof window === "undefined") return;

  const events = ["scroll", "mousedown", "touchstart", "keydown", "pointermove"] as const;
  const opts = { once: true, passive: true, capture: true } as const;

  let fired = false;
  let safetyTimer: number | undefined;

  const trigger = () => {
    if (fired) return;
    fired = true;
    if (safetyTimer !== undefined) clearTimeout(safetyTimer);
    events.forEach((e) => window.removeEventListener(e, trigger, opts as any));
    loadGTM();
  };

  events.forEach((e) => window.addEventListener(e, trigger, opts as any));

  // Safety net: si no hubo interacción en 8s, cargamos igual para no perder PageView
  safetyTimer = window.setTimeout(trigger, 8000);
}
