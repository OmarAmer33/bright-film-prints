
# Step 13.2 — Backend & data model (revised)

Scope: enable Lovable Cloud, create the database schema, RLS, and seed data. No Home page UI changes. No client wiring.

## 1. Enable Lovable Cloud
Call `supabase--enable` to provision Postgres + Auth + Storage + server functions.

## 2. Extensions
```sql
create extension if not exists citext;
create extension if not exists pgcrypto;  -- gen_random_uuid()
```

## 3. Roles (admin for Chai)

```sql
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
```
Chai's `admin` row is inserted manually after she signs up — out of scope for this migration.

## 4. Enums
```sql
create type public.order_status as enum
  ('new','paid','in_production','printed','shipped','delivered','on_hold','issue');
create type public.order_item_source as enum ('upload','builder');
create type public.upload_status as enum ('pending','ok','low_res','rejected');
create type public.rewards_entry_type as enum ('earn','redeem','adjust');
create type public.builder_session_status as enum
  ('created','in_progress','accepted','file_ready','abandoned');
```

## 5. Tables

**pricing_config** — `id uuid pk`, `size_ft numeric`, `price numeric`, `per_sqft numeric`, `sort_order int`, `active bool default true`, `created_at`, `updated_at`.

**settings** — `key text pk`, `value jsonb not null`, `updated_at`.

**customers** — `id uuid pk`, `auth_user_id uuid unique references auth.users(id) on delete set null` (nullable = guest), `email citext not null`, `name text`, `rewards_balance numeric not null default 0`, `created_at`, `updated_at`. Indexes on `email`, `auth_user_id`.

**orders** — `id uuid pk`, `customer_id uuid references customers(id)` (nullable), `email citext not null`, `status order_status default 'new'`, `subtotal/shipping_fee/tax/rush_fee/total numeric not null default 0`, `rewards_earned/rewards_redeemed numeric default 0`, `stripe_payment_intent_id text`, `shipping_address jsonb`, `carrier text`, `tracking_number text`, `is_rush bool default false`, `created_at`, `updated_at`.

**order_items** — `id uuid pk`, `order_id uuid not null references orders(id) on delete cascade`, `source order_item_source not null`, `size_ft numeric not null`, `quantity int not null check (quantity > 0)`, `unit_price numeric not null`, `line_total numeric not null`, `print_file_url text`, `preview_url text`, `builder_project_ref text`, `dpi_ok bool`, `notes text`, `created_at`.

**uploads** — `id uuid pk`, `order_item_id uuid references order_items(id) on delete set null`, `customer_id uuid references customers(id)` (pre-checkout ownership), `file_url text not null`, `width_px int`, `height_px int`, `detected_dpi numeric`, `status upload_status default 'pending'`, `created_at`.

**rewards_ledger** — `id uuid pk`, `customer_id uuid not null references customers(id) on delete cascade`, `order_id uuid references orders(id) on delete set null`, `type rewards_entry_type not null`, `amount numeric not null`, `memo text`, `created_at`.

**builder_sessions** — `id uuid pk`, `customer_id uuid references customers(id)`, `antigro_session_id text`, `jwt_ref text`, `status builder_session_status default 'created'`, `print_file_url text`, `dimensions jsonb`, `created_at`, `updated_at`.

## 6. Grants + RLS

Pattern: explicit grants in the same migration, then `enable row level security`, then policies.

**pricing_config / settings — public read, admin write**
```sql
grant select on public.pricing_config to anon, authenticated;
grant all on public.pricing_config to service_role;
alter table public.pricing_config enable row level security;
create policy "read active pricing" on public.pricing_config
  for select to anon, authenticated using (active = true);
create policy "admins manage pricing" on public.pricing_config
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));
```
Same shape for `settings` (full `select` to anon/authenticated, admin writes).

**customers / orders / order_items / uploads / rewards_ledger / builder_sessions**
- Grants: `select, insert, update, delete` to `authenticated`; `all` to `service_role`. No anon grants.
- Owner policies scope to `auth.uid()`, e.g. for `customers`: `auth_user_id = auth.uid()`. For child tables (`orders`, `uploads`, `rewards_ledger`, `builder_sessions`): `exists (select 1 from customers c where c.id = <table>.customer_id and c.auth_user_id = auth.uid())`. `order_items` joins through `orders`.
- Admin policy on each: `for all using (public.has_role(auth.uid(),'admin')) with check (...)`.
- Guest flows (no auth user) are created/read by service-role server functions in 13.3+, never by `anon`.

## 7. handle_new_user trigger (customer row on signup)

Create the customers row + default `customer` role automatically so authenticated users have a record to scope RLS against.

```sql
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
```

## 8. updated_at triggers
Generic trigger function applied to `customers`, `orders`, `pricing_config`, `settings`, `builder_sessions`.

## 9. Rewards discipline (noted, not implemented here)
When the rewards server function lands later, `rewards_ledger` is the single source of truth. `customers.rewards_balance` is a derived cache written only by that function (sum of ledger entries). No other path mutates the balance.

## 10. Seed data

`pricing_config` (active, sort ascending):

| size_ft | price  | per_sqft | sort_order |
|--------:|-------:|---------:|-----------:|
| 3       | 19.99  | 3.63     | 10 |
| 5       | 30.99  | 3.38     | 20 |
| 7       | 40.99  | 3.19     | 30 |
| 10      | 54.99  | 3.00     | 40 |
| 15      | 76.99  | 2.80     | 50 |
| 20      | 97.99  | 2.67     | 60 |
| 30      | 139.99 | 2.55     | 70 |

`settings` (jsonb numerics):
- `free_ship_threshold` → `75`
- `standard_ship_fee` → `6.99`
- `rush_fee` → `19.99`
- `rewards_rate` → `0.10`

## 11. Out of scope
- No Home page wiring.
- No server functions, upload pipeline, Stripe, or Antigro yet (13.3+).
- Chai's admin row inserted manually after her signup.

## Verify
- `select * from public.pricing_config order by sort_order` → 7 rows at locked prices.
- `select * from public.settings` → 4 globals.
- RLS smoke: anon can read `pricing_config` + `settings` only; cannot read `orders`/`customers`/etc.
- Trigger smoke: a new signup creates one `customers` row and one `user_roles('customer')` row.
