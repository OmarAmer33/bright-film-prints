## Step 13.5a — associate checkout orders with the logged-in customer

Scope: `src/lib/checkout.functions.ts` only. No webhook, schema, or migration changes. Guests remain unaffected; checkout never throws on missing/invalid auth.

### Change 1 — add non-throwing helper

Add above `createCheckout`:

```ts
import { getRequest } from "@tanstack/react-start/server";

async function resolveCustomerIdFromAuth(): Promise<string | null> {
  try {
    const req = getRequest();
    const auth = req.headers.get("authorization");
    if (!auth || !auth.startsWith("Bearer ")) return null;
    const token = auth.slice("Bearer ".length).trim();
    if (token.split(".").length !== 3) return null;

    const pub = publicClient();
    const { data: claimsRes, error: claimsErr } = await pub.auth.getClaims(token);
    if (claimsErr || !claimsRes?.claims?.sub) return null;
    const sub = claimsRes.claims.sub as string;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("auth_user_id", sub)
      .maybeSingle();
    return row?.id ?? null;
  } catch {
    return null;
  }
}
```

Notes:
- `publicClient()` (already in this file) returns a SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY client — reused for `auth.getClaims(token)`.
- Every failure path (no header, wrong scheme, non-JWT-shaped token, `getClaims` error, no matching `customers` row, any thrown error) returns `null` → guest.
- `customer_id` is derived only from the verified token; no client input is trusted.

### Change 2 — set `customer_id` on the order insert

Inside the `createCheckout` handler, immediately before the `supabaseAdmin.from("orders").insert(...)` call, add:

```ts
const resolvedCustomerId = await resolveCustomerIdFromAuth();
```

Then add one field to the insert object:

```ts
customer_id: resolvedCustomerId,
```

Nothing else in the insert or downstream logic changes. No changes to `CheckoutInput` / `CheckoutLineInput` types.

### Not touched
- Pricing/quote logic, `claimed_breakdown` validation, Stripe session creation, `metadata.order_id`, email handling, `order_items` rows, webhook, DB schema, migrations, and the `requireSupabaseAuth` middleware (deliberately NOT applied — would break guest checkout).

### After the edit
1. Show the full diff of `src/lib/checkout.functions.ts`.
2. Confirm no other files changed.
3. Publish.
