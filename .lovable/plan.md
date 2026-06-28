## Unblock the Stripe webhook 401 loop

Audit result first, so we agree on the diagnosis before changing anything:

**Raw-body handling in `src/routes/api/public/stripe.webhook.ts` is correct.**
- First action after the `stripe-signature` header check is `const rawBody = await request.text()`.
- That exact string is passed to `stripe.webhooks.constructEvent(rawBody, sig, getWebhookSecret())`.
- No JSON parse, no re-stringify, no logging-then-reserialize, no middleware touches the body. `src/server.ts` forwards untouched to `@tanstack/react-start/server-entry`; no global body parser sits in front of `/api/public/*`.
- `getWebhookSecret()` reads `process.env.STRIPE_WEBHOOK_SECRET` lazily inside the handler, not at module scope — correct for Worker runtime.

So the 401 is **not** a body-integrity bug. The two remaining causes are (a) the stored secret doesn't match the live endpoint's signing secret, or (b) the running deploy was started before the most recent secret save and still has the old value cached in `process.env`.

### Steps

1. **Re-store `STRIPE_WEBHOOK_SECRET` via the secure form.** Open `update_secret` for `STRIPE_WEBHOOK_SECRET`. The form trims surrounding whitespace and newlines automatically — pasting cleanly into the field is sufficient to eliminate the whitespace concern. (No code can read the value back to "confirm no whitespace"; the form's storage path is the guarantee.)

2. **Republish so the Worker picks up the new secret value.** Secret changes only reach the running backend on the next deploy. After the user confirms the secret form is saved, call `preview_ui--publish` to redeploy the production Worker at `bright-film-prints.lovable.app`. Confirm the deploy completed before step 3.

3. **User action — Resend the failed event from Stripe.** In the Stripe dashboard's "Bright Transfers — test" endpoint, hit **Resend** on the most recent failed `checkout.session.completed`. Expected outcome:
   - Stripe shows `200 OK` (not 401).
   - `orders` row for that session flips `status: 'new' → 'paid'`, `stripe_payment_intent_id` populates, `tax` and `total` reflect Stripe's `amount_tax` / `amount_total`.
   - `webhook_events` has a row keyed by that `event_id`.

4. **Verification I'll run after the resend.** Read the affected order and the `webhook_events` row, then report back the observed `status`, `total`, `tax`, `stripe_payment_intent_id`, and the recorded `event_id` so we agree the path is clean.

### What I'll report after step 2

> Audit: raw-body path is correct, not the cause. Most likely fix: re-stored secret + republish so the Worker reloads `process.env.STRIPE_WEBHOOK_SECRET`. Hit Resend now.

### Held until 401 is cleared

- D2/D2c multi-line tampering patch in `src/lib/checkout.functions.ts`.
- Test-data cleanup migration for `evt_test_*` events, their orders, `order_items`, and orphaned `uploads`.

No code changes in this turn — secret + republish only. If the resend still 401s after both, next step is to log the first 12 chars of the secret prefix (`whsec_…`) and Stripe's `t=…` timestamp delta in a one-off diagnostic to rule out a stale-event-vs-tolerance issue, without ever logging the secret body.