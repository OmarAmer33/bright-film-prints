
BEGIN;

CREATE TEMP TABLE _test_orders ON COMMIT DROP AS
SELECT id, stripe_payment_intent_id
FROM public.orders
WHERE stripe_payment_intent_id LIKE 'pi_test_%'
   OR email IN ('happy@test.local','tax@test.local','mismatch@test.local','e2e@brighttransfers.test')
   OR (email = 'guest@brighttransfers.local' AND created_at >= '2026-06-28 18:00:00+00');

CREATE TEMP TABLE _test_uploads ON COMMIT DROP AS
SELECT DISTINCT (regexp_match(oi.notes, 'upload:([0-9a-f-]{36})'))[1]::uuid AS upload_id
FROM public.order_items oi
WHERE oi.order_id IN (SELECT id FROM _test_orders)
  AND oi.notes ~ 'upload:[0-9a-f-]{36}';

DO $$
DECLARE o int; i int; u int; w int;
BEGIN
  SELECT count(*) INTO o FROM _test_orders;
  SELECT count(*) INTO i FROM public.order_items WHERE order_id IN (SELECT id FROM _test_orders);
  SELECT count(*) INTO u FROM _test_uploads;
  SELECT count(*) INTO w FROM public.webhook_events;
  RAISE NOTICE 'CLEANUP PREVIEW: orders=%, order_items=%, uploads=%, webhook_events(full clear)=%', o, i, u, w;
END $$;

DELETE FROM public.uploads        WHERE id       IN (SELECT upload_id FROM _test_uploads);
DELETE FROM public.order_items    WHERE order_id IN (SELECT id        FROM _test_orders);
DELETE FROM public.webhook_events;
DELETE FROM public.orders         WHERE id       IN (SELECT id        FROM _test_orders);

COMMIT;
