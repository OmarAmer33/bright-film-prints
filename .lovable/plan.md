
## Part 2 — Redemption end-to-end wiring

Three-file change. No migrations, no SQL, no RLS, no pricing changes. Server is authoritative; client's number is a request only. Logged-in only; guests unchanged.

---

### File 1 — `src/lib/checkout.functions.ts`

**Type + validation**
- Add `redeem_requested?: number` to `CheckoutInput`.
- In `validateCheckoutInput`, parse `r.redeem_requested` via existing `numOrUndef`, then keep it only if `> 0` (else `undefined`). Return it on the object.

**Handler — inserted after `total` is computed and after `resolvedCustomerId = await resolveCustomerIdFromAuth()`, BEFORE `stripe.checkout.sessions.create`:**
- If `resolvedCustomerId == null` or `!data.redeem_requested` or `data.redeem_requested <= 0` → skip entirely (no coupon, no discount, no metadata addition, no state change). Existing session-create call is unchanged.
- Otherwise:
  - Read balance: `supabaseAdmin.from("customers").select("rewards_balance").eq("id", resolvedCustomerId).maybeSingle()`. `const bal = Number(balRow?.rewards_balance ?? 0)`.
  - `const redeem = Number(Math.min(data.redeem_requested, bal, total - 0.5).toFixed(2))`.
  - If `redeem < 0.01` → skip redemption (same as no-redemption branch).
  - Else create one-time coupon:
    ```ts
    const coupon = await stripe.coupons.create({
      amount_off: Math.round(redeem * 100),
      currency: "usd",
      duration: "once",
      max_redemptions: 1,
      name: "Bright rewards",
    });
    ```
  - Pass `discounts: [{ coupon: coupon.id }]` to `checkout.sessions.create`.
  - Add `rewards_redeemed: String(redeem)` to session `metadata` (alongside existing `order_id` and `view_token`).
- The single combined line item keeps `unit_amount = Math.round(total * 100)` (pre-discount).
- Do NOT touch `orders.total`, `orders.rewards_redeemed`, `orders.rewards_redeemed_committed`, or `customers.rewards_balance` here.

Implementation shape: compute redemption values (`redeem`, `couponId`) in a small block, then thread them into the `create({...})` call via conditional spreads so the no-redemption path is byte-identical to today.

---

### File 2 — `src/routes/api/public/stripe.webhook.ts`

Inside `checkout.session.completed`, in the `else` branch of `if (!updated?.length)` (i.e., the branch that logs `"order X -> paid"` and calls `accrue_order_rewards`), immediately AFTER the existing `accrue_order_rewards` RPC block, add:

```ts
const redeem = Number(session.metadata?.rewards_redeemed ?? 0);
if (redeem > 0) {
  const { error: redeemErr } = await supabaseAdmin.rpc("commit_order_redemption", {
    p_order_id: order.id,
    p_redeem: redeem,
  });
  if (redeemErr) console.error("[stripe.webhook] redemption commit failed:", redeemErr);
}
```

Nothing else in the webhook changes — reconciliation, paid flip, idempotency layers, event log all untouched.

---

### File 3 — `src/routes/cart.tsx`

**State + auth wiring**
- Import `useEffect`, `supabase` from `@/integrations/supabase/client`.
- New state: `balance: number` (default `0`), `applyRewards: boolean` (default `false`), `signedIn: boolean` (default `false`).
- `useEffect` on mount:
  - Call `supabase.auth.getSession()`; if session, fetch `customers.rewards_balance` where `auth_user_id = session.user.id` (`.maybeSingle()`), set `balance = Number(row?.rewards_balance ?? 0)` and `signedIn = true`. If no session, reset balance/signedIn and force `applyRewards = false`.
  - Subscribe with `supabase.auth.onAuthStateChange` — on change, re-run the same load (or clear on sign-out). Unsubscribe on unmount.

**UI — inserted above the Checkout button block (inside the `items.length > 0` branch, just before the flex column that holds email + checkout button, or above the button itself within that column — placement above the button, below email, both acceptable; using above the email→button column keeps it prominent):**

Render only when `signedIn && balance > 0`:
```tsx
<div className="w-full sm:max-w-sm rounded-card border border-line bg-paper p-3">
  <label className="flex items-center gap-2 text-sm text-ink">
    <input
      type="checkbox"
      checked={applyRewards}
      onChange={(e) => setApplyRewards(e.target.checked)}
      className="h-4 w-4 rounded border-line accent-ember"
    />
    <span>Apply my ${balance.toFixed(2)} in rewards</span>
  </label>
  {applyRewards && (
    <p className="mt-2 text-xs text-stone">
      Rewards −${balance.toFixed(2)} applied at checkout (final amount confirmed by Stripe)
    </p>
  )}
</div>
```
Uses only existing tokens (`border-line`, `rounded-card`, `bg-paper`, `text-ink`, `text-stone`, `ember`).

**Payload** — in `onCheckout`, if `applyRewards && balance > 0`, add `redeem_requested: balance` to the payload; otherwise omit the key entirely.

No changes to email input, items list, subtotal display, remove button, or empty-cart state.

---

### Verification
- Typecheck must pass.
- Guest checkout path: no auth header → `resolvedCustomerId` null → redemption block skipped → session-create call identical to today.
- Signed-in with toggle OFF: `redeem_requested` omitted → skipped → identical to today.
- Signed-in with toggle ON and balance > 0: coupon created, `discounts` + `metadata.rewards_redeemed` set; on webhook `paid`, `commit_order_redemption` runs.

### Publish
After build passes, publish to `bright-film-prints.lovable.app`.
