-- One award function for both identifiers: p_who is an email OR a member_code (e.g. M-1042).
-- staff may award 1-20 T per call, admin 1-500.
create or replace function public.award_points_to(p_who text, p_amount int) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_max int; v_who text := trim(p_who);
begin
  if public.is_admin() then v_max := 500;
  elsif public.is_staff() then v_max := 20;
  else raise exception 'staff only'; end if;
  if p_amount < 1 or p_amount > v_max then raise exception 'amount must be 1-%', v_max; end if;
  if v_who ~* '^m-[0-9]+$' then
    select id into v_user from public.profiles where member_code = upper(v_who);
  else
    select u.id into v_user from auth.users u join public.profiles p on p.id = u.id where lower(u.email) = lower(v_who);
  end if;
  if v_user is null then raise exception 'unknown member'; end if;
  insert into public.t_ledger (user_id, delta, reason) values (v_user, p_amount, 'sort_reward');
end $$;

revoke all on function public.award_points_to(text, int) from public, anon;
grant execute on function public.award_points_to(text, int) to authenticated;
