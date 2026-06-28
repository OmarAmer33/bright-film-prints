import { createServerFn } from "@tanstack/react-start";

export type OrderForView = {
  id: string;
  view_token: string;
  status: string;
  email: string;
  subtotal: number;
  shipping_fee: number;
  rush_fee: number;
  tax: number;
  total: number;
  is_rush: boolean;
  created_at: string;
  items: Array<{
    id: string;
    source: string;
    size_ft: number;
    quantity: number;
    unit_price: number;
    line_total: number;
    notes: string | null;
  }>;
};

function validateTokenInput(raw: unknown): { token: string } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const token = typeof r.token === "string" ? r.token.trim() : "";
  if (!token || token.length < 16 || !/^[a-f0-9]+$/i.test(token)) {
    throw new Error("Invalid order token");
  }
  return { token };
}

export const getOrderForView = createServerFn({ method: "POST" })
  .inputValidator(validateTokenInput)
  .handler(async ({ data }): Promise<OrderForView | null> => {
    // Service-role lookup by opaque view_token. The token IS the auth: anyone
    // who has the URL can view this order. Token is 48 hex chars / 192 bits.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, view_token, status, email, subtotal, shipping_fee, rush_fee, tax, total, is_rush, created_at",
      )
      .eq("view_token", data.token)
      .maybeSingle();
    if (error) throw error;
    if (!order) return null;

    const { data: items, error: itemsErr } = await supabaseAdmin
      .from("order_items")
      .select("id, source, size_ft, quantity, unit_price, line_total, notes")
      .eq("order_id", order.id)
      .order("size_ft", { ascending: false });
    if (itemsErr) throw itemsErr;

    return {
      ...order,
      subtotal: Number(order.subtotal),
      shipping_fee: Number(order.shipping_fee),
      rush_fee: Number(order.rush_fee),
      tax: Number(order.tax),
      total: Number(order.total),
      items: (items ?? []).map((i) => ({
        id: i.id,
        source: i.source,
        size_ft: Number(i.size_ft),
        quantity: i.quantity,
        unit_price: Number(i.unit_price),
        line_total: Number(i.line_total),
        notes: i.notes ?? null,
      })),
    };
  });
