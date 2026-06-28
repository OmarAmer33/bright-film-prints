import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  buildQuote,
  computeSheet,
  computeWholesalerSheet,
  type PricingRow,
  type Quote,
} from "./pricing.server";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    },
  );
}

export type PricingPayload = {
  tiers: PricingRow[];
  settings: { upscale_fee: number; bg_removal_fee: number; free_ship_threshold: number };
};

export const getPricing = createServerFn({ method: "GET" }).handler(
  async (): Promise<PricingPayload> => {
    const supabase = publicClient();
    const [pricingRes, settingsRes] = await Promise.all([
      supabase
        .from("pricing_config")
        .select("size_ft, price, per_sqft")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("settings")
        .select("key, value")
        .in("key", ["upscale_fee", "bg_removal_fee", "free_ship_threshold"]),
    ]);
    if (pricingRes.error) throw pricingRes.error;
    if (settingsRes.error) throw settingsRes.error;

    const settingsMap = new Map<string, unknown>(
      (settingsRes.data ?? []).map((r) => [r.key, r.value]),
    );
    const num = (v: unknown, d: number) => {
      if (typeof v === "number") return v;
      if (typeof v === "string") return Number(v) || d;
      return d;
    };

    return {
      tiers: (pricingRes.data ?? []).map((r) => ({
        size_ft: Number(r.size_ft),
        price: Number(r.price),
        per_sqft: Number(r.per_sqft),
      })),
      settings: {
        upscale_fee: num(settingsMap.get("upscale_fee"), 2.49),
        bg_removal_fee: num(settingsMap.get("bg_removal_fee"), 0),
        free_ship_threshold: num(settingsMap.get("free_ship_threshold"), 75),
      },
    };
  },
);

export type QuoteInput = {
  mode: "diy" | "wholesaler";
  design_w?: number;
  design_h?: number;
  qty?: number;
  length_in?: number;
};

// Strict validator: ONLY dimensions and qty are accepted. Any client-sent
// prices/tier names are silently dropped — the server prices from the DB.
function validateQuoteInput(raw: unknown): QuoteInput {
  const r = (raw ?? {}) as Record<string, unknown>;
  const mode = r.mode === "wholesaler" ? "wholesaler" : "diy";
  const numOrUndef = (v: unknown) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    mode,
    design_w: numOrUndef(r.design_w),
    design_h: numOrUndef(r.design_h),
    qty: numOrUndef(r.qty),
    length_in: numOrUndef(r.length_in),
  };
}

export const getQuote = createServerFn({ method: "POST" })
  .inputValidator(validateQuoteInput)
  .handler(async ({ data }): Promise<Quote> => {
    const supabase = publicClient();
    const { data: pricingData, error } = await supabase
      .from("pricing_config")
      .select("size_ft, price, per_sqft")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;

    const pricing: PricingRow[] = (pricingData ?? []).map((r) => ({
      size_ft: Number(r.size_ft),
      price: Number(r.price),
      per_sqft: Number(r.per_sqft),
    }));

    if (data.mode === "wholesaler") {
      const length_in = data.length_in ?? 0;
      const comp = computeWholesalerSheet({ length_in });
      // Wholesaler qty is the sheet count (1) for per-piece purposes; treat as 1.
      return buildQuote(comp, pricing, 1);
    }

    const qty = Math.max(1, Math.floor(data.qty ?? 1));
    const comp = computeSheet({
      design_w: data.design_w ?? 0,
      design_h: data.design_h ?? 0,
      qty,
    });
    return buildQuote(comp, pricing, qty);
  });
