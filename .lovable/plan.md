Two surgical changes to the checkout → paid flow so we capture the customer's shipping address.

Technical changes
1. src/lib/checkout.functions.ts
   - In the `stripe.checkout.sessions.create({ ... })` call, add the top-level property `shipping_address_collection: { allowed_countries: ["US"] }` immediately after `automatic_tax: { enabled: true }`.
   - Leave the single line item, discounts, metadata, success_url, and cancel_url exactly as they are. Do not touch pricing or reconciliation.

2. src/routes/api/public/stripe.webhook.ts
   - In the `checkout.session.completed` branch, immediately before the `.update({ ... })` that sets `status: "paid"` and is gated on `.eq("status", "new")`, derive a robust shipping-address object:
     ```
     const ci = (session as any).collected_information;
     const shipDetails =
       ci?.shipping_details ??
       (session as any).shipping_details ??
       (session.customer_details
         ? { name: session.customer_details.name, address: session.customer_details.address }
         : null);
     const shippingAddress = shipDetails
       ? { name: shipDetails.name ?? null, address: shipDetails.address ?? null }
       : null;
     ```
   - Add exactly one field, `shipping_address: shippingAddress`, to that same `.update({...})` object.
   - Leave amount reconciliation, the `accrue_order_rewards` RPC call, and the `commit_order_redemption` call untouched. Keep the `.eq("status", "new")` gate.

Verification
- Build the app to confirm both files compile and TypeScript is happy.
- Publish the current project.

Out of scope
- No pricing, tax, shipping fee, rewards, idempotency, reconciliation, display copy, or UI changes.
- No database schema changes are needed; `orders.shipping_address` already exists as jsonb.
