
-- Move extensions out of public
create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;
alter extension citext set schema extensions;
alter extension pgcrypto set schema extensions;

-- Lock down SECURITY DEFINER functions
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
-- has_role must remain callable by `authenticated` for RLS policy evaluation.
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
