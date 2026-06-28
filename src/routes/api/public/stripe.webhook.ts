// Stripe webhook receiver. Lives under /api/public/* so it bypasses auth on
// published sites — signature verification IS the gate.
//
// Guardrails:
// 1. Signature verification before any work (Stripe SDK does timing-safe compare).
// 2. Idempotency layer 1: webhook_events has event_id as PK; duplicate insert -> 200.
// 3. Idempotency layer 2: orders update is gated on `status = 'new'`, so a re-
//    delivered event affecting an already-paid order updates 0 rows harmlessly.
// 4. Amount reconciliation uses Stripe's PRE-TAX amount_subtotal, not amount_total
//    (which includes Stripe-calculated tax). Mismatch -> status='issue', no paid flip.
// 5. On success, write Stripe's real charged values (tax, total) back to the order
//    so receipts and admin reports reflect what the customer actually paid.

import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";

export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sig = request.headers.get("stripe-signature");
        if (!sig) {
          return new Response("Missing signature", { status: 400 });
        }

        const rawBody = await request.text();

        const { getStripe, getWebhookSecret } = await import("@/lib/stripe.server");
        const stripe = getStripe();

        let event: Stripe.Event;
        try {
          event = stripe.webhooks.constructEvent(rawBody, sig, getWebhookSecret());
        } catch (err) {
          console.error("[stripe.webhook] signature verify failed:", (err as Error).message);
          return new Response("Invalid signature", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // -------- Idempotency layer 1: dedup by event_id --------
        const insertEvent = await (supabaseAdmin as unknown as {
          from: (t: string) => {
            insert: (row: Record<string, unknown>) => Promise<{ error: { code?: string; message?: string } | null }>;
          };
        })
          .from("webhook_events")
          .insert({
            event_id: event.id,
            type: event.type,
            payload: event as unknown as Record<string, unknown>,
          });
        if (insertEvent.error) {
          // Unique violation = already processed
          if ((insertEvent.error as { code?: string }).code === "23505") {
            console.log(`[stripe.webhook] dedup: ${event.id} already processed`);
            return new Response("ok (dup)", { status: 200 });
          }
          console.error("[stripe.webhook] event-log insert failed:", insertEvent.error);
          // Don't 500 — Stripe would retry forever. Log and ack.
          return new Response("ok (log-failed)", { status: 200 });
        }

        // -------- Handle the events we care about --------
        if (event.type === "checkout.session.completed") {
          const session = event.data.object as Stripe.Checkout.Session;
          const orderId = session.metadata?.order_id;
          if (!orderId) {
            console.warn("[stripe.webhook] session missing order_id metadata", session.id);
            return new Response("ok (no order_id)", { status: 200 });
          }

          const { data: order, error: loadErr } = await supabaseAdmin
            .from("orders")
            .select("id, total, status, notes")
            .eq("id", orderId)
            .maybeSingle();
          if (loadErr || !order) {
            console.warn(`[stripe.webhook] order ${orderId} not found:`, loadErr?.message);
            return new Response("ok (no order)", { status: 200 });
          }

          // -------- Amount reconciliation (PRE-TAX) --------
          const stripeSubtotalCents = session.amount_subtotal ?? 0;
          const dbTotalCents = Math.round(Number(order.total) * 100);
          if (stripeSubtotalCents !== dbTotalCents) {
            const note = `amount_mismatch: stripe_subtotal=${stripeSubtotalCents}c, db_total=${dbTotalCents}c, event=${event.id}`;
            console.error(`[stripe.webhook] ${note}`);
            await supabaseAdmin
              .from("orders")
              .update({
                status: "issue",
                notes: order.notes ? `${order.notes}\n${note}` : note,
              })
              .eq("id", order.id)
              .eq("status", "new");
            return new Response("ok (amount_mismatch flagged)", { status: 200 });
          }

          // -------- Mark paid, write real charged values back --------
          const stripeTaxCents = session.total_details?.amount_tax ?? 0;
          const stripeTotalCents = session.amount_total ?? dbTotalCents;
          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id;

          const { data: updated, error: updateErr } = await supabaseAdmin
            .from("orders")
            .update({
              status: "paid",
              tax: stripeTaxCents / 100,
              total: stripeTotalCents / 100,
              stripe_payment_intent_id: paymentIntentId ?? null,
            })
            .eq("id", order.id)
            .eq("status", "new") // idempotency layer 2
            .select("id");
          if (updateErr) {
            console.error("[stripe.webhook] paid update failed:", updateErr);
            return new Response("ok (update-failed)", { status: 200 });
          }
          if (!updated?.length) {
            console.log(`[stripe.webhook] order ${order.id} already paid; no-op`);
          } else {
            console.log(`[stripe.webhook] order ${order.id} -> paid`);
          }
          return new Response("ok", { status: 200 });
        }

        // Other event types: logged via webhook_events, otherwise ignored.
        return new Response("ok", { status: 200 });
      },
    },
  },
});
