# Stop losing the customer's email address

No migration, no dependency changes. Pricing, cart, templates, sender/reply-to, idempotency, reconciliation, order_items and rewards are untouched.

## Edits

**1. New `src/lib/order-constants.ts`** (no imports)
```ts
export const GUEST_EMAIL_PLACEHOLDER = "guest@brighttransfers.local";
```

**2. `src/routes/api/public/stripe.webhook.ts`**
- Line 72: the existing order load becomes `.select("id, total, status, notes, email")`. Only the column is added; it is the same query.
- Paid update (lines 116–127): before the update, compute
  ```ts
  const stripeEmail = session.customer_details?.email?.trim();
  const backfillEmail = stripeEmail && order.email === GUEST_EMAIL_PLACEHOLDER ? stripeEmail : null;
  ```
  and spread `...(backfillEmail ? { email: backfillEmail } : {})` into the existing update object.
- The other fields, `.eq("id")`, `.eq("status","new")`, the amount_mismatch branch, accrual, redemption and the email call do not change.
- The confirmation email is sent after this update, so `loadOrderForEmail` reads the backfilled address.

**3. `src/lib/checkout.functions.ts`** (insert at line 253)
- After `resolvedCustomerId` (line 248): if `!data.email && resolvedCustomerId`, select `email` from `customers` by id with the `supabaseAdmin` already loaded at line 246.
- `email: data.email ?? customerEmail ?? GUEST_EMAIL_PLACEHOLDER`, with the constant imported from `./order-constants`.
- Nothing else in the function changes. The Stripe `customer_email: data.email` at line 335 stays as it is.

**4. `src/lib/email.server.ts`** (`loadOrderForEmail` only)
- After the customer-record block: if `toEmail === GUEST_EMAIL_PLACEHOLDER`, log `console.error(\`[email] order ${orderId} has no deliverable address; not sending\`)` and `return null`.
- Both send helpers already treat `null` as "return false". Their existing "not found" log would also fire, so I'll make that log say "not found or undeliverable". The two template strings are untouched.

## a) Where the webhook gets the current email
From the order row already loaded at lines 70–74 (`select("id, total, status, notes")`). Adding `email` to that select adds no extra database round trip.

## b) Existing paid guest orders
- The database currently has 3 paid orders with no customer account and the placeholder address. All 3 have a Stripe checkout session ID.
- This change does not alter them. The backfill only runs inside the `status = 'new'` paid-flip. A re-delivered event is stopped by the `webhook_events` dedup and by the status guard.
- Their addresses can be recovered: each stored `stripe_checkout_session_id` can be looked up in Stripe and `customer_details.email` read from it. That would be a separate one-off fix I'd propose on request. It is not part of this change.

Also noted: 11 orders that do have a customer account also carry the placeholder (3 new, 5 paid, 1 in production, 1 shipped). Emails for those are already rescued by the customer-record lookup, and they are also left as they are.

## c) Other callers of `loadOrderForEmail`
- It is used only by `sendOrderConfirmationEmail` and `sendShippingNotificationEmail`.
- Their callers are the Stripe webhook (line 151) and `updateAdminOrder` (`admin.orders.functions.ts` line 167). Both only `console.error` on `false`. Neither throws, fails the response or rolls back. The webhook still returns 200 and the admin save still returns `{ ok: true }`.
- From now on, a `false` will also appear for guest orders where Stripe gave no email. That should not happen in practice, because Stripe always collects one.

## Not changed (noted)
Signed-in customers who leave the cart email blank still get no pre-filled email in Stripe Checkout (`customer_email: data.email`). Passing the resolved customer email there would be a one-line follow-up if you want it.
