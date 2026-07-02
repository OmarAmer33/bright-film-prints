Display-only update for the order-summary page so rewards redemption and earning are visible.

Technical changes
1. src/lib/orders.functions.ts
   - Add `rewards_redeemed` and `rewards_earned` to the Supabase `.select(...)` string for orders.
   - Extend the `OrderForView` type with `rewards_redeemed: number` and `rewards_earned: number`.
   - In the return object, convert them with `Number(order.rewards_redeemed)` and `Number(order.rewards_earned)` alongside the existing numeric field conversions.

2. src/routes/orders.$token.tsx
   - In the totals `<dl>`, insert a conditional `Row` immediately before the `Total` row:
     - Rendered only when `order.rewards_redeemed > 0`.
     - Label `Rewards`, value `-$${order.rewards_redeemed.toFixed(2)}`.
   - After the `Total` row, add a small muted line rendered only when `order.rewards_earned > 0`:
     - `You earned $${order.rewards_earned.toFixed(2)} in rewards on this order.`
     - Uses existing `mt-2 text-xs text-stone` styling.
   - No other changes to layout, Row component, StatusBanner, polling logic, or metadata.

Verification
- Build the app to confirm the new fields are typed correctly and the JSX is valid.
- Publish the current project.

Out of scope
- Pricing, checkout, webhook, RPC, database schema, RLS, or reconciliation logic.