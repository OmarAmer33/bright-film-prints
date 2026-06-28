## Step 13.4 (revised) — Cart, Stripe Checkout, Order Creation

Test-mode only. Three revisions folded in: tax-safe amount reconciliation, schema-qualified token default, single-environment test target.

### Secrets sequencing (this turn)

1. Request via `add_secret`:
   - `STRIPE_SECRET_KEY` — you paste `sk_test_…`
   - `VITE_STRIPE_PUBLISHABLE_KEY` — you paste `pk_test_…`
   - `STRIPE_WEBHOOK_SECRET` — paste `whsec_placeholder` for now
2. Build & deploy.
3. **Single test target** (revision #3): register **production** URL in Stripe and run all test checkouts against it: `https://bright-film-prints.lovable.app/api/public/stripe.webhook`. Preview and production share the same Lovable Cloud database, so events would route to the same orders either way — but using one URL avoids any split-brain confusion and avoids re-registering at launch. (Preview URL `https://project--e9e1cf9d-5f52-4372-869d-697167934b89-dev.lovable.app/api/public/stripe.webhook` stays available as a fallback only if the production endpoint ever has issues.)
4. Register endpoint → grab real `whsec_…` → `update_secret` swaps it in. Until then signature verification rejects every event; cart, createCheckout, redirect, success polling all still testable.

### Schema additions (one migration)

- `webhook_events` already exists from earlier work — confirm `event_id text primary key`, `type text`, `received_at timestamptz default now()`, `payload jsonb`. Service-role only, no anon/auth grants.
- `orders` additions:
  - `view_token text unique not null default encode(extensions.gen_random_bytes(24), 'hex')` — **revision #2**: schema-qualified because the earlier hardening migration moved pgcrypto into the `extensions` schema; bare `gen_random_bytes` is no longer on the default search_path and would fail at insert time. `gen_random_uuid()` stays as-is (core Postgres).
  - `stripe_checkout_session_id text unique` — for webhook→order lookup.
- Status enum already includes `issue`; reused for amount-mismatch and signature-mismatch flagging.

### Server modules

- `src/lib/stripe.server.ts` — lazy Stripe client; reads `STRIPE_SECRET_KEY` inside getter.
- `src/lib/checkout.functions.ts`:
  - `createCheckout` (`POST`). Input: array of `{ source, size_ft, quantity, design_w?, design_h?, job_qty?, length_in?, upload_id? }`. **No prices accepted from client.** Handler:
    1. Loads pricing fresh from DB.
    2. Re-runs `computeSheet` / `computeWholesalerSheet` per line; prices server-side.
    3. **Tampering rejects independently on three checks:** recomputed `size_ft` mismatch vs any claimed, recomputed sheet `quantity` mismatch vs claimed, out-of-range dims. Server trusts only its own recomputed values.
    4. Loads `settings` for `free_ship_threshold`, `standard_ship_fee`, `rush_fee`.
    5. Computes `subtotal`, `shipping_fee`, `total = subtotal + shipping_fee + rush_fee` (**pre-tax** — tax is applied by Stripe on top).
    6. Inserts `orders` row (`status='new'`, email if provided, `view_token` auto, `tax=0` placeholder — populated by webhook), inserts `order_items` with authoritative pricing.
    7. Creates Stripe Checkout Session: **single combined line item** with `amount = order.total` (pre-tax cents) and `name = "Bright Transfers gang sheets — N items"`, `automatic_tax: { enabled: true }`, `metadata: { order_id, view_token }`, `success_url = /orders/{view_token}?checkout=success`, `cancel_url = /cart?checkout=cancel`, `customer_email` when known.
    8. Persists `stripe_checkout_session_id` on the order.
    9. Returns `{ url, view_token }`.
- `src/lib/orders.functions.ts` → `getOrderForView({ token })` — public read by `view_token`; gates `clear()`.

### Webhook route — `src/routes/api/public/stripe.webhook.ts`

`POST` handler:

1. Read raw body, `stripe-signature` header.
2. `stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)` — invalid sig → `401`.
3. **Idempotency layer 1:** insert into `webhook_events(event_id, type, payload)`; on unique violation, return `200` immediately.
4. Switch `event.type === 'checkout.session.completed'`:
   - Load order by `metadata.order_id`. Missing → log + `200`.
   - **Amount reconciliation (revision #1):** compare `event.data.object.amount_subtotal` (Stripe's pre-tax figure, cents) against `Math.round(order.total * 100)`. **Not `amount_total`** — `amount_total` includes Stripe-calculated tax and would false-flag every taxed order at launch.
     - Mismatch → `update orders set status='issue', notes=appended('amount_mismatch: stripe_subtotal=X, db_total=Y')`. Log. Return `200`. Do not mark paid. Do not send confirmation.
   - On match: in a single update, write the **real charged values** back so the DB matches what the customer actually paid:
     ```sql
     update orders set
       status = 'paid',
       tax = (amount_tax_cents / 100.0),
       total = (amount_total_cents / 100.0),
       stripe_payment_intent_id = ...,
       updated_at = now()
     where id = $1 and status = 'new';
     ```
     Reads `event.data.object.total_details.amount_tax` and `event.data.object.amount_total`. This keeps receipts, the future admin dashboard, and refund math honest — `orders.total` post-paid equals what Stripe charged.
   - **Layer 2 idempotency** is the `status='new'` guard — a re-delivered event finds `status='paid'` and updates zero rows.
5. Other event types: dedupe + `200`.

### Cart page (`src/routes/cart.tsx`)

Replace disabled button with `Checkout` calling `useServerFn(createCheckout)` with dims/qty/source only; `window.location.assign(url)`. Optional guest email input above. Subtotal stays client-display only; real totals from the server (and may differ slightly once tax is added at Stripe Checkout).

### Order success page — `src/routes/orders.$token.tsx`

- Loader: `getOrderForView({ token: params.token })`.
- If `?checkout=success` AND loader returned the order: `useEffect` → `useCart.getState().clear()` (gated on verified ownership, not URL).
- Polling: 2s interval up to 30s while `status==='new'` → "Finalizing your payment…". When `paid` → confirmation + items + the now-accurate `total` (incl. tax) + `view_token` link.
- **30s fallback:** still `new` → "Your payment went through — your confirmation will arrive by email shortly." Never an error state.
- `status==='issue'`: "We're reviewing your payment — we'll email you shortly."

### Reviewer additions — confirmation

| # | Note | Where in plan |
|---|---|---|
| 1 | Downgraded-size_ft / quantity tampering tests | checkout.functions.ts step 3; Verification §C2, §C3 |
| 2 | Webhook amount reconciliation → status `issue` on mismatch | Webhook step 4 |
| 3 | Stripe Tax depends on Chai's dashboard origin/registration for live | Noted; test-mode tax ≈ 0 |
| 4 | "Payment succeeded, email coming" 30s fallback | Success page |
| 5 | `clear()` gated on verified order ownership | Success page |

### Revisions in this pass

| # | Change | Why |
|---|---|---|
| 1 | Reconcile on `amount_subtotal` vs `order.total`; on match write `tax` + `total` from Stripe back to DB | `amount_total` includes Stripe tax → would false-flag every real-tax order at launch; writing real values keeps DB honest with receipts |
| 2 | `view_token` default uses `extensions.gen_random_bytes(24)` | pgcrypto lives in `extensions` schema after hardening — bare reference fails |
| 3 | Single test target: production URL `bright-film-prints.lovable.app/api/public/stripe.webhook` | Preview + prod share DB so either works, but one URL = no split-brain + no re-register at launch |

### Verification (after real `whsec_`)

A. Happy path: card `4242 4242 4242 4242` → redirect → polls → `paid`, cart cleared, `orders.total` updated to charged amount, `orders.tax` populated.

B. **Webhook replay idempotency:** Dashboard "Send test event" / resend → second `webhook_events` insert conflicts, returns 200, order stays `paid` exactly once.

C. **Tampering matrix (must all reject):**
   1. Extra `unit_price` fields → ignored, reprised.
   2. Honest 4×10×20 (formula → 5 ft) with claimed `size_ft: 3` → rejected.
   3. Honest dims with claimed sheet `quantity: 1` when formula needs 2 (auto-split) → rejected.
   4. Wholesaler `length_in: 30` with claimed `size_ft: 3` → rejected.

D. **Amount-mismatch flagging:** manually mutate `orders.total` between session creation and webhook arrival, replay event → status flips to `issue`, not `paid`, notes appended.

E. **Tax-not-flagged check (revision #1 proof):** even in test mode with a small non-zero tax (use a Stripe tax-test product or simulate), confirm the webhook reconciles on subtotal and does **not** flip to `issue`. Confirm `orders.tax` post-paid is non-zero and `orders.total` equals `amount_total/100`.

F. **30s fallback:** disable webhook delivery in Stripe, complete payment → success page shows graceful email-coming copy after 30s.

G. **Cart clear gating:** `/orders/bogus-token?checkout=success` → no clear, cart preserved.

### Out of scope

Loyalty accrual (13.5), admin (13.6), live AI (13.7), live tax origin config (launch), live Stripe keys (launch).
