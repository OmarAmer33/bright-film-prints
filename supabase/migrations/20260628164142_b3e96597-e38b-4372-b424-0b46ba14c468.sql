
-- Extensions
create extension if not exists citext;
create extension if not exists pgcrypto;

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

-- Roles
create type public.app_role as enum ('admin','customer');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "users read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Enums
create type public.order_status as enum
  ('new','paid','in_production','printed','shipped','delivered','on_hold','issue');
create type public.order_item_source as enum ('upload','builder');
create type public.upload_status as enum ('pending','ok','low_res','rejected');
create type public.rewards_entry_type as enum ('earn','redeem','adjust');
create type public.builder_session_status as enum
  ('created','in_progress','accepted','file_ready','abandoned');

-- pricing_config
create table public.pricing_config (
  id uuid primary key default gen_random_uuid(),
  size_ft numeric not null,
  price numeric not null,
  per_sqft numeric not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.pricing_config to anon, authenticated;
grant all on public.pricing_config to service_role;
alter table public.pricing_config enable row level security;
create policy "read active pricing" on public.pricing_config
  for select to anon, authenticated using (active = true);
create policy "admins manage pricing" on public.pricing_config
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));
create trigger trg_pricing_config_updated before update on public.pricing_config
  for each row execute function public.set_updated_at();

-- settings
create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
grant select on public.settings to anon, authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "read settings" on public.settings
  for select to anon, authenticated using (true);
create policy "admins manage settings" on public.settings
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));
create trigger trg_settings_updated before update on public.settings
  for each row execute function public.set_updated_at();

-- customers
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email citext not null,
  name text,
  rewards_balance numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_email_idx on public.customers (email);
create index customers_auth_user_id_idx on public.customers (auth_user_id);
grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
create policy "customers read own" on public.customers
  for select to authenticated using (auth_user_id = auth.uid());
create policy "customers update own" on public.customers
  for update to authenticated using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());
create policy "admins manage customers" on public.customers
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));
create trigger trg_customers_updated before update on public.customers
  for each row execute function public.set_updated_at();

-- orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  email citext not null,
  status public.order_status not null default 'new',
  subtotal numeric not null default 0,
  shipping_fee numeric not null default 0,
  tax numeric not null default 0,
  rush_fee numeric not null default 0,
  total numeric not null default 0,
  rewards_earned numeric not null default 0,
  rewards_redeemed numeric not null default 0,
  stripe_payment_intent_id text,
  shipping_address jsonb,
  carrier text,
  tracking_number text,
  is_rush boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_customer_id_idx on public.orders (customer_id);
create index orders_email_idx on public.orders (email);
grant select, insert, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "orders read own" on public.orders
  for select to authenticated using (
    exists (select 1 from public.customers c where c.id = orders.customer_id and c.auth_user_id = auth.uid())
  );
create policy "admins manage orders" on public.orders
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

-- order_items
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  source public.order_item_source not null,
  size_ft numeric not null,
  quantity int not null check (quantity > 0),
  unit_price numeric not null,
  line_total numeric not null,
  print_file_url text,
  preview_url text,
  builder_project_ref text,
  dpi_ok boolean,
  notes text,
  created_at timestamptz not null default now()
);
create index order_items_order_id_idx on public.order_items (order_id);
grant select, insert, update, delete on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "order_items read own" on public.order_items
  for select to authenticated using (
    exists (
      select 1 from public.orders o
      join public.customers c on c.id = o.customer_id
      where o.id = order_items.order_id and c.auth_user_id = auth.uid()
    )
  );
create policy "admins manage order_items" on public.order_items
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- uploads
create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid references public.order_items(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  file_url text not null,
  width_px int,
  height_px int,
  detected_dpi numeric,
  status public.upload_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index uploads_customer_id_idx on public.uploads (customer_id);
grant select, insert, update, delete on public.uploads to authenticated;
grant all on public.uploads to service_role;
alter table public.uploads enable row level security;
create policy "uploads read own" on public.uploads
  for select to authenticated using (
    exists (select 1 from public.customers c where c.id = uploads.customer_id and c.auth_user_id = auth.uid())
  );
create policy "uploads insert own" on public.uploads
  for insert to authenticated with check (
    exists (select 1 from public.customers c where c.id = uploads.customer_id and c.auth_user_id = auth.uid())
  );
create policy "admins manage uploads" on public.uploads
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- rewards_ledger
create table public.rewards_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  type public.rewards_entry_type not null,
  amount numeric not null,
  memo text,
  created_at timestamptz not null default now()
);
create index rewards_ledger_customer_id_idx on public.rewards_ledger (customer_id);
grant select, insert, update, delete on public.rewards_ledger to authenticated;
grant all on public.rewards_ledger to service_role;
alter table public.rewards_ledger enable row level security;
create policy "rewards read own" on public.rewards_ledger
  for select to authenticated using (
    exists (select 1 from public.customers c where c.id = rewards_ledger.customer_id and c.auth_user_id = auth.uid())
  );
create policy "admins manage rewards" on public.rewards_ledger
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- builder_sessions
create table public.builder_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  antigro_session_id text,
  jwt_ref text,
  status public.builder_session_status not null default 'created',
  print_file_url text,
  dimensions jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index builder_sessions_customer_id_idx on public.builder_sessions (customer_id);
grant select, insert, update, delete on public.builder_sessions to authenticated;
grant all on public.builder_sessions to service_role;
alter table public.builder_sessions enable row level security;
create policy "builder_sessions read own" on public.builder_sessions
  for select to authenticated using (
    exists (select 1 from public.customers c where c.id = builder_sessions.customer_id and c.auth_user_id = auth.uid())
  );
create policy "builder_sessions insert own" on public.builder_sessions
  for insert to authenticated with check (
    exists (select 1 from public.customers c where c.id = builder_sessions.customer_id and c.auth_user_id = auth.uid())
  );
create policy "builder_sessions update own" on public.builder_sessions
  for update to authenticated using (
    exists (select 1 from public.customers c where c.id = builder_sessions.customer_id and c.auth_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.customers c where c.id = builder_sessions.customer_id and c.auth_user_id = auth.uid())
  );
create policy "admins manage builder_sessions" on public.builder_sessions
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));
create trigger trg_builder_sessions_updated before update on public.builder_sessions
  for each row execute function public.set_updated_at();

-- handle_new_user trigger: auto-create customers row + default 'customer' role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.customers (auth_user_id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name')
  )
  on conflict (auth_user_id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict (user_id, role) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed pricing_config
insert into public.pricing_config (size_ft, price, per_sqft, sort_order) values
  (3, 19.99, 3.63, 10),
  (5, 30.99, 3.38, 20),
  (7, 40.99, 3.19, 30),
  (10, 54.99, 3.00, 40),
  (15, 76.99, 2.80, 50),
  (20, 97.99, 2.67, 60),
  (30, 139.99, 2.55, 70);

-- Seed settings
insert into public.settings (key, value) values
  ('free_ship_threshold', '75'::jsonb),
  ('standard_ship_fee', '6.99'::jsonb),
  ('rush_fee', '19.99'::jsonb),
  ('rewards_rate', '0.10'::jsonb);
