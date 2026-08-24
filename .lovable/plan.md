# Stage 1 — EasyPost test-mode label generation (admin only)

Buy a TEST-mode shipping label from the admin order detail page, store tracking, carrier, label URL and shipment id on the order. No status change, no email, no checkout/pricing/rewards changes.

## 1. Migration

Idempotent, additive only:

```sql
alter table public.orders add column if not exists label_url text;
alter table public.orders add column if not exists easypost_shipment_id text;
```

Both nullable. Existing RLS/grants already cover the `orders` table; these columns are only read/written through the service-role admin server functions.

## 2. New file: `src/lib/easypost.server.ts`

Exactly the content supplied: REST client over `fetch` with Basic auth (`EASYPOST_API_KEY` as username, empty password), `epFetch` error unwrapping, and `buyCheapestLabel` which creates a shipment, picks the cheapest rate, buys it, and returns `{ shipment_id, tracking_code, carrier, label_url }`. Server-only, imported dynamically inside handlers.

## 3. Edit `src/lib/admin.orders.functions.ts`

- Add `label_url: string | null;` to `AdminOrderDetail`.
- Add `label_url` to the select string in `getAdminOrderDetail` (the return spreads the row).
- Append the `SHIP_FROM` placeholder constant (Miramar address — CHAI-CONFIRM at launch) and the new `generateShippingLabel` server function exactly as specified: admin-guarded, validates order id with the existing `validateOrderId`, requires a complete captured ship-to, derives parcel weight from total feet (`8 + 4 * totalFeet` oz — CHAI-CONFIRM), buys the label, then writes `tracking_number`, `carrier`, `label_url`, `easypost_shipment_id` back to the order.

No status write, no email call in this function.

## 4. Edit `src/routes/admin_.orders.$id.tsx`

- Add `generateShippingLabel` to the existing import.
- Add a `LabelGenerator` component with the specified behavior: disabled when there is no ship-to address, "Generate label (test)" button, busy state, success/error message, `reload()` after success. When `order.label_url` exists it instead shows carrier, tracking, a "Download label" link (new tab), and the note that buying a label does not notify the customer — status must be set to "shipped" below to send the shipping email.
- Render `<LabelGenerator ... />` immediately after `<FulfillmentEditor ... />` in `OrderView`.

Note on markup: the JSX inside the pasted `LabelGenerator` was stripped by the message formatter, so the element structure will be rebuilt to match the surrounding admin page conventions (`rounded-2xl border border-line bg-white p-6 shadow-sm` card, `font-display text-lg font-bold text-ink` heading, shadcn `Button`, `text-stone` / `text-ember` message colors). Logic, copy, and hook order stay exactly as specified.

## 5. Secret

Request `EASYPOST_API_KEY` (test key, `EZTK...`) through the secure secret form. Server-side only — never `VITE_`-prefixed, never referenced from client code.

## Order of work

1. Migration (approval required) → 2. secret request → 3. `easypost.server.ts` → 4. server function edits → 5. admin UI edit → 6. typecheck and report exact files changed.

## Out of scope

Checkout, pricing, reconciliation, rewards, flat-rate shipping model, order status transitions, and all email sending remain byte-for-byte unchanged.
