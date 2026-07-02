## Step 13.5c — Stamp `rewards_rate_applied` on orders

Single new migration. Nothing else touched (no webhook, no checkout, no UI, no types edits — types regenerate after approval).

### Migration

1. `alter table public.orders add column if not exists rewards_rate_applied numeric not null default 0;`
2. `create or replace function public.accrue_order_rewards(p_order_id uuid)` — same body as today, with two changes:
   - The atomic idempotency UPDATE also sets `rewards_rate_applied = v_rate`.
   - Idempotency guard (`rewards_earned = 0 AND status = 'paid' AND customer_id IS NOT NULL`) unchanged — still exactly-once.
3. Re-apply permissions: `revoke all ... from public, anon, authenticated;` `grant execute ... to service_role;`

### Not touched

Webhook, checkout, cart, pricing, RLS policies, order creation, account route, ledger schema, customers schema.

### After build

Publish.
