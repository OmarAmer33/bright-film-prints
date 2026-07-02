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
     set rewards_earned = v_earn
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

  update public.customers
     set rewards_balance = rewards_balance + v_earn,
         updated_at = now()
   where id = v_customer;
end;
$$;

revoke all on function public.accrue_order_rewards(uuid) from public, anon, authenticated;
grant execute on function public.accrue_order_rewards(uuid) to service_role;