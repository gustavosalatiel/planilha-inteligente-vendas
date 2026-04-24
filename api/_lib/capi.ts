// Cliente que envía el evento al GTM Server (Stape) en tracking.helenarodriguez.site.
// El GTM Server reenvía a Meta usando el template Facebook Conversions API.
// DNS gestionado por Vercel — sin Cloudflare Worker intermediario.

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

export async function sendCAPI(ev: CapiEvent): Promise<void> {
  const url = `https://tracking.helenarodriguez.site/capi`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-source": "kiwify-webhook",
    },
    body: JSON.stringify({
      event: ev.event_name.toLowerCase().replace(/^([A-Z])/g, "$1"),
      event_id: ev.event_id,
      event_time: ev.event_time,
      page_location: ev.event_source_url,
      value: (ev.custom_data as any)?.value,
      currency: (ev.custom_data as any)?.currency,
      user_data: ev.user_data,
    }),
  });

  if (!resp.ok) {
    throw new Error(`CAPI proxy returned ${resp.status}: ${await resp.text()}`);
  }
}
