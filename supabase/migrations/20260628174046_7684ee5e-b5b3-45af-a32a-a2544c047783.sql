-- Add lookup token + stripe session id to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS guest_email_lookup_token text,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;

CREATE INDEX IF NOT EXISTS orders_lookup_token_idx ON public.orders (guest_email_lookup_token);
CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_checkout_session_id_key ON public.orders (stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;

-- Optional processing fee on each line item
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS processing_fee numeric NOT NULL DEFAULT 0;

-- Webhook idempotency table
CREATE TABLE IF NOT EXISTS public.webhook_events (
  event_id text PRIMARY KEY,
  type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.webhook_events TO service_role;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies → only service_role can touch it.

-- Seed missing settings (idempotent)
INSERT INTO public.settings (key, value) VALUES
  ('standard_ship_fee', '6.99'::jsonb),
  ('rush_fee', '19.99'::jsonb),
  ('rewards_rate', '0.10'::jsonb)
ON CONFLICT (key) DO NOTHING;