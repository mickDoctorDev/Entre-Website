-- Staff/admin award T Points by member email (no member code needed).
create or replace function public.award_points_by_email(p_email text, p_amount int) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if not public.is_staff() then raise exception 'staff only'; end if;
  if p_amount < 1 or p_amount > 20 then raise exception 'amount must be 1-20'; end if;
  select u.id into v_user from auth.users u
    join public.profiles p on p.id = u.id
    where lower(u.email) = lower(trim(p_email));
  if v_user is null then raise exception 'unknown member'; end if;
  insert into public.t_ledger (user_id, delta, reason) values (v_user, p_amount, 'sort_reward');
end $$;

revoke all on function public.award_points_by_email(text, int) from public, anon;
grant execute on function public.award_points_by_email(text, int) to authenticated;
