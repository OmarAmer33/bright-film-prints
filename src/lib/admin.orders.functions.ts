import { createServerFn } from "@tanstack/react-start";
import { assertAdmin } from "@/lib/admin-guard.server";

export type AdminOrderRow = {
  id: string;
  created_at: string;
  email: string;
  status: string;
  subtotal: number;
  total: number;
  rewards_earned: number;
  rewards_redeemed: number;
  is_rush: boolean;
  has_shipping: boolean;
  notes: string | null;
  customer_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  is_guest: boolean;
};

export const listAdminOrders = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminOrderRow[]> => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, created_at, email, status, subtotal, total, rewards_earned, rewards_redeemed, is_rush, shipping_address, notes, customer_id",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    const orders = data ?? [];
    const ids = Array.from(new Set(orders.map((o) => o.customer_id).filter(Boolean))) as string[];
    const customersById: Record<string, { email: string | null; name: string | null }> = {};
    if (ids.length) {
      const { data: custs } = await supabaseAdmin
        .from("customers")
        .select("id, email, name")
        .in("id", ids);
      for (const c of custs ?? []) customersById[c.id] = { email: c.email, name: c.name };
    }
    return orders.map((o) => ({
      id: o.id,
      created_at: o.created_at,
      email: o.email,
      status: o.status,
      subtotal: o.subtotal,
      total: o.total,
      rewards_earned: o.rewards_earned,
      rewards_redeemed: o.rewards_redeemed,
      is_rush: o.is_rush,
      has_shipping: !!o.shipping_address,
      notes: o.notes,
      customer_id: o.customer_id,
      customer_email: (o.customer_id && customersById[o.customer_id]?.email) || o.email,
      customer_name: (o.customer_id && customersById[o.customer_id]?.name) || null,
      is_guest: !o.customer_id,
    }));
  },
);


type UploadFile = { id: string; download_url: string | null; width_px: number | null; height_px: number | null; status: string } | null;
export type AdminOrderItem = { id: string; source: string; size_ft: number; quantity: number; unit_price: number; line_total: number; notes: string | null; dpi_ok: boolean | null; file: UploadFile };
export type AdminOrderDetail = { id: string; created_at: string; email: string; status: string; subtotal: number; shipping_fee: number; rush_fee: number; tax: number; total: number; rewards_earned: number; rewards_redeemed: number; is_rush: boolean; shipping_address: any | null; notes: string | null; tracking_number: string | null; carrier: string | null; customer_id: string | null; customer_email: string | null; customer_name: string | null; is_guest: boolean; items: AdminOrderItem[] };


function validateOrderId(raw: unknown): { orderId: string } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const orderId = typeof r.orderId === "string" ? r.orderId.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) throw new Error("Invalid order id");
  return { orderId };
}

export const getAdminOrderDetail = createServerFn({ method: "POST" })
  .inputValidator(validateOrderId)
  .handler(async ({ data }): Promise<AdminOrderDetail | null> => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin.from("orders")
      .select("id, created_at, email, status, subtotal, shipping_fee, rush_fee, tax, total, rewards_earned, rewards_redeemed, is_rush, shipping_address, notes, tracking_number, carrier, customer_id")
      .eq("id", data.orderId).maybeSingle();
    if (error) throw error;
    if (!order) return null;
    let customer_email: string | null = order.email;
    let customer_name: string | null = null;
    if (order.customer_id) {
      const { data: cust } = await supabaseAdmin
        .from("customers")
        .select("email, name")
        .eq("id", order.customer_id)
        .maybeSingle();
      if (cust) {
        customer_email = cust.email ?? order.email;
        customer_name = cust.name ?? null;
      }
    }

    const { data: items, error: itemsErr } = await supabaseAdmin.from("order_items")
      .select("id, source, size_ft, quantity, unit_price, line_total, notes, dpi_ok")
      .eq("order_id", data.orderId).order("created_at", { ascending: true });
    if (itemsErr) throw itemsErr;
    const parseUploadId = (notes: string | null): string | null => {
      if (!notes) return null;
      const m = notes.match(/upload:([0-9a-f-]{36})/i);
      return m ? m[1] : null;
    };
    const uploadIds = Array.from(new Set((items ?? []).map((it) => parseUploadId(it.notes)).filter(Boolean))) as string[];
    const uploadsById: Record<string, { file_url: string; width_px: number | null; height_px: number | null; status: string }> = {};
    if (uploadIds.length) {
      const { data: ups } = await supabaseAdmin.from("uploads").select("id, file_url, width_px, height_px, status").in("id", uploadIds);
      for (const u of ups ?? []) uploadsById[u.id] = u as any;
    }
    const itemsOut: AdminOrderItem[] = [];
    for (const it of items ?? []) {
      const uid = parseUploadId(it.notes);
      let file: UploadFile = null;
      if (uid && uploadsById[uid]) {
        const u = uploadsById[uid];
        const { data: signed } = await supabaseAdmin.storage.from("uploads").createSignedUrl(u.file_url, 3600);
        file = { id: uid, download_url: signed?.signedUrl ?? null, width_px: u.width_px, height_px: u.height_px, status: u.status };
      }
      itemsOut.push({ id: it.id, source: it.source, size_ft: it.size_ft, quantity: it.quantity, unit_price: it.unit_price, line_total: it.line_total, notes: it.notes, dpi_ok: it.dpi_ok, file });
    }
    return { ...(order as any), customer_id: order.customer_id, customer_email, customer_name, is_guest: !order.customer_id, items: itemsOut } as AdminOrderDetail;
  });
