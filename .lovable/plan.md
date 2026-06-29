## Test-data cleanup migration — revised (webhook_events full-clear)

### `webhook_events` type breakdown (read-only, just ran)

| type | count |
|---|---|
| `checkout.session.completed` | 7 |
| `payment_intent.succeeded` | 4 |
| `payment_intent.payment_failed` | 1 |
| **Total** | **12** |

Confirms the rationale: the surgical `payment_intent` / `metadata.order_id` payload filter would miss the 5 `payment_intent.*` events (their object has no `payment_intent` field and no `order_id` in metadata), silently leaving test rows behind. Pre-launch Stripe sandbox → every row is a test artifact → full clear is complete and simpler.

### Preview counts (unchanged from prior plan)

| Filter | Rows |
|---|---|
| `orders` matching test scope | **19** of 19 |
| `order_items` where `order_id` ∈ test scope | **26** of 26 |
| `uploads` referenced by those order_items' `notes` (`upload:<uuid>`) | **7** of 8 |
| Orphan upload `c49d12f4-…` (not referenced) | **1** — left in place |
| `webhook_events` (full clear) | **12** of 12 |

Untouched: `pricing_config`, `settings`, `customers`, `user_roles`, `builder_sessions`, `rewards_ledger`.

### Revised migration SQL

Single transaction, `RAISE NOTICE` before each delete.

```sql
BEGIN;

-- 1. Resolve the test order set (explicit, narrow).
CREATE TEMP TABLE _test_orders ON COMMIT DROP AS
SELECT id, stripe_payment_intent_id
FROM public.orders
WHERE stripe_payment_intent_id LIKE 'pi_test_%'
   OR email IN ('happy@test.local','tax@test.local','mismatch@test.local','e2e@brighttransfers.test')
   OR (email = 'guest@brighttransfers.local' AND created_at >= '2026-06-28 18:00:00+00');

-- 2. Resolve uploads referenced by those orders' order_items.notes (upload:<uuid>).
--    Orphan uploads (no matching notes) are intentionally NOT included.
CREATE TEMP TABLE _test_uploads ON COMMIT DROP AS
SELECT DISTINCT (regexp_match(oi.notes, 'upload:([0-9a-f-]{36})'))[1]::uuid AS upload_id
FROM public.order_items oi
WHERE oi.order_id IN (SELECT id FROM _test_orders)
  AND oi.notes ~ 'upload:[0-9a-f-]{36}';

-- 3. Preview counts before any delete.
DO $$
DECLARE o int; i int; u int; w int;
BEGIN
  SELECT count(*) INTO o FROM _test_orders;
  SELECT count(*) INTO i FROM public.order_items WHERE order_id IN (SELECT id FROM _test_orders);
  SELECT count(*) INTO u FROM _test_uploads;
  SELECT count(*) INTO w FROM public.webhook_events;
  RAISE NOTICE 'CLEANUP PREVIEW: orders=%, order_items=%, uploads=%, webhook_events(full clear)=%', o, i, u, w;
END $$;

-- 4. Deletes (child -> parent).
DELETE FROM public.uploads        WHERE id       IN (SELECT upload_id FROM _test_uploads);
DELETE FROM public.order_items    WHERE order_id IN (SELECT id        FROM _test_orders);
DELETE FROM public.webhook_events;   -- full clear: pre-launch sandbox, all rows are test artifacts
DELETE FROM public.orders         WHERE id       IN (SELECT id        FROM _test_orders);

COMMIT;
```

### After approval, I will

1. Submit the migration. `RAISE NOTICE` prints the preview counts; deletes commit in the same transaction.
2. Re-run `SELECT count(*)` on `orders`, `order_items`, `uploads`, `webhook_events`, `pricing_config`, `settings` and paste the post-state.
3. Storage blob cleanup (the 7 PNGs in the `uploads` bucket) stays a separate follow-up.

Stopping here — approve to run, or tell me to adjust.