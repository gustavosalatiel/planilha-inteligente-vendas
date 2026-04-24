// Cliente que envía eventos directo al Meta Graph API Conversions endpoint.
// Arquitectura simplificada: Kiwify webhook → Vercel Function → graph.facebook.com
// (sin pasar por GTM Server). Más confiable para server-to-server — menos hops.
//
// Los datos personales ya vienen hasheados con SHA-256 de api/_lib/hash.ts.

type UserData = {
  em?: string;
  ph?: string;
  fn?: string;
  ln?: string;
  external_id?: string;
  fbp?: string;
  fbc?: string;
  client_ip_address?: string;
  client_user_agent?: string;
};

type CapiEvent = {
  event_name: "Purchase" | "Lead" | "InitiateCheckout" | "ViewContent";
  event_id: string;
  event_time: number;
  action_source: "website" | "system_generated";
  event_source_url: string;
  user_data: UserData;
  custom_data?: Record<string, unknown>;
};

const META_GRAPH_VERSION = "v19.0";

export async function sendCAPI(ev: CapiEvent): Promise<void> {
  const pixelId = process.env.FB_PIXEL_ID;
  const accessToken = process.env.FB_ACCESS_TOKEN;
  const testEventCode = process.env.FB_TEST_CODE; // opcional, solo en staging

  if (!pixelId || !accessToken) {
    throw new Error("Missing FB_PIXEL_ID or FB_ACCESS_TOKEN env vars");
  }

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: ev.event_name,
        event_time: ev.event_time,
        event_id: ev.event_id,
        action_source: ev.action_source,
        event_source_url: ev.event_source_url,
        user_data: ev.user_data,
        custom_data: ev.custom_data || {},
      },
    ],
  };
  if (testEventCode) payload.test_event_code = testEventCode;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Meta CAPI returned ${resp.status}: ${body}`);
  }

  // Meta responde con { events_received, messages, fbtrace_id }.
  // Si events_received < 1, el evento fue rechazado (validación fallida).
  const data = (await resp.json()) as { events_received?: number; messages?: string[] };
  if (!data.events_received || data.events_received < 1) {
    throw new Error(`Meta CAPI rejected event: ${JSON.stringify(data)}`);
  }
}
