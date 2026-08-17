-- Allowlist table that gates Google login.
-- RLS enabled, no policies. Only the service-role key can read it.
create table if not exists admin_allowlist (
  id bigint generated always as identity primary key,
  email text not null unique,
  added_at timestamptz not null default now()
);

alter table admin_allowlist enable row level security;

-- service_role bypasses RLS, but table GRANTs are separate
grant select, insert, update, delete on public.admin_allowlist to service_role;

-- Add emails into allowlist like so:
-- insert into admin_allowlist (email) values
--   ('someone@gmail.com'),
--   ('someone2@gmail.com');

-- Before User Created hook: blocks signup for emails not on the allowlist.
create or replace function public.check_allowlist_before_signup(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  signup_email text;
begin
  signup_email := lower(event->'user'->>'email');

  if exists (select 1 from admin_allowlist where email = signup_email) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'message', 'This Google account is not authorized for this dashboard.',
      'http_code', 403
    )
  );
end;
$$;

grant execute on function public.check_allowlist_before_signup to supabase_auth_admin;
revoke execute on function public.check_allowlist_before_signup from authenticated, anon, public;

-- In Supabase: Authentication -> Auth Hooks -> Before User Created ->
-- Postgres Function -> check_allowlist_before_signup -> Save.