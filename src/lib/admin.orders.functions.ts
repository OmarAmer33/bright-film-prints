import { createServerFn } from "@tanstack/react-start";
import { assertAdmin } from "@/lib/admin.functions";

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
};

export const listAdminOrders = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminOrderRow[]> => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, created_at, email, status, subtotal, total, rewards_earned, rewards_redeemed, is_rush, shipping_address, notes",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []).map((o) => ({
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
    }));
  },
);
