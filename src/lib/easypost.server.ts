// Server-only EasyPost client via REST (no SDK — fetch + Basic auth, Worker-safe,
// same discipline as stripe.server / email.server). Import ONLY via
// `await import("@/lib/easypost.server")` inside a server fn.
// TEST MODE: EASYPOST_API_KEY is a test key (EZTK...). Test mode returns mock
// USPS labels + tracking codes with no carrier account — all Stage 1 needs.

const EASYPOST_BASE = "https://api.easypost.com/v2";

function authHeader(): string {
  const key = process.env.EASYPOST_API_KEY;
  if (!key) throw new Error("EASYPOST_API_KEY is not configured");
  return "Basic " + btoa(key + ":"); // EasyPost: API key as username, empty password
}

export type EPAddress = {
  name?: string | null;
  company?: string | null;
  street1: string;
  street2?: string | null;
  city: string;
  state: string;
  zip: string;
  country?: string;
  phone?: string | null;
};
export type EPParcel = { length: number; width: number; height: number; weight: number };
export type LabelResult = { shipment_id: string; tracking_code: string; carrier: string; label_url: string };

async function epFetch(path: string, body: unknown): Promise<any> {
  const res = await fetch(`${EASYPOST_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || json?.error || `EasyPost ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return json;
}

export async function buyCheapestLabel(args: { to: EPAddress; from: EPAddress; parcel: EPParcel }): Promise<LabelResult> {
  const shipment = await epFetch("/shipments", {
    shipment: { to_address: args.to, from_address: args.from, parcel: args.parcel },
  });
  const rates: any[] = shipment?.rates ?? [];
  if (!rates.length) throw new Error("No rates returned for this shipment");
  const cheapest = rates.reduce((lo, r) => (parseFloat(r.rate) < parseFloat(lo.rate) ? r : lo), rates[0]);
  const bought = await epFetch(`/shipments/${shipment.id}/buy`, { rate: { id: cheapest.id } });
  const tracking_code = bought?.tracking_code;
  const label_url = bought?.postage_label?.label_url;
  const carrier = bought?.selected_rate?.carrier ?? cheapest.carrier ?? "USPS";
  if (!tracking_code || !label_url) throw new Error("Label purchased but tracking/label missing in response");
  return { shipment_id: bought.id ?? shipment.id, tracking_code, carrier, label_url };
}
