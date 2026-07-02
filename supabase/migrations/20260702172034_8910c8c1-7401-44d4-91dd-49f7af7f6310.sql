alter table public.orders
  add column if not exists rewards_redeemed_committed boolean not null default false;

create or replace function public.apply_rewards_delta(p_customer uuid, p_delta numeric)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.customers
     set rewards_balance = rewards_balance + p_delta,
         updated_at = now()
   where id = p_customer;
end;
$$;

revoke all on function public.apply_rewards_delta(uuid, numeric) from public, anon, authenticated;
grant execute on function public.apply_rewards_delta(uuid, numeric) to service_role;

create or replace function public.accrue_order_rewards(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_status   text;
  v_customer uuid;
  v_subtotal numeric;
  v_rate     numeric;
  v_earn     numeric;
begin
  select status::text, customer_id, subtotal
    into v_status, v_customer, v_subtotal
  from public.orders
  where id = p_order_id;

  if v_status is distinct from 'paid' or v_customer is null then
    return;
  end if;

  select (value #>> '{}')::numeric into v_rate
  from public.settings
  where key = 'rewards_rate';
  v_rate := coalesce(v_rate, 0.10);

  v_earn := round(coalesce(v_subtotal, 0) * v_rate, 2);
  if v_earn <= 0 then
    return;
  end if;

  update public.orders
     set rewards_earned = v_earn,
         rewards_rate_applied = v_rate
   where id = p_order_id
     and rewards_earned = 0
     and status = 'paid'
     and customer_id is not null;

  if not found then
    return;
  end if;

  insert into public.rewards_ledger (customer_id, order_id, type, amount, memo)
  values (v_customer, p_order_id, 'earn'::public.rewards_entry_type, v_earn,
          'Order reward @ ' || (v_rate * 100)::text || '%');

  perform public.apply_rewards_delta(v_customer, v_earn);
end;
$$;

revoke all on function public.accrue_order_rewards(uuid) from public, anon, authenticated;
grant execute on function public.accrue_order_rewards(uuid) to service_role;

create or replace function public.commit_order_redemption(p_order_id uuid, p_redeem numeric)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_status   text;
  v_customer uuid;
  v_balance  numeric;
  v_debit    numeric;
begin
  select status::text, customer_id
    into v_status, v_customer
  from public.orders
  where id = p_order_id;

  if v_status is distinct from 'paid' or v_customer is null then
    return;
  end if;

  if coalesce(p_redeem, 0) <= 0 then
    return;
  end if;

  update public.orders
     set rewards_redeemed_committed = true
   where id = p_order_id
     and rewards_redeemed_committed = false
     and status = 'paid'
     and customer_id is not null;

  if not found then
    return;
  end if;

  select rewards_balance into v_balance
  from public.customers
  where id = v_customer
  for update;

  v_debit := least(p_redeem, coalesce(v_balance, 0));

  if v_debit <= 0 then
    update public.orders
       set rewards_redeemed = 0,
           status = 'issue',
           notes = coalesce(notes || E'\n', '') ||
                   'redeem_shortfall: requested=' || p_redeem::text || ' available=0'
     where id = p_order_id;
    return;
  end if;

  update public.orders
     set rewards_redeemed = v_debit
   where id = p_order_id;

  insert into public.rewards_ledger (customer_id, order_id, type, amount, memo)
  values (v_customer, p_order_id, 'redeem'::public.rewards_entry_type, -v_debit,
          'Redeemed on order');

  perform public.apply_rewards_delta(v_customer, -v_debit);

  if v_debit < p_redeem then
    update public.orders
       set status = 'issue',
           notes = coalesce(notes || E'\n', '') ||
                   'redeem_shortfall: requested=' || p_redeem::text ||
                   ' debited=' || v_debit::text
     where id = p_order_id;
  end if;
end;
$$;

revoke all on function public.commit_order_redemption(uuid, numeric) from public, anon, authenticated;
grant execute on function public.commit_order_redemption(uuid, numeric) to service_role;