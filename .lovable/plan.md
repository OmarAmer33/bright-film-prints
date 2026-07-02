## Step 13.5b — Loyalty accrual

Two surgical changes; nothing else touched.

### 1. New migration: `accrue_order_rewards(uuid)` RPC

Create a `security definer` function in `public` that:
- Loads the order's `status`, `customer_id`, `subtotal`.
- Returns early if not `paid` or if guest (`customer_id` null).
- Reads `rewards_rate` from `public.settings` (jsonb number), defaults to `0.10`.
- Computes `earn = round(subtotal * rate, 2)`; returns if `<= 0`.
- Atomic idempotency gate: `UPDATE orders SET rewards_earned = v_earn WHERE id = ? AND rewards_earned = 0 AND status = 'paid' AND customer_id IS NOT NULL`. If no row updated, return (already accrued / race lost).
- Insert `earn` row into `rewards_ledger` with memo `Order reward @ NN%`.
- Increment `customers.rewards_balance` (RPC is the sole writer).

Permissions: `revoke all` from public/anon/authenticated; `grant execute` to `service_role` only.

SQL used verbatim from the request.

### 2. Webhook: single accrual call

In `src/routes/api/public/stripe.webhook.ts`, inside the `checkout.session.completed` handler, in the branch where `updated?.length` is truthy (the "-> paid" log), add:

```ts
const { error: accrualErr } = await supabaseAdmin.rpc("accrue_order_rewards", {
  p_order_id: order.id,
});
if (accrualErr) {
  console.error("[stripe.webhook] rewards accrual failed:", accrualErr);
}
```

Non-fatal: errors are logged only; the webhook still returns 200. Runs only when the `new -> paid` flip actually happened this event (idempotent regardless, thanks to the RPC's gate).

### Not touched

Pricing, checkout, order creation, account route, RLS policies, reconciliation block, the paid-update statement, the `.eq('status','new')` guard, or any other file.

### After build

Publish.
