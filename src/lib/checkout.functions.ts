import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  buildQuote,
  computeSheet,
  computeWholesalerSheet,
  type PricingRow,
} from "./pricing-core";

// ---------------- Input validation ----------------
// Accept ONLY dimensions/qty/source — never prices, never claimed sizes that we'll trust.
// Client may include `claimed_size_ft` and `claimed_quantity` purely so we can compare
// them against our own recomputation and reject tampering loudly. The server still
// trusts only its own recomputed values.
export type CheckoutLineInput = {
  source: "upload" | "builder";
  // DIY mode
  design_w?: number;
  design_h?: number;
  job_qty?: number; // pieces the customer wants to print
  // Wholesaler mode
  length_in?: number;
  // Common
  upload_id?: string;
  // Tampering-detection fields — server compares to recomputed values
  claimed_size_ft?: number;
  claimed_sheet_count?: number;
};

export type CheckoutInput = {
  items: CheckoutLineInput[];
  email?: string;
  is_rush?: boolean;
};

function numOrUndef(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function validateCheckoutInput(raw: unknown): CheckoutInput {
  const r = (raw ?? {}) as Record<string, unknown>;
  const itemsRaw = Array.isArray(r.items) ? r.items : [];
  const items: CheckoutLineInput[] = itemsRaw.slice(0, 50).map((it) => {
    const o = (it ?? {}) as Record<string, unknown>;
    const source = o.source === "builder" ? "builder" : "upload";
    return {
      source,
      design_w: numOrUndef(o.design_w),
      design_h: numOrUndef(o.design_h),
      job_qty: numOrUndef(o.job_qty),
      length_in: numOrUndef(o.length_in),
      upload_id: typeof o.upload_id === "string" ? o.upload_id : undefined,
      claimed_size_ft: numOrUndef(o.claimed_size_ft),
      claimed_sheet_count: numOrUndef(o.claimed_sheet_count),
    };
  });
  const email = typeof r.email === "string" && r.email.includes("@") ? r.email.trim() : undefined;
  const is_rush = Boolean(r.is_rush);
  return { items, email, is_rush };
}

// ---------------- Server publishable client (public reads) ----------------
function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export type CreateCheckoutResult = {
  url: string;
  view_token: string;
};

// ---------------- The function ----------------
export const createCheckout = createServerFn({ method: "POST" })
  .inputValidator(validateCheckoutInput)
  .handler(async ({ data }): Promise<CreateCheckoutResult> => {
    if (!data.items.length) {
      throw new Error("Cart is empty");
    }

    const supabasePub = publicClient();

    // Load pricing + settings fresh from DB.
    const [pricingRes, settingsRes] = await Promise.all([
      supabasePub
        .from("pricing_config")
        .select("size_ft, price, per_sqft")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabasePub
        .from("settings")
        .select("key, value")
        .in("key", ["free_ship_threshold", "standard_ship_fee", "rush_fee"]),
    ]);
    if (pricingRes.error) throw pricingRes.error;
    if (settingsRes.error) throw settingsRes.error;

    const pricing: PricingRow[] = (pricingRes.data ?? []).map((r) => ({
      size_ft: Number(r.size_ft),
      price: Number(r.price),
      per_sqft: Number(r.per_sqft),
    }));
    const settingsMap = new Map<string, unknown>(
      (settingsRes.data ?? []).map((r) => [r.key, r.value]),
    );
    const num = (v: unknown, d: number) => {
      if (typeof v === "number") return v;
      if (typeof v === "string") return Number(v) || d;
      return d;
    };
    const free_ship_threshold = num(settingsMap.get("free_ship_threshold"), 75);
    const standard_ship_fee = num(settingsMap.get("standard_ship_fee"), 6.99);
    const rush_fee = num(settingsMap.get("rush_fee"), 19.99);

    // ---- Reprice every line server-side and reject tampering loudly ----
    type ResolvedLine = {
      source: "upload" | "builder";
      size_ft: number;
      sheet_count: number;
      unit_price: number;
      line_total: number;
      job_qty: number;
      design_w: number | null;
      design_h: number | null;
      length_in: number;
      per_piece: number;
      upload_id: string | null;
    };

    const resolved: ResolvedLine[] = [];

    for (const [idx, item] of data.items.entries()) {
      let comp;
      let jobQty = 1;
      if (item.source === "upload" || item.source === "builder") {
        // DIY or builder = treat as design×qty calculator
        if (item.length_in && item.length_in > 0 && !item.design_w && !item.design_h) {
          // Wholesaler-style line (length-only)
          comp = computeWholesalerSheet({ length_in: item.length_in });
          jobQty = 1;
        } else {
          jobQty = Math.max(1, Math.floor(item.job_qty ?? 0));
          comp = computeSheet({
            design_w: item.design_w ?? 0,
            design_h: item.design_h ?? 0,
            qty: jobQty,
          });
          if (comp.over_width) {
            throw new Error(`Item ${idx + 1}: design exceeds 22" film width`);
          }
          if (!item.design_w || !item.design_h || jobQty <= 0) {
            throw new Error(`Item ${idx + 1}: missing dimensions or quantity`);
          }
        }
      } else {
        throw new Error(`Item ${idx + 1}: invalid source`);
      }

      const quote = buildQuote(comp, pricing, jobQty);

      // Each priced line in the quote is its own ResolvedLine
      for (const line of quote.lines) {
        // Tampering checks — server trusts its own recomputed values.
        if (
          item.claimed_size_ft !== undefined &&
          quote.lines.length === 1 &&
          Number(item.claimed_size_ft) !== line.size_ft
        ) {
          throw new Error(
            `Item ${idx + 1}: claimed size ${item.claimed_size_ft}ft does not match computed size ${line.size_ft}ft`,
          );
        }
        if (
          item.claimed_sheet_count !== undefined &&
          quote.lines.length === 1 &&
          Number(item.claimed_sheet_count) !== line.count
        ) {
          throw new Error(
            `Item ${idx + 1}: claimed sheet count ${item.claimed_sheet_count} does not match computed count ${line.count}`,
          );
        }

        resolved.push({
          source: item.source,
          size_ft: line.size_ft,
          sheet_count: line.count,
          unit_price: line.unit_price,
          line_total: line.line_total,
          job_qty: jobQty,
          design_w: item.design_w ?? null,
          design_h: item.design_h ?? null,
          length_in: comp.length_in,
          per_piece: quote.per_piece,
          upload_id: item.upload_id ?? null,
        });
      }
    }

    if (!resolved.length) {
      throw new Error("Could not price any items");
    }

    const subtotal = Number(resolved.reduce((s, l) => s + l.line_total, 0).toFixed(2));
    const shipping_fee = subtotal >= free_ship_threshold ? 0 : standard_ship_fee;
    const rushFeeApplied = data.is_rush ? rush_fee : 0;
    const total = Number((subtotal + shipping_fee + rushFeeApplied).toFixed(2));

    // ---- Insert order + items (service role) ----
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: orderRow, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        email: data.email ?? "guest@brighttransfers.local",
        status: "new",
        subtotal,
        shipping_fee,
        rush_fee: rushFeeApplied,
        tax: 0, // populated by webhook on paid
        total,
        is_rush: Boolean(data.is_rush),
      })
      .select("id, view_token")
      .single();
    if (orderErr || !orderRow) throw orderErr ?? new Error("Order insert failed");

    const itemsRows = resolved.map((l) => ({
      order_id: orderRow.id,
      source: l.source,
      size_ft: l.size_ft,
      quantity: l.sheet_count,
      unit_price: l.unit_price,
      line_total: l.line_total,
      notes:
        l.design_w && l.design_h
          ? `${l.job_qty} pieces · ${l.design_w}×${l.design_h}" · ~$${l.per_piece.toFixed(2)}/pc${l.upload_id ? ` · upload:${l.upload_id}` : ""}`
          : `${l.length_in.toFixed(0)}" wholesaler sheet${l.upload_id ? ` · upload:${l.upload_id}` : ""}`,
    }));

    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(itemsRows);
    if (itemsErr) throw itemsErr;

    // ---- Create Stripe Checkout Session ----
    const { getStripe } = await import("@/lib/stripe.server");
    const stripe = getStripe();

    const origin =
      (process.env.PUBLIC_SITE_URL as string | undefined) ??
      "https://bright-film-prints.lovable.app";

    const totalSheets = resolved.reduce((s, l) => s + l.sheet_count, 0);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: data.email,
      // Single combined line item to avoid per-line tax rounding mismatch
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(total * 100),
            product_data: {
              name: `Bright Transfers gang sheets — ${totalSheets} sheet${totalSheets === 1 ? "" : "s"}`,
              description: resolved
                .map((l) => `${l.sheet_count}× ${l.size_ft}ft @ $${l.unit_price.toFixed(2)}`)
                .join(" · "),
            },
          },
        },
      ],
      automatic_tax: { enabled: true },
      metadata: {
        order_id: orderRow.id,
        view_token: orderRow.view_token,
      },
      success_url: `${origin}/orders/${orderRow.view_token}?checkout=success`,
      cancel_url: `${origin}/cart?checkout=cancel`,
    });

    if (!session.url) {
      throw new Error("Stripe session created without a URL");
    }

    await supabaseAdmin
      .from("orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", orderRow.id);

    return { url: session.url, view_token: orderRow.view_token };
  });
