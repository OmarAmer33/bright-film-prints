## Plan

1. **Add temporary webhook diagnostics only**
   - In `src/routes/api/public/stripe.webhook.ts`, add a log at the very start of the POST handler:
     - `defined: boolean`
     - `len: number | undefined`
     - `prefix: first 9 characters only`
   - Do **not** log the full secret.
   - Keep the existing `constructEvent` catch log, and ensure it prints the exact error message string.

2. **Publish the app**
   - Publish after the diagnostic log is in place so the running backend reloads the current `STRIPE_WEBHOOK_SECRET`.

3. **Trigger one fresh webhook event**
   - Use one fresh Stripe test event or fresh checkout event against the published endpoint.

4. **Read runtime logs and report exact results**
   - Report:
     - `STRIPE_WEBHOOK_SECRET` defined status
     - secret length
     - first 9-character prefix only
     - exact `constructEvent` error message
   - Interpret whether this points to missing env, stale/placeholder secret, secret mismatch, timestamp issue, or raw-body/signature issue.

5. **Leave the temporary log in place only long enough to diagnose**
   - After you confirm the cause, I’ll remove the diagnostic log in the follow-up patch unless you want it kept briefly for another resend.