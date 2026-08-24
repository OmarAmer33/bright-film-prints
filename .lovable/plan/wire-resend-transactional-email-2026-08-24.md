# Wire Resend transactional email

Two emails: order confirmation (on the Stripe paid-flip) and shipping notification (when an admin moves an order into "shipped"). Sends are fire-and-forget — they can never fail a payment webhook or an admin save.

## Files touched (exactly three, plus one secret)

1. **New: `src/lib/email.server.ts`** — server-only module, called via `await import(...)` inside server handlers.
2. **Edit: `src/routes/api/public/stripe.webhook.ts`** — one insertion in the paid branch, after the redemption block.
3. **Edit: `src/lib/admin.orders.functions.ts`** — `updateAdminOrder` handler body only.
4. **Secret: `RESEND_API_KEY`** — server-side only, requested through the secure form.

Nothing else changes: no schema, RLS, pricing, reconciliation, rewards, idempotency, or UI.

## One thing to confirm

The HTML markup inside the module you pasted was stripped by the chat (all the `<div>`, `<table>`, `<tr>` tags are gone, and the `Promise` return types lost their `<boolean>`). I will rebuild the module with the exact same structure, logic, function names, log strings, and copy, filling in table/div markup for the email body styled with the brand palette (paper `#FFF7EC`, ink, gold/sun accent on the CTA button, matching the order-summary page). Everything else stays byte-identical to what you specified.

## Technical detail

`email.server.ts`:
- `sendEmail(to, subject, html)` POSTs to `https://api.resend.com/emails` with `fetch` (no SDK — Worker-runtime safe, same constraint as the Stripe webhook's `constructEventAsync`). Returns `boolean`, self-catches, logs `[email] send failed <status>: <body>`.
- `getResendKey()` reads `process.env.RESEND_API_KEY` inside the call (never at module scope).
- `fromAddress()` = `process.env.EMAIL_FROM ?? "Bright Transfers <onboarding@resend.dev>"`. Note: the onboarding sender only delivers to your own Resend account address until a domain is verified.
- `siteOrigin()` = `process.env.PUBLIC_SITE_URL ?? "https://bright-film-prints.lovable.app"`.
- `loadOrderForEmail(orderId)` uses the service-role admin client to read the order, resolve the customer email/name via `customer_id` (falling back to `orders.email` for guests), and load `order_items`.
- `sendOrderConfirmationEmail` / `sendShippingNotificationEmail` — both `Promise<boolean>`, both self-catching, both linking to `/orders/<view_token>`.

Webhook: inside `checkout.session.completed`, in the `else` branch where the paid-flip updated a row, after the `if (redeem > 0)` block, dynamically import and call `sendOrderConfirmationEmail(order.id)`, logging on failure. The reconciliation block, the `.eq("status","new")` gate, accrual, and redemption stay untouched.

`updateAdminOrder`: reads the prior `status` before applying the patch, applies the patch as today, then sends the shipping email only on a transition into `shipped` (prior status was not already `shipped`) — so re-saving a shipped order does not re-email.

## After building

Report the changed files and confirm nothing else was modified. I will not publish unless you ask.
