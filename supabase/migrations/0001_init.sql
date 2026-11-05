-- Toilet Truck + T Point — initial schema. Run in Supabase SQL editor (or `supabase db push`).

create sequence public.member_seq start 1000;

create table public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  member_code  text not null unique default ('M-' || nextval('public.member_seq')),
  role         text not null default 'member' check (role in ('member', 'staff', 'admin')),
  created_at   timestamptz not null default now()
);

create table public.trucks (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  zone       text not null default '',
  status     text not null default 'available' check (status in ('available', 'busy', 'offline')),
  lat        double precision not null,
  lng        double precision not null,
  queue_est  int not null default 0 check (queue_est >= 0),
  updated_at timestamptz not null default now()
);

create table public.stations (
  id   uuid primary key default gen_random_uuid(),
  name text not null,
  lat  double precision not null,
  lng  double precision not null
);

-- Append-only: balance = sum(delta). Clients can never write here directly.
create table public.t_ledger (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles on delete cascade,
  delta      int not null check (delta <> 0),
  reason     text not null check (reason in ('sort_reward', 'redeem', 'adjust')),
  truck_id   uuid references public.trucks,
  created_at timestamptz not null default now()
);
create index on public.t_ledger (user_id, created_at desc);

create view public.t_balance with (security_invoker = true) as
  select user_id, sum(delta)::int as balance from public.t_ledger group by user_id;

create table public.redemptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles,
  truck_id   uuid not null references public.trucks,
  code       text not null,
  expires_at timestamptz not null,
  used_at    timestamptz
);

-- ---------- helpers ----------
create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('staff', 'admin'));
$$;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 40));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RLS ----------
alter table public.profiles    enable row level security;
alter table public.trucks      enable row level security;
alter table public.stations    enable row level security;
alter table public.t_ledger    enable row level security;
alter table public.redemptions enable row level security;

create policy "own profile"     on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy "edit own name"   on public.profiles for update using (id = auth.uid());
-- users may change display_name only, never role / member_code
revoke update on public.profiles from authenticated, anon;
grant  update (display_name) on public.profiles to authenticated;

create policy "trucks readable"   on public.trucks   for select using (true);
create policy "staff edit trucks" on public.trucks   for update using (public.is_staff()) with check (public.is_staff());
create policy "stations readable" on public.stations for select using (true);

create policy "own ledger"      on public.t_ledger    for select using (user_id = auth.uid() or public.is_staff());
create policy "own redemptions" on public.redemptions for select using (user_id = auth.uid());

-- ---------- RPCs (only way to write points) ----------
create function public.award_points(p_code text, p_amount int) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if not public.is_staff() then raise exception 'staff only'; end if;
  if p_amount < 1 or p_amount > 20 then raise exception 'amount must be 1-20'; end if;
  select id into v_user from public.profiles where member_code = upper(p_code);
  if v_user is null then raise exception 'unknown member'; end if;
  insert into public.t_ledger (user_id, delta, reason) values (v_user, p_amount, 'sort_reward');
end $$;

create function public.redeem_toilet(p_truck uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_bal int; v_status text; v_code text := lpad(floor(random() * 10000)::text, 4, '0');
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  perform 1 from public.profiles where id = auth.uid() for update;   -- serialise per user: no double spend
  select status into v_status from public.trucks where id = p_truck;
  if v_status is null or v_status = 'offline' then raise exception 'truck unavailable'; end if;
  select coalesce(sum(delta), 0) into v_bal from public.t_ledger where user_id = auth.uid();
  if v_bal < 1 then raise exception 'not enough T points'; end if;
  insert into public.t_ledger (user_id, delta, reason, truck_id) values (auth.uid(), -1, 'redeem', p_truck);
  insert into public.redemptions (user_id, truck_id, code, expires_at)
    values (auth.uid(), p_truck, v_code, now() + interval '60 seconds');
  return v_code;
end $$;

revoke all on function public.award_points(text, int), public.redeem_toilet(uuid) from public, anon;
grant execute on function public.award_points(text, int), public.redeem_toilet(uuid) to authenticated;

-- ---------- realtime ----------
alter publication supabase_realtime add table public.trucks;

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger trucks_touch before update on public.trucks
  for each row execute function public.touch_updated_at();
