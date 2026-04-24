// Scroll depth con IntersectionObserver (sin scroll listeners).
// Dispara scroll_25, scroll_50, scroll_75, scroll_100 una sola vez por sesión.

import { trackEvent } from "./events";

const MILESTONES = [25, 50, 75, 100] as const;

export function initScrollDepth(): void {
  if (typeof document === "undefined") return;

  const fired = new Set<number>();
  const sentinels: HTMLDivElement[] = [];

  MILESTONES.forEach((pct) => {
    const el = document.createElement("div");
    el.style.cssText = `position:absolute;top:${pct}%;left:0;width:1px;height:1px;pointer-events:none;`;
    el.dataset.depth = String(pct);
    document.body.appendChild(el);
    sentinels.push(el);
  });

  const obs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const pct = Number((e.target as HTMLDivElement).dataset.depth);
        if (fired.has(pct)) continue;
        fired.add(pct);
        trackEvent("scroll_depth", { depth: pct });
        if (pct === 100) obs.disconnect();
      }
    },
    { rootMargin: "0px 0px 0px 0px", threshold: 0 }
  );

  sentinels.forEach((s) => obs.observe(s));
}
