// Módulo central de tracking — fuente única de verdad de eventos dataLayer.
// Todos los eventos llevan event_id para deduplicación pixel↔CAPI.

type EventBase = {
  event: string;
  event_id: string;
  event_time: number;
  page_location: string;
  page_title: string;
};

type CommerceEvent = EventBase & {
  value?: number;
  currency?: string;
  items?: Array<{ item_id: string; item_name: string; price: number; quantity: number }>;
};

type UserIdentified = EventBase & {
  user_data: { em: string; external_id?: string };
};

type AnyEvent = EventBase | CommerceEvent | UserIdentified;

declare global {
  interface Window {
    dataLayer: Array<Record<string, unknown>>;
  }
}

export function uuid(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function pushEvent(ev: AnyEvent): void {
  (window.dataLayer = window.dataLayer || []).push(ev as unknown as Record<string, unknown>);
}

// Lee los UTMs que UTMify persiste en localStorage bajo la clave "utmify_data".
function readUtmifyData(): Record<string, string | undefined> {
  try {
    const raw = localStorage.getItem("utmify_data");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function trackEvent(name: string, data: Record<string, unknown> = {}): string {
  const event_id = uuid();
  const utm = readUtmifyData();
  pushEvent({
    event: name,
    event_id,
    event_time: Math.floor(Date.now() / 1000),
    page_location: location.href,
    page_title: document.title,
    utm_source: utm.utm_source,
    utm_medium: utm.utm_medium,
    utm_campaign: utm.utm_campaign,
    utm_content: utm.utm_content,
    utm_term: utm.utm_term,
    ...data,
  } as EventBase);
  return event_id;
}

export async function identify(email: string): Promise<void> {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return;

  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clean));
  const hash = [...new Uint8Array(hashBuf)].map((x) => x.toString(16).padStart(2, "0")).join("");

  sessionStorage.setItem("he", hash);
  trackEvent("user_identified", { user_data: { em: hash } });
}

export function trackPurchase(order: { order_id: string; value: number; currency: string }): void {
  const utm = readUtmifyData();
  pushEvent({
    event: "purchase",
    event_id: order.order_id,
    event_time: Math.floor(Date.now() / 1000),
    page_location: location.href,
    page_title: document.title,
    value: order.value,
    currency: order.currency,
    utm_source: utm.utm_source,
    utm_medium: utm.utm_medium,
    utm_campaign: utm.utm_campaign,
    utm_content: utm.utm_content,
    utm_term: utm.utm_term,
    items: [
      {
        item_id: "planilla-inteligente",
        item_name: "Planilla Inteligente",
        price: order.value,
        quantity: 1,
      },
    ],
  } as CommerceEvent);
}
