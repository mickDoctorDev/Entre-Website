-- Admin-only: add T Points by member_code with a free amount (1-500).
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.award_points(p_code text, p_amount int) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if p_amount < 1 or p_amount > 500 then raise exception 'amount must be 1-500'; end if;
  select id into v_user from public.profiles where member_code = upper(trim(p_code));
  if v_user is null then raise exception 'unknown member'; end if;
  insert into public.t_ledger (user_id, delta, reason) values (v_user, p_amount, 'sort_reward');
end $$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
