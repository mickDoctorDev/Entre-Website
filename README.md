# Toilet Truck + T Point

Mobile-first web app: find the nearest Toilet Truck, earn/spend T Points. React + TypeScript + Supabase. Design notes: [docs/DESIGN-PLAN.md](docs/DESIGN-PLAN.md).

```bash
npm install
npm run dev      # / = public app, /admin = ops dashboard
```

Without `.env` the app runs on **mock** GPS trucks and a **mock** local login.

## Connect Supabase
1. Create a project at supabase.com.
2. SQL Editor → run `supabase/migrations/0001_init.sql`, `0002_drop_stations.sql`, `0003_award_by_email.sql`, `0004_admin_award_by_code.sql`, `0005_award_to.sql`, then `supabase/seed.sql`.
3. Project Settings → API: copy **Project URL** and the **anon public** key into `.env` (see `.env.example`). Never use or commit the `service_role` key.
4. Authentication → Providers → Email: for quick testing turn off "Confirm email".
5. Register in the app, then make yourself staff in the SQL Editor:
   `update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');`
6. Restart `npm run dev`.

**Make an admin without SQL:** Supabase → Table Editor → `profiles` → find your row → change the `role` cell to `admin` → Save. (Or run the SQL above.)

**Admin login:** there is no separate admin ID. An admin is a normal account (its email + the password you chose) whose `profiles.role` is `admin` or `staff`. Log in at `/login`, then open `/admin`. Other accounts see "no permission". Create more staff the same way (change the email in the SQL above).

Staff/admin can change truck status and award points (`award_points` RPC). Members cannot write to the points ledger directly (RLS).

## Not done yet
Wallet page, `redeem_toilet` UI + entry code, real GPS ingest (Edge Function), refund of unused entry codes.

Admin → "Award T Points" (Overview) takes the member's **email or member_code** in one field plus an amount. Staff can give 1–20 T per call, admin 1–500 (`award_points_to`).
