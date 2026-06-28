-- 13.4: Stripe checkout + order creation schema additions

-- 1. Add view_token + stripe_checkout_session_id to orders.
--    view_token uses extensions.gen_random_bytes because pgcrypto lives in the extensions schema.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS view_token text UNIQUE NOT NULL
    DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text UNIQUE;

-- 2. Add a free-form notes column for amount_mismatch / issue notes (if not already present).
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS notes text;

-- 3. Public read policy for orders by view_token: callers retrieve via a server fn
--    using the publishable client, so we need an anon SELECT policy gated on a
--    function that can match the token. Simpler: route reads through service-role
--    server fn instead of widening RLS. So no new policy here — getOrderForView
--    will use supabaseAdmin server-side after looking up by token.

-- 4. webhook_events already exists from prior work — confirm structure is correct
--    (event_id PK, type, received_at, payload). No changes needed if present.
--    If somehow missing, create it:
CREATE TABLE IF NOT EXISTS public.webhook_events (
  event_id text PRIMARY KEY,
  type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL
);

GRANT ALL ON public.webhook_events TO service_role;
-- No anon/authenticated grants: only the webhook handler (service role) touches this.

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies = locked to service role only.
