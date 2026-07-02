## Step 13.5d — Redemption RPC layer (backend only)

Single new migration. No code, UI, RLS, checkout, webhook, or cart changes. Types regenerate automatically after approval.

### Migration contents (exact SQL as provided)

1. **Schema:** `alter table public.orders add column if not exists rewards_redeemed_committed boolean not null default false;` — idempotency gate for redemption commits.

2. **`public.apply_rewards_delta(p_customer uuid, p_delta numeric)`** — new SECURITY DEFINER function; the only mutator of `customers.rewards_balance`. `revoke all` from public/anon/authenticated; `grant execute` to `service_role`.

3. **`public.accrue_order_rewards(p_order_id uuid)`** — replaced with identical behavior; only the final balance update is swapped from an inline `UPDATE customers` to `perform public.apply_rewards_delta(v_customer, v_earn)`. Same idempotency guard (`rewards_earned = 0 AND status = 'paid' AND customer_id IS NOT NULL`), same rate stamp, same 'earn' ledger insert. Same revoke/grant.

4. **`public.commit_order_redemption(p_order_id uuid, p_redeem numeric)`** — new SECURITY DEFINER function. Commit-on-paid, idempotent via atomic `rewards_redeemed_committed` flip. Row-locks the customer, debits `least(p_redeem, balance)`, inserts a `'redeem'` ledger row with negative amount, calls `apply_rewards_delta(-v_debit)`. Flags `status = 'issue'` with a `redeem_shortfall` note when the balance can't cover the full request. Same revoke/grant.

All three functions: `language plpgsql`, `security definer`, `set search_path = public, extensions`, executable by `service_role` only.

### Untouched
Checkout, Stripe webhook, cart store, all UI/routes, RLS policies, `orders` RLS, `rewards_ledger` schema, `customers` schema (aside from the balance write path), settings, types (regenerated, never hand-edited).

### After approval
Publish.
