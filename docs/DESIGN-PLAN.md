# Toilet Truck + T Point — Mobile Design Plan & Handoff Spec

Mobile-first web app. Event visitors in Pathum Wan (Bangkok) sort trash, earn **T Points**, and spend **1 T = 1 toilet entry** at our Toilet Trucks.
Stack: React + TypeScript (Vite), Supabase (Auth, Postgres, Realtime). Style: green/white, eco, minimal.

## 1. Product decisions (assumed — change if wrong)

| # | Decision | Why |
|---|----------|-----|
| D1 | Map is the landing page; no login needed to view trucks | Core value in 1 tap, lowest friction |
| D2 | Map = Leaflet + OpenStreetMap tiles | Free, no API key; swap to Google Maps later if needed |
| D3 | "Nearest truck" computed client-side (browser GPS + haversine) | Few trucks (<50), no server needed |
| D4 | Truck positions live via Supabase Realtime | Trucks move between events |
| D5 | T Points stored as an append-only **ledger**; balance = SUM | Auditable, no tampering/double-spend |
| D6 | Earn, **phase 1 (first term):** staff confirm sorting and scan member's QR → `award_points` RPC. **Phase 2:** automated — member scans a QR at the bin/bill station → `claim_bin_reward` RPC (rate-limited, one-time/rotating codes). Spend: member taps "Use 1 T" at truck → RPC deducts when code is generated (refund if it expires unused), shows 60-second entry code | Staff-first prevents self-awarding; same ledger serves both phases |
| D9 | Truck positions come from the **GPS device on each truck**, not manual entry. The device (or its vendor's webhook) calls a Supabase Edge Function with a per-truck secret, which updates `trucks.lat/lng/updated_at` | Real-time map without staff effort; status (available/busy/offline) stays editable by staff, and goes `offline` automatically if no ping for 2 min |
| D7 | Auth = Supabase email + password (add Google/LINE later) | Simplest; Thai users often prefer LINE → Q2 |
| D8 | Thai primary, English toggle (i18n keys from day 1) | Local audience, tourists at events |

## 2. Screens & flow

```
Open site ──► [Map / Home] ──(first visit, guest, after 3s)──► [Login Spotlight]
                 │  ▲                                              │
                 │  └──────────── dismiss ─────────────────────────┘
                 ├─ tap truck pin ─► [Truck Sheet]  ─ "Use 1 T" ─► [Entry Code] (needs login)
                 ├─ tap "Login" ───► [Login / Register]
                 └─ tab "My T" ────► [T Point Wallet] (guest sees login CTA)
```

| Screen | Purpose |
|--------|---------|
| **Home / Map** | Full-screen map, all trucks, nearest highlighted, bottom sheet with nearest truck |
| **Truck Sheet** | Name, status, distance/walk time, queue, "Navigate" (opens Google/Apple Maps), "Use 1 T" |
| **Login / Register** | Tabs on one screen; email + password; "Continue as guest" |
| **Login Spotlight** | Dim overlay with cut-out around Login button + arrow + text |
| **Wallet (My T)** | Balance, member QR (for staff scan), history list |
| **Entry Code** | Large 4-digit code + countdown; staff/truck verifies |

Bottom nav (3 items): **Map · My T · Account/Login**.

## 3. Design tokens

| Token | Value | Usage |
|-------|-------|-------|
| `color-primary` | `#1F9D55` | CTAs, active nav, nearest pin |
| `color-primary-dark` | `#167A42` | Pressed state, text on light green |
| `color-primary-soft` | `#E8F6EE` | Chips, selected rows, sheet header tint |
| `color-bg` | `#FFFFFF` | Surfaces |
| `color-bg-muted` | `#F6F8F7` | Page background, skeletons |
| `color-text` | `#14221A` | Body (contrast 15:1 on white) |
| `color-text-muted` | `#5B6B62` | Secondary (contrast 5.4:1 — AA) |
| `color-warning` | `#E0A100` | "Busy" truck |
| `color-danger` | `#D64545` | Errors, "Offline" truck |
| `color-scrim` | `rgba(10,25,15,0.55)` | Login spotlight dim |
| `font-family` | `Noto Sans Thai`, `Inter`, system | Thai + Latin |
| `font-title` | 20/28, 600 | Screen titles |
| `font-body` | 16/24, 400 | Body (16 min avoids iOS input zoom) |
| `font-caption` | 13/18, 400 | Meta |
| `font-balance` | 40/44, 700 | T Point number |
| `space-xs/sm/md/lg/xl` | 4 / 8 / 16 / 24 / 32 px | Spacing scale |
| `radius-md` / `radius-lg` / `radius-pill` | 12 / 20 / 999 px | Cards / sheets / buttons |
| `shadow-sheet` | `0 -4px 16px rgba(0,0,0,.08)` | Bottom sheet |
| `tap-min` | 44×44 px | Minimum touch target |

Truck pin colors: available = primary, busy = warning, offline = danger. **Also differ by icon/label** (not color alone).

## 4. Components

| Component | Variants | Props | Notes |
|-----------|----------|-------|-------|
| `MapView` | — | `trucks`, `userPos`, `nearestId`, `onSelect` | Leaflet; nearest pin is larger with pulse ring |
| `TruckPin` | available / busy / offline / nearest | `status`, `selected` | SVG marker |
| `NearestSheet` | collapsed (peek 112px) / expanded (60% h) | `truck`, `distanceM`, `onUse` | Draggable; default collapsed |
| `TruckCard` | — | `name`, `status`, `distanceM`, `queue` | Used in sheet + "All trucks" list |
| `TPointBadge` | guest / member | `balance`, `onClick` | Top-right of map; guest shows "Login to earn T" |
| `Button` | primary / secondary / ghost; sm / md | `loading`, `disabled` | Height 48 |
| `TextField` | default / error / disabled | `label`, `error`, `type` | Label above, error below |
| `LoginSpotlight` | — | `targetRef`, `onDismiss` | Overlay with cut-out + tooltip |
| `WalletCard` | — | `balance` | Green gradient-free solid card |
| `LedgerList` | — | `entries` | Earn (+, green) / spend (−, neutral) |
| `QrCard` | — | `value` | Member QR, brightness-friendly white bg |
| `BottomNav` | — | `active` | 3 tabs, 56px high, safe-area padding |
| `Toast` | success / error | `message` | Bottom, above nav, auto-dismiss 4s |

## 5. Screen specs

### 5.1 Home / Map
- Map fills viewport minus `BottomNav`. Top bar floats over map: logo (left), `TPointBadge` (right) — this is the **Login target** for guests.
- On load: request geolocation (after one short in-app explainer, not cold browser prompt). Center on user; fit bounds to user + nearest truck.
- Nearest sheet peeks at bottom: "รถห้องน้ำใกล้คุณที่สุด · 120 m · เดิน 2 นาที".
- Recenter button (44px, bottom-right above sheet).
- **Geolocation denied/unavailable:** center on Pathum Wan default (13.7466, 100.5347), show banner "เปิดตำแหน่งเพื่อดูรถที่ใกล้ที่สุด" + "All trucks" list; no nearest highlight.

### 5.2 Truck Sheet (expanded)
Name · status chip · distance · queue ("~3 คน") · last-updated ("อัปเดต 10 วิที่แล้ว") · [Navigate] secondary · [Use 1 T] primary.
- Guest taps **Use 1 T** → Login screen with return-to-truck.
- Member balance 0 → button disabled, helper "ยังไม่มี T Point — แยกขยะเพื่อรับ T".
- Truck offline → button disabled.

### 5.3 Login / Register
Single screen, segmented tabs (เข้าสู่ระบบ / สมัครสมาชิก). Fields: email, password (+ display name on register). Show/hide password. "Continue as guest" text link. Password rule ≥ 8 chars, validated on blur. Errors inline under field; auth errors in a banner above the form.

### 5.4 Login Spotlight (pop-up)
- Trigger: guest, first session visit, 3s after map ready; once per session; remember dismiss in `localStorage` for 7 days.
- Overlay `color-scrim` covers screen; **cut-out** (radius-pill, 8px padding) around `TPointBadge`/Login button using a `box-shadow: 0 0 0 100vmax` technique on a positioned ring, or SVG mask.
- Tooltip below the cut-out with up-arrow: "เข้าสู่ระบบเพื่อสะสม T Point แลกเข้าห้องน้ำฟรี" + [Login] + [ไว้ทีหลัง].
- Tapping the dimmed area dismisses; tapping the cut-out passes through to Login. Esc dismisses. Focus trapped to tooltip buttons.
- Does not show if a truck sheet is open or Login screen is active.

### 5.5 Wallet (My T)
Balance (`font-balance`) + "= เข้าห้องน้ำได้ N ครั้ง" · Member QR · History list (date, event, +/−). Empty history: leaf illustration + "ยังไม่มีประวัติ — แยกขยะที่จุดกิจกรรมเพื่อรับ T". Guest: login CTA card instead.

### 5.6 Entry Code
After successful redeem: big 4-digit code, 60s countdown ring, "แสดงให้เจ้าหน้าที่ที่รถ". Expired → "หมดอายุ" and **T is not refunded unless unused** (see Q3).

## 6. States

| Element | State | Behavior |
|---------|-------|----------|
| Map | Loading | Muted grey tiles + centered spinner; sheet shows skeleton card |
| Map | Realtime disconnected | Toast "ตำแหน่งอาจไม่เป็นปัจจุบัน"; auto-retry with backoff |
| Truck list | Empty (no active trucks) | Sheet: "ตอนนี้ยังไม่มีรถห้องน้ำในพื้นที่" |
| Truck name | Long | Truncate 1 line, ellipsis; full in expanded sheet (2 lines max) |
| Button | Loading | Spinner, disabled, label kept (no layout shift) |
| Redeem | Error / race (balance changed) | Toast error, refetch balance |
| Offline browser | — | Banner "ออฟไลน์"; last known trucks shown with stale timestamp |
| Balance | Large (≥ 1000) | Format with separators; shrink font to 32 if > 6 digits |

## 7. Motion

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| Sheet | expand/collapse | translateY | 250ms | `cubic-bezier(.2,.8,.2,1)` |
| Nearest pin | idle | pulse ring scale 1→1.6, fade | 1800ms loop | ease-out |
| Spotlight | appear | scrim fade-in, tooltip rise 8px | 300ms | ease-out |
| Balance | change | count up | 600ms | ease-out |
| Toast | in/out | slide + fade | 200ms | ease |

All motion disabled under `prefers-reduced-motion` (pulse → static ring).

## 8. Accessibility
- Tap targets ≥ `tap-min`; contrast AA everywhere.
- Map is not keyboard/screen-reader friendly → **always provide the "All trucks" list** as the accessible equivalent (same data, sorted by distance).
- Spotlight: `role="dialog"`, `aria-modal="true"`, label = tooltip text, focus first button, restore focus on close.
- Status conveyed by icon + text, not color only.
- Form: `<label for>`, `aria-invalid`, `aria-describedby` for errors; errors announced via `role="alert"`.
- Countdown announced at start and at 10s only (not every second).
- `lang="th"` on root, switch with toggle.

## 9. Responsive
Designed at **375×812**. Min supported 320. ≥ 768: center the app in a 480px column over a muted background (no separate desktop layout in v1). Respect `env(safe-area-inset-*)` for nav and sheet.

## 10. Database (Supabase / Postgres)

```sql
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) <= 40),
  created_at timestamptz default now()
);

create table trucks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'available' check (status in ('available','busy','offline')),
  lat double precision not null,
  lng double precision not null,
  queue_est int default 0,
  updated_at timestamptz default now()
);

create table events (          -- optional grouping of where points were earned
  id uuid primary key default gen_random_uuid(),
  name text not null, starts_at timestamptz, ends_at timestamptz
);

create table t_ledger (        -- append-only
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles on delete cascade,
  delta int not null check (delta <> 0),
  reason text not null check (reason in ('sort_reward','redeem','adjust')),
  event_id uuid references events,
  truck_id uuid references trucks,
  created_at timestamptz default now()
);

create view t_balance as
  select user_id, sum(delta)::int as balance from t_ledger group by user_id;

create table redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles,
  truck_id uuid not null references trucks,
  code text not null,
  expires_at timestamptz not null,
  used_at timestamptz
);
```

**RLS (enable on all tables):**
- `trucks`, `events`: `select` for `anon` + `authenticated`; writes only for admin role (service role / `is_admin` claim).
- `profiles`: user can select/update own row only.
- `t_ledger`, `redemptions`: user can **select own rows only; no insert/update/delete from client**.
- Writes happen only through `security definer` RPCs:
  - `redeem_toilet(truck_id)` — checks balance ≥ 1, truck not offline, inserts `-1` ledger row + redemption with 4-digit code, 60s expiry, in one transaction (lock user row to stop double-spend). Returns code.
  - `award_points(member_id, amount, event_id)` — callable by staff role only.
- Trigger on `auth.users` insert → create `profiles` row.
- Realtime enabled on `trucks` only.
- Index: `t_ledger(user_id, created_at desc)`.

## 11. Frontend structure (React + TS)

```
src/
  main.tsx, App.tsx            # router: / (map), /wallet, /login
  lib/supabase.ts              # client from VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
  lib/geo.ts                   # haversine, nearestTruck()
  hooks/useTrucks.ts           # fetch + realtime subscribe
  hooks/useAuth.ts             # session, profile
  hooks/useBalance.ts
  components/…                 # per §4
  pages/MapPage, WalletPage, LoginPage
  i18n/th.json, en.json
```
Libraries: `react-router`, `@supabase/supabase-js`, `leaflet` + `react-leaflet`, `i18next`. No state library — hooks + Supabase are enough.

## 12. Build plan (thin slices, each shippable)

| # | Slice | Done when |
|---|-------|-----------|
| 1 | Vite + TS scaffold, tokens as CSS variables, `BottomNav`, router | Empty 3-tab app runs at 375px |
| 2 | Supabase project, `trucks` table + seed 5 Pathum Wan trucks, RLS | Anon can read trucks |
| 3 | **Map page**: pins, GPS, nearest sheet, denied-GPS fallback, "All trucks" list | Landing shows nearest truck as guest |
| 4 | Realtime truck updates | Editing a row in Supabase moves the pin live |
| 5 | Auth: register/login, profile trigger, session persistence | Can sign up and log in |
| 6 | **Login spotlight** | Appears once for guests, correct cut-out on 320–430px widths |
| 7 | Ledger + balance + Wallet page + QR | Balance and history show for member |
| 8 | `redeem_toilet` + `award_points` RPCs, Entry Code screen, RLS tests | Cannot overspend; client cannot write ledger |
| 9 | i18n TH/EN, a11y pass, Lighthouse mobile ≥ 90 | Checklist in §8 passes |
| 10 | GitHub: `.gitignore` (.env), `.env.example`, README, GitHub Actions (lint + build), deploy to Vercel/Netlify | Repo public-safe |

## 13. GitHub notes
- Never commit `.env`; only the **anon** key belongs in the frontend and it is safe only because RLS is on. Service-role key stays out of the repo entirely.
- Commit SQL as `supabase/migrations/*.sql` so the DB is reproducible.

## 14. Decisions confirmed
- Earning: staff confirm in phase 1; automated bin/bill QR scan in phase 2 (D6).
- Login: email + password only.
- Redeem: deduct when the code is generated; refund if unused.
- Staff page in v1 (phase 1): scan member QR → award points; set truck status. Truck **location** comes from on-truck GPS (D9).

## 15. Still open
- **Q5** App name/logo and brand green — `#1F9D55` is a placeholder.
- **Q6** What GPS hardware/vendor is on the trucks, and can it POST to a webhook (or expose an API we poll)? This decides how the Edge Function in D9 receives positions.
- **Q7** Roughly how many trucks and how often do they report (e.g. every 10 s)? Affects Realtime load (fine under ~50 trucks).

Slice 4 becomes "GPS ingest Edge Function + realtime"; add slice 7b "Staff page (QR scan + truck status)". Phase 2 bin-QR is out of scope for the first release.
